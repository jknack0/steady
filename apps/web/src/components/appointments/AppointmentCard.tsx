"use client";

import { cn } from "@/lib/utils";
import type { AppointmentView } from "@/lib/appointment-types";
import { STATUS_THEME } from "./status-colors";
import { formatInClinicianTz } from "@/lib/tz";

interface Props {
  appointment: AppointmentView;
  timezone: string;
  onClick?: () => void;
  hasConflict?: boolean;
  compact?: boolean;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

export function AppointmentCard({ appointment, timezone, onClick, hasConflict, compact }: Props) {
  const theme = STATUS_THEME[appointment.status];
  const start = formatInClinicianTz(appointment.startAt, timezone, "h:mm a");
  const end = formatInClinicianTz(appointment.endAt, timezone, "h:mm a");
  const client = appointment.participant
    ? `${appointment.participant.firstName ?? ""} ${appointment.participant.lastName ?? ""}`.trim() || "(no name)"
    : "(no client)";
  const codeLabel = appointment.serviceCode?.code ?? "";
  const locationLabel = appointment.location?.name ?? "";
  const notePreview = appointment.internalNote ? truncate(appointment.internalNote, 80) : "";
  const ariaLabel = `${theme.label}, ${client}, ${start}–${end}, ${codeLabel}, ${locationLabel}`;

  return (
    <button
      type="button"
      role="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "w-full text-left border-l-4 rounded-sm px-2 py-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary",
        "motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-sm",
        theme.border,
        theme.bg,
        theme.text,
        hasConflict && "border-t-2 border-t-yellow-500",
        compact ? "text-xs" : "text-sm",
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={cn("inline-block h-2 w-2 rounded-full", theme.dot)} aria-hidden="true" />
        <span className="font-medium">
          {theme.icon && <span className="mr-0.5">{theme.icon}</span>}
          {start}–{end}
        </span>
        {appointment.recurringSeriesId && (
          <span className="text-current opacity-60" title="Part of a recurring series" aria-label="recurring">
            ↻
          </span>
        )}
        {hasConflict && (
          <span className="text-yellow-700" title="Overlaps another appointment" aria-label="conflict">
            ⚠
          </span>
        )}
      </div>
      <div className="truncate font-semibold">{client}</div>
      {!compact && (
        <div className="truncate text-xs opacity-80">
          {codeLabel} · {locationLabel}
        </div>
      )}
      {!compact && notePreview && (
        <div className="truncate text-xs italic opacity-70">&ldquo;{notePreview}&rdquo;</div>
      )}
    </button>
  );
}
