import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { MiniAgendaSheet } from "../mini-agenda-sheet";
import type { CalendarEvent } from "../helpers";

function makeEvent(overrides: Partial<CalendarEvent> & { startTime: string; endTime: string }): CalendarEvent {
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

describe("MiniAgendaSheet", () => {
  const defaultProps = {
    visible: true,
    date: new Date(2026, 3, 15), // April 15 (Wednesday)
    events: [] as CalendarEvent[],
    onEventPress: jest.fn(),
    onClose: jest.fn(),
  };

  // MA1
  test("shows date header", () => {
    const { getByText } = render(<MiniAgendaSheet {...defaultProps} />);
    expect(getByText("Wednesday, April 15")).toBeTruthy();
  });

  // MA2
  test("lists events with time", () => {
    const events = [
      makeEvent({
        id: "e1",
        title: "Morning Meeting",
        startTime: "2026-04-15T09:00:00",
        endTime: "2026-04-15T10:00:00",
      }),
    ];
    const { getByText, getByTestId } = render(
      <MiniAgendaSheet {...defaultProps} events={events} />,
    );
    expect(getByText("Morning Meeting")).toBeTruthy();
    expect(getByTestId("agenda-event-e1")).toBeTruthy();
  });

  // MA3
  test("events show type indicator", () => {
    const events = [
      makeEvent({
        id: "e2",
        startTime: "2026-04-15T09:00:00",
        endTime: "2026-04-15T10:00:00",
        eventType: "SESSION",
      }),
    ];
    const { getByTestId } = render(
      <MiniAgendaSheet {...defaultProps} events={events} />,
    );
    const indicator = getByTestId("event-type-indicator-e2");
    expect(indicator).toBeTruthy();
    expect(indicator.props.style).toEqual(
      expect.objectContaining({ backgroundColor: "#C4A84D" }),
    );
  });

  // MA4
  test("tapping event calls onEventPress", () => {
    const onEventPress = jest.fn();
    const event = makeEvent({
      id: "e3",
      startTime: "2026-04-15T09:00:00",
      endTime: "2026-04-15T10:00:00",
    });
    const { getByTestId } = render(
      <MiniAgendaSheet {...defaultProps} events={[event]} onEventPress={onEventPress} />,
    );
    fireEvent.press(getByTestId("agenda-event-e3"));
    expect(onEventPress).toHaveBeenCalledWith(event);
  });

  // MA5
  test("empty state shown when no events", () => {
    const { getByText } = render(<MiniAgendaSheet {...defaultProps} events={[]} />);
    expect(getByText("No events")).toBeTruthy();
  });

  // MA6
  test("events sorted chronologically", () => {
    const events = [
      makeEvent({ id: "late", title: "Late", startTime: "2026-04-15T15:00:00", endTime: "2026-04-15T16:00:00" }),
      makeEvent({ id: "early", title: "Early", startTime: "2026-04-15T08:00:00", endTime: "2026-04-15T09:00:00" }),
    ];
    const { getAllByTestId } = render(
      <MiniAgendaSheet {...defaultProps} events={events} />,
    );
    const rows = getAllByTestId(/^agenda-event-/);
    expect(rows[0].props.testID).toBe("agenda-event-early");
    expect(rows[1].props.testID).toBe("agenda-event-late");
  });

  // MA7
  test("close button calls onClose", () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <MiniAgendaSheet {...defaultProps} onClose={onClose} />,
    );
    fireEvent.press(getByTestId("sheet-close-button"));
    expect(onClose).toHaveBeenCalled();
  });

  // MA8
  test("returns null when date is null", () => {
    const { queryByTestId } = render(
      <MiniAgendaSheet {...defaultProps} date={null} />,
    );
    expect(queryByTestId("mini-agenda-sheet")).toBeNull();
  });
});
