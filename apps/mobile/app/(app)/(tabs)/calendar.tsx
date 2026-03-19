import { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../lib/api";

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  eventType: string;
  color: string | null;
  task: { id: string; title: string; status: string } | null;
}

const EVENT_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  TIME_BLOCK: { bg: "#E3EDED", border: "#5B8A8A", text: "#4A7272", icon: "time-outline" },
  SESSION: { bg: "#F5ECD7", border: "#C4A84D", text: "#9A8340", icon: "people-outline" },
  CATCH_UP: { bg: "#E8F0E7", border: "#8FAE8B", text: "#729070", icon: "chatbubbles-outline" },
  EXTERNAL_SYNC: { bg: "#E1EBF1", border: "#89B4C8", text: "#6A97AD", icon: "sync-outline" },
};

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6am to 9pm

function getWeekDays(baseDate: Date): Date[] {
  const start = new Date(baseDate);
  start.setDate(start.getDate() - start.getDay()); // Sunday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function formatHour(h: number) {
  if (h === 0 || h === 12) return h === 0 ? "12 AM" : "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

export default function CalendarScreen() {
  const queryClient = useQueryClient();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (dateParam) {
      setSelectedDate(new Date(dateParam));
    }
  }, [dateParam]);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [startHour, setStartHour] = useState(9);
  const [durationMinutes, setDurationMinutes] = useState(60);

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate.toDateString()]);

  const weekStart = weekDays[0].toISOString();
  const weekEnd = new Date(weekDays[6].getTime() + 86400000).toISOString();

  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ["calendar", weekStart],
    queryFn: async () => {
      const res = await api.getCalendarEvents(weekStart, weekEnd);
      if (!res.success) throw new Error(res.error);
      return res.data as CalendarEvent[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const start = new Date(selectedDate);
      start.setHours(startHour, 0, 0, 0);
      const end = new Date(start.getTime() + durationMinutes * 60000);

      const res = await api.createCalendarEvent({
        title,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        eventType: "TIME_BLOCK",
      });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      setShowAdd(false);
      setTitle("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.deleteCalendarEvent(id);
      if (!res.success) throw new Error(res.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });

  const todayEvents = useMemo(() => {
    if (!events) return [];
    const dateStr = selectedDate.toDateString();
    return events
      .filter((e) => new Date(e.startTime).toDateString() === dateStr)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [events, selectedDate.toDateString()]);

  const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
  const isSelected = (d: Date) => d.toDateString() === selectedDate.toDateString();

  const navigateWeek = (dir: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + dir * 7);
    setSelectedDate(next);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F5F2" }}>
      {/* Week navigation */}
      <View style={{ backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#F0EDE8" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => navigateWeek(-1)}
            style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: "#F0EDE8" }}
          >
            <Ionicons name="chevron-back" size={18} color="#5B8A8A" />
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_700Bold", color: "#2D2D2D" }}>
            {selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </Text>
          <TouchableOpacity
            onPress={() => navigateWeek(1)}
            style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: "#F0EDE8" }}
          >
            <Ionicons name="chevron-forward" size={18} color="#5B8A8A" />
          </TouchableOpacity>
        </View>

        {/* Day pills */}
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {weekDays.map((d) => {
            const selected = isSelected(d);
            const today = isToday(d);
            return (
              <TouchableOpacity
                key={d.toISOString()}
                style={{
                  alignItems: "center",
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  borderRadius: 16,
                  backgroundColor: selected ? "#5B8A8A" : today ? "#E3EDED" : "transparent",
                }}
                onPress={() => setSelectedDate(d)}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "PlusJakartaSans_500Medium",
                    marginBottom: 4,
                    color: selected ? "rgba(255,255,255,0.7)" : "#8A8A8A",
                  }}
                >
                  {d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)}
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: "PlusJakartaSans_700Bold",
                    color: selected ? "#FFFFFF" : today ? "#5B8A8A" : "#2D2D2D",
                  }}
                >
                  {d.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Day view */}
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#5B8A8A" />}
      >
        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_600SemiBold", color: "#8A8A8A", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
            {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </Text>

          {todayEvents.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 64 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#E3EDED", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Ionicons name="calendar-outline" size={28} color="#5B8A8A" />
              </View>
              <Text style={{ fontSize: 18, fontFamily: "PlusJakartaSans_600SemiBold", color: "#2D2D2D", marginBottom: 4 }}>No events today</Text>
              <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A" }}>Tap + to schedule a time block</Text>
            </View>
          ) : (
            <View>
              {todayEvents.map((event) => {
                const start = new Date(event.startTime);
                const end = new Date(event.endTime);
                const config = EVENT_COLORS[event.eventType] || EVENT_COLORS.TIME_BLOCK;

                return (
                  <TouchableOpacity
                    key={event.id}
                    style={{
                      borderRadius: 16,
                      overflow: "hidden",
                      marginBottom: 12,
                      backgroundColor: config.bg,
                      borderLeftWidth: 4,
                      borderLeftColor: config.border,
                    }}
                    onLongPress={() => {
                      Alert.alert("Delete Event", `Delete "${event.title}"?`, [
                        { text: "Cancel", style: "cancel" },
                        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(event.id) },
                      ]);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_600SemiBold", color: config.text }}>
                          {event.title}
                        </Text>
                        <Ionicons name={config.icon as any} size={16} color={config.text} />
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                        <Ionicons name="time-outline" size={13} color={config.text} />
                        <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", marginLeft: 6, color: config.text, opacity: 0.8 }}>
                          {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          {" - "}
                          {end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </Text>
                      </View>
                      {event.task && (
                        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                          <Ionicons name="link-outline" size={13} color={config.text} />
                          <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", marginLeft: 6, color: config.text, opacity: 0.7 }}>
                            {event.task.title}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 18,
          backgroundColor: "#5B8A8A",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#5B8A8A",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        }}
        onPress={() => setShowAdd(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* Add Event Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.25)" }}
            onPress={() => setShowAdd(false)}
            activeOpacity={1}
          />
          <View style={{
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 20,
            paddingBottom: 32,
            paddingTop: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 10,
          }}>
            {/* Handle bar */}
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#D4D0CB", alignSelf: "center", marginBottom: 20 }} />

            <Text style={{ fontSize: 20, fontFamily: "PlusJakartaSans_700Bold", color: "#2D2D2D", marginBottom: 20 }}>New Time Block</Text>

            <TextInput
              style={{ borderWidth: 1, borderColor: "#D4D0CB", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, fontFamily: "PlusJakartaSans_400Regular", color: "#2D2D2D", marginBottom: 16, backgroundColor: "#F7F5F2" }}
              placeholder="What are you working on?"
              placeholderTextColor="#D4D0CB"
              value={title}
              onChangeText={setTitle}
              autoFocus
            />

            <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#5A5A5A", marginBottom: 8 }}>Start Time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {HOURS.map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 12,
                      backgroundColor: startHour === h ? "#5B8A8A" : "#F0EDE8",
                    }}
                    onPress={() => setStartHour(h)}
                    activeOpacity={0.7}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontFamily: "PlusJakartaSans_500Medium",
                      color: startHour === h ? "#FFFFFF" : "#5A5A5A",
                    }}>
                      {formatHour(h)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#5A5A5A", marginBottom: 8 }}>Duration</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
              {[30, 60, 90, 120].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    alignItems: "center",
                    backgroundColor: durationMinutes === d ? "#5B8A8A" : "#F0EDE8",
                  }}
                  onPress={() => setDurationMinutes(d)}
                  activeOpacity={0.7}
                >
                  <Text style={{
                    fontSize: 14,
                    fontFamily: "PlusJakartaSans_600SemiBold",
                    color: durationMinutes === d ? "#FFFFFF" : "#5A5A5A",
                  }}>
                    {d < 60 ? `${d}m` : `${d / 60}h`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: "#5B8A8A",
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: "center",
                shadowColor: "#5B8A8A",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 4,
              }}
              onPress={() => {
                if (!title.trim()) return;
                createMutation.mutate();
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: "white", fontFamily: "PlusJakartaSans_700Bold", fontSize: 16 }}>Add Event</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
