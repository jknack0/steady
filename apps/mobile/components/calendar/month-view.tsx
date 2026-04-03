import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import {
  TEAL,
  TEAL_LIGHT,
  TEXT_PRIMARY,
  TEXT_MUTED,
  OVERFLOW_DAY_COLOR,
  EVENT_COLORS,
} from "./constants";
import {
  getMonthGrid,
  isToday,
  isSameDay,
  getFirstTwoChronological,
  type CalendarEvent,
} from "./helpers";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface MonthViewProps {
  anchorDate: Date;
  selectedDate: Date | null;
  eventsByDate: Map<string, CalendarEvent[]>;
  onDayPress: (date: Date) => void;
}

export const MonthView = React.memo(function MonthView({
  anchorDate,
  selectedDate,
  eventsByDate,
  onDayPress,
}: MonthViewProps) {
  const grid = getMonthGrid(anchorDate);
  const currentMonth = anchorDate.getMonth();

  return (
    <View testID="month-view" style={{ paddingHorizontal: 8 }}>
      {/* Day-of-week headers */}
      <View style={{ flexDirection: "row", marginBottom: 8 }}>
        {DAY_LABELS.map((label) => (
          <View key={label} style={{ flex: 1, alignItems: "center" }}>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "PlusJakartaSans_600SemiBold",
                color: TEXT_MUTED,
                textTransform: "uppercase",
              }}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* 6 rows x 7 cols */}
      {Array.from({ length: 6 }, (_, row) => (
        <View key={row} style={{ flexDirection: "row" }}>
          {Array.from({ length: 7 }, (_, col) => {
            const cellDate = grid[row * 7 + col];
            const isOverflow = cellDate.getMonth() !== currentMonth;
            const today = isToday(cellDate);
            const selected = selectedDate ? isSameDay(cellDate, selectedDate) : false;
            const dayEvents = eventsByDate.get(cellDate.toDateString()) || [];
            const dotEvents = getFirstTwoChronological(dayEvents);
            const eventCount = dayEvents.length;

            const dateStr = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, "0")}-${String(cellDate.getDate()).padStart(2, "0")}`;

            return (
              <TouchableOpacity
                key={col}
                testID={`month-day-${dateStr}`}
                accessibilityLabel={`${cellDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })}${eventCount > 0 ? `, ${eventCount} event${eventCount > 1 ? "s" : ""}` : ""}${today ? ", today" : ""}`}
                onPress={() => onDayPress(cellDate)}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 6,
                  minHeight: 48,
                }}
              >
                <View
                  testID={today ? "today-marker" : selected ? "selected-marker" : undefined}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: today ? TEAL : selected ? TEAL_LIGHT : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "PlusJakartaSans_600SemiBold",
                      color: today
                        ? "#FFFFFF"
                        : isOverflow
                          ? OVERFLOW_DAY_COLOR
                          : TEXT_PRIMARY,
                    }}
                  >
                    {cellDate.getDate()}
                  </Text>
                </View>

                {/* Event dots */}
                {dotEvents.length > 0 && (
                  <View
                    style={{
                      flexDirection: "row",
                      marginTop: 2,
                      gap: 3,
                    }}
                  >
                    {dotEvents.map((e, i) => {
                      const config = EVENT_COLORS[e.eventType] || EVENT_COLORS.TIME_BLOCK;
                      return (
                        <View
                          key={i}
                          testID="event-dot"
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: config.border,
                          }}
                        />
                      );
                    })}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
});
