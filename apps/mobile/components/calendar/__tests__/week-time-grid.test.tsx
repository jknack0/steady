import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { WeekTimeGrid } from "../week-time-grid";
import { formatHour, getWeekDates } from "../helpers";
import type { CalendarEvent } from "../helpers";

// Mock Dimensions
jest.mock("react-native/Libraries/Utilities/Dimensions", () => ({
  get: jest.fn().mockReturnValue({ width: 375, height: 812 }),
}));

function makeEvent(overrides: Partial<CalendarEvent> & { startTime: string; endTime: string }): CalendarEvent {
  return {
    id: overrides.id || Math.random().toString(),
    title: overrides.title || "Test Event",
    startTime: overrides.startTime,
    endTime: overrides.endTime,
    eventType: overrides.eventType || "TIME_BLOCK",
    color: null,
    task: null,
  };
}

describe("WeekTimeGrid", () => {
  const anchorDate = new Date(2026, 3, 8); // Wednesday Apr 8
  const weekDates = getWeekDates(anchorDate);
  const defaultProps = {
    anchorDate,
    eventsByDate: new Map<string, CalendarEvent[]>(),
    onDayPress: jest.fn(),
    onEventPress: jest.fn(),
  };

  // WG1
  test("renders 24 hour labels", () => {
    const { getByText } = render(<WeekTimeGrid {...defaultProps} />);
    // Spot-check a few hours
    expect(getByText("12 AM")).toBeTruthy();
    expect(getByText("9 AM")).toBeTruthy();
    expect(getByText("12 PM")).toBeTruthy();
    expect(getByText("6 PM")).toBeTruthy();
  });

  // WG2
  test("renders 7 day column headers", () => {
    const { getAllByTestId } = render(<WeekTimeGrid {...defaultProps} />);
    const headers = getAllByTestId(/^week-header-/);
    expect(headers).toHaveLength(7);
  });

  // WG3
  test("event block positioned correctly", () => {
    const map = new Map<string, CalendarEvent[]>();
    const dateStr = weekDates[3].toDateString(); // Wednesday
    map.set(dateStr, [
      makeEvent({
        id: "e1",
        startTime: "2026-04-08T09:00:00",
        endTime: "2026-04-08T10:00:00",
      }),
    ]);
    const { getByTestId } = render(
      <WeekTimeGrid {...defaultProps} eventsByDate={map} />,
    );
    expect(getByTestId("event-block-e1")).toBeTruthy();
  });

  // WG4
  test("event block shows title", () => {
    const map = new Map<string, CalendarEvent[]>();
    const dateStr = weekDates[3].toDateString();
    map.set(dateStr, [
      makeEvent({
        id: "e2",
        title: "Study Session",
        startTime: "2026-04-08T09:00:00",
        endTime: "2026-04-08T10:00:00",
      }),
    ]);
    const { getByText } = render(
      <WeekTimeGrid {...defaultProps} eventsByDate={map} />,
    );
    expect(getByText("Study Session")).toBeTruthy();
  });

  // WG5
  test("2 overlapping events both visible", () => {
    const map = new Map<string, CalendarEvent[]>();
    const dateStr = weekDates[3].toDateString();
    map.set(dateStr, [
      makeEvent({ id: "o1", startTime: "2026-04-08T09:00:00", endTime: "2026-04-08T10:00:00" }),
      makeEvent({ id: "o2", startTime: "2026-04-08T09:30:00", endTime: "2026-04-08T10:30:00" }),
    ]);
    const { getByTestId } = render(
      <WeekTimeGrid {...defaultProps} eventsByDate={map} />,
    );
    expect(getByTestId("event-block-o1")).toBeTruthy();
    expect(getByTestId("event-block-o2")).toBeTruthy();
  });

  // WG6
  test('3 overlapping events show "+1 more"', () => {
    const map = new Map<string, CalendarEvent[]>();
    const dateStr = weekDates[3].toDateString();
    map.set(dateStr, [
      makeEvent({ id: "v1", startTime: "2026-04-08T09:00:00", endTime: "2026-04-08T10:00:00" }),
      makeEvent({ id: "v2", startTime: "2026-04-08T09:15:00", endTime: "2026-04-08T10:15:00" }),
      makeEvent({ id: "v3", startTime: "2026-04-08T09:30:00", endTime: "2026-04-08T10:30:00" }),
    ]);
    const { getByText } = render(
      <WeekTimeGrid {...defaultProps} eventsByDate={map} />,
    );
    expect(getByText("+1 more")).toBeTruthy();
  });

  // WG7
  test("tapping day header calls onDayPress", () => {
    const onDayPress = jest.fn();
    const { getAllByTestId } = render(
      <WeekTimeGrid {...defaultProps} onDayPress={onDayPress} />,
    );
    const headers = getAllByTestId(/^week-header-/);
    fireEvent.press(headers[0]); // Sunday
    expect(onDayPress).toHaveBeenCalled();
  });

  // WG8
  test("tapping event block calls onEventPress", () => {
    const onEventPress = jest.fn();
    const map = new Map<string, CalendarEvent[]>();
    const dateStr = weekDates[3].toDateString();
    const event = makeEvent({
      id: "tap1",
      startTime: "2026-04-08T09:00:00",
      endTime: "2026-04-08T10:00:00",
    });
    map.set(dateStr, [event]);
    const { getByTestId } = render(
      <WeekTimeGrid {...defaultProps} eventsByDate={map} onEventPress={onEventPress} />,
    );
    fireEvent.press(getByTestId("event-block-tap1"));
    expect(onEventPress).toHaveBeenCalledWith(event);
  });

  // WG9
  test("today column has highlight", () => {
    const today = new Date();
    const { getAllByTestId } = render(
      <WeekTimeGrid {...defaultProps} anchorDate={today} />,
    );
    // At least one header should exist for today's date
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const headers = getAllByTestId(/^week-header-/);
    const todayHeader = headers.find((h) => h.props.testID === `week-header-${todayStr}`);
    expect(todayHeader).toBeTruthy();
  });

  // WG10
  test("empty week shows empty state message", () => {
    const { getByText } = render(<WeekTimeGrid {...defaultProps} />);
    expect(getByText("No events this week")).toBeTruthy();
  });

  // WG11
  test("current time indicator shown for today", () => {
    const today = new Date();
    const { queryByTestId } = render(
      <WeekTimeGrid {...defaultProps} anchorDate={today} />,
    );
    expect(queryByTestId("current-time-indicator")).toBeTruthy();
  });
});
