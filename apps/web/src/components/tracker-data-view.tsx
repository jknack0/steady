"use client";

import { useTrackerTrends } from "@/hooks/use-daily-trackers";
import { Loader2, Flame, TrendingUp } from "lucide-react";

export function TrackerDataView({
  trackerId,
  userId,
  trackerName,
}: {
  trackerId: string;
  userId: string;
  trackerName: string;
}) {
  const { data: trends, isLoading } = useTrackerTrends(trackerId, userId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!trends) return null;

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          <span className="text-sm font-medium">{trackerName}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            {Math.round(trends.completionRate * 100)}% completion
            ({trends.completedDays}/{trends.totalDays} days)
          </span>
          {trends.streak > 0 && (
            <span className="flex items-center gap-1 text-orange-600">
              <Flame className="h-3 w-3" />
              {trends.streak}-day streak
            </span>
          )}
        </div>
      </div>

      {/* Simple sparkline-like display for chartable fields */}
      {trends.fields
        .filter((f) => f.fieldType === "SCALE" || f.fieldType === "NUMBER")
        .map((field) => {
          const points = trends.fieldTrends[field.id] || [];
          if (points.length === 0) return null;

          const values = points.map((p) => p.value);
          const min = Math.min(...values);
          const max = Math.max(...values);
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          const latest = values[values.length - 1];
          const opts = field.options as { min?: number; max?: number } | null;

          return (
            <div key={field.id} className="flex items-center gap-3 text-xs">
              <span className="w-28 text-muted-foreground truncate">
                {field.label}
              </span>
              <div className="flex-1 flex items-center gap-1 h-4">
                {/* Mini bar chart */}
                {points.slice(-14).map((p, i) => {
                  const range = (opts?.max ?? max) - (opts?.min ?? min) || 1;
                  const height = ((p.value - (opts?.min ?? min)) / range) * 100;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-primary/20 rounded-sm relative"
                      style={{ height: "100%" }}
                    >
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-primary/60 rounded-sm"
                        style={{ height: `${Math.max(5, height)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <span className="w-16 text-right tabular-nums">
                avg {avg.toFixed(1)}
              </span>
              <span className="w-12 text-right tabular-nums font-medium">
                now {latest}
              </span>
            </div>
          );
        })}
    </div>
  );
}
