"use client";

import type { AppointmentView } from "@/lib/appointment-types";
import { AppointmentCard } from "./AppointmentCard";
import { formatInClinicianTz } from "@/lib/tz";

interface Props {
  anchor: Date;
  appointments: AppointmentView[];
  timezone: string;
  onSlotClick: (slotStart: Date) => void;
  onCardClick: (a: AppointmentView) => void;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6am–10pm

export function CalendarDayView({ anchor, appointments, timezone, onSlotClick, onCardClick }: Props) {
  const dayLabel = formatInClinicianTz(anchor, timezone, "EEEE, MMMM d, yyyy");

  return (
    <div role="grid" aria-colcount={1} aria-rowcount={HOURS.length} aria-label={`Day view ${dayLabel}`}>
      <div className="text-sm font-semibold mb-2">{dayLabel}</div>
      <div className="border rounded-md overflow-hidden bg-white">
        {HOURS.map((h, rowIdx) => {
          const slotAppointments = appointments.filter((a) => {
            const hour = parseInt(formatInClinicianTz(a.startAt, timezone, "H"), 10);
            return hour === h;
          });
          return (
            <div
              key={h}
              role="row"
              className="flex border-b last:border-b-0 min-h-16"
              aria-rowindex={rowIdx + 1}
            >
              <div className="w-16 shrink-0 px-2 py-1 text-xs text-muted-foreground border-r">
                {h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`}
              </div>
              <button
                type="button"
                role="gridcell"
                className="flex-1 text-left p-1 hover:bg-accent/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => {
                  const slot = new Date(anchor);
                  slot.setHours(h, 0, 0, 0);
                  onSlotClick(slot);
                }}
                aria-label={`Empty slot ${h}:00`}
              >
                <div className="space-y-1">
                  {slotAppointments.map((a) => (
                    <div key={a.id} onClick={(e) => { e.stopPropagation(); onCardClick(a); }}>
                      <AppointmentCard appointment={a} timezone={timezone} onClick={() => onCardClick(a)} />
                    </div>
                  ))}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
