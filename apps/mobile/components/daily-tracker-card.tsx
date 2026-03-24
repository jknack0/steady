import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../lib/api";

interface TrackerWithStatus {
  id: string;
  name: string;
  description: string | null;
  fields: Array<{ id: string; label: string; fieldType: string }>;
  completedToday: boolean;
}

function TrackerCard({ tracker }: { tracker: TrackerWithStatus }) {
  const { data: streakData } = useQuery({
    queryKey: ["tracker-streak", tracker.id],
    queryFn: async () => {
      const res = await api.getTrackerStreak(tracker.id);
      if (!res.success) return null;
      return res.data;
    },
    staleTime: 60000,
  });

  return (
    <TouchableOpacity
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: tracker.completedToday ? "#C3DCC3" : "#F0EDE8",
      }}
      activeOpacity={0.7}
      onPress={() => router.push(`/(app)/tracker/${tracker.id}`)}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: tracker.completedToday ? "#E8F5E9" : "#E3EDED",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Ionicons
                name={tracker.completedToday ? "checkmark-circle" : "clipboard-outline"}
                size={18}
                color={tracker.completedToday ? "#4CAF50" : "#5B8A8A"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                  color: "#2D2D2D",
                }}
              >
                {tracker.name}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "PlusJakartaSans_400Regular",
                  color: tracker.completedToday ? "#4CAF50" : "#8A8A8A",
                  marginTop: 2,
                }}
              >
                {tracker.completedToday
                  ? "Completed today"
                  : `${tracker.fields.length} fields to fill out`}
              </Text>
            </View>
          </View>

          {streakData?.streak > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
              <Ionicons name="flame" size={14} color="#E8783A" />
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                  color: "#E8783A",
                  marginLeft: 4,
                }}
              >
                {streakData.streak}-day streak
              </Text>
            </View>
          )}
        </View>

        {!tracker.completedToday && (
          <Ionicons name="chevron-forward" size={20} color="#D4D0CB" />
        )}
      </View>
    </TouchableOpacity>
  );
}

export function DailyTrackerCards() {
  const { data, isLoading } = useQuery<TrackerWithStatus[]>({
    queryKey: ["participant-daily-trackers"],
    queryFn: async () => {
      const res = await api.getDailyTrackers();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <View style={{ paddingVertical: 16, alignItems: "center" }}>
        <ActivityIndicator size="small" color="#5B8A8A" />
      </View>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <View style={{ marginTop: 16, paddingHorizontal: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Ionicons
          name="clipboard-outline"
          size={18}
          color="#5B8A8A"
          style={{ marginRight: 8 }}
        />
        <Text
          style={{
            fontSize: 17,
            fontFamily: "PlusJakartaSans_700Bold",
            color: "#2D2D2D",
          }}
        >
          Daily Pulse
        </Text>
      </View>
      {data.map((tracker) => (
        <TrackerCard key={tracker.id} tracker={tracker} />
      ))}
    </View>
  );
}
