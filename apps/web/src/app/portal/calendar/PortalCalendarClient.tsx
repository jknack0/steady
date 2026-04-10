"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ParticipantAppointmentView } from "@steady/shared";
import { fetchAppointmentsAction } from "../_actions/fetch-appointments";
import { updateTimezoneAction } from "../_actions/update-timezone";
import { ChevronLeft, ChevronRight } from "lucide-react";

// FR-6 — Calendar UI (client-side interactivity)
// Implements:
// - AC-6.5: visual treatment per status
// - AC-6.6: empty state
// - AC-6.7/8: timezone detection + persistence
// - AC-7.1/2: Join button via shared isAppointmentJoinable
// - AC-7.5: 60s polling for cancellation detection
// - AC-8.2/3: idle timer with 30-min timeout

const POLL_INTERVAL_MS = 60 * 1000;
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const IDLE_WARNING_MS = 28 * 60 * 1000;

// Navigation limits — 30 days back, 90 days forward (spec)
const MAX_BACK_DAYS = 30;
const MAX_FORWARD_DAYS = 90;

type ViewMode = "day" | "week" | "month";

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
  const [view, setView] = useState<ViewMode>("week");
  const [anchorDate, setAnchorDate] = useState<Date>(() => startOfDay(new Date()));

  // Timezone detection on first load
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      updateTimezoneAction(tz).catch(() => {});
    }
  }, []);

  // Polling (AC-7.5)
  const refresh = useCallback(async () => {
    const now = new Date();
    const from = new Date(
      now.getTime() - MAX_BACK_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    const to = new Date(
      now.getTime() + MAX_FORWARD_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
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
    let warningTimer: ReturnType<typeof setTimeout>;
    let logoutTimer: ReturnType<typeof setTimeout>;

    const resetTimers = () => {
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
    events.forEach((e) =>
      document.addEventListener(e, resetTimers, { passive: true })
    );
    resetTimers();

    return () => {
      events.forEach((e) => document.removeEventListener(e, resetTimers));
      clearTimeout(warningTimer);
      clearTimeout(logoutTimer);
    };
  }, [router]);

  // Compute the visible date window
  const { windowStart, windowEnd, windowLabel } = useMemo(() => {
    if (view === "day") {
      return {
        windowStart: startOfDay(anchorDate),
        windowEnd: endOfDay(anchorDate),
        windowLabel: formatFull(anchorDate),
      };
    }
    if (view === "week") {
      const start = startOfWeek(anchorDate);
      const end = endOfDay(addDays(start, 6));
      return {
        windowStart: start,
        windowEnd: end,
        windowLabel: `${formatMonthDay(start)} – ${formatMonthDay(end)}, ${end.getFullYear()}`,
      };
    }
    const start = startOfMonth(anchorDate);
    const end = endOfMonth(anchorDate);
    return {
      windowStart: start,
      windowEnd: end,
      windowLabel: `${MONTH_LONG[start.getMonth()]} ${start.getFullYear()}`,
    };
  }, [view, anchorDate]);

  const appointmentsInWindow = useMemo(() => {
    return appointments.filter((apt) => {
      const t = new Date(apt.startTime).getTime();
      return t >= windowStart.getTime() && t <= windowEnd.getTime();
    });
  }, [appointments, windowStart, windowEnd]);

  const today = startOfDay(new Date());
  const canGoBack = useMemo(() => {
    const maxBack = addDays(today, -MAX_BACK_DAYS);
    const previous = previousAnchor(anchorDate, view);
    return previous >= maxBack;
  }, [anchorDate, view, today]);

  const canGoForward = useMemo(() => {
    const maxForward = addDays(today, MAX_FORWARD_DAYS);
    const next = nextAnchor(anchorDate, view);
    return next <= maxForward;
  }, [anchorDate, view, today]);

  // Error branch
  if (error && appointments.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div
          className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800"
          role="alert"
        >
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

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-stone-800">Your schedule</h1>
        <div
          role="tablist"
          aria-label="Calendar view"
          className="inline-flex rounded-lg border border-stone-200 bg-white p-0.5"
        >
          {(["day", "week", "month"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              role="tab"
              aria-selected={view === mode}
              onClick={() => setView(mode)}
              className={`px-3 py-1.5 text-sm rounded-md capitalize ${
                view === mode
                  ? "bg-teal-700 text-white"
                  : "text-stone-600 hover:text-stone-800"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => canGoBack && setAnchorDate(previousAnchor(anchorDate, view))}
            disabled={!canGoBack}
            aria-label="Previous"
            className="p-2 rounded-lg hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setAnchorDate(startOfDay(new Date()))}
            className="px-3 py-1.5 text-sm rounded-lg border border-stone-200 hover:bg-stone-100"
          >
            Today
          </button>
          <button
            onClick={() => canGoForward && setAnchorDate(nextAnchor(anchorDate, view))}
            disabled={!canGoForward}
            aria-label="Next"
            className="p-2 rounded-lg hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm font-medium text-stone-700">{windowLabel}</p>
      </div>

      {appointmentsInWindow.length === 0 ? (
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
      ) : view === "month" ? (
        <MonthGrid
          anchor={anchorDate}
          appointments={appointmentsInWindow}
        />
      ) : view === "week" ? (
        <WeekGrid windowStart={windowStart} appointments={appointmentsInWindow} />
      ) : (
        <DayList appointments={appointmentsInWindow} />
      )}
    </div>
  );
}

// ── Views ───────────────────────────────────────────────────────────

function WeekGrid({
  windowStart,
  appointments,
}: {
  windowStart: Date;
  appointments: ParticipantAppointmentView[];
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(windowStart, i));

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-7 gap-2 bg-white rounded-2xl border border-stone-200 p-3"
      role="grid"
      aria-label="Week view"
    >
      {days.map((day) => {
        const daily = appointments.filter((apt) =>
          isSameDay(new Date(apt.startTime), day)
        );
        const today = isSameDay(day, new Date());
        return (
          <div
            key={day.toISOString()}
            role="gridcell"
            className={`rounded-lg p-2 min-h-[160px] border ${
              today
                ? "bg-teal-50/40 border-teal-200"
                : "bg-stone-50/50 border-stone-100"
            }`}
          >
            <div className="text-xs font-medium text-stone-700 mb-2">
              {WEEKDAY_SHORT[day.getDay()]} {day.getDate()}
            </div>
            <div className="space-y-2">
              {daily.length === 0 ? (
                <p className="text-[11px] text-stone-400">—</p>
              ) : (
                daily.map((apt) => (
                  <AppointmentCard key={apt.id} appointment={apt} compact />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthGrid({
  anchor,
  appointments,
}: {
  anchor: Date;
  appointments: ParticipantAppointmentView[];
}) {
  const gridStart = startOfWeek(startOfMonth(anchor));
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const currentMonth = anchor.getMonth();

  return (
    <div
      className="bg-white rounded-2xl border border-stone-200 p-3"
      role="grid"
      aria-label="Month view"
    >
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAY_SHORT.map((name) => (
          <div
            key={name}
            className="text-xs font-medium text-stone-500 text-center py-1"
          >
            {name}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const daily = appointments.filter((apt) =>
            isSameDay(new Date(apt.startTime), day)
          );
          const inMonth = day.getMonth() === currentMonth;
          const today = isSameDay(day, new Date());
          return (
            <div
              key={day.toISOString()}
              role="gridcell"
              className={`min-h-[96px] p-1.5 rounded-md border text-xs ${
                today
                  ? "bg-teal-50/40 border-teal-200"
                  : inMonth
                    ? "bg-white border-stone-100"
                    : "bg-stone-50 border-stone-100 text-stone-400"
              }`}
            >
              <div className="font-medium mb-1">{day.getDate()}</div>
              {daily.slice(0, 2).map((apt) => (
                <MonthCell key={apt.id} appointment={apt} />
              ))}
              {daily.length > 2 && (
                <p className="text-[10px] text-stone-500 mt-0.5">
                  +{daily.length - 2} more
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayList({
  appointments,
}: {
  appointments: ParticipantAppointmentView[];
}) {
  const sorted = [...appointments].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
  return (
    <div className="space-y-3">
      {sorted.map((apt) => (
        <AppointmentCard key={apt.id} appointment={apt} />
      ))}
    </div>
  );
}

// ── Appointment card variants ──────────────────────────────────────

function AppointmentCard({
  appointment,
  compact = false,
}: {
  appointment: ParticipantAppointmentView;
  compact?: boolean;
}) {
  const start = new Date(appointment.startTime);
  const end = new Date(appointment.endTime);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const clinicianTz = appointment.clinician.timezone ?? null;
  const showDualTime = clinicianTz && clinicianTz !== tz;

  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  });
  const longFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  });
  const clinicianTimeFormatter = clinicianTz
    ? new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
        timeZone: clinicianTz,
      })
    : null;
  const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);

  const isCanceled = [
    "CLIENT_CANCELED",
    "CLINICIAN_CANCELED",
    "LATE_CANCELED",
  ].includes(appointment.status);
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

  const clinicianName = `Dr. ${appointment.clinician.firstName ?? ""} ${
    appointment.clinician.lastName ?? ""
  }`.trim();

  const hintId = `join-hint-${appointment.id}`;

  if (compact) {
    return (
      <div
        className={`p-2 rounded-lg border text-xs ${cardClass}`}
        role="article"
      >
        <p
          className={`font-semibold truncate ${
            isCanceled ? "line-through text-stone-500" : "text-stone-800"
          }`}
        >
          {clinicianName}
        </p>
        <p
          className={`${
            isCanceled ? "line-through text-stone-500" : "text-stone-600"
          }`}
        >
          {timeFormatter.format(start)}
        </p>
        {appointment.status === "SCHEDULED" && (
          <a
            href={`/portal/telehealth/${appointment.id}`}
            aria-disabled={!appointment.isJoinable}
            aria-describedby={
              !appointment.isJoinable ? hintId : undefined
            }
            className={`mt-1 block text-center px-2 py-1 rounded font-semibold ${
              appointment.isJoinable
                ? "bg-teal-700 text-white hover:bg-teal-800"
                : "bg-stone-200 text-stone-500 pointer-events-none"
            }`}
            onClick={(e) => {
              if (!appointment.isJoinable) e.preventDefault();
            }}
          >
            Join
          </a>
        )}
        {!appointment.isJoinable && appointment.status === "SCHEDULED" && (
          <p id={hintId} className="sr-only">
            {start > new Date()
              ? "You can join 15 minutes before your session starts"
              : "This session has ended"}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`p-5 rounded-2xl border ${cardClass}`}
      role="article"
      aria-label={`${appointment.appointmentType ?? "Session"} with ${clinicianName} on ${longFormatter.format(start)}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h2
            className={`font-semibold ${
              isCanceled ? "line-through text-stone-500" : "text-stone-800"
            }`}
          >
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
      <p
        className={`text-sm ${
          isCanceled ? "line-through text-stone-500" : "text-stone-700"
        }`}
      >
        {longFormatter.format(start)}
      </p>
      {showDualTime && clinicianTimeFormatter && (
        <p className="text-xs text-stone-500 mt-1">
          {timeFormatter.format(start)} your time ·{" "}
          {clinicianTimeFormatter.format(start)} clinician&apos;s time
        </p>
      )}
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
            aria-describedby={
              !appointment.isJoinable ? hintId : undefined
            }
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
            <p id={hintId} className="text-xs text-stone-500 mt-1">
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

function MonthCell({
  appointment,
}: {
  appointment: ParticipantAppointmentView;
}) {
  const start = new Date(appointment.startTime);
  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const isCanceled = [
    "CLIENT_CANCELED",
    "CLINICIAN_CANCELED",
    "LATE_CANCELED",
  ].includes(appointment.status);
  const baseClass = isCanceled
    ? "bg-red-50 text-red-700 line-through"
    : appointment.isJoinable
      ? "bg-teal-700 text-white"
      : "bg-teal-50 text-teal-900";

  return (
    <a
      href={
        appointment.status === "SCHEDULED" && appointment.isJoinable
          ? `/portal/telehealth/${appointment.id}`
          : "#"
      }
      className={`block truncate rounded px-1 py-0.5 text-[10px] font-medium mb-0.5 ${baseClass} ${
        appointment.status === "SCHEDULED" && appointment.isJoinable
          ? "hover:opacity-90"
          : "pointer-events-none"
      }`}
    >
      {formatter.format(start)}
    </a>
  );
}

// ── Date helpers (local, intentionally tiny — no date-fns dep added) ─

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}
function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}
function startOfWeek(d: Date): Date {
  const copy = startOfDay(d);
  const day = copy.getDay();
  return addDays(copy, -day);
}
function startOfMonth(d: Date): Date {
  const copy = startOfDay(d);
  copy.setDate(1);
  return copy;
}
function endOfMonth(d: Date): Date {
  const copy = startOfDay(d);
  copy.setMonth(copy.getMonth() + 1);
  copy.setDate(0);
  copy.setHours(23, 59, 59, 999);
  return copy;
}
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function formatMonthDay(d: Date): string {
  return `${MONTH_LONG[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}
function formatFull(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
function previousAnchor(anchor: Date, view: ViewMode): Date {
  if (view === "day") return addDays(anchor, -1);
  if (view === "week") return addDays(anchor, -7);
  const d = new Date(anchor);
  d.setMonth(d.getMonth() - 1);
  return startOfDay(d);
}
function nextAnchor(anchor: Date, view: ViewMode): Date {
  if (view === "day") return addDays(anchor, 1);
  if (view === "week") return addDays(anchor, 7);
  const d = new Date(anchor);
  d.setMonth(d.getMonth() + 1);
  return startOfDay(d);
}
