import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../../lib/api";

interface TrackerEntry {
  id: string;
  date: string;
  responses: Record<string, any>;
  completedAt: string;
}

export default function TrackerHistoryScreen() {
  const { trackerId } = useLocalSearchParams<{ trackerId: string }>();

  const { data: trackerData } = useQuery({
    queryKey: ["tracker-today", trackerId],
    queryFn: async () => {
      const res = await api.getTrackerToday(trackerId!);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    enabled: !!trackerId,
  });

  const { data: entries, isLoading } = useQuery<TrackerEntry[]>({
    queryKey: ["tracker-history", trackerId],
    queryFn: async () => {
      const end = new Date().toISOString().split("T")[0];
      const start = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      const res = await api.getTrackerHistory(trackerId!, { startDate: start, endDate: end });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    enabled: !!trackerId,
  });

  const tracker = trackerData?.tracker;
  const fields = tracker?.fields || [];

  // Build a lookup for field labels
  const fieldLabels: Record<string, string> = {};
  for (const f of fields) {
    fieldLabels[f.id] = f.label;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F5F2" }}>
      <View style={{ backgroundColor: "#5B8A8A", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 12 }}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontFamily: "PlusJakartaSans_700Bold", color: "white" }}>
          {tracker?.name || "Tracker"} History
        </Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#5B8A8A" />
        </View>
      ) : !entries || entries.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Ionicons name="calendar-outline" size={48} color="#D4D0CB" />
          <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_500Medium", color: "#8A8A8A", marginTop: 12, textAlign: "center" }}>
            No entries yet. Start tracking today!
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {entries.map((entry) => {
            const date = new Date(entry.date);
            const dateStr = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

            return (
              <View
                key={entry.id}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: "#F0EDE8",
                }}
              >
                <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_600SemiBold", color: "#5B8A8A", marginBottom: 8 }}>
                  {dateStr}
                </Text>
                {fields.map((field: any) => {
                  const value = entry.responses[field.id];
                  if (value === undefined || value === null) return null;

                  let display: string;
                  if (typeof value === "boolean") {
                    display = value ? "Yes" : "No";
                  } else if (Array.isArray(value)) {
                    display = value.join(", ");
                  } else {
                    display = String(value);
                  }

                  return (
                    <View
                      key={field.id}
                      style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}
                    >
                      <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A", flex: 1 }}>
                        {field.label}
                      </Text>
                      <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_600SemiBold", color: "#2D2D2D", textAlign: "right", maxWidth: "60%" }}>
                        {display}
                      </Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
