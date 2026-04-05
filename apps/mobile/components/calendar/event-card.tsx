import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EVENT_COLORS } from "./constants";
import type { CalendarEvent } from "./helpers";

interface EventCardProps {
  event: CalendarEvent;
  onDelete: (id: string) => void;
}

export function EventCard({ event, onDelete }: EventCardProps) {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const config = EVENT_COLORS[event.eventType] || EVENT_COLORS.TIME_BLOCK;

  return (
    <TouchableOpacity
      style={{
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 12,
        backgroundColor: config.bg,
        borderLeftWidth: 4,
        borderLeftColor: config.border,
      }}
      onLongPress={() => {
        Alert.alert("Delete Event", `Delete "${event.title}"?`, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => onDelete(event.id),
          },
        ]);
      }}
      activeOpacity={0.7}
    >
      <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontFamily: "PlusJakartaSans_600SemiBold",
              color: config.text,
            }}
          >
            {event.title}
          </Text>
          <Ionicons name={config.icon as any} size={16} color={config.text} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
          <Ionicons name="time-outline" size={13} color={config.text} />
          <Text
            style={{
              fontSize: 14,
              fontFamily: "PlusJakartaSans_400Regular",
              marginLeft: 6,
              color: config.text,
              opacity: 0.8,
            }}
          >
            {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            {" - "}
            {end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </Text>
        </View>
        {event.task && (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
            <Ionicons name="link-outline" size={13} color={config.text} />
            <Text
              style={{
                fontSize: 12,
                fontFamily: "PlusJakartaSans_500Medium",
                marginLeft: 6,
                color: config.text,
                opacity: 0.7,
              }}
            >
              {event.task.title}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
