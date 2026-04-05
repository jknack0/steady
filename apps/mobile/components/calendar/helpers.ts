import { HOUR_HEIGHT } from "./constants";

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  eventType: string;
  color: string | null;
  task: { id: string; title: string; status: string } | null;
}

export type ViewMode = "day" | "week" | "month";

// ---- Date arithmetic ----

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // Sunday
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfWeek(date: Date): Date {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

// ---- Week helpers ----

export function getWeekDates(baseDate: Date): Date[] {
  const start = startOfWeek(baseDate);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

// ---- Month grid (6x7 = 42 cells) ----

export function getMonthGrid(date: Date): Date[] {
  const firstOfMonth = startOfMonth(date);
  const gridStart = startOfWeek(firstOfMonth); // Sunday before (or on) the 1st
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

// ---- Event helpers ----

export function groupEventsByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const key = new Date(e.startTime).toDateString();
    const arr = map.get(key) || [];
    arr.push(e);
    map.set(key, arr);
  }
  // Sort each day's events chronologically
  for (const [key, arr] of map) {
    arr.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    map.set(key, arr);
  }
  return map;
}

export function getEventsForDay(events: CalendarEvent[], date: Date): CalendarEvent[] {
  const dateStr = date.toDateString();
  return events
    .filter((e) => new Date(e.startTime).toDateString() === dateStr)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

export function getFirstTwoChronological(events: CalendarEvent[]): CalendarEvent[] {
  return [...events]
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 2);
}

// ---- Week time grid positioning ----

export function getEventTopOffset(startTime: string, hourHeight: number = HOUR_HEIGHT): number {
  const d = new Date(startTime);
  const hours = d.getHours() + d.getMinutes() / 60;
  return hours * hourHeight;
}

export function getEventHeight(
  startTime: string,
  endTime: string,
  hourHeight: number = HOUR_HEIGHT,
): number {
  const ms = new Date(endTime).getTime() - new Date(startTime).getTime();
  const hours = ms / (60 * 60 * 1000);
  return Math.max(hours * hourHeight, hourHeight / 4); // min height 15px
}

export interface OverlapGroup {
  events: CalendarEvent[];
  columns: number;
}

/**
 * Groups overlapping events within a day column for layout.
 * Returns groups of events that overlap, with the number of columns needed.
 */
export function groupOverlappingEvents(events: CalendarEvent[]): OverlapGroup[] {
  if (events.length === 0) return [];

  const sorted = [...events].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );

  const groups: OverlapGroup[] = [];
  let currentGroup: CalendarEvent[] = [sorted[0]];
  let groupEnd = new Date(sorted[0].endTime).getTime();

  for (let i = 1; i < sorted.length; i++) {
    const start = new Date(sorted[i].startTime).getTime();
    if (start < groupEnd) {
      // Overlaps with current group
      currentGroup.push(sorted[i]);
      groupEnd = Math.max(groupEnd, new Date(sorted[i].endTime).getTime());
    } else {
      // No overlap — start new group
      groups.push({ events: currentGroup, columns: currentGroup.length });
      currentGroup = [sorted[i]];
      groupEnd = new Date(sorted[i].endTime).getTime();
    }
  }
  groups.push({ events: currentGroup, columns: currentGroup.length });

  return groups;
}

// ---- Navigation labels ----

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const FULL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const SHORT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatPeriodLabel(viewMode: ViewMode, anchorDate: Date): string {
  switch (viewMode) {
    case "day": {
      const wd = SHORT_WEEKDAYS[anchorDate.getDay()];
      const mon = SHORT_MONTHS[anchorDate.getMonth()];
      return `${wd}, ${mon} ${anchorDate.getDate()}, ${anchorDate.getFullYear()}`;
    }
    case "week": {
      const start = startOfWeek(anchorDate);
      const end = endOfWeek(anchorDate);
      const sm = SHORT_MONTHS[start.getMonth()];
      const em = SHORT_MONTHS[end.getMonth()];
      if (start.getMonth() === end.getMonth()) {
        return `${sm} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
      }
      return `${sm} ${start.getDate()} – ${em} ${end.getDate()}, ${end.getFullYear()}`;
    }
    case "month": {
      return `${FULL_MONTHS[anchorDate.getMonth()]} ${anchorDate.getFullYear()}`;
    }
  }
}

// ---- Adjacent period ranges for prefetch ----

export interface DateRange {
  start: Date;
  end: Date;
}

export function getAdjacentPeriodRange(
  viewMode: ViewMode,
  anchorDate: Date,
): { prev: DateRange; next: DateRange } {
  switch (viewMode) {
    case "day": {
      const prev = addDays(anchorDate, -1);
      const next = addDays(anchorDate, 1);
      return {
        prev: { start: startOfDay(prev), end: endOfDay(prev) },
        next: { start: startOfDay(next), end: endOfDay(next) },
      };
    }
    case "week": {
      const prevStart = startOfWeek(addWeeks(anchorDate, -1));
      const prevEnd = endOfWeek(addWeeks(anchorDate, -1));
      const nextStart = startOfWeek(addWeeks(anchorDate, 1));
      const nextEnd = endOfWeek(addWeeks(anchorDate, 1));
      return {
        prev: { start: prevStart, end: prevEnd },
        next: { start: nextStart, end: nextEnd },
      };
    }
    case "month": {
      const prevMonth = addMonths(anchorDate, -1);
      const nextMonth = addMonths(anchorDate, 1);
      return {
        prev: { start: startOfMonth(prevMonth), end: endOfMonth(prevMonth) },
        next: { start: startOfMonth(nextMonth), end: endOfMonth(nextMonth) },
      };
    }
  }
}

// ---- Date range for current view ----

export function getViewDateRange(viewMode: ViewMode, anchorDate: Date): DateRange {
  switch (viewMode) {
    case "day":
      return { start: startOfDay(anchorDate), end: endOfDay(anchorDate) };
    case "week":
      return { start: startOfWeek(anchorDate), end: endOfWeek(anchorDate) };
    case "month": {
      // Extend to fill the 6x7 grid
      const gridStart = startOfWeek(startOfMonth(anchorDate));
      const gridEnd = endOfDay(addDays(gridStart, 41));
      return { start: gridStart, end: gridEnd };
    }
  }
}

export function formatHour(h: number): string {
  if (h === 0 || h === 12) return h === 0 ? "12 AM" : "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}
