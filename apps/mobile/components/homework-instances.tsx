import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useState, useCallback, useRef, useEffect } from "react";
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

function getCompletedItemCount(responses: Record<string, any>, items: any[]): number {
  let count = 0;
  for (const item of items) {
    const key = String(item.sortOrder ?? items.indexOf(item));
    const r = responses[key];
    if (!r) continue;
    switch (r.type) {
      case "ACTION": if (r.completed) count++; break;
      case "JOURNAL_PROMPT": if (r.entries?.some((e: string) => e?.trim())) count++; break;
      case "WORKSHEET": if (r.rows?.some((row: any) => Object.values(row).some((v: any) => v?.trim?.()))) count++; break;
      case "CHOICE": if (r.selectedIndex >= 0) count++; break;
      case "RESOURCE_REVIEW": if (r.reviewed) count++; break;
      case "RATING_SCALE": if (r.value >= 0) count++; break;
      case "TIMER": if (r.completed || r.elapsedSeconds > 0) count++; break;
      case "MOOD_CHECK": if (r.mood) count++; break;
      case "HABIT_TRACKER": if (r.done !== undefined) count++; break;
      case "BRING_TO_SESSION": if (r.acknowledged) count++; break;
      case "FREE_TEXT_NOTE": if (r.acknowledged) count++; break;
    }
  }
  return count;
}

function InstanceCard({ instance }: { instance: HomeworkInstance }) {
  const queryClient = useQueryClient();
  const [responses, setResponses] = useState<Record<string, any>>(
    (instance.response as Record<string, any>) || {}
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responsesRef = useRef(responses);
  responsesRef.current = responses;

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, any>) => api.saveHomeworkResponse(instance.id, data),
    onSuccess: () => setSaveStatus("saved"),
    onError: () => setSaveStatus("idle"),
  });

  const handleResponseChange = useCallback((key: string, value: any) => {
    setResponses((prev) => {
      const next = { ...prev, [key]: value };
      responsesRef.current = next;
      return next;
    });
    setSaveStatus("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveMutation.mutate(responsesRef.current);
    }, 2000);
  }, []);

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        // Fire a final save
        if (Object.keys(responsesRef.current).length > 0) {
          api.saveHomeworkResponse(instance.id, responsesRef.current);
        }
      }
    };
  }, [instance.id]);

  const completeMutation = useMutation({
    mutationFn: () => {
      // Cancel pending debounce
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return api.completeHomeworkInstance(instance.id, Object.keys(responses).length > 0 ? responses : null);
    },
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
  const readOnly = !isPending;

  const items = instance.part.content?.items || [];
  const totalItems = items.length;
  const completedItems = getCompletedItemCount(responses, items);

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
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 8 }}>
            <StreakIndicator instanceId={instance.id} />
            {isPending && totalItems > 0 && (
              <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", color: "#8A8A8A" }}>
                {completedItems}/{totalItems} items
              </Text>
            )}
            {isPending && saveStatus === "saving" && (
              <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A" }}>Saving...</Text>
            )}
            {isPending && saveStatus === "saved" && (
              <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_400Regular", color: "#5B8A8A" }}>Saved</Text>
            )}
          </View>
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

      {/* Homework items — interactive */}
      <HomeworkRenderer
        content={instance.part.content}
        responses={responses}
        onResponseChange={handleResponseChange}
        readOnly={readOnly}
      />

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
