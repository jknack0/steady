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
import { Ionicons } from "@expo/vector-icons";
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

function getScoreColor(n: number): { bg: string; text: string; activeBg: string } {
  if (n <= 3) return { bg: "#fef2f2", text: "#dc2626", activeBg: "#ef4444" };
  if (n <= 6) return { bg: "#fefce8", text: "#ca8a04", activeBg: "#eab308" };
  return { bg: "#ecfdf5", text: "#059669", activeBg: "#22c55e" };
}

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

  const { data: todayEntry } = useQuery({
    queryKey: ["journal", todayStr],
    queryFn: async () => {
      const res = await api.getJournalEntry(todayStr);
      if (!res.success) throw new Error(res.error);
      return res.data as JournalEntry | null;
    },
  });

  const { data: history, isLoading: loadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ["journal-history"],
    queryFn: async () => {
      const res = await api.getJournalEntries();
      if (!res.success) throw new Error(res.error);
      return res.data as JournalEntry[];
    },
    enabled: view === "history",
  });

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
    setTimeout(() => saveMutation.mutate(), 100);
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* View toggle */}
      <View className="flex-row px-4 py-3 bg-white items-center" style={{
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
      }}>
        <TouchableOpacity
          className={`px-5 py-2 mr-2 rounded-xl ${view === "today" ? "bg-indigo-600" : "bg-gray-100"}`}
          onPress={() => setView("today")}
          activeOpacity={0.7}
        >
          <Text className={`text-sm font-semibold ${view === "today" ? "text-white" : "text-gray-500"}`}>
            Today
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`px-5 py-2 rounded-xl ${view === "history" ? "bg-indigo-600" : "bg-gray-100"}`}
          onPress={() => setView("history")}
          activeOpacity={0.7}
        >
          <Text className={`text-sm font-semibold ${view === "history" ? "text-white" : "text-gray-500"}`}>
            History
          </Text>
        </TouchableOpacity>

        {view === "today" && (
          <View className="flex-1 items-end justify-center">
            {saveMutation.isPending ? (
              <View className="flex-row items-center">
                <Ionicons name="cloud-upload-outline" size={14} color="#9ca3af" />
                <Text className="text-xs text-gray-400 ml-1">Saving...</Text>
              </View>
            ) : saveMutation.isSuccess ? (
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                <Text className="text-xs text-green-500 ml-1">Saved</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      {view === "today" ? (
        <ScrollView className="flex-1 px-4 py-4">
          {/* Regulation Score */}
          <View className="bg-white rounded-2xl p-5 mb-4" style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
          }}>
            <View className="flex-row items-center mb-1">
              <Ionicons name="pulse-outline" size={18} color="#6366f1" />
              <Text className="text-base font-bold text-gray-900 ml-2">
                How regulated do you feel?
              </Text>
            </View>
            <Text className="text-sm text-gray-400 mb-4 ml-7">
              {score ? REGULATION_LABELS[score] : "Tap a number to rate"}
            </Text>

            <View className="flex-row justify-between px-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                const colors = getScoreColor(n);
                const isActive = score === n;
                return (
                  <TouchableOpacity
                    key={n}
                    className="w-8 h-8 rounded-xl items-center justify-center"
                    style={{
                      backgroundColor: isActive ? colors.activeBg : "#f3f4f6",
                    }}
                    onPress={() => handleScoreChange(n)}
                    activeOpacity={0.7}
                  >
                    <Text
                      className="text-sm font-bold"
                      style={{ color: isActive ? "#fff" : "#9ca3af" }}
                    >
                      {n}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View className="flex-row justify-between mt-2 px-1">
              <Text className="text-xs text-red-400 font-medium">Dysregulated</Text>
              <Text className="text-xs text-green-500 font-medium">Regulated</Text>
            </View>
          </View>

          {/* Journal content */}
          <View className="bg-white rounded-2xl p-5 mb-4" style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
          }}>
            <View className="flex-row items-center mb-3">
              <Ionicons name="create-outline" size={18} color="#6366f1" />
              <Text className="text-base font-bold text-gray-900 ml-2">Daily Reflection</Text>
            </View>
            <TextInput
              className="text-base text-gray-700 min-h-[180px] leading-6"
              placeholder={"How was your day? What went well? What was challenging?\n\nTake a moment to reflect..."}
              placeholderTextColor="#d1d5db"
              value={content}
              onChangeText={handleContentChange}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Share toggle */}
          <TouchableOpacity
            className="bg-white rounded-2xl p-5 mb-8 flex-row items-center"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 2,
            }}
            onPress={() => {
              setShareWithClinician(!shareWithClinician);
              setTimeout(() => saveMutation.mutate(), 100);
            }}
            activeOpacity={0.7}
          >
            <View
              className={`w-6 h-6 rounded-lg items-center justify-center ${
                shareWithClinician ? "bg-indigo-600" : "border-2 border-gray-300"
              }`}
            >
              {shareWithClinician && <Ionicons name="checkmark" size={16} color="white" />}
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-base font-medium text-gray-900">Share with clinician</Text>
              <Text className="text-sm text-gray-400 mt-0.5">Your clinician can view this entry</Text>
            </View>
            <Ionicons
              name={shareWithClinician ? "eye" : "eye-off-outline"}
              size={20}
              color={shareWithClinician ? "#6366f1" : "#d1d5db"}
            />
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={loadingHistory} onRefresh={refetchHistory} tintColor="#6366f1" />
          }
        >
          {!history || history.length === 0 ? (
            <View className="items-center py-20">
              <View className="w-16 h-16 rounded-full bg-indigo-50 items-center justify-center mb-4">
                <Ionicons name="book-outline" size={28} color="#6366f1" />
              </View>
              <Text className="text-lg font-semibold text-gray-900 mb-1">No entries yet</Text>
              <Text className="text-sm text-gray-400">Start writing today</Text>
            </View>
          ) : (
            <View className="px-4 py-4">
              {history.map((entry) => {
                const scoreColor = entry.regulationScore ? getScoreColor(entry.regulationScore) : null;
                return (
                  <View
                    key={entry.id}
                    className="bg-white rounded-2xl p-5 mb-3"
                    style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.04,
                      shadowRadius: 8,
                      elevation: 2,
                    }}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-sm font-bold text-gray-900">
                        {formatDate(entry.entryDate)}
                      </Text>
                      {entry.regulationScore && scoreColor && (
                        <View
                          className="px-2.5 py-1 rounded-lg flex-row items-center"
                          style={{ backgroundColor: scoreColor.bg }}
                        >
                          <Ionicons name="pulse" size={12} color={scoreColor.text} />
                          <Text className="text-xs font-bold ml-1" style={{ color: scoreColor.text }}>
                            {entry.regulationScore}/10
                          </Text>
                        </View>
                      )}
                    </View>
                    {entry.freeformContent ? (
                      <Text className="text-sm text-gray-500 leading-5" numberOfLines={3}>
                        {entry.freeformContent}
                      </Text>
                    ) : (
                      <Text className="text-sm text-gray-300 italic">No content</Text>
                    )}
                    {entry.isSharedWithClinician && (
                      <View className="flex-row items-center mt-2">
                        <Ionicons name="eye-outline" size={12} color="#9ca3af" />
                        <Text className="text-xs text-gray-400 ml-1">Shared with clinician</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
