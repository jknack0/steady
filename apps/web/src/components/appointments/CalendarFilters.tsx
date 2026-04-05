"use client";

import { useState } from "react";
import type { LocationRef, AppointmentStatus } from "@/lib/appointment-types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { appointmentStrings as S } from "@/lib/strings/appointments";
import { STATUS_THEME } from "./status-colors";

interface Props {
  locations: LocationRef[];
  selectedLocationIds: string[];
  selectedStatuses: AppointmentStatus[];
  onChange: (args: { locationIds: string[]; statuses: AppointmentStatus[] }) => void;
}

const ALL_STATUSES: AppointmentStatus[] = [
  "SCHEDULED",
  "ATTENDED",
  "NO_SHOW",
  "LATE_CANCELED",
  "CLIENT_CANCELED",
  "CLINICIAN_CANCELED",
];

export function CalendarFilters({ locations, selectedLocationIds, selectedStatuses, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [locs, setLocs] = useState<string[]>(selectedLocationIds);
  const [sts, setSts] = useState<AppointmentStatus[]>(selectedStatuses);

  const activeCount = selectedLocationIds.length + selectedStatuses.length;

  return (
    <div className="relative">
      <Button type="button" variant="outline" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {S.filtersButton}
        {activeCount > 0 && (
          <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
            {activeCount}
          </span>
        )}
      </Button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-64 rounded-md border bg-white shadow-lg p-3">
          <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{S.filtersLocation}</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {locations.map((l) => (
              <label key={l.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={locs.includes(l.id)}
                  onCheckedChange={(v) =>
                    setLocs((prev) => (v ? [...prev, l.id] : prev.filter((x) => x !== l.id)))
                  }
                />
                {l.name}
              </label>
            ))}
          </div>
          <div className="mt-2 mb-2 text-xs font-semibold uppercase text-muted-foreground">{S.filtersStatus}</div>
          <div className="space-y-1">
            {ALL_STATUSES.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={sts.includes(s)}
                  onCheckedChange={(v) =>
                    setSts((prev) => (v ? [...prev, s] : prev.filter((x) => x !== s)))
                  }
                />
                <span className={`inline-block h-2 w-2 rounded-full ${STATUS_THEME[s].dot}`} />
                {STATUS_THEME[s].label}
              </label>
            ))}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setLocs([]);
                setSts([]);
                onChange({ locationIds: [], statuses: [] });
                setOpen(false);
              }}
            >
              {S.filtersClear}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onChange({ locationIds: locs, statuses: sts });
                setOpen(false);
              }}
            >
              {S.filtersApply}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
