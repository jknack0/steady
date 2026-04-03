import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { EVENT_COLORS } from "./constants";
import type { CalendarEvent } from "./helpers";

interface EventBlockProps {
  event: CalendarEvent;
  top: number;
  height: number;
  left: number;
  width: number;
  onPress?: (event: CalendarEvent) => void;
}

export function EventBlock({ event, top, height, left, width, onPress }: EventBlockProps) {
  const config = EVENT_COLORS[event.eventType] || EVENT_COLORS.TIME_BLOCK;

  return (
    <TouchableOpacity
      testID={`event-block-${event.id}`}
      accessibilityLabel={`${event.title}, ${new Date(event.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} to ${new Date(event.endTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}, ${event.eventType.toLowerCase().replace("_", " ")}`}
      onPress={() => onPress?.(event)}
      activeOpacity={0.7}
      style={{
        position: "absolute",
        top,
        left,
        width,
        height: Math.max(height, 20),
        backgroundColor: config.bg,
        borderLeftWidth: 3,
        borderLeftColor: config.border,
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 2,
        overflow: "hidden",
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          fontSize: 10,
          fontFamily: "PlusJakartaSans_600SemiBold",
          color: config.text,
        }}
      >
        {event.title}
      </Text>
      {height > 30 && (
        <Text
          numberOfLines={1}
          style={{
            fontSize: 9,
            fontFamily: "PlusJakartaSans_400Regular",
            color: config.text,
            opacity: 0.8,
          }}
        >
          {new Date(event.startTime).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </Text>
      )}
    </TouchableOpacity>
  );
}
