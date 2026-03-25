import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";
import { useConfig } from "../../../lib/config-context";
import { DailyTrackerCards } from "../../../components/daily-tracker-card";
import { TodaysHomeworkInstances } from "../../../components/homework-instances";

// ── Upcoming Session Card (self-contained with own query) ────────────

function UpcomingSessionCard() {
  const { data } = useQuery({
    queryKey: ["upcoming-session"],
    queryFn: async () => {
      const res = await api.getUpcomingSession();
      if (!res.success) return null;
      return res.data;
    },
    staleTime: 60000,
  });

  if (!data) return null;

  const date = new Date(data.scheduledAt);
  const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const dateStr = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <View style={{
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      padding: 16,
      marginHorizontal: 16,
      marginTop: 12,
      borderWidth: 1,
      borderColor: "#F0EDE8",
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#E3EDED", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
          <Ionicons name="videocam-outline" size={18} color="#5B8A8A" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#2D2D2D" }}>
            Upcoming Session
          </Text>
          <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A" }}>
            {dateStr} at {timeStr}
          </Text>
        </View>
      </View>
      {data.clinicianName && (
        <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", color: "#5A5A5A", marginBottom: 8 }}>
          with {data.clinicianName}
        </Text>
      )}
      {data.videoCallUrl && (
        <TouchableOpacity
          onPress={() => {}}
          style={{
            backgroundColor: "#5B8A8A",
            borderRadius: 10,
            paddingVertical: 10,
            alignItems: "center",
          }}
          activeOpacity={0.8}
        >
          <Text style={{ color: "white", fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 14 }}>
            Join Call
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Program Progress Card ────────────

function ProgramProgressCard() {
  const { data: enrollments } = useQuery({
    queryKey: ["enrollments"],
    queryFn: async () => {
      const res = await api.getEnrollments();
      return res.success ? res.data : [];
    },
    staleTime: 60000,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const active = enrollments?.find((e: any) => e.status === "ACTIVE");

  return (
    <TouchableOpacity
      onPress={() => router.push("/(app)/(tabs)/program")}
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginTop: 12,
        borderWidth: 1,
        borderColor: "#F0EDE8",
      }}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#2D2D2D" }}>
            {active ? active.program.title : "My Program"}
          </Text>
          <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A", marginTop: 2 }}>
            {active ? "Continue where you left off" : "No program yet"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#8A8A8A" />
      </View>
    </TouchableOpacity>
  );
}

// ── Today View ────────────

export default function TodayScreen() {
  const { user } = useAuth();
  const { isModuleEnabled } = useConfig();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F7F5F2" }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5B8A8A" />
      }
    >
      {/* Section 1: Greeting */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 22, fontFamily: "PlusJakartaSans_700Bold", color: "#2D2D2D" }}>
          Hi, {user?.firstName || "there"}
        </Text>
        <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_500Medium", color: "#8A8A8A" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </Text>
      </View>

      {/* Section 2: Daily Check-in */}
      {isModuleEnabled("daily_tracker") && (
        <View style={{ marginHorizontal: 16, marginTop: 4 }}>
          <DailyTrackerCards />
        </View>
      )}

      {/* Section 3: Upcoming Session */}
      <UpcomingSessionCard />

      {/* Section 4: Due Homework */}
      {isModuleEnabled("homework") && (
        <TodaysHomeworkInstances />
      )}

      {/* Section 5: Program Progress */}
      <ProgramProgressCard />

      {/* Bottom spacing */}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}
