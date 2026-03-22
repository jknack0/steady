import { useEffect, useRef } from "react";
import { TouchableOpacity, Animated } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

interface AnimatedCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  size?: number;
  disabled?: boolean;
}

export function AnimatedCheckbox({
  checked,
  onToggle,
  size = 20,
  disabled = false,
}: AnimatedCheckboxProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const fill = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(fill, {
      toValue: checked ? 1 : 0,
      damping: 15,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  }, [checked]);

  function handlePress() {
    if (disabled) return;

    // Spring scale animation
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 0.8,
        damping: 10,
        stiffness: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1.15,
        damping: 8,
        stiffness: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 12,
        stiffness: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Haptic feedback
    if (!checked) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    onToggle();
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          width: size,
          height: size,
          borderRadius: size * 0.3,
          borderWidth: 2,
          borderColor: checked ? "#8FAE8B" : "#D4D0CB",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#8FAE8B",
            alignItems: "center",
            justifyContent: "center",
            opacity: fill,
          }}
        >
          <Ionicons name="checkmark" size={size * 0.6} color="white" />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}
