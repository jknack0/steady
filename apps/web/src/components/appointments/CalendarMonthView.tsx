"use client";

import type { AppointmentView } from "@/lib/appointment-types";
import { formatInClinicianTz } from "@/lib/tz";
import { addDays, startOfWeek, startOfMonth, endOfMonth, isSameMonth } from "date-fns";

interface Props {
  anchor: Date;
  appointments: AppointmentView[];
  timezone: string;
  onDayClick: (date: Date) => void;
}

export function CalendarMonthView({ anchor, appointments, timezone, onDayClick }: Props) {
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  // Render 6 weeks = 42 cells
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const countByDay = new Map<string, number>();
  for (const a of appointments) {
    const key = formatInClinicianTz(a.startAt, timezone, "yyyy-MM-dd");
    countByDay.set(key, (countByDay.get(key) || 0) + 1);
  }

  return (
    <div role="grid" aria-colcount={7} aria-rowcount={7} aria-label="Month view">
      <div className="grid grid-cols-7 border rounded-md overflow-hidden bg-white text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="border-b border-r last:border-r-0 p-1 text-center font-semibold">
            {d}
          </div>
        ))}
        {cells.map((d) => {
          const key = formatInClinicianTz(d, timezone, "yyyy-MM-dd");
          const count = countByDay.get(key) || 0;
          const inMonth = isSameMonth(d, anchor);
          return (
            <button
              key={d.toISOString()}
              type="button"
              role="gridcell"
              onClick={() => onDayClick(d)}
              className={`min-h-16 border-b border-r last:border-r-0 p-1 text-left hover:bg-accent/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${inMonth ? "" : "opacity-40"}`}
              aria-label={formatInClinicianTz(d, timezone, "MMMM d, yyyy") + (count > 0 ? `, ${count} appointments` : "")}
            >
              <div className="text-right font-medium">{formatInClinicianTz(d, timezone, "d")}</div>
              {count > 0 && (
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
                    <span key={i} className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
                  ))}
                  {count > 4 && <span className="text-[10px] text-muted-foreground">+{count - 4}</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
