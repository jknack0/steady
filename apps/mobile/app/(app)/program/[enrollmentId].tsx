import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";

interface Part {
  id: string;
  type: string;
  title: string;
  isRequired: boolean;
  content: any;
  sortOrder: number;
  progressStatus: string;
  completedAt: string | null;
}

interface Module {
  id: string;
  title: string;
  sortOrder: number;
  status: "LOCKED" | "UNLOCKED" | "COMPLETED";
  unlockedAt: string | null;
  completedAt: string | null;
  parts: Part[];
}

interface ProgramData {
  enrollmentId: string;
  status: string;
  currentModuleId: string | null;
  program: {
    id: string;
    title: string;
    description: string | null;
    cadence: string;
  };
  modules: Module[];
}

function ModuleStatusIcon({ status }: { status: string }) {
  if (status === "COMPLETED") {
    return (
      <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center">
        <Text className="text-green-600 font-bold text-sm">+</Text>
      </View>
    );
  }
  if (status === "UNLOCKED") {
    return (
      <View className="w-8 h-8 rounded-full bg-indigo-100 items-center justify-center">
        <Text className="text-indigo-600 font-bold text-sm">*</Text>
      </View>
    );
  }
  return (
    <View className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center">
      <Text className="text-gray-400 font-bold text-sm">L</Text>
    </View>
  );
}

function PartRow({
  part,
  enrollmentId,
  moduleStatus,
}: {
  part: Part;
  enrollmentId: string;
  moduleStatus: string;
}) {
  const isAccessible = moduleStatus !== "LOCKED";
  const isCompleted = part.progressStatus === "COMPLETED";

  return (
    <TouchableOpacity
      className={`flex-row items-center py-3 px-4 border-b border-gray-50 ${!isAccessible ? "opacity-40" : ""}`}
      onPress={() => {
        if (isAccessible) {
          router.push({
            pathname: "/(app)/part/[partId]",
            params: { partId: part.id, enrollmentId },
          });
        }
      }}
      disabled={!isAccessible}
    >
      <View
        className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
          isCompleted ? "bg-green-500 border-green-500" : "border-gray-300"
        }`}
      >
        {isCompleted ? <Text className="text-white text-xs">+</Text> : null}
      </View>
      <View className="flex-1">
        <Text className={`text-sm ${isCompleted ? "text-gray-400 line-through" : "text-gray-900"}`}>
          {part.title || partTypeLabel(part.type)}
        </Text>
      </View>
      {part.isRequired ? (
        <Text className="text-xs text-gray-400">Required</Text>
      ) : null}
    </TouchableOpacity>
  );
}

function partTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    TEXT: "Reading",
    VIDEO: "Video",
    STRATEGY_CARDS: "Strategy Cards",
    JOURNAL_PROMPT: "Journal",
    CHECKLIST: "Checklist",
    RESOURCE_LINK: "Resource",
    DIVIDER: "Section Break",
  };
  return labels[type] || type;
}

function ModuleCard({
  mod,
  enrollmentId,
  isCurrent,
}: {
  mod: Module;
  enrollmentId: string;
  isCurrent: boolean;
}) {
  const completedCount = mod.parts.filter((p) => p.progressStatus === "COMPLETED").length;
  const totalParts = mod.parts.length;

  return (
    <View
      className={`bg-white rounded-xl mb-4 overflow-hidden border ${
        isCurrent ? "border-indigo-300" : "border-gray-100"
      }`}
    >
      <View className="flex-row items-center p-4">
        <ModuleStatusIcon status={mod.status} />
        <View className="flex-1 ml-3">
          <Text className="text-base font-semibold text-gray-900">{mod.title}</Text>
          <Text className="text-xs text-gray-400 mt-0.5">
            {mod.status === "LOCKED"
              ? "Locked"
              : `${completedCount}/${totalParts} completed`}
          </Text>
        </View>
        {isCurrent ? (
          <View className="bg-indigo-50 rounded-full px-2.5 py-0.5">
            <Text className="text-xs text-indigo-600 font-medium">Current</Text>
          </View>
        ) : null}
      </View>

      {mod.status !== "LOCKED" ? (
        <View className="border-t border-gray-50">
          {mod.parts.map((part) => (
            <PartRow
              key={part.id}
              part={part}
              enrollmentId={enrollmentId}
              moduleStatus={mod.status}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function ProgramScreen() {
  const { enrollmentId } = useLocalSearchParams<{ enrollmentId: string }>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["program", enrollmentId],
    queryFn: async () => {
      const res = await api.getProgram(enrollmentId!);
      if (!res.success) throw new Error(res.error);
      return res.data as ProgramData;
    },
    enabled: !!enrollmentId,
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8">
        <Text className="text-gray-500 mb-4">Failed to load program</Text>
        <TouchableOpacity className="bg-indigo-600 rounded-lg px-6 py-2" onPress={() => refetch()}>
          <Text className="text-white font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: data.program.title }} />
      <ScrollView className="flex-1 bg-gray-50">
        {/* Program header */}
        <View className="bg-white px-4 py-5 border-b border-gray-100">
          <Text className="text-xl font-bold text-gray-900">{data.program.title}</Text>
          {data.program.description ? (
            <Text className="text-sm text-gray-500 mt-1">{data.program.description}</Text>
          ) : null}
          <Text className="text-xs text-gray-400 uppercase mt-2">{data.program.cadence}</Text>
        </View>

        {/* Modules */}
        <View className="p-4">
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
    </>
  );
}
