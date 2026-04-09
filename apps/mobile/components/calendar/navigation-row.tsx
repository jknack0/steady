import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TEAL, TEXT_PRIMARY } from "./constants";

interface NavigationRowProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function NavigationRow({ label, onPrev, onNext, onToday }: NavigationRowProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
      }}
    >
      <TouchableOpacity
        testID="nav-prev"
        onPress={onPrev}
        accessibilityLabel="Previous period"
        style={{
          width: 36,
          height: 36,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          backgroundColor: "#F0EDE8",
        }}
      >
        <Ionicons name="chevron-back" size={18} color={TEAL} />
      </TouchableOpacity>

      <TouchableOpacity
        testID="nav-today"
        onPress={onToday}
        accessibilityLabel="Go to today"
        activeOpacity={0.7}
      >
        <Text
          testID="period-label"
          style={{
            fontSize: 16,
            fontFamily: "PlusJakartaSans_700Bold",
            color: TEXT_PRIMARY,
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="nav-next"
        onPress={onNext}
        accessibilityLabel="Next period"
        style={{
          width: 36,
          height: 36,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          backgroundColor: "#F0EDE8",
        }}
      >
        <Ionicons name="chevron-forward" size={18} color={TEAL} />
      </TouchableOpacity>
    </View>
  );
}
