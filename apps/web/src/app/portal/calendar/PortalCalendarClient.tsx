"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ParticipantAppointmentView } from "@steady/shared";
import { fetchAppointmentsAction } from "../_actions/fetch-appointments";
import { updateTimezoneAction } from "../_actions/update-timezone";

// FR-6 — Calendar UI (client-side interactivity)
// Implements:
// - AC-6.5: visual treatment per status
// - AC-6.6: empty state
// - AC-6.7/8: timezone detection + persistence
// - AC-7.1/2: Join button via shared isAppointmentJoinable
// - AC-7.5: 60s polling for cancellation detection
// - AC-8.2/3: idle timer with 30-min timeout (paused by Telehealth view)

const POLL_INTERVAL_MS = 60 * 1000;
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const IDLE_WARNING_MS = 28 * 60 * 1000;

interface Props {
  initialAppointments: ParticipantAppointmentView[];
  initialError?: string;
}

export default function PortalCalendarClient({
  initialAppointments,
  initialError,
}: Props) {
  const router = useRouter();
  const [appointments, setAppointments] =
    useState<ParticipantAppointmentView[]>(initialAppointments);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [showIdleWarning, setShowIdleWarning] = useState(false);

  // Timezone detection on first load
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      // Fire-and-forget — server stores it; we don't await
      updateTimezoneAction(tz).catch(() => {});
    }
  }, []);

  // Polling (AC-7.5)
  const refresh = useCallback(async () => {
    const now = new Date();
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const to = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const result = await fetchAppointmentsAction({ from, to });
    if (result.ok && result.data) {
      setAppointments(result.data);
      setError(null);
    } else if (result.error) {
      setError(result.error);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  // Idle timer (AC-8.2, AC-8.3)
  useEffect(() => {
    let lastActivity = Date.now();
    let warningTimer: ReturnType<typeof setTimeout>;
    let logoutTimer: ReturnType<typeof setTimeout>;

    const resetTimers = () => {
      lastActivity = Date.now();
      setShowIdleWarning(false);
      clearTimeout(warningTimer);
      clearTimeout(logoutTimer);
      warningTimer = setTimeout(
        () => setShowIdleWarning(true),
        IDLE_WARNING_MS
      );
      logoutTimer = setTimeout(() => {
        router.push("/portal/login?idle=1");
      }, IDLE_TIMEOUT_MS);
    };

    const events = ["mousedown", "mousemove", "keydown", "touchstart", "scroll"];
    events.forEach((e) => document.addEventListener(e, resetTimers, { passive: true }));
    resetTimers();

    return () => {
      events.forEach((e) => document.removeEventListener(e, resetTimers));
      clearTimeout(warningTimer);
      clearTimeout(logoutTimer);
    };
  }, [router]);

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
          <p className="font-semibold">Couldn&apos;t load your schedule.</p>
          <button
            onClick={refresh}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-semibold text-stone-800 mb-6">
          Your schedule
        </h1>
        <div
          className="bg-white p-12 rounded-2xl border border-stone-200 text-center"
          data-testid="calendar-empty-state"
          role="status"
        >
          <p className="text-lg font-medium text-stone-800 mb-2">
            No appointments scheduled
          </p>
          <p className="text-stone-600">
            Your clinician will let you know when your next session is booked.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {showIdleWarning && (
        <div
          className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm"
          role="status"
          aria-live="polite"
        >
          You&apos;ll be signed out in 2 minutes. Move your mouse to stay signed in.
        </div>
      )}
      <h1 className="text-2xl font-semibold text-stone-800 mb-6">
        Your schedule
      </h1>
      <div className="space-y-3">
        {appointments.map((apt) => (
          <AppointmentCard key={apt.id} appointment={apt} />
        ))}
      </div>
    </div>
  );
}

function AppointmentCard({ appointment }: { appointment: ParticipantAppointmentView }) {
  const start = new Date(appointment.startTime);
  const end = new Date(appointment.endTime);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const formatter = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  });
  const durationMin = Math.round(
    (end.getTime() - start.getTime()) / 60000
  );

  const isCanceled = ["CLIENT_CANCELED", "CLINICIAN_CANCELED", "LATE_CANCELED"].includes(
    appointment.status
  );
  const isPast = appointment.status === "ATTENDED";

  const statusLabel: Record<string, string> = {
    SCHEDULED: "",
    ATTENDED: "Attended",
    CLIENT_CANCELED: "You canceled",
    CLINICIAN_CANCELED: "Clinician canceled",
    LATE_CANCELED: "Late cancel",
  };

  const cardClass = isCanceled
    ? "bg-red-50/40 border-red-200/60"
    : isPast
      ? "bg-stone-100 border-stone-200"
      : "bg-white border-stone-200";

  const clinicianName = `Dr. ${
    appointment.clinician.firstName ?? ""
  } ${appointment.clinician.lastName ?? ""}`.trim();

  return (
    <div
      className={`p-5 rounded-2xl border ${cardClass}`}
      role="article"
      aria-label={`${appointment.appointmentType ?? "Session"} with ${clinicianName} on ${formatter.format(start)}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h2 className={`font-semibold ${isCanceled ? "line-through text-stone-500" : "text-stone-800"}`}>
            {clinicianName}
          </h2>
          <p className="text-sm text-stone-600">
            {appointment.appointmentType ?? "Session"} · {durationMin} min
          </p>
        </div>
        {statusLabel[appointment.status] && (
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-stone-200 text-stone-700">
            {statusLabel[appointment.status]}
          </span>
        )}
      </div>
      <p className={`text-sm ${isCanceled ? "line-through text-stone-500" : "text-stone-700"}`}>
        {formatter.format(start)}
      </p>
      {appointment.cancelReason && (
        <p className="text-xs text-stone-500 mt-1 italic">
          {appointment.cancelReason}
        </p>
      )}
      {appointment.status === "SCHEDULED" && (
        <div className="mt-3">
          <a
            href={`/portal/telehealth/${appointment.id}`}
            aria-disabled={!appointment.isJoinable}
            aria-describedby={!appointment.isJoinable ? `join-hint-${appointment.id}` : undefined}
            className={`inline-block px-5 py-2 rounded-lg font-semibold ${
              appointment.isJoinable
                ? "bg-teal-700 text-white hover:bg-teal-800"
                : "bg-stone-200 text-stone-500 pointer-events-none"
            }`}
            onClick={(e) => {
              if (!appointment.isJoinable) e.preventDefault();
            }}
          >
            Join session
          </a>
          {!appointment.isJoinable && (
            <p
              id={`join-hint-${appointment.id}`}
              className="text-xs text-stone-500 mt-1"
            >
              {start > new Date()
                ? "You can join 15 minutes before your session starts"
                : "This session has ended"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
