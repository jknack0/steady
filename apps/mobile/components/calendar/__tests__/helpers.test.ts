import {
  getMonthGrid,
  getWeekDates,
  isToday,
  isSameDay,
  getEventsForDay,
  formatPeriodLabel,
  getEventTopOffset,
  getEventHeight,
  groupOverlappingEvents,
  addMonths,
  addWeeks,
  getAdjacentPeriodRange,
  getFirstTwoChronological,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  type CalendarEvent,
} from "../helpers";

function makeEvent(
  overrides: Partial<CalendarEvent> & { startTime: string; endTime: string },
): CalendarEvent {
  return {
    id: overrides.id || Math.random().toString(),
    title: overrides.title || "Test",
    startTime: overrides.startTime,
    endTime: overrides.endTime,
    eventType: overrides.eventType || "TIME_BLOCK",
    color: null,
    task: null,
  };
}

describe("helpers", () => {
  // H1
  test("getMonthGrid returns 42 Date objects", () => {
    const grid = getMonthGrid(new Date(2026, 3, 1)); // April 2026
    expect(grid).toHaveLength(42);
    grid.forEach((d) => expect(d).toBeInstanceOf(Date));
  });

  // H2
  test("getMonthGrid pads with previous/next month days", () => {
    // March 2026 starts on Sunday
    const grid = getMonthGrid(new Date(2026, 2, 1));
    expect(grid[0].getDate()).toBe(1); // March 1 is a Sunday
    expect(grid[0].getMonth()).toBe(2); // March
    // Last cells should be April days
    expect(grid[41].getMonth()).toBe(3); // April
  });

  // H3
  test("getWeekDates returns 7 days containing the given date", () => {
    const wed = new Date(2026, 3, 8); // Wednesday Apr 8
    const week = getWeekDates(wed);
    expect(week).toHaveLength(7);
    // Should contain the Wednesday
    expect(week.some((d) => d.getDate() === 8 && d.getMonth() === 3)).toBe(true);
  });

  // H4
  test("getWeekDates starts on Sunday", () => {
    const mon = new Date(2026, 3, 6); // Monday Apr 6
    const week = getWeekDates(mon);
    expect(week[0].getDay()).toBe(0); // Sunday
    expect(week[0].getDate()).toBe(5); // Apr 5
  });

  // H5
  test("isToday returns true for current date", () => {
    expect(isToday(new Date())).toBe(true);
  });

  // H6
  test("isToday returns false for yesterday", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isToday(yesterday)).toBe(false);
  });

  // H7
  test("isSameDay compares same day different time", () => {
    const a = new Date(2026, 3, 15, 9, 0);
    const b = new Date(2026, 3, 15, 17, 30);
    expect(isSameDay(a, b)).toBe(true);
  });

  // H8
  test("isSameDay rejects different days", () => {
    const a = new Date(2026, 3, 15);
    const b = new Date(2026, 3, 16);
    expect(isSameDay(a, b)).toBe(false);
  });

  // H9
  test("getEventsForDay filters correctly", () => {
    const events = [
      makeEvent({ startTime: "2026-04-15T09:00:00", endTime: "2026-04-15T10:00:00" }),
      makeEvent({ startTime: "2026-04-16T09:00:00", endTime: "2026-04-16T10:00:00" }),
      makeEvent({ startTime: "2026-04-15T14:00:00", endTime: "2026-04-15T15:00:00" }),
    ];
    const result = getEventsForDay(events, new Date(2026, 3, 15));
    expect(result).toHaveLength(2);
  });

  // H10
  test("getEventsForDay returns empty for no matches", () => {
    const events = [
      makeEvent({ startTime: "2026-04-15T09:00:00", endTime: "2026-04-15T10:00:00" }),
    ];
    const result = getEventsForDay(events, new Date(2026, 3, 20));
    expect(result).toHaveLength(0);
  });

  // H11
  test("formatPeriodLabel month view", () => {
    const label = formatPeriodLabel("month", new Date(2026, 3, 1));
    expect(label).toBe("April 2026");
  });

  // H12
  test("formatPeriodLabel week view same month", () => {
    const label = formatPeriodLabel("week", new Date(2026, 3, 8)); // Wed Apr 8
    // Week: Apr 5 – 11, 2026
    expect(label).toBe("Apr 5 – 11, 2026");
  });

  // H13
  test("formatPeriodLabel week crossing months", () => {
    // Mar 29 – Apr 4, 2026 (week containing Mar 30)
    const label = formatPeriodLabel("week", new Date(2026, 2, 30));
    expect(label).toBe("Mar 29 – Apr 4, 2026");
  });

  // H14
  test("getEventTopOffset maps time to pixels", () => {
    // 9:30 AM → 9.5 * 60 = 570
    const offset = getEventTopOffset("2026-04-15T09:30:00", 60);
    expect(offset).toBe(570);
  });

  // H15
  test("getEventHeight calculates duration", () => {
    // 90 minutes = 1.5 hours → 1.5 * 60 = 90px
    const height = getEventHeight("2026-04-15T09:00:00", "2026-04-15T10:30:00", 60);
    expect(height).toBe(90);
  });

  // H16
  test("groupOverlappingEvents groups concurrent events", () => {
    const events = [
      makeEvent({
        id: "1",
        startTime: "2026-04-15T09:00:00",
        endTime: "2026-04-15T10:00:00",
      }),
      makeEvent({
        id: "2",
        startTime: "2026-04-15T09:30:00",
        endTime: "2026-04-15T10:30:00",
      }),
      makeEvent({
        id: "3",
        startTime: "2026-04-15T14:00:00",
        endTime: "2026-04-15T15:00:00",
      }),
    ];
    const groups = groupOverlappingEvents(events);
    expect(groups).toHaveLength(2);
    expect(groups[0].events).toHaveLength(2); // overlapping
    expect(groups[1].events).toHaveLength(1); // standalone
  });

  // H17
  test("addMonths advances correctly", () => {
    const result = addMonths(new Date(2026, 0, 15), 1);
    expect(result.getMonth()).toBe(1); // February
  });

  // H18
  test("addMonths handles year boundary", () => {
    const result = addMonths(new Date(2026, 11, 15), 1);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getFullYear()).toBe(2027);
  });

  // H19
  test("addWeeks advances 7 days", () => {
    const result = addWeeks(new Date(2026, 3, 5), 1);
    expect(result.getDate()).toBe(12);
    expect(result.getMonth()).toBe(3);
  });

  // H20
  test("getAdjacentPeriodRange month", () => {
    const { prev, next } = getAdjacentPeriodRange("month", new Date(2026, 3, 15));
    expect(prev.start.getMonth()).toBe(2); // March
    expect(next.start.getMonth()).toBe(4); // May
  });

  // H21
  test("getAdjacentPeriodRange week", () => {
    const { prev, next } = getAdjacentPeriodRange("week", new Date(2026, 3, 8));
    // prev week start should be 7 days before current week start
    const currentWeekStart = startOfWeek(new Date(2026, 3, 8));
    expect(prev.start.getDate()).toBe(currentWeekStart.getDate() - 7);
  });

  // H22
  test("getFirstTwoChronological sorts and limits", () => {
    const events = [
      makeEvent({ id: "c", startTime: "2026-04-15T15:00:00", endTime: "2026-04-15T16:00:00" }),
      makeEvent({ id: "a", startTime: "2026-04-15T09:00:00", endTime: "2026-04-15T10:00:00" }),
      makeEvent({ id: "b", startTime: "2026-04-15T12:00:00", endTime: "2026-04-15T13:00:00" }),
      makeEvent({ id: "d", startTime: "2026-04-15T17:00:00", endTime: "2026-04-15T18:00:00" }),
      makeEvent({ id: "e", startTime: "2026-04-15T08:00:00", endTime: "2026-04-15T09:00:00" }),
    ];
    const result = getFirstTwoChronological(events);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("e"); // 8 AM
    expect(result[1].id).toBe("a"); // 9 AM
  });
});
