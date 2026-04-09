import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { TEAL, TEAL_LIGHT, TEXT_PRIMARY, TEXT_SECONDARY } from "./constants";
import { isToday, isSameDay } from "./helpers";

interface DayPillsProps {
  weekDates: Date[];
  selectedDate: Date | null;
  onDayPress: (date: Date) => void;
}

export function DayPills({ weekDates, selectedDate, onDayPress }: DayPillsProps) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      {weekDates.map((d) => {
        const selected = selectedDate ? isSameDay(d, selectedDate) : false;
        const today = isToday(d);
        return (
          <TouchableOpacity
            key={d.toISOString()}
            style={{
              alignItems: "center",
              paddingVertical: 8,
              paddingHorizontal: 10,
              borderRadius: 16,
              backgroundColor: selected ? TEAL : today ? TEAL_LIGHT : "transparent",
            }}
            onPress={() => onDayPress(d)}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: "PlusJakartaSans_500Medium",
                marginBottom: 4,
                color: selected ? "rgba(255,255,255,0.7)" : TEXT_SECONDARY,
              }}
            >
              {d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)}
            </Text>
            <Text
              style={{
                fontSize: 16,
                fontFamily: "PlusJakartaSans_700Bold",
                color: selected ? "#FFFFFF" : today ? TEAL : TEXT_PRIMARY,
              }}
            >
              {d.getDate()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
