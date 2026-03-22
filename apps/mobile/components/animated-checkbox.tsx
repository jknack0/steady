import { useEffect } from "react";
import { TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  runOnJS,
} from "react-native-reanimated";
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
  const scale = useSharedValue(1);
  const bgOpacity = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    bgOpacity.value = withSpring(checked ? 1 : 0, { damping: 15, stiffness: 200 });
  }, [checked]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  function handlePress() {
    if (disabled) return;

    // Spring scale animation
    scale.value = withSequence(
      withSpring(0.8, { damping: 10, stiffness: 400 }),
      withSpring(1.15, { damping: 8, stiffness: 300 }),
      withSpring(1, { damping: 12, stiffness: 200 })
    );

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
        style={[
          containerStyle,
          {
            width: size,
            height: size,
            borderRadius: size * 0.3,
            borderWidth: 2,
            borderColor: checked ? "#8FAE8B" : "#D4D0CB",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          },
        ]}
      >
        <Animated.View
          style={[
            fillStyle,
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "#8FAE8B",
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
        >
          <Ionicons name="checkmark" size={size * 0.6} color="white" />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}
