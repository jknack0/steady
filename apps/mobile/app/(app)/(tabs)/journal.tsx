import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";

interface JournalEntry {
  id: string;
  entryDate: string;
  freeformContent: string | null;
  regulationScore: number | null;
  responses: any;
  isSharedWithClinician: boolean;
}

const REGULATION_LABELS: Record<number, string> = {
  1: "Very dysregulated",
  2: "Quite dysregulated",
  3: "Somewhat dysregulated",
  4: "Slightly dysregulated",
  5: "Neutral",
  6: "Slightly regulated",
  7: "Somewhat regulated",
  8: "Fairly regulated",
  9: "Well regulated",
  10: "Fully regulated",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function getTodayStr() {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

export default function JournalScreen() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"today" | "history">("today");
  const [content, setContent] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [shareWithClinician, setShareWithClinician] = useState(false);
  const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const todayStr = getTodayStr();

  // Load today's entry
  const { data: todayEntry, isLoading: loadingToday } = useQuery({
    queryKey: ["journal", todayStr],
    queryFn: async () => {
      const res = await api.getJournalEntry(todayStr);
      if (!res.success) throw new Error(res.error);
      return res.data as JournalEntry | null;
    },
  });

  // Load history
  const { data: history, isLoading: loadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ["journal-history"],
    queryFn: async () => {
      const res = await api.getJournalEntries();
      if (!res.success) throw new Error(res.error);
      return res.data as JournalEntry[];
    },
    enabled: view === "history",
  });

  // Populate form when today's entry loads
  useEffect(() => {
    if (todayEntry) {
      setContent(todayEntry.freeformContent || "");
      setScore(todayEntry.regulationScore);
      setShareWithClinician(todayEntry.isSharedWithClinician);
    }
  }, [todayEntry?.id]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.saveJournalEntry({
        entryDate: todayStr,
        freeformContent: content,
        regulationScore: score ?? undefined,
        isSharedWithClinician: shareWithClinician,
      });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      queryClient.invalidateQueries({ queryKey: ["journal-history"] });
    },
  });

  // Auto-save with 2s debounce
  const debounceSave = useCallback(() => {
    if (saveTimer) clearTimeout(saveTimer);
    const timer = setTimeout(() => {
      saveMutation.mutate();
    }, 2000);
    setSaveTimer(timer);
  }, [content, score, shareWithClinician]);

  const handleContentChange = (text: string) => {
    setContent(text);
    debounceSave();
  };

  const handleScoreChange = (s: number) => {
    setScore(score === s ? null : s);
    // Save immediately on score change
    setTimeout(() => saveMutation.mutate(), 100);
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* View toggle */}
      <View className="flex-row px-4 py-2 bg-white border-b border-gray-200">
        <TouchableOpacity
          className={`px-4 py-1.5 mr-2 rounded-full ${view === "today" ? "bg-indigo-600" : "bg-gray-100"}`}
          onPress={() => setView("today")}
        >
          <Text className={`text-sm font-medium ${view === "today" ? "text-white" : "text-gray-600"}`}>
            Today
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`px-4 py-1.5 rounded-full ${view === "history" ? "bg-indigo-600" : "bg-gray-100"}`}
          onPress={() => setView("history")}
        >
          <Text className={`text-sm font-medium ${view === "history" ? "text-white" : "text-gray-600"}`}>
            History
          </Text>
        </TouchableOpacity>

        {view === "today" && (
          <View className="flex-1 items-end justify-center">
            <Text className="text-xs text-gray-400">
              {saveMutation.isPending ? "Saving..." : saveMutation.isSuccess ? "Saved" : ""}
            </Text>
          </View>
        )}
      </View>

      {view === "today" ? (
        <ScrollView className="flex-1 px-4 py-4">
          {/* Regulation Score */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <Text className="text-base font-semibold text-gray-800 mb-1">
              How regulated do you feel?
            </Text>
            <Text className="text-sm text-gray-500 mb-3">
              {score ? REGULATION_LABELS[score] : "Tap a number to rate"}
            </Text>

            <View className="flex-row justify-between">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <TouchableOpacity
                  key={n}
                  className={`w-8 h-8 rounded-full items-center justify-center ${
                    score === n
                      ? n <= 3
                        ? "bg-red-500"
                        : n <= 6
                        ? "bg-yellow-500"
                        : "bg-green-500"
                      : "bg-gray-100"
                  }`}
                  onPress={() => handleScoreChange(n)}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      score === n ? "text-white" : "text-gray-600"
                    }`}
                  >
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View className="flex-row justify-between mt-1">
              <Text className="text-xs text-gray-400">Dysregulated</Text>
              <Text className="text-xs text-gray-400">Regulated</Text>
            </View>
          </View>

          {/* Journal content */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <Text className="text-base font-semibold text-gray-800 mb-2">Daily Reflection</Text>
            <TextInput
              className="text-base text-gray-700 min-h-[200px]"
              placeholder="How was your day? What went well? What was challenging?&#10;&#10;Take a moment to reflect..."
              value={content}
              onChangeText={handleContentChange}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Share toggle */}
          <TouchableOpacity
            className="bg-white rounded-xl p-4 mb-4 shadow-sm flex-row items-center"
            onPress={() => {
              setShareWithClinician(!shareWithClinician);
              setTimeout(() => saveMutation.mutate(), 100);
            }}
          >
            <View
              className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center ${
                shareWithClinician ? "bg-indigo-600 border-indigo-600" : "border-gray-300"
              }`}
            >
              {shareWithClinician && <Text className="text-white text-xs">✓</Text>}
            </View>
            <View className="flex-1">
              <Text className="text-base text-gray-800">Share with clinician</Text>
              <Text className="text-sm text-gray-500">Your clinician can view this entry</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          className="flex-1"
          refreshControl={<RefreshControl refreshing={loadingHistory} onRefresh={refetchHistory} />}
        >
          {!history || history.length === 0 ? (
            <View className="items-center py-16">
              <Text className="text-4xl mb-3">📝</Text>
              <Text className="text-gray-500">No journal entries yet</Text>
              <Text className="text-gray-400 text-sm mt-1">Start writing today</Text>
            </View>
          ) : (
            <View className="px-4 py-3 space-y-3">
              {history.map((entry) => (
                <View key={entry.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-sm font-semibold text-gray-800">
                      {formatDate(entry.entryDate)}
                    </Text>
                    {entry.regulationScore && (
                      <View
                        className={`px-2 py-0.5 rounded-full ${
                          entry.regulationScore <= 3
                            ? "bg-red-100"
                            : entry.regulationScore <= 6
                            ? "bg-yellow-100"
                            : "bg-green-100"
                        }`}
                      >
                        <Text
                          className={`text-xs font-medium ${
                            entry.regulationScore <= 3
                              ? "text-red-700"
                              : entry.regulationScore <= 6
                              ? "text-yellow-700"
                              : "text-green-700"
                          }`}
                        >
                          {entry.regulationScore}/10
                        </Text>
                      </View>
                    )}
                  </View>
                  {entry.freeformContent ? (
                    <Text className="text-sm text-gray-600" numberOfLines={3}>
                      {entry.freeformContent}
                    </Text>
                  ) : (
                    <Text className="text-sm text-gray-400 italic">No content</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
