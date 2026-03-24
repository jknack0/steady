"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Flame, CalendarCheck, TrendingUp, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

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

// ── Chart colors ─────────────────────────────────────

const CHART_COLORS = ["#5B8A8A", "#E8783A", "#8FAE8B", "#D4A0A0", "#89B4C8", "#C4A86B"];

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

  const chartableFields = fields.filter((f) => f.fieldType === "SCALE" || f.fieldType === "NUMBER");

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

      {/* Summary stats */}
      {trends && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border p-4 text-center">
            <Flame className="h-5 w-5 mx-auto mb-1 text-orange-500" />
            <p className="text-2xl font-bold">{trends.streak}</p>
            <p className="text-xs text-muted-foreground">Day streak</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <CalendarCheck className="h-5 w-5 mx-auto mb-1 text-teal" />
            <p className="text-2xl font-bold">{Math.round(trends.completionRate * 100)}%</p>
            <p className="text-xs text-muted-foreground">
              {trends.completedDays}/{trends.totalDays} days
            </p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{chartableFields.length}</p>
            <p className="text-xs text-muted-foreground">Tracked metrics</p>
          </div>
        </div>
      )}

      {/* Trend charts */}
      {trends && chartableFields.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Trends (Last 30 Days)</h4>
          {chartableFields.map((field, i) => {
            const data = trends.fieldTrends[field.id] || [];
            if (data.length < 2) return null;

            const opts = field.options as any;
            const min = opts?.min ?? 0;
            const max = opts?.max ?? Math.max(...data.map((d) => d.value), 10);

            return (
              <div key={field.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">{field.label}</span>
                  {data.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Latest:</span>
                      <Badge variant="outline" className="text-xs">
                        {data[data.length - 1].value}
                        {opts?.maxLabel ? ` / ${max}` : ""}
                      </Badge>
                    </div>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE8" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "#8A8A8A" }}
                      tickFormatter={(d) => {
                        const date = new Date(d + "T00:00:00");
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[min, max]}
                      tick={{ fontSize: 10, fill: "#8A8A8A" }}
                      width={30}
                    />
                    <Tooltip
                      labelFormatter={(d) => {
                        const date = new Date(d + "T00:00:00");
                        return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                      }}
                      formatter={(value: any) => [value, field.label]}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #F0EDE8" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3, fill: CHART_COLORS[i % CHART_COLORS.length] }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                {opts?.minLabel && opts?.maxLabel && (
                  <div className="flex justify-between mt-1 px-8 text-[10px] text-muted-foreground">
                    <span>{opts.minLabel}</span>
                    <span>{opts.maxLabel}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
    default:
      return <span>{String(value)}</span>;
  }
}
