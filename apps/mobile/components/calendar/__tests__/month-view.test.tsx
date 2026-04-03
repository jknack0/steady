import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { MonthView } from "../month-view";
import type { CalendarEvent } from "../helpers";

function makeEvent(overrides: Partial<CalendarEvent> & { startTime: string }): CalendarEvent {
  return {
    id: overrides.id || Math.random().toString(),
    title: overrides.title || "Test",
    startTime: overrides.startTime,
    endTime: overrides.endTime || overrides.startTime,
    eventType: overrides.eventType || "TIME_BLOCK",
    color: null,
    task: null,
  };
}

describe("MonthView", () => {
  const defaultProps = {
    anchorDate: new Date(2026, 3, 1), // April 2026
    selectedDate: null,
    eventsByDate: new Map<string, CalendarEvent[]>(),
    onDayPress: jest.fn(),
  };

  // MV1
  test("renders 7 day-of-week headers", () => {
    const { getByText } = render(<MonthView {...defaultProps} />);
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((label) => {
      expect(getByText(label)).toBeTruthy();
    });
  });

  // MV2
  test("renders 42 day cells", () => {
    const { getAllByTestId } = render(<MonthView {...defaultProps} />);
    const cells = getAllByTestId(/^month-day-/);
    expect(cells).toHaveLength(42);
  });

  // MV3
  test("today cell has teal highlight", () => {
    const today = new Date();
    const { queryByTestId } = render(
      <MonthView {...defaultProps} anchorDate={today} />,
    );
    expect(queryByTestId("today-marker")).toBeTruthy();
  });

  // MV4
  test("non-current-month days are rendered (overflow)", () => {
    // April 2026 starts on Wednesday, so Sun-Tue of first week are March days
    const { getByTestId } = render(<MonthView {...defaultProps} />);
    // March 29 (Sunday before April 1 2026)
    const cell = getByTestId("month-day-2026-03-29");
    expect(cell).toBeTruthy();
  });

  // MV5
  test("day with 1 event shows 1 dot", () => {
    const map = new Map<string, CalendarEvent[]>();
    const date = new Date(2026, 3, 15);
    map.set(
      date.toDateString(),
      [makeEvent({ startTime: "2026-04-15T09:00:00" })],
    );
    const { getAllByTestId } = render(
      <MonthView {...defaultProps} eventsByDate={map} />,
    );
    // Find dots within April 15 cell area
    const dots = getAllByTestId("event-dot");
    expect(dots.length).toBeGreaterThanOrEqual(1);
  });

  // MV6
  test("day with 3 events shows max 2 dots", () => {
    const map = new Map<string, CalendarEvent[]>();
    const date = new Date(2026, 3, 15);
    map.set(date.toDateString(), [
      makeEvent({ startTime: "2026-04-15T09:00:00" }),
      makeEvent({ startTime: "2026-04-15T10:00:00" }),
      makeEvent({ startTime: "2026-04-15T11:00:00" }),
    ]);
    const { getAllByTestId } = render(
      <MonthView {...defaultProps} eventsByDate={map} />,
    );
    const dots = getAllByTestId("event-dot");
    expect(dots).toHaveLength(2);
  });

  // MV7
  test("dots are color-coded by event type", () => {
    const map = new Map<string, CalendarEvent[]>();
    const date = new Date(2026, 3, 15);
    map.set(date.toDateString(), [
      makeEvent({ startTime: "2026-04-15T09:00:00", eventType: "SESSION" }),
    ]);
    const { getAllByTestId } = render(
      <MonthView {...defaultProps} eventsByDate={map} />,
    );
    const dots = getAllByTestId("event-dot");
    expect(dots).toHaveLength(1);
    // SESSION border color is #C4A84D
    expect(dots[0].props.style).toEqual(
      expect.objectContaining({ backgroundColor: "#C4A84D" }),
    );
  });

  // MV8
  test("tapping a day calls onDayPress", () => {
    const onDayPress = jest.fn();
    const { getByTestId } = render(
      <MonthView {...defaultProps} onDayPress={onDayPress} />,
    );
    fireEvent.press(getByTestId("month-day-2026-04-15"));
    expect(onDayPress).toHaveBeenCalled();
    expect(onDayPress.mock.calls[0][0].getDate()).toBe(15);
  });

  // MV9
  test("selected day has distinct style", () => {
    const { queryByTestId } = render(
      <MonthView {...defaultProps} selectedDate={new Date(2026, 3, 15)} />,
    );
    expect(queryByTestId("selected-marker")).toBeTruthy();
  });

  // MV10
  test("empty month shows no dots", () => {
    const { queryAllByTestId } = render(<MonthView {...defaultProps} />);
    expect(queryAllByTestId("event-dot")).toHaveLength(0);
  });
});
