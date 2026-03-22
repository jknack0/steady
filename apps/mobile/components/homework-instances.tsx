import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../lib/api";
import { HomeworkRenderer } from "./part-renderers";

interface HomeworkInstance {
  id: string;
  partId: string;
  enrollmentId: string;
  dueDate: string;
  status: "PENDING" | "COMPLETED" | "SKIPPED" | "MISSED";
  completedAt: string | null;
  response: any;
  part: {
    id: string;
    title: string;
    content: any;
    type: string;
  };
  enrollment: {
    id: string;
    programId: string;
  };
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalCompleted: number;
  totalInstances: number;
  completionRate: number;
}

function StreakIndicator({ instanceId }: { instanceId: string }) {
  const { data } = useQuery<StreakData>({
    queryKey: ["homework-streak", instanceId],
    queryFn: async () => {
      const res = await api.getHomeworkStreak(instanceId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    staleTime: 60000,
  });

  if (!data || data.currentStreak === 0) return null;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
      <Ionicons name="flame" size={14} color="#E8783A" />
      <Text
        style={{
          fontSize: 12,
          fontFamily: "PlusJakartaSans_600SemiBold",
          color: "#E8783A",
          marginLeft: 4,
        }}
      >
        {data.currentStreak}-day streak
      </Text>
    </View>
  );
}

function InstanceCard({ instance }: { instance: HomeworkInstance }) {
  const queryClient = useQueryClient();

  const completeMutation = useMutation({
    mutationFn: () => api.completeHomeworkInstance(instance.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homework-instances"] });
      queryClient.invalidateQueries({ queryKey: ["homework-streak"] });
    },
  });

  const skipMutation = useMutation({
    mutationFn: () => api.skipHomeworkInstance(instance.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homework-instances"] });
    },
  });

  const isCompleted = instance.status === "COMPLETED";
  const isSkipped = instance.status === "SKIPPED";
  const isMissed = instance.status === "MISSED";
  const isPending = instance.status === "PENDING";

  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: isCompleted ? "#C3DCC3" : "#F0EDE8",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 8,
        }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons
              name="repeat-outline"
              size={16}
              color="#5B8A8A"
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                fontSize: 16,
                fontFamily: "PlusJakartaSans_600SemiBold",
                color: "#2D2D2D",
                flex: 1,
              }}
            >
              {instance.part.title}
            </Text>
          </View>
          <StreakIndicator instanceId={instance.id} />
        </View>
        {isCompleted && (
          <View
            style={{
              backgroundColor: "#E8F5E9",
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontFamily: "PlusJakartaSans_600SemiBold",
                color: "#4CAF50",
              }}
            >
              Done
            </Text>
          </View>
        )}
        {isSkipped && (
          <View
            style={{
              backgroundColor: "#FFF8E1",
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontFamily: "PlusJakartaSans_600SemiBold",
                color: "#F9A825",
              }}
            >
              Skipped
            </Text>
          </View>
        )}
        {isMissed && (
          <View
            style={{
              backgroundColor: "#FFEBEE",
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontFamily: "PlusJakartaSans_600SemiBold",
                color: "#E53935",
              }}
            >
              Missed
            </Text>
          </View>
        )}
      </View>

      {/* Homework items from parent Part content */}
      <HomeworkRenderer content={instance.part.content} />

      {/* Actions */}
      {isPending && (
        <View
          style={{
            flexDirection: "row",
            gap: 10,
            paddingHorizontal: 16,
            paddingBottom: 14,
          }}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: "#5B8A8A",
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
            }}
            onPress={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
          >
            {completeMutation.isPending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                  color: "white",
                }}
              >
                Mark Complete
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#D4D0CB",
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={() => skipMutation.mutate()}
            disabled={skipMutation.isPending}
          >
            <Text
              style={{
                fontSize: 14,
                fontFamily: "PlusJakartaSans_500Medium",
                color: "#8A8A8A",
              }}
            >
              Skip
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export function TodaysHomeworkInstances() {
  const today = new Date().toISOString().split("T")[0];

  const { data, isLoading } = useQuery<HomeworkInstance[]>({
    queryKey: ["homework-instances", today],
    queryFn: async () => {
      const res = await api.getHomeworkInstances({ date: today });
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
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Ionicons
          name="repeat-outline"
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
          Today&apos;s Recurring Homework
        </Text>
      </View>
      {data.map((instance) => (
        <InstanceCard key={instance.id} instance={instance} />
      ))}
    </View>
  );
}
