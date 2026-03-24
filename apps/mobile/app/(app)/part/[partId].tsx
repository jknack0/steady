import { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { ModuleCompletionOverlay } from "../../../components/module-completion-overlay";
import {
  TextRenderer,
  VideoRenderer,
  StrategyCardsRenderer,
  JournalPromptRenderer,
  ChecklistRenderer,
  ResourceLinkRenderer,
  DividerRenderer,
  HomeworkRenderer,
  AssessmentRenderer,
  IntakeFormRenderer,
  SmartGoalsRenderer,
  StyledContentRenderer,
  PdfRenderer,
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
  const insets = useSafeAreaInsets();

  // Local state for interactive parts
  const [journalResponses, setJournalResponses] = useState<Record<number, string>>({});
  const [checklistState, setChecklistState] = useState<Record<number, boolean>>({});
  const [assessmentResponses, setAssessmentResponses] = useState<Record<number, any>>({});
  const [intakeResponses, setIntakeResponses] = useState<Record<string, any>>({});
  const [smartGoalResponses, setSmartGoalResponses] = useState<Record<string, any>>({});

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

  const [completedModule, setCompletedModule] = useState<{
    title: string;
    message?: string | null;
  } | null>(null);

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
        setCompletedModule({
          title: data.moduleTitle || "Module",
          message: data.clinicianMessage || null,
        });
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
    if (part.type === "ASSESSMENT" && Object.keys(assessmentResponses).length > 0) {
      return { assessmentResponses };
    }
    if (part.type === "INTAKE_FORM" && Object.keys(intakeResponses).length > 0) {
      return { intakeResponses };
    }
    if (part.type === "SMART_GOALS" && Object.keys(smartGoalResponses).length > 0) {
      return { smartGoalResponses };
    }
    return undefined;
  }, [part, journalResponses, checklistState, assessmentResponses, intakeResponses, smartGoalResponses]);

  if (isLoading || !part) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" }}>
        <ActivityIndicator size="large" color="#5B8A8A" />
      </View>
    );
  }

  const isCompleted = part.progressStatus === "COMPLETED";

  return (
    <>
      <Stack.Screen options={{ title: part.title || partTypeLabel(part.type) }} />
      <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* Part header */}
          <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
            <Text style={{ fontSize: 20, fontFamily: "PlusJakartaSans_700Bold", color: "#2D2D2D" }}>{part.title}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
              <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", color: "#8A8A8A", textTransform: "uppercase", marginRight: 8 }}>
                {partTypeLabel(part.type)}
              </Text>
              {part.isRequired ? (
                <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", color: "#D4A0A0" }}>Required</Text>
              ) : null}
              {isCompleted ? (
                <View style={{ backgroundColor: "#E8F0E7", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 }}>
                  <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", color: "#729070" }}>Completed</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Content renderer */}
          {renderContent(
            part,
            journalResponses, setJournalResponses,
            checklistState, setChecklistState,
            assessmentResponses, setAssessmentResponses,
            intakeResponses, setIntakeResponses,
            smartGoalResponses, setSmartGoalResponses,
          )}
        </ScrollView>

        {/* Bottom action bar */}
        {!isCompleted && part.type !== "DIVIDER" ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 + insets.bottom, borderTopWidth: 1, borderTopColor: "#F0EDE8", backgroundColor: "#FFFFFF" }}>
            <TouchableOpacity
              style={{
                borderRadius: 10,
                paddingVertical: 14,
                alignItems: "center",
                backgroundColor: markCompleteMutation.isPending ? "#7BA3A3" : "#5B8A8A",
              }}
              onPress={() => markCompleteMutation.mutate()}
              disabled={markCompleteMutation.isPending}
            >
              {markCompleteMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ color: "white", fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 16 }}>Mark as Complete</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        <ModuleCompletionOverlay
          visible={!!completedModule}
          moduleTitle={completedModule?.title || ""}
          clinicianMessage={completedModule?.message}
          onDismiss={() => {
            setCompletedModule(null);
            router.back();
          }}
        />
      </View>
    </>
  );
}

function renderContent(
  part: PartData,
  journalResponses: Record<number, string>,
  setJournalResponses: (r: Record<number, string>) => void,
  checklistState: Record<number, boolean>,
  setChecklistState: (r: Record<number, boolean>) => void,
  assessmentResponses: Record<number, any>,
  setAssessmentResponses: (r: Record<number, any>) => void,
  intakeResponses: Record<string, any>,
  setIntakeResponses: (r: Record<string, any>) => void,
  smartGoalResponses: Record<string, any>,
  setSmartGoalResponses: (r: Record<string, any>) => void,
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
    case "ASSESSMENT":
      return (
        <AssessmentRenderer
          content={content}
          responses={assessmentResponses}
          onResponseChange={(index, value) =>
            setAssessmentResponses({ ...assessmentResponses, [index]: value })
          }
        />
      );
    case "INTAKE_FORM":
      return (
        <IntakeFormRenderer
          content={content}
          responses={intakeResponses}
          onResponseChange={(key, value) =>
            setIntakeResponses({ ...intakeResponses, [key]: value })
          }
        />
      );
    case "SMART_GOALS":
      return (
        <SmartGoalsRenderer
          content={content}
          responses={smartGoalResponses}
          onResponseChange={(key, value) =>
            setSmartGoalResponses({ ...smartGoalResponses, [key]: value })
          }
        />
      );
    case "STYLED_CONTENT":
      return <StyledContentRenderer content={content} />;
    case "PDF":
      return <PdfRenderer content={content} />;
    default:
      return (
        <View style={{ paddingHorizontal: 16, paddingVertical: 24, alignItems: "center" }}>
          <Text style={{ color: "#8A8A8A", fontFamily: "PlusJakartaSans_400Regular" }}>Content type "{part.type}" is not supported</Text>
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
    STYLED_CONTENT: "Content",
    PDF: "PDF",
  };
  return labels[type] || type;
}
