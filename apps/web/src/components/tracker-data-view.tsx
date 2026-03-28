"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrackerCharts } from "@/components/tracker-charts";
import { getEmotionLabel, getEmotionColor } from "@steady/shared";

// ── Types ────────────────────────────────────────────

interface TrendField {
  id: string;
  label: string;
  fieldType: string;
  options: any;
}

interface TrendData {
  fields: TrendField[];
  fieldTrends: Record<string, Array<{ date: string; value: number }>>;
  completionRate: number;
  totalDays: number;
  completedDays: number;
  streak: number;
}

interface Entry {
  id: string;
  date: string;
  responses: Record<string, any>;
  completedAt: string;
}

interface TrackerField {
  id: string;
  label: string;
  fieldType: string;
  options: any;
  sortOrder: number;
}

// ── Main Component ───────────────────────────────────

interface TrackerDataViewProps {
  trackerId: string;
  trackerName: string;
  userId: string;
  fields: TrackerField[];
  onBack: () => void;
}

export function TrackerDataView({ trackerId, trackerName, userId, fields, onBack }: TrackerDataViewProps) {
  const { data: trends } = useQuery<TrendData>({
    queryKey: ["tracker-trends", trackerId, userId],
    queryFn: () => api.get(`/api/daily-trackers/${trackerId}/trends?userId=${userId}`),
  });

  const { data: entries, isLoading: entriesLoading } = useQuery<Entry[]>({
    queryKey: ["tracker-entries", trackerId, userId],
    queryFn: () => api.get(`/api/daily-trackers/${trackerId}/entries?userId=${userId}&limit=14`),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h3 className="text-lg font-semibold">{trackerName}</h3>
      </div>

      {/* Charts & stats */}
      {trends && (
        <TrackerCharts
          fields={fields}
          fieldTrends={trends.fieldTrends}
          completionRate={trends.completionRate}
          completedDays={trends.completedDays}
          totalDays={trends.totalDays}
          streak={trends.streak}
        />
      )}

      {/* Recent entries */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Recent Entries</h4>
        {entriesLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : !entries || entries.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No entries yet</div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} fields={fields} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Entry Card ───────────────────────────────────────

function EntryCard({ entry, fields }: { entry: Entry; fields: TrackerField[] }) {
  const date = new Date(entry.date + "T00:00:00");
  const dateLabel = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground">{dateLabel}</span>
        <span className="text-[10px] text-muted-foreground">
          {new Date(entry.completedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {fields.map((field) => {
          const value = entry.responses[field.id];
          if (value === undefined || value === null) return null;
          return (
            <div key={field.id} className="text-sm">
              <span className="text-xs text-muted-foreground block">{field.label}</span>
              <FieldValue field={field} value={value} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Field Value Renderer ─────────────────────────────

function FieldValue({ field, value }: { field: TrackerField; value: any }) {
  switch (field.fieldType) {
    case "SCALE": {
      const opts = field.options as any;
      const max = opts?.max ?? 10;
      const pct = ((value as number) / max) * 100;
      const color = pct >= 70 ? "text-green-600" : pct >= 40 ? "text-amber-600" : "text-red-500";
      return (
        <span className={`font-semibold ${color}`}>
          {value}/{max}
        </span>
      );
    }
    case "NUMBER":
      return <span className="font-semibold">{value}</span>;
    case "YES_NO":
      return (
        <Badge variant={value ? "default" : "secondary"} className="text-[10px]">
          {value ? "Yes" : "No"}
        </Badge>
      );
    case "MULTI_CHECK":
      if (Array.isArray(value)) {
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((v: string, i: number) => (
              <Badge key={i} variant="secondary" className="text-[10px]">
                {v}
              </Badge>
            ))}
          </div>
        );
      }
      return <span>{String(value)}</span>;
    case "FREE_TEXT":
      return (
        <span className="text-xs text-muted-foreground line-clamp-2">{value}</span>
      );
    case "TIME":
      return <span className="font-semibold">{value}</span>;
    case "FEELINGS_WHEEL":
      if (Array.isArray(value)) {
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((emotionId: string, i: number) => {
              const label = getEmotionLabel(emotionId) || emotionId;
              const color = getEmotionColor(emotionId);
              const parts = emotionId.split(".");
              const fullPath = parts
                .map((_, idx) => getEmotionLabel(parts.slice(0, idx + 1).join(".")) || parts[idx])
                .join(" > ");
              return (
                <span
                  key={i}
                  title={fullPath}
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium cursor-default"
                  style={{
                    backgroundColor: color ? `${color}26` : undefined,
                    color: color || undefined,
                    border: color ? `1px solid ${color}4D` : undefined,
                  }}
                >
                  {label}
                </span>
              );
            })}
          </div>
        );
      }
      return <span>{String(value)}</span>;
    default:
      return <span>{String(value)}</span>;
  }
}
