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
  if (n <= 3) return { bg: "#F5E6E6", text: "#D4A0A0", activeBg: "#C08585" };
  if (n <= 6) return { bg: "#F5ECD7", text: "#C4A84D", activeBg: "#A89040" };
  return { bg: "#E8F0E7", text: "#8FAE8B", activeBg: "#729070" };
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

  const cardStyle = {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F0EDE8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F5F2" }}>
      {/* View toggle */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#FFFFFF", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#F0EDE8" }}>
        <TouchableOpacity
          style={{
            paddingHorizontal: 20,
            paddingVertical: 8,
            marginRight: 8,
            borderRadius: 12,
            backgroundColor: view === "today" ? "#5B8A8A" : "#F0EDE8",
          }}
          onPress={() => setView("today")}
          activeOpacity={0.7}
        >
          <Text style={{
            fontSize: 14,
            fontFamily: "PlusJakartaSans_600SemiBold",
            color: view === "today" ? "#FFFFFF" : "#5A5A5A",
          }}>
            Today
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            paddingHorizontal: 20,
            paddingVertical: 8,
            borderRadius: 12,
            backgroundColor: view === "history" ? "#5B8A8A" : "#F0EDE8",
          }}
          onPress={() => setView("history")}
          activeOpacity={0.7}
        >
          <Text style={{
            fontSize: 14,
            fontFamily: "PlusJakartaSans_600SemiBold",
            color: view === "history" ? "#FFFFFF" : "#5A5A5A",
          }}>
            History
          </Text>
        </TouchableOpacity>

        {view === "today" && (
          <View style={{ flex: 1, alignItems: "flex-end", justifyContent: "center" }}>
            {saveMutation.isPending ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="cloud-upload-outline" size={14} color="#8A8A8A" />
                <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A", marginLeft: 4 }}>Saving...</Text>
              </View>
            ) : saveMutation.isSuccess ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="checkmark-circle" size={14} color="#8FAE8B" />
                <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", color: "#8FAE8B", marginLeft: 4 }}>Saved</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      {view === "today" ? (
        <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
          {/* Regulation Score */}
          <View style={cardStyle}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <Ionicons name="pulse-outline" size={18} color="#5B8A8A" />
              <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_700Bold", color: "#2D2D2D", marginLeft: 8 }}>
                How regulated do you feel?
              </Text>
            </View>
            <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A", marginBottom: 16, marginLeft: 26 }}>
              {score ? REGULATION_LABELS[score] : "Tap a number to rate"}
            </Text>

            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 }}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                const colors = getScoreColor(n);
                const isActive = score === n;
                return (
                  <TouchableOpacity
                    key={n}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isActive ? colors.activeBg : "#F0EDE8",
                    }}
                    onPress={() => handleScoreChange(n)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: "PlusJakartaSans_700Bold",
                        color: isActive ? "#FFFFFF" : "#8A8A8A",
                      }}
                    >
                      {n}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_500Medium", color: "#D4A0A0" }}>Dysregulated</Text>
              <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_500Medium", color: "#8FAE8B" }}>Regulated</Text>
            </View>
          </View>

          {/* Journal content */}
          <View style={cardStyle}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <Ionicons name="create-outline" size={18} color="#5B8A8A" />
              <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_700Bold", color: "#2D2D2D", marginLeft: 8 }}>Daily Reflection</Text>
            </View>
            <TextInput
              style={{ fontSize: 16, fontFamily: "PlusJakartaSans_400Regular", color: "#2D2D2D", minHeight: 180, lineHeight: 24 }}
              placeholder={"How was your day? What went well? What was challenging?\n\nTake a moment to reflect..."}
              placeholderTextColor="#D4D0CB"
              value={content}
              onChangeText={handleContentChange}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Share toggle */}
          <TouchableOpacity
            style={{ ...cardStyle, flexDirection: "row", alignItems: "center", marginBottom: 32 }}
            onPress={() => {
              setShareWithClinician(!shareWithClinician);
              setTimeout(() => saveMutation.mutate(), 100);
            }}
            activeOpacity={0.7}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: shareWithClinician ? "#5B8A8A" : "transparent",
                borderWidth: shareWithClinician ? 0 : 2,
                borderColor: shareWithClinician ? undefined : "#D4D0CB",
              }}
            >
              {shareWithClinician && <Ionicons name="checkmark" size={16} color="white" />}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_500Medium", color: "#2D2D2D" }}>Share with clinician</Text>
              <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A", marginTop: 2 }}>Your clinician can view this entry</Text>
            </View>
            <Ionicons
              name={shareWithClinician ? "eye" : "eye-off-outline"}
              size={20}
              color={shareWithClinician ? "#5B8A8A" : "#D4D0CB"}
            />
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl refreshing={loadingHistory} onRefresh={refetchHistory} tintColor="#5B8A8A" />
          }
        >
          {!history || history.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 80 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#E3EDED", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Ionicons name="book-outline" size={28} color="#5B8A8A" />
              </View>
              <Text style={{ fontSize: 18, fontFamily: "PlusJakartaSans_600SemiBold", color: "#2D2D2D", marginBottom: 4 }}>No entries yet</Text>
              <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A" }}>Start writing today</Text>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
              {history.map((entry) => {
                const scoreColor = entry.regulationScore ? getScoreColor(entry.regulationScore) : null;
                return (
                  <View
                    key={entry.id}
                    style={cardStyle}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_700Bold", color: "#2D2D2D" }}>
                        {formatDate(entry.entryDate)}
                      </Text>
                      {entry.regulationScore && scoreColor && (
                        <View
                          style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, flexDirection: "row", alignItems: "center", backgroundColor: scoreColor.bg }}
                        >
                          <Ionicons name="pulse" size={12} color={scoreColor.text} />
                          <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_700Bold", marginLeft: 4, color: scoreColor.text }}>
                            {entry.regulationScore}/10
                          </Text>
                        </View>
                      )}
                    </View>
                    {entry.freeformContent ? (
                      <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: "#5A5A5A", lineHeight: 20 }} numberOfLines={3}>
                        {entry.freeformContent}
                      </Text>
                    ) : (
                      <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: "#D4D0CB", fontStyle: "italic" }}>No content</Text>
                    )}
                    {entry.isSharedWithClinician && (
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                        <Ionicons name="eye-outline" size={12} color="#8A8A8A" />
                        <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A", marginLeft: 4 }}>Shared with clinician</Text>
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
