import { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import {
  TextRenderer,
  VideoRenderer,
  StrategyCardsRenderer,
  JournalPromptRenderer,
  ChecklistRenderer,
  ResourceLinkRenderer,
  DividerRenderer,
  HomeworkRenderer,
} from "../../../components/part-renderers";

interface PartData {
  id: string;
  type: string;
  title: string;
  isRequired: boolean;
  content: any;
  sortOrder: number;
  progressStatus: string;
  completedAt: string | null;
  responseData: any;
}

export default function PartScreen() {
  const { partId, enrollmentId } = useLocalSearchParams<{
    partId: string;
    enrollmentId: string;
  }>();
  const queryClient = useQueryClient();

  // Local state for interactive parts
  const [journalResponses, setJournalResponses] = useState<Record<number, string>>({});
  const [checklistState, setChecklistState] = useState<Record<number, boolean>>({});

  // Fetch program data to find the specific part
  const { data: programData, isLoading } = useQuery({
    queryKey: ["program", enrollmentId],
    queryFn: async () => {
      const res = await api.getProgram(enrollmentId!);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    enabled: !!enrollmentId,
  });

  // Find the part in the program data
  const part: PartData | undefined = programData?.modules
    ?.flatMap((m: any) => m.parts)
    ?.find((p: any) => p.id === partId);

  const markCompleteMutation = useMutation({
    mutationFn: async () => {
      const responseData = buildResponseData();
      const res = await api.markPartComplete(partId!, enrollmentId!, responseData);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["program", enrollmentId] });
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });

      if (data?.moduleCompleted) {
        Alert.alert(
          "Module Complete!",
          "Great work! The next module has been unlocked.",
          [{ text: "Continue", onPress: () => router.back() }]
        );
      } else {
        router.back();
      }
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to mark as complete");
    },
  });

  const buildResponseData = useCallback(() => {
    if (!part) return undefined;

    if (part.type === "JOURNAL_PROMPT" && Object.keys(journalResponses).length > 0) {
      return { journalResponses };
    }
    if (part.type === "CHECKLIST" && Object.keys(checklistState).length > 0) {
      return { checklistState };
    }
    return undefined;
  }, [part, journalResponses, checklistState]);

  if (isLoading || !part) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const isCompleted = part.progressStatus === "COMPLETED";

  return (
    <>
      <Stack.Screen options={{ title: part.title || partTypeLabel(part.type) }} />
      <View className="flex-1 bg-white">
        <ScrollView className="flex-1">
          {/* Part header */}
          <View className="px-4 pt-4 pb-2">
            <Text className="text-xl font-bold text-gray-900">{part.title}</Text>
            <View className="flex-row items-center mt-1">
              <Text className="text-xs text-gray-400 uppercase mr-2">
                {partTypeLabel(part.type)}
              </Text>
              {part.isRequired ? (
                <Text className="text-xs text-amber-600 font-medium">Required</Text>
              ) : null}
              {isCompleted ? (
                <View className="bg-green-100 rounded-full px-2 py-0.5 ml-2">
                  <Text className="text-xs text-green-700 font-medium">Completed</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Content renderer */}
          {renderContent(part, journalResponses, setJournalResponses, checklistState, setChecklistState)}
        </ScrollView>

        {/* Bottom action bar */}
        {!isCompleted && part.type !== "DIVIDER" ? (
          <View className="px-4 py-4 border-t border-gray-100 bg-white">
            <TouchableOpacity
              className={`rounded-lg py-3.5 items-center ${
                markCompleteMutation.isPending ? "bg-indigo-400" : "bg-indigo-600"
              }`}
              onPress={() => markCompleteMutation.mutate()}
              disabled={markCompleteMutation.isPending}
            >
              {markCompleteMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-base">Mark as Complete</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </>
  );
}

function renderContent(
  part: PartData,
  journalResponses: Record<number, string>,
  setJournalResponses: (r: Record<number, string>) => void,
  checklistState: Record<number, boolean>,
  setChecklistState: (r: Record<number, boolean>) => void
) {
  const content = part.content;
  if (!content) return null;

  switch (part.type) {
    case "TEXT":
      return <TextRenderer content={content} />;
    case "VIDEO":
      return <VideoRenderer content={content} />;
    case "STRATEGY_CARDS":
      return <StrategyCardsRenderer content={content} />;
    case "JOURNAL_PROMPT":
      return (
        <JournalPromptRenderer
          content={content}
          responses={journalResponses}
          onResponseChange={(index, text) =>
            setJournalResponses({ ...journalResponses, [index]: text })
          }
        />
      );
    case "CHECKLIST":
      return (
        <ChecklistRenderer
          content={content}
          checked={checklistState}
          onToggle={(index) =>
            setChecklistState({ ...checklistState, [index]: !checklistState[index] })
          }
        />
      );
    case "RESOURCE_LINK":
      return <ResourceLinkRenderer content={content} />;
    case "DIVIDER":
      return <DividerRenderer content={content} />;
    case "HOMEWORK":
      return <HomeworkRenderer content={content} />;
    default:
      return (
        <View className="px-4 py-6 items-center">
          <Text className="text-gray-400">Content type "{part.type}" is coming soon</Text>
        </View>
      );
  }
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
    HOMEWORK: "Homework",
    ASSESSMENT: "Assessment",
    INTAKE_FORM: "Intake Form",
    SMART_GOALS: "SMART Goals",
  };
  return labels[type] || type;
}
