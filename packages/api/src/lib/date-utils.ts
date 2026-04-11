/** Return a new Date set to midnight UTC of the given (or current) day. */
export function startOfDayUTC(date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Return a new Date set to 23:59:59.999 UTC of the given (or current) day. */
export function endOfDayUTC(date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/** Return midnight UTC of `days` days ago. */
export function daysAgoUTC(days: number): Date {
  const d = startOfDayUTC();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

/** Return the YYYY-MM-DD date string for a Date. */
export function toDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}
