import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { storage } from "../../../lib/storage";
import { api } from "../../../lib/api";
import { ModuleCard, type ProgramData } from "../../../lib/program-components";
import { StreakBadges, calculateStreak } from "../../../components/streak-badges";
import { MilestoneCelebration } from "../../../components/milestone-celebration";

// ── Types ────────────────────────────────────────────

interface Enrollment {
  id: string;
  status: "ACTIVE" | "INVITED";
  program: {
    id: string;
    title: string;
    description: string | null;
    coverImageUrl: string | null;
    cadence: string;
    status: string;
  };
}

// ── Status Badge ─────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config = {
    ACTIVE: { bg: "#E8F0E7", text: "#8FAE8B", label: "Active" },
    INVITED: { bg: "#F5ECD7", text: "#C4A84D", label: "New Invitation" },
  };
  const c =
    config[status as keyof typeof config] || {
      bg: "#F0EDE8",
      text: "#5A5A5A",
      label: status,
    };

  return (
    <View
      style={{
        backgroundColor: c.bg,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 4,
      }}
    >
      <Text
        style={{
          color: c.text,
          fontSize: 12,
          fontFamily: "PlusJakartaSans_600SemiBold",
        }}
      >
        {c.label}
      </Text>
    </View>
  );
}

// ── Enrollment Card (multi-program list) ─────────────

