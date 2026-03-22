import { useEffect, useState } from "react";
import { View, Text, Modal, TouchableOpacity, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const MILESTONES = [7, 14, 21, 30] as const;

interface MilestoneCelebrationProps {
  currentStreak: number;
  lastCelebratedMilestone: number;
  onDismiss: (milestone: number) => void;
}

const MILESTONE_CONFIG: Record<number, { emoji: string; title: string; message: string; color: string }> = {
  7: {
    emoji: "🌱",
    title: "1 Week Strong!",
    message: "You've shown up for 7 days. Building habits takes consistency, and you're doing it.",
    color: "#8FAE8B",
  },
  14: {
    emoji: "🌿",
    title: "2 Weeks!",
    message: "Two weeks of steady progress. Your commitment is making a real difference.",
    color: "#5B8A8A",
  },
  21: {
    emoji: "🌳",
    title: "3 Weeks!",
    message: "21 days — they say it takes this long to build a habit. You've done it!",
    color: "#5B8A8A",
  },
  30: {
    emoji: "🏆",
    title: "30 Day Milestone!",
    message: "A full month of showing up for yourself. That's something to be truly proud of.",
    color: "#C4A84D",
  },
};

export function MilestoneCelebration({
  currentStreak,
  lastCelebratedMilestone,
  onDismiss,
}: MilestoneCelebrationProps) {
  const [activeMilestone, setActiveMilestone] = useState<number | null>(null);
  const scale = useSharedValue(0);
  const emojiScale = useSharedValue(0);

  useEffect(() => {
    // Find the highest uncelebrated milestone that the streak has reached
    const milestone = MILESTONES.filter(
      (m) => currentStreak >= m && m > lastCelebratedMilestone
    ).pop();

    if (milestone) {
      setActiveMilestone(milestone);
      scale.value = withSpring(1, { damping: 12, stiffness: 150 });
      emojiScale.value = withDelay(
        200,
        withSequence(
          withSpring(1.3, { damping: 6, stiffness: 200 }),
          withSpring(1, { damping: 10, stiffness: 150 })
        )
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [currentStreak, lastCelebratedMilestone]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiScale.value }],
  }));

  if (!activeMilestone) return null;

  const config = MILESTONE_CONFIG[activeMilestone];

  function handleDismiss() {
    scale.value = withSpring(0, { damping: 15 });
    setTimeout(() => {
      onDismiss(activeMilestone!);
      setActiveMilestone(null);
    }, 200);
  }

  return (
    <Modal visible transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 60,
        }}
      >
        <Animated.View
          style={[
            sheetStyle,
            {
              width: SCREEN_WIDTH - 40,
              backgroundColor: "#FFFFFF",
              borderRadius: 24,
              padding: 32,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 24,
              elevation: 12,
            },
          ]}
        >
          <Animated.Text style={[emojiStyle, { fontSize: 56, marginBottom: 16 }]}>
            {config.emoji}
          </Animated.Text>

          <Text
            style={{
              fontSize: 24,
              fontFamily: "PlusJakartaSans_700Bold",
              color: "#2D2D2D",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            {config.title}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: config.color + "15",
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 8,
              marginBottom: 16,
            }}
          >
            <Ionicons name="flame" size={18} color={config.color} />
            <Text
              style={{
                fontSize: 16,
                fontFamily: "PlusJakartaSans_700Bold",
                color: config.color,
                marginLeft: 6,
              }}
            >
              {currentStreak} day streak
            </Text>
          </View>

          <Text
            style={{
              fontSize: 15,
              fontFamily: "PlusJakartaSans_400Regular",
              color: "#5A5A5A",
              textAlign: "center",
              lineHeight: 22,
              marginBottom: 24,
            }}
          >
            {config.message}
          </Text>

          <TouchableOpacity
            style={{
              backgroundColor: config.color,
              borderRadius: 14,
              paddingVertical: 14,
              paddingHorizontal: 48,
            }}
            onPress={handleDismiss}
            activeOpacity={0.8}
          >
            <Text
              style={{
                color: "white",
                fontFamily: "PlusJakartaSans_700Bold",
                fontSize: 16,
              }}
            >
              Keep Going!
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}
