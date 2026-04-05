import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { TEAL, TEXT_SECONDARY } from "./constants";
import type { ViewMode } from "./helpers";

interface SegmentedControlProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const SEGMENTS: { key: ViewMode; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

export function SegmentedControl({ value, onChange }: SegmentedControlProps) {
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        backgroundColor: "#F0EDE8",
        borderRadius: 10,
        padding: 3,
      }}
    >
      {SEGMENTS.map((seg) => {
        const active = seg.key === value;
        return (
          <TouchableOpacity
            key={seg.key}
            testID={`segment-${seg.key}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${seg.label} view`}
            onPress={() => {
              if (!active) onChange(seg.key);
            }}
            activeOpacity={0.7}
            style={{
              flex: 1,
              paddingVertical: 8,
              alignItems: "center",
              borderRadius: 8,
              backgroundColor: active ? TEAL : "transparent",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontFamily: "PlusJakartaSans_600SemiBold",
                color: active ? "#FFFFFF" : TEXT_SECONDARY,
              }}
            >
              {seg.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
