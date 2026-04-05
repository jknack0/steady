import { format as fnsFormat, addDays, startOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";

export const DEFAULT_TZ = "America/New_York";

export function resolveTz(tz?: string | null): string {
  if (tz && tz.length > 0) return tz;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TZ;
  } catch {
    return DEFAULT_TZ;
  }
}

export function formatInClinicianTz(utcIso: string | Date, tz: string, fmt: string): string {
  const date = typeof utcIso === "string" ? new Date(utcIso) : utcIso;
  return formatInTimeZone(date, resolveTz(tz), fmt);
}

function utcIsoForZonedWallClock(year: number, month: number, day: number, tz: string): string {
  // Construct a Date representing midnight wall-clock in tz, converted to UTC.
  const zoned = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const asUtc = fromZonedTime(zoned, tz);
  return asUtc.toISOString();
}

export interface Range {
  startIso: string;
  endIso: string;
  startDate: Date;
  endDate: Date;
}

function zonedAnchor(anchor: Date, tz: string): Date {
  return toZonedTime(anchor, tz);
}

export function dayRangeInTz(anchor: Date, tz: string): Range {
  const local = zonedAnchor(anchor, tz);
  const start = startOfDay(local);
  const end = addDays(start, 1);
  const startIso = utcIsoForZonedWallClock(start.getFullYear(), start.getMonth(), start.getDate(), tz);
  const endIso = utcIsoForZonedWallClock(end.getFullYear(), end.getMonth(), end.getDate(), tz);
  return { startIso, endIso, startDate: start, endDate: end };
}

export function weekRangeInTz(anchor: Date, tz: string): Range {
  const local = zonedAnchor(anchor, tz);
  // Week starts on Sunday to match the month grid
  const start = startOfWeek(local, { weekStartsOn: 0 });
  const end = addDays(endOfWeek(local, { weekStartsOn: 0 }), 1); // exclusive
  const startIso = utcIsoForZonedWallClock(start.getFullYear(), start.getMonth(), start.getDate(), tz);
  const endIso = utcIsoForZonedWallClock(end.getFullYear(), end.getMonth(), end.getDate(), tz);
  return { startIso, endIso, startDate: start, endDate: end };
}

export function monthRangeInTz(anchor: Date, tz: string): Range {
  const local = zonedAnchor(anchor, tz);
  const start = startOfMonth(local);
  const end = addDays(endOfMonth(local), 1); // exclusive
  const startIso = utcIsoForZonedWallClock(start.getFullYear(), start.getMonth(), start.getDate(), tz);
  const endIso = utcIsoForZonedWallClock(end.getFullYear(), end.getMonth(), end.getDate(), tz);
  return { startIso, endIso, startDate: start, endDate: end };
}

export function localDateInTz(utcIso: string | Date, tz: string): Date {
  const date = typeof utcIso === "string" ? new Date(utcIso) : utcIso;
  return toZonedTime(date, resolveTz(tz));
}

export function formatDate(date: Date, fmt: string): string {
  return fnsFormat(date, fmt);
}
