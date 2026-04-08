"use client";

import React from "react";
import type { AppointmentView } from "@/lib/appointment-types";
import { AppointmentCard } from "./AppointmentCard";
import { formatInClinicianTz } from "@/lib/tz";
import { addDays, startOfWeek } from "date-fns";

interface Props {
  anchor: Date;
  appointments: AppointmentView[];
  timezone: string;
  onSlotClick: (slotStart: Date) => void;
  onCardClick: (a: AppointmentView) => void;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6am–10pm

export function CalendarWeekView({ anchor, appointments, timezone, onSlotClick, onCardClick }: Props) {
  const weekStart = startOfWeek(anchor, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div
      role="grid"
      aria-colcount={8}
      aria-rowcount={HOURS.length + 1}
      aria-label="Week view"
    >
      <div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))] border rounded-md overflow-hidden bg-white text-xs">
        <div className="border-b border-r p-1" />
        {days.map((d) => (
          <div key={d.toISOString()} className="border-b border-r last:border-r-0 p-1 text-center font-semibold">
            {formatInClinicianTz(d, timezone, "EEE d")}
          </div>
        ))}
        {HOURS.map((h) => (
          <React.Fragment key={`h-${h}`}>
            <div className="border-b last:border-b-0 border-r p-1 text-muted-foreground text-right pr-2">
              {h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`}
            </div>
            {days.map((d) => {
              const dayStr = formatInClinicianTz(d, timezone, "yyyy-MM-dd");
              const slot = appointments.filter((a) => {
                const aDay = formatInClinicianTz(a.startAt, timezone, "yyyy-MM-dd");
                const aHour = parseInt(formatInClinicianTz(a.startAt, timezone, "H"), 10);
                return aDay === dayStr && aHour === h;
              });
              return (
                <div
                  key={`${h}-${d.toISOString()}`}
                  role="gridcell"
                  tabIndex={0}
                  className="min-h-14 border-b last:border-b-0 border-r last:border-r-0 p-0.5 text-left hover:bg-accent/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary cursor-pointer"
                  onClick={() => {
                    const slotDate = new Date(d);
                    slotDate.setHours(h, 0, 0, 0);
                    onSlotClick(slotDate);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      const slotDate = new Date(d);
                      slotDate.setHours(h, 0, 0, 0);
                      onSlotClick(slotDate);
                    }
                  }}
                  aria-label={`Empty slot ${formatInClinicianTz(d, timezone, "EEE")} ${h}:00`}
                >
                  <div className="space-y-0.5">
                    {slot.map((a) => (
                      <div key={a.id} onClick={(e) => { e.stopPropagation(); onCardClick(a); }}>
                        <AppointmentCard appointment={a} timezone={timezone} onClick={() => onCardClick(a)} compact />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
