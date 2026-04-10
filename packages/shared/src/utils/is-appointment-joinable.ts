/**
 * Shared join-window logic used by BOTH the clinician and participant sides.
 *
 * Contract (AC-7.1, AC-7.2):
 * - Only SCHEDULED appointments are joinable.
 * - The join window opens 15 minutes before `startTime` and closes at `endTime`.
 *
 * Rule enforcement via NFR-2.12 / COND-8: this is the ONE source of truth.
 * A drift-prevention test asserts both clinician and participant calendars
 * import from this module. Do NOT duplicate this logic in either app.
 */

export const JOIN_WINDOW_MINUTES_BEFORE_START = 15;

export interface JoinableAppointment {
  startTime: Date | string;
  endTime: Date | string;
  status: string;
}

/**
 * Returns true iff the appointment is joinable at the given reference time.
 *
 * @param appointment The appointment to check. Status must be one of the
 *   AppointmentStatus enum values; only SCHEDULED is ever joinable.
 * @param now The current time. Caller passes `new Date()` in production.
 *   Pass a fixed Date in tests for determinism.
 */
export function isAppointmentJoinable(
  appointment: JoinableAppointment,
  now: Date = new Date()
): boolean {
  if (appointment.status !== "SCHEDULED") {
    return false;
  }

  const start =
    appointment.startTime instanceof Date
      ? appointment.startTime
      : new Date(appointment.startTime);
  const end =
    appointment.endTime instanceof Date
      ? appointment.endTime
      : new Date(appointment.endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return false;
  }

  const joinOpensAt = new Date(
    start.getTime() - JOIN_WINDOW_MINUTES_BEFORE_START * 60 * 1000
  );

  return now >= joinOpensAt && now <= end;
}
