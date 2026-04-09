import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EVENT_COLORS, TEAL, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED } from "./constants";
import type { CalendarEvent } from "./helpers";

const FULL_WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const FULL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface MiniAgendaSheetProps {
  visible: boolean;
  date: Date | null;
  events: CalendarEvent[];
  onEventPress: (event: CalendarEvent) => void;
  onClose: () => void;
}

export function MiniAgendaSheet({
  visible,
  date,
  events,
  onEventPress,
  onClose,
}: MiniAgendaSheetProps) {
  if (!date) return null;

  const dateLabel = `${FULL_WEEKDAYS[date.getDay()]}, ${FULL_MONTHS[date.getMonth()]} ${date.getDate()}`;

  const sorted = [...events].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.25)" }}
        onPress={onClose}
        activeOpacity={1}
        accessibilityLabel="Close"
      />
      <View
        testID="mini-agenda-sheet"
        style={{
          backgroundColor: "#FFFFFF",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingHorizontal: 20,
          paddingBottom: 32,
          paddingTop: 16,
          maxHeight: "60%",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 10,
        }}
      >
        {/* Handle bar */}
        <View
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: "#D4D0CB",
            alignSelf: "center",
            marginBottom: 16,
          }}
        />

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontFamily: "PlusJakartaSans_700Bold",
              color: TEXT_PRIMARY,
            }}
          >
            {dateLabel}
          </Text>
          <TouchableOpacity
            testID="sheet-close-button"
            onPress={onClose}
            accessibilityLabel="Close"
            style={{
              width: 32,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              backgroundColor: "#F0EDE8",
            }}
          >
            <Ionicons name="close" size={18} color={TEXT_SECONDARY} />
          </TouchableOpacity>
        </View>

        {sorted.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <Text
              style={{
                fontSize: 16,
                fontFamily: "PlusJakartaSans_500Medium",
                color: TEXT_MUTED,
              }}
            >
              No events
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {sorted.map((event) => {
              const config = EVENT_COLORS[event.eventType] || EVENT_COLORS.TIME_BLOCK;
              const start = new Date(event.startTime);
              const end = new Date(event.endTime);
              return (
                <TouchableOpacity
                  key={event.id}
                  testID={`agenda-event-${event.id}`}
                  onPress={() => onEventPress(event)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: "#F0EDE8",
                  }}
                >
                  <View
                    testID={`event-type-indicator-${event.id}`}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: config.border,
                      marginRight: 12,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontFamily: "PlusJakartaSans_600SemiBold",
                        color: TEXT_PRIMARY,
                      }}
                    >
                      {event.title}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "PlusJakartaSans_400Regular",
                        color: TEXT_SECONDARY,
                        marginTop: 2,
                      }}
                    >
                      {start.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}{" "}
                      –{" "}
                      {end.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <Ionicons
                    name={config.icon as any}
                    size={16}
                    color={config.text}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
