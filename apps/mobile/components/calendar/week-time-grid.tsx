import React, { useRef, useEffect, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import {
  HOUR_HEIGHT,
  HOURS,
  INITIAL_SCROLL_HOUR,
  TIME_LABEL_WIDTH,
  GRID_LINE_COLOR,
  TEAL,
  TEAL_LIGHT,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_MUTED,
  EVENT_COLORS,
} from "./constants";
import {
  getWeekDates,
  isToday,
  formatHour,
  getEventTopOffset,
  getEventHeight,
  groupOverlappingEvents,
  type CalendarEvent,
} from "./helpers";
import { EventBlock } from "./event-block";
import { Dimensions } from "react-native";

const SHORT_DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

interface WeekTimeGridProps {
  anchorDate: Date;
  eventsByDate: Map<string, CalendarEvent[]>;
  onDayPress: (date: Date) => void;
  onEventPress?: (event: CalendarEvent) => void;
}

export const WeekTimeGrid = React.memo(function WeekTimeGrid({
  anchorDate,
  eventsByDate,
  onDayPress,
  onEventPress,
}: WeekTimeGridProps) {
  const scrollRef = useRef<ScrollView>(null);
  const weekDates = useMemo(() => getWeekDates(anchorDate), [anchorDate.toDateString()]);

  const screenWidth = Dimensions.get("window").width;
  const gridWidth = screenWidth - TIME_LABEL_WIDTH - 16; // 16 for padding
  const dayColumnWidth = gridWidth / 7;

  useEffect(() => {
    // Scroll to 7 AM on mount
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: INITIAL_SCROLL_HOUR * HOUR_HEIGHT,
        animated: false,
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const hasAnyEvents = useMemo(() => {
    for (const d of weekDates) {
      const dayEvents = eventsByDate.get(d.toDateString());
      if (dayEvents && dayEvents.length > 0) return true;
    }
    return false;
  }, [weekDates, eventsByDate]);

  // Current time indicator
  const now = new Date();
  const todayInWeek = weekDates.findIndex((d) => isToday(d));

  return (
    <View testID="week-time-grid" style={{ flex: 1 }}>
      {/* Day headers */}
      <View
        style={{
          flexDirection: "row",
          paddingLeft: TIME_LABEL_WIDTH,
          paddingRight: 8,
          borderBottomWidth: 1,
          borderBottomColor: GRID_LINE_COLOR,
          backgroundColor: "#FFFFFF",
        }}
      >
        {weekDates.map((d, i) => {
          const today = isToday(d);
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          return (
            <TouchableOpacity
              key={i}
              testID={`week-header-${dateStr}`}
              onPress={() => onDayPress(d)}
              activeOpacity={0.7}
              style={{
                width: dayColumnWidth,
                alignItems: "center",
                paddingVertical: 8,
                backgroundColor: today ? TEAL_LIGHT : "transparent",
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                  color: today ? TEAL : TEXT_SECONDARY,
                  textTransform: "uppercase",
                }}
              >
                {SHORT_DAYS[i]}
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "PlusJakartaSans_700Bold",
                  color: today ? TEAL : TEXT_PRIMARY,
                }}
              >
                {d.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Scrollable time grid */}
      <ScrollView ref={scrollRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {!hasAnyEvents && (
          <View
            style={{
              position: "absolute",
              top: INITIAL_SCROLL_HOUR * HOUR_HEIGHT,
              left: 0,
              right: 0,
              alignItems: "center",
              zIndex: 10,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontFamily: "PlusJakartaSans_500Medium",
                color: TEXT_MUTED,
              }}
            >
              No events this week
            </Text>
          </View>
        )}

        <View style={{ flexDirection: "row", minHeight: 24 * HOUR_HEIGHT }}>
          {/* Hour labels */}
          <View style={{ width: TIME_LABEL_WIDTH }}>
            {HOURS.map((h) => (
              <View
                key={h}
                style={{
                  height: HOUR_HEIGHT,
                  justifyContent: "flex-start",
                  paddingRight: 8,
                  alignItems: "flex-end",
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontFamily: "PlusJakartaSans_400Regular",
                    color: TEXT_MUTED,
                    marginTop: -6,
                  }}
                >
                  {formatHour(h)}
                </Text>
              </View>
            ))}
          </View>

          {/* Day columns */}
          <View style={{ flex: 1, flexDirection: "row" }}>
            {weekDates.map((d, dayIndex) => {
              const dayEvents = eventsByDate.get(d.toDateString()) || [];
              const overlapGroups = groupOverlappingEvents(dayEvents);

              return (
                <View
                  key={dayIndex}
                  style={{
                    width: dayColumnWidth,
                    position: "relative",
                    borderLeftWidth: 0.5,
                    borderLeftColor: GRID_LINE_COLOR,
                  }}
                >
                  {/* Hour grid lines */}
                  {HOURS.map((h) => (
                    <View
                      key={h}
                      style={{
                        position: "absolute",
                        top: h * HOUR_HEIGHT,
                        left: 0,
                        right: 0,
                        height: 0.5,
                        backgroundColor: GRID_LINE_COLOR,
                      }}
                    />
                  ))}

                  {/* Event blocks */}
                  {overlapGroups.map((group, gi) => {
                    const maxVisible = 2;
                    const visible = group.events.slice(0, maxVisible);
                    const overflow = group.events.length - maxVisible;
                    const colWidth =
                      (dayColumnWidth - 4) / Math.min(group.columns, maxVisible);

                    return (
                      <React.Fragment key={gi}>
                        {visible.map((event, ei) => {
                          const top = getEventTopOffset(event.startTime);
                          const height = getEventHeight(event.startTime, event.endTime);
                          return (
                            <EventBlock
                              key={event.id}
                              event={event}
                              top={top}
                              height={height}
                              left={ei * colWidth + 2}
                              width={colWidth - 2}
                              onPress={onEventPress}
                            />
                          );
                        })}
                        {overflow > 0 && (
                          <TouchableOpacity
                            onPress={() => onDayPress(d)}
                            style={{
                              position: "absolute",
                              top:
                                getEventTopOffset(
                                  group.events[group.events.length - 1].endTime,
                                ) - 16,
                              left: 2,
                              backgroundColor: "#E5E7EB",
                              borderRadius: 4,
                              paddingHorizontal: 4,
                              paddingVertical: 2,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 9,
                                fontFamily: "PlusJakartaSans_600SemiBold",
                                color: TEXT_SECONDARY,
                              }}
                            >
                              +{overflow} more
                            </Text>
                          </TouchableOpacity>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {/* Current time indicator */}
                  {dayIndex === todayInWeek && todayInWeek >= 0 && (
                    <View
                      testID="current-time-indicator"
                      style={{
                        position: "absolute",
                        top: (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT,
                        left: 0,
                        right: 0,
                        height: 2,
                        backgroundColor: "#EF4444",
                        zIndex: 20,
                      }}
                    >
                      <View
                        style={{
                          position: "absolute",
                          left: -4,
                          top: -3,
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: "#EF4444",
                        }}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
});