function EnrollmentCard({ enrollment }: { enrollment: Enrollment }) {
  const queryClient = useQueryClient();

  const acceptMutation = useMutation({
    mutationFn: () => api.acceptEnrollment(enrollment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
    },
  });

  const handlePress = () => {
    if (enrollment.status === "ACTIVE") {
      router.push(`/(app)/program/${enrollment.id}`);
    }
  };

  const cadenceLabel =
    enrollment.program.cadence === "WEEKLY"
      ? "Weekly"
      : enrollment.program.cadence === "BIWEEKLY"
        ? "Biweekly"
        : "Self-paced";

  return (
    <TouchableOpacity
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#F0EDE8",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 3,
      }}
      onPress={handlePress}
      disabled={enrollment.status === "INVITED"}
      activeOpacity={0.7}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text
            style={{
              fontSize: 18,
              fontFamily: "PlusJakartaSans_700Bold",
              color: "#2D2D2D",
            }}
            numberOfLines={2}
          >
            {enrollment.program.title}
          </Text>
        </View>
        <StatusBadge status={enrollment.status} />
      </View>

      {enrollment.program.description ? (
        <Text
          style={{
            fontSize: 14,
            fontFamily: "PlusJakartaSans_400Regular",
            color: "#5A5A5A",
            marginBottom: 16,
            lineHeight: 20,
          }}
          numberOfLines={2}
        >
          {enrollment.program.description}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="time-outline" size={14} color="#8A8A8A" />
          <Text
            style={{
              fontSize: 12,
              fontFamily: "PlusJakartaSans_500Medium",
              color: "#8A8A8A",
              marginLeft: 4,
            }}
          >
            {cadenceLabel}
          </Text>
        </View>

        {enrollment.status === "INVITED" ? (
          <TouchableOpacity
            style={{
              borderRadius: 12,
              paddingHorizontal: 20,
              paddingVertical: 10,
              backgroundColor: acceptMutation.isPending
                ? "#7BA3A3"
                : "#5B8A8A",
            }}
            onPress={() => acceptMutation.mutate()}
            disabled={acceptMutation.isPending}
            activeOpacity={0.8}
          >
            {acceptMutation.isPending ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text
                style={{
                  color: "white",
                  fontFamily: "PlusJakartaSans_600SemiBold",
                  fontSize: 14,
                }}
              >
                Accept Invite
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={{
                color: "#5B8A8A",
                fontSize: 14,
                fontFamily: "PlusJakartaSans_600SemiBold",
                marginRight: 4,
              }}
            >
              Open
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#5B8A8A" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Single Program Inline View ───────────────────────

function SingleProgramView({ enrollment }: { enrollment: Enrollment }) {
  // If it's an invitation, show the card instead
  if (enrollment.status === "INVITED") {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: "#F7F5F2" }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      >
        <EnrollmentCard enrollment={enrollment} />
      </ScrollView>
    );
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["program", enrollment.id],
    queryFn: async () => {
      const res = await api.getProgram(enrollment.id);
      if (!res.success) throw new Error(res.error);
      return res.data as ProgramData;
    },
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#5B8A8A" />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: "#F5E6E6",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Ionicons name="cloud-offline-outline" size={28} color="#D4A0A0" />
        </View>
        <Text
          style={{
            fontSize: 18,
            fontFamily: "PlusJakartaSans_600SemiBold",
            color: "#2D2D2D",
            marginBottom: 4,
          }}
        >
          Failed to load program
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: "#5B8A8A",
            borderRadius: 12,
            paddingHorizontal: 24,
            paddingVertical: 12,
            marginTop: 16,
          }}
          onPress={() => refetch()}
          activeOpacity={0.8}
        >
          <Text
            style={{
              color: "white",
              fontFamily: "PlusJakartaSans_600SemiBold",
            }}
          >
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F7F5F2" }}>
      {/* Program header */}
      <View
        style={{
          backgroundColor: "#FFFFFF",
          paddingHorizontal: 20,
          paddingVertical: 20,
          borderBottomWidth: 1,
          borderBottomColor: "#F0EDE8",
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontFamily: "PlusJakartaSans_700Bold",
            color: "#2D2D2D",
          }}
        >
          {data.program.title}
        </Text>
        {data.program.description ? (
          <Text
            style={{
              fontSize: 14,
              fontFamily: "PlusJakartaSans_400Regular",
              color: "#5A5A5A",
              marginTop: 6,
              lineHeight: 20,
            }}
          >
            {data.program.description}
          </Text>
        ) : null}
        <View
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="time-outline" size={14} color="#8A8A8A" />
            <Text
              style={{
                fontSize: 12,
                fontFamily: "PlusJakartaSans_500Medium",
                color: "#8A8A8A",
                marginLeft: 4,
                textTransform: "uppercase",
              }}
            >
              {data.program.cadence}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/(app)/insights")}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            accessibilityRole="button"
            accessibilityLabel="View your insights"
          >
            <Ionicons name="analytics-outline" size={14} color="#5B8A8A" />
            <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_600SemiBold", color: "#5B8A8A" }}>
              My Insights
            </Text>
            <Ionicons name="chevron-forward" size={12} color="#5B8A8A" />
          </Pressable>
        </View>
      </View>

      {/* Modules */}
      <View style={{ padding: 16 }}>
        {data.modules.map((mod) => (
          <ModuleCard
            key={mod.id}
            mod={mod}
            enrollmentId={data.enrollmentId}
            isCurrent={mod.id === data.currentModuleId}
          />
        ))}
      </View>
    </ScrollView>
  );
}

// ── Streak Data Hook ─────────────────────────────────

function useStreaks() {
  const { data } = useQuery({
    queryKey: ["my-stats"],
    queryFn: async () => {
      const res = await api.getMyStats();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    staleTime: 60000,
  });

  if (!data) return null;

  const journalDates: string[] =
    data.journalHeatmap?.map((d: any) => d.date) || [];
  const checkInDates: string[] = data.checkInDates || [];
  const homeworkDates: string[] = data.homeworkCompletionDates || [];

  return {
    journalingStreak: calculateStreak(journalDates),
    checkInStreak: calculateStreak(checkInDates),
    homeworkStreak: calculateStreak(homeworkDates),
  };
}

// ── Main Screen ──────────────────────────────────────

const MILESTONE_STORAGE_KEY = "steady_last_celebrated_milestone";

export default function ProgramScreen() {
  const [lastCelebratedMilestone, setLastCelebratedMilestone] = useState(0);

  useEffect(() => {
    storage.get(MILESTONE_STORAGE_KEY).then((val) => {
      if (val) setLastCelebratedMilestone(parseInt(val, 10));
    });
  }, []);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["enrollments"],
    queryFn: async () => {
      const res = await api.getEnrollments();
      if (!res.success) throw new Error(res.error);
      return res.data as Enrollment[];
    },
  });

  const streaks = useStreaks();
  const maxStreak = streaks
    ? Math.max(
        streaks.journalingStreak,
        streaks.checkInStreak,
        streaks.homeworkStreak
      )
    : 0;

  const isSingleProgram = data?.length === 1;

  function handleMilestoneDismiss(milestone: number) {
    setLastCelebratedMilestone(milestone);
    storage.set(MILESTONE_STORAGE_KEY, String(milestone));
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F5F2" }}>
      <MilestoneCelebration
        currentStreak={maxStreak}
        lastCelebratedMilestone={lastCelebratedMilestone}
        onDismiss={handleMilestoneDismiss}
      />

      {isLoading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color="#5B8A8A" />
        </View>
      ) : isError ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 32,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: "#F5E6E6",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Ionicons name="cloud-offline-outline" size={28} color="#D4A0A0" />
          </View>
          <Text
            style={{
              fontSize: 18,
              fontFamily: "PlusJakartaSans_600SemiBold",
              color: "#2D2D2D",
              marginBottom: 4,
            }}
          >
            Connection Error
          </Text>
          <Text
            style={{
              fontSize: 14,
              fontFamily: "PlusJakartaSans_400Regular",
              color: "#8A8A8A",
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            Could not load your programs. Please try again.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: "#5B8A8A",
              borderRadius: 12,
              paddingHorizontal: 24,
              paddingVertical: 12,
            }}
            onPress={() => refetch()}
            activeOpacity={0.8}
          >
            <Text
              style={{
                color: "white",
                fontFamily: "PlusJakartaSans_600SemiBold",
              }}
            >
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : !data || data.length === 0 ? (
        <ScrollView
          style={{ flex: 1, backgroundColor: "#F7F5F2" }}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#5B8A8A"
            />
          }
        >
          <View
            style={{
              alignItems: "center",
              paddingHorizontal: 32,
              paddingTop: 48,
              paddingBottom: 8,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#E3EDED",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="leaf-outline" size={28} color="#5B8A8A" />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontFamily: "PlusJakartaSans_700Bold",
                color: "#2D2D2D",
                marginBottom: 6,
              }}
            >
              No Program Yet
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "PlusJakartaSans_400Regular",
                color: "#8A8A8A",
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              No program yet — your clinician will enroll you when ready.
            </Text>
          </View>
        </ScrollView>
      ) : isSingleProgram ? (
        <SingleProgramView enrollment={data[0]} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EnrollmentCard enrollment={item} />}
          ListHeaderComponent={
            <Pressable
              onPress={() => router.push("/(app)/insights")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                paddingVertical: 12,
                marginBottom: 12,
                gap: 6,
                borderWidth: 1,
                borderColor: "#F0EDE8",
              }}
              accessibilityRole="button"
              accessibilityLabel="View your insights"
            >
              <Ionicons name="analytics-outline" size={16} color="#5B8A8A" />
              <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#5B8A8A" }}>
                My Insights
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#5B8A8A" />
            </Pressable>
          }
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#5B8A8A"
            />
          }
        />
      )}
    </View>
  );
}
