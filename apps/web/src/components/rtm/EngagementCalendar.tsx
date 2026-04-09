"use client";

import { cn } from "@/lib/utils";

interface EngagementCalendarProps {
  periodStart: string;
  periodEnd: string;
  calendar: Record<string, boolean>;
  engagementDays: number;
}

export function EngagementCalendar({
  periodStart,
  periodEnd,
  calendar,
  engagementDays,
}: EngagementCalendarProps) {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: { key: string; engaged: boolean; isToday: boolean; isFuture: boolean }[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = cursor.toISOString().split("T")[0];
    const cursorMidnight = new Date(cursor);
    cursorMidnight.setHours(0, 0, 0, 0);
    days.push({
      key,
      engaged: calendar[key] === true,
      isToday: cursorMidnight.getTime() === today.getTime(),
      isFuture: cursorMidnight > today,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  const thresholdMet = engagementDays >= 16;

  return (
    <div>
      {/* GitHub-style heatmap -- single horizontal row */}
      <div className="flex items-center gap-[3px]">
        {days.map((day) => (
          <div
            key={day.key}
            className={cn(
              "w-3 h-3 rounded-sm transition-colors",
              day.isFuture
                ? "bg-gray-100"
                : day.engaged
                  ? "bg-green-500"
                  : "bg-gray-200",
              day.isToday && "ring-1 ring-primary ring-offset-1"
            )}
            title={`${day.key}${day.engaged ? " — engaged" : ""}`}
          />
        ))}
      </div>

      {/* Legend + stats */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-gray-200" />
            No activity
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
            Engaged
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {engagementDays}/30 days | threshold{" "}
          {thresholdMet ? (
            <span className="text-green-600 font-medium">met</span>
          ) : (
            <span className="text-amber-600 font-medium">
              {16 - engagementDays} more needed
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
