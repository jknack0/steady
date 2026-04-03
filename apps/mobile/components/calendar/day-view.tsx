import React from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EventCard } from "./event-card";
import { TEAL, TEXT_PRIMARY, TEXT_SECONDARY } from "./constants";
import type { CalendarEvent } from "./helpers";

interface DayViewProps {
  selectedDate: Date;
  events: CalendarEvent[];
  isLoading: boolean;
  onRefresh: () => void;
  onDeleteEvent: (id: string) => void;
}

export function DayView({
  selectedDate,
  events,
  isLoading,
  onRefresh,
  onDeleteEvent,
}: DayViewProps) {
  return (
    <ScrollView
      testID="day-view"
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={TEAL} />
      }
    >
      <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
        <Text
          style={{
            fontSize: 12,
            fontFamily: "PlusJakartaSans_600SemiBold",
            color: TEXT_SECONDARY,
            marginBottom: 12,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {selectedDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </Text>

        {events.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 64 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#E3EDED",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="calendar-outline" size={28} color={TEAL} />
            </View>
            <Text
              style={{
                fontSize: 18,
                fontFamily: "PlusJakartaSans_600SemiBold",
                color: TEXT_PRIMARY,
                marginBottom: 4,
              }}
            >
              No events today
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "PlusJakartaSans_400Regular",
                color: TEXT_SECONDARY,
              }}
            >
              Tap + to schedule a time block
            </Text>
          </View>
        ) : (
          <View>
            {events.map((event) => (
              <EventCard key={event.id} event={event} onDelete={onDeleteEvent} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
