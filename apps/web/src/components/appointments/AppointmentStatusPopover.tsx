"use client";

import { useState } from "react";
import type { AppointmentStatus, AppointmentView } from "@/lib/appointment-types";
import { STATUS_THEME } from "./status-colors";
import { appointmentStrings as S } from "@/lib/strings/appointments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChangeAppointmentStatus } from "@/hooks/use-appointments";

interface Props {
  appointment: AppointmentView;
  onClose: () => void;
}

const ALL_STATUSES: AppointmentStatus[] = [
  "SCHEDULED",
  "ATTENDED",
  "NO_SHOW",
  "LATE_CANCELED",
  "CLIENT_CANCELED",
  "CLINICIAN_CANCELED",
];

const CANCEL_STATUSES = new Set<AppointmentStatus>(["LATE_CANCELED", "CLIENT_CANCELED", "CLINICIAN_CANCELED"]);

export function AppointmentStatusPopover({ appointment, onClose }: Props) {
  const change = useChangeAppointmentStatus(appointment.id);
  const [selected, setSelected] = useState<AppointmentStatus | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function apply(status: AppointmentStatus, cancelReason?: string) {
    setError(null);
    try {
      await change.mutateAsync({ status, cancelReason });
      onClose();
    } catch (e) {
      setError((e as Error).message || S.errorGeneric);
    }
  }

  if (selected && CANCEL_STATUSES.has(selected)) {
    return (
      <div role="dialog" aria-modal="true" aria-label={STATUS_THEME[selected].label} className="rounded-md border bg-white p-3 shadow w-64">
        <div className="text-sm font-medium mb-2">{STATUS_THEME[selected].label}</div>
        <label className="text-xs text-muted-foreground">{S.statusReasonLabel}</label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          placeholder={S.statusReasonPlaceholder}
          className="mt-1"
        />
        <div className="text-right text-xs text-muted-foreground">{reason.length} / 500</div>
        {error && <div role="alert" className="text-xs text-red-600 mt-1">{error}</div>}
        <div className="flex justify-end gap-2 mt-2">
          <Button type="button" variant="outline" size="sm" onClick={() => { setSelected(null); setReason(""); }}>
            {S.statusBackBtn}
          </Button>
          <Button type="button" size="sm" disabled={change.isPending} onClick={() => apply(selected, reason || undefined)}>
            {S.statusConfirmBtn}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={S.statusChangeTitle} className="rounded-md border bg-white shadow w-64">
      <div className="px-3 py-2 text-xs font-semibold border-b">{S.statusChangeTitle}</div>
      <ul>
        {ALL_STATUSES.map((s) => {
          const theme = STATUS_THEME[s];
          const current = s === appointment.status;
          return (
            <li key={s}>
              <button
                type="button"
                disabled={change.isPending}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
                onClick={() => {
                  if (CANCEL_STATUSES.has(s)) {
                    setSelected(s);
                  } else {
                    apply(s);
                  }
                }}
              >
                <span className={`inline-block h-2 w-2 rounded-full ${theme.dot}`} aria-hidden="true" />
                <span className="flex-1">{theme.label}</span>
                {current && <span className="text-xs text-muted-foreground">✓ now</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {error && <div role="alert" className="text-xs text-red-600 p-2">{error}</div>}
    </div>
  );
}
