"use client";

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
import { Flame, CalendarCheck, TrendingUp } from "lucide-react";

// ── Chart colors ─────────────────────────────────────

export const CHART_COLORS = ["#5B8A8A", "#E8783A", "#8FAE8B", "#D4A0A0", "#89B4C8", "#C4A86B"];

// ── Types ────────────────────────────────────────────

export interface TrackerChartsProps {
  fields: Array<{ id: string; label: string; fieldType: string; options: Record<string, unknown> | null }>;
  fieldTrends: Record<string, Array<{ date: string; value: number }>>;
  completionRate: number;
  completedDays: number;
  totalDays: number;
  streak: number;
  compact?: boolean;
}

// ── Component ────────────────────────────────────────

export function TrackerCharts({
  fields,
  fieldTrends,
  completionRate,
  completedDays,
  totalDays,
  streak,
  compact = false,
}: TrackerChartsProps): React.ReactElement {
  const chartableFields = fields.filter((f) => f.fieldType === "SCALE" || f.fieldType === "NUMBER");

  const chartHeight = compact ? 100 : 160;

  return (
    <div className={compact ? "space-y-3" : "space-y-6"}>
      {/* Summary stats */}
      {compact ? (
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            <span className="font-semibold">{streak}</span>
            <span className="text-muted-foreground">streak</span>
          </div>
          <div className="flex items-center gap-1">
            <CalendarCheck className="h-3.5 w-3.5 text-teal" />
            <span className="font-semibold">{Math.round(completionRate * 100)}%</span>
            <span className="text-muted-foreground">
              ({completedDays}/{totalDays})
            </span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
            <span className="font-semibold">{chartableFields.length}</span>
            <span className="text-muted-foreground">metrics</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border p-4 text-center">
            <Flame className="h-5 w-5 mx-auto mb-1 text-orange-500" />
            <p className="text-2xl font-bold">{streak}</p>
            <p className="text-xs text-muted-foreground">Day streak</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <CalendarCheck className="h-5 w-5 mx-auto mb-1 text-teal" />
            <p className="text-2xl font-bold">{Math.round(completionRate * 100)}%</p>
            <p className="text-xs text-muted-foreground">
              {completedDays}/{totalDays} days
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
      {chartableFields.length > 0 && (
        <div className={compact ? "space-y-2" : "space-y-4"}>
          {!compact && <h4 className="text-sm font-semibold">Trends (Last 30 Days)</h4>}
          {chartableFields.map((field, i) => {
            const data = fieldTrends[field.id] || [];
            if (data.length < 2) return null;

            const opts = field.options as Record<string, unknown> | null;
            const min = (opts?.min as number) ?? 0;
            const max = (opts?.max as number) ?? Math.max(...data.map((d) => d.value), 10);

            return (
              <div key={field.id} className={compact ? "rounded-lg border p-2" : "rounded-lg border p-4"}>
                <div className={`flex items-center justify-between ${compact ? "mb-1" : "mb-3"}`}>
                  <span className={compact ? "text-xs font-medium" : "text-sm font-medium"}>{field.label}</span>
                  {!compact && data.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Latest:</span>
                      <Badge variant="outline" className="text-xs">
                        {data[data.length - 1].value}
                        {(opts?.maxLabel as string) ? ` / ${max}` : ""}
                      </Badge>
                    </div>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE8" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: compact ? 8 : 10, fill: "#8A8A8A" }}
                      tickFormatter={(d) => {
                        const date = new Date(d + "T00:00:00");
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                      interval="preserveStartEnd"
                    />
                    {!compact && (
                      <YAxis
                        domain={[min, max]}
                        tick={{ fontSize: 10, fill: "#8A8A8A" }}
                        width={30}
                      />
                    )}
                    <Tooltip
                      labelFormatter={(d) => {
                        const date = new Date(d + "T00:00:00");
                        return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                      }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any) => [value, field.label]}
                      contentStyle={{ fontSize: compact ? 10 : 12, borderRadius: 8, border: "1px solid #F0EDE8" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: compact ? 2 : 3, fill: CHART_COLORS[i % CHART_COLORS.length] }}
                      activeDot={{ r: compact ? 3 : 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                {!compact && (opts?.minLabel as string) && (opts?.maxLabel as string) && (
                  <div className="flex justify-between mt-1 px-8 text-[10px] text-muted-foreground">
                    <span>{opts?.minLabel as string}</span>
                    <span>{opts?.maxLabel as string}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
