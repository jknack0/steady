import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface StreakData {
  journalingStreak: number;
  checkInStreak: number;
  homeworkStreak: number;
}

const STREAK_CONFIG = [
  {
    key: "journalingStreak" as const,
    label: "Journal",
    icon: "book-outline" as const,
    color: "#8FAE8B",
    bg: "#E8F0E7",
  },
  {
    key: "checkInStreak" as const,
    label: "Check-in",
    icon: "sunny-outline" as const,
    color: "#C4A84D",
    bg: "#F5ECD7",
  },
  {
    key: "homeworkStreak" as const,
    label: "Homework",
    icon: "school-outline" as const,
    color: "#5B8A8A",
    bg: "#E3EDED",
  },
];

/**
 * Calculates streak length from an array of ISO date strings,
 * allowing 1 gap day per 7-day window.
 */
export function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const sorted = [...dates]
    .map((d) => new Date(d).toISOString().slice(0, 10))
    .filter((v, i, a) => a.indexOf(v) === i) // unique dates
    .sort()
    .reverse(); // most recent first

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Must have activity today or yesterday to have an active streak
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  let gapsUsed = 0;
  let windowStart = 0;

  for (let i = 1; i < sorted.length; i++) {
    const current = new Date(sorted[i - 1]);
    const prev = new Date(sorted[i]);
    const diffDays = Math.round(
      (current.getTime() - prev.getTime()) / 86400000
    );

    if (diffDays === 1) {
      // Consecutive day
      streak++;
    } else if (diffDays === 2) {
      // 1 gap day — check if we can forgive it
      // Reset gap counter every 7 days
      if (streak - windowStart >= 7) {
        windowStart = streak;
        gapsUsed = 0;
      }
      if (gapsUsed < 1) {
        gapsUsed++;
        streak += 2; // count both the gap and the previous day
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return streak;
}

export function StreakBadges({ streaks }: { streaks: StreakData }) {
  const hasAnyStreak = STREAK_CONFIG.some((s) => streaks[s.key] > 0);
  if (!hasAnyStreak) return null;

  return (
    <View
      style={{
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
    >
      {STREAK_CONFIG.map((config) => {
        const count = streaks[config.key];
        if (count === 0) return null;

        return (
          <View
            key={config.key}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: config.bg,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: config.color + "22",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 8,
              }}
            >
              <Ionicons name={config.icon} size={14} color={config.color} />
            </View>
            <View>
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "PlusJakartaSans_700Bold",
                  color: config.color,
                }}
              >
                {count}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: "PlusJakartaSans_500Medium",
                  color: config.color,
                  opacity: 0.7,
                }}
              >
                {config.label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
