import { useEffect, useRef } from "react";
import { View, Text, Modal, TouchableOpacity, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import ConfettiCannon from "react-native-confetti-cannon";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ModuleCompletionOverlayProps {
  visible: boolean;
  moduleTitle: string;
  clinicianMessage?: string | null;
  onDismiss: () => void;
}

export function ModuleCompletionOverlay({
  visible,
  moduleTitle,
  clinicianMessage,
  onDismiss,
}: ModuleCompletionOverlayProps) {
  const confettiRef = useRef<any>(null);
  const contentScale = useSharedValue(0);
  const checkScale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      contentScale.value = withDelay(
        300,
        withSpring(1, { damping: 10, stiffness: 120 })
      );
      checkScale.value = withDelay(
        500,
        withSequence(
          withSpring(1.2, { damping: 6, stiffness: 200 }),
          withSpring(1, { damping: 10, stiffness: 150 })
        )
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => confettiRef.current?.start(), 100);
    } else {
      contentScale.value = 0;
      checkScale.value = 0;
    }
  }, [visible]);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: contentScale.value }],
    opacity: contentScale.value,
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const message =
    clinicianMessage ||
    "Great work completing this module! Take a moment to appreciate your progress.";

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(45, 45, 45, 0.85)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ConfettiCannon
          ref={confettiRef}
          count={120}
          origin={{ x: SCREEN_WIDTH / 2, y: -20 }}
          autoStart={false}
          fadeOut
          fallSpeed={2500}
          explosionSpeed={400}
          colors={["#5B8A8A", "#8FAE8B", "#C4A84D", "#D4A0A0", "#89B4C8", "#F5ECD7"]}
        />

        <Animated.View
          style={[
            contentStyle,
            {
              width: SCREEN_WIDTH - 48,
              backgroundColor: "#FFFFFF",
              borderRadius: 28,
              padding: 36,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.2,
              shadowRadius: 32,
              elevation: 16,
            },
          ]}
        >
          {/* Checkmark circle */}
          <Animated.View
            style={[
              checkStyle,
              {
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: "#8FAE8B",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
                shadowColor: "#8FAE8B",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
              },
            ]}
          >
            <Text style={{ fontSize: 36, color: "white" }}>✓</Text>
          </Animated.View>

          <Text
            style={{
              fontSize: 14,
              fontFamily: "PlusJakartaSans_600SemiBold",
              color: "#8FAE8B",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            Module Complete
          </Text>

          <Text
            style={{
              fontSize: 22,
              fontFamily: "PlusJakartaSans_700Bold",
              color: "#2D2D2D",
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            {moduleTitle}
          </Text>

          <Text
            style={{
              fontSize: 15,
              fontFamily: "PlusJakartaSans_400Regular",
              color: "#5A5A5A",
              textAlign: "center",
              lineHeight: 22,
              marginBottom: 28,
            }}
          >
            {message}
          </Text>

          <TouchableOpacity
            style={{
              backgroundColor: "#5B8A8A",
              borderRadius: 14,
              paddingVertical: 14,
              paddingHorizontal: 48,
              width: "100%",
              alignItems: "center",
            }}
            onPress={onDismiss}
            activeOpacity={0.8}
          >
            <Text
              style={{
                color: "white",
                fontFamily: "PlusJakartaSans_700Bold",
                fontSize: 16,
              }}
            >
              Continue
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}
