import { useState, useMemo } from "react";
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
  TIME_BLOCK: { bg: "#eef2ff", border: "#6366f1", text: "#4f46e5", icon: "time-outline" },
  SESSION: { bg: "#fef9c3", border: "#f59e0b", text: "#b45309", icon: "people-outline" },
  CATCH_UP: { bg: "#ecfdf5", border: "#10b981", text: "#059669", icon: "chatbubbles-outline" },
  EXTERNAL_SYNC: { bg: "#f3e8ff", border: "#8b5cf6", text: "#7c3aed", icon: "sync-outline" },
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
  const [selectedDate, setSelectedDate] = useState(new Date());
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
    <View className="flex-1 bg-gray-50">
      {/* Week navigation */}
      <View className="bg-white px-4 pt-2 pb-3" style={{
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
      }}>
        <View className="flex-row items-center justify-between mb-3">
          <TouchableOpacity
            onPress={() => navigateWeek(-1)}
            className="w-8 h-8 items-center justify-center rounded-lg bg-gray-50"
          >
            <Ionicons name="chevron-back" size={18} color="#6366f1" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-gray-900">
            {selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </Text>
          <TouchableOpacity
            onPress={() => navigateWeek(1)}
            className="w-8 h-8 items-center justify-center rounded-lg bg-gray-50"
          >
            <Ionicons name="chevron-forward" size={18} color="#6366f1" />
          </TouchableOpacity>
        </View>

        {/* Day pills */}
        <View className="flex-row justify-between">
          {weekDays.map((d) => {
            const selected = isSelected(d);
            const today = isToday(d);
            return (
              <TouchableOpacity
                key={d.toISOString()}
                className={`items-center py-2 px-2.5 rounded-2xl ${
                  selected ? "bg-indigo-600" : ""
                }`}
                style={today && !selected ? { backgroundColor: "#eef2ff" } : undefined}
                onPress={() => setSelectedDate(d)}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-xs mb-1 font-medium ${
                    selected ? "text-indigo-200" : "text-gray-400"
                  }`}
                >
                  {d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)}
                </Text>
                <Text
                  className={`text-base font-bold ${
                    selected ? "text-white" : today ? "text-indigo-600" : "text-gray-800"
                  }`}
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
        className="flex-1"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#6366f1" />}
      >
        <View className="px-4 py-4">
          <Text className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">
            {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </Text>

          {todayEvents.length === 0 ? (
            <View className="items-center py-16">
              <View className="w-16 h-16 rounded-full bg-indigo-50 items-center justify-center mb-4">
                <Ionicons name="calendar-outline" size={28} color="#6366f1" />
              </View>
              <Text className="text-lg font-semibold text-gray-900 mb-1">No events today</Text>
              <Text className="text-sm text-gray-400">Tap + to schedule a time block</Text>
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
                    className="rounded-2xl overflow-hidden mb-3"
                    style={{
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
                    <View className="px-4 py-3.5">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-base font-semibold" style={{ color: config.text }}>
                          {event.title}
                        </Text>
                        <Ionicons name={config.icon as any} size={16} color={config.text} />
                      </View>
                      <View className="flex-row items-center mt-1.5">
                        <Ionicons name="time-outline" size={13} color={config.text} />
                        <Text className="text-sm ml-1.5" style={{ color: config.text, opacity: 0.8 }}>
                          {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          {" - "}
                          {end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </Text>
                      </View>
                      {event.task && (
                        <View className="flex-row items-center mt-2">
                          <Ionicons name="link-outline" size={13} color={config.text} />
                          <Text className="text-xs ml-1.5 font-medium" style={{ color: config.text, opacity: 0.7 }}>
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
        className="absolute bottom-6 right-6 w-14 h-14 rounded-2xl bg-indigo-600 items-center justify-center"
        onPress={() => setShowAdd(true)}
        activeOpacity={0.8}
        style={{
          shadowColor: "#6366f1",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* Add Event Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-end"
        >
          <TouchableOpacity
            className="flex-1 bg-black/30"
            onPress={() => setShowAdd(false)}
            activeOpacity={1}
          />
          <View className="bg-white rounded-t-3xl px-5 pb-8 pt-5" style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 16,
            elevation: 10,
          }}>
            {/* Handle bar */}
            <View className="w-10 h-1 rounded-full bg-gray-200 self-center mb-5" />

            <Text className="text-xl font-bold text-gray-900 mb-5">New Time Block</Text>

            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-base mb-4 bg-gray-50"
              placeholder="What are you working on?"
              placeholderTextColor="#9ca3af"
              value={title}
              onChangeText={setTitle}
              autoFocus
            />

            <Text className="text-sm font-semibold text-gray-600 mb-2">Start Time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              <View className="flex-row gap-2">
                {HOURS.map((h) => (
                  <TouchableOpacity
                    key={h}
                    className={`px-3.5 py-2 rounded-xl ${
                      startHour === h ? "bg-indigo-600" : "bg-gray-100"
                    }`}
                    onPress={() => setStartHour(h)}
                    activeOpacity={0.7}
                  >
                    <Text className={`text-sm font-medium ${startHour === h ? "text-white" : "text-gray-500"}`}>
                      {formatHour(h)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text className="text-sm font-semibold text-gray-600 mb-2">Duration</Text>
            <View className="flex-row gap-2 mb-6">
              {[30, 60, 90, 120].map((d) => (
                <TouchableOpacity
                  key={d}
                  className={`flex-1 py-2.5 rounded-xl items-center ${
                    durationMinutes === d ? "bg-indigo-600" : "bg-gray-100"
                  }`}
                  onPress={() => setDurationMinutes(d)}
                  activeOpacity={0.7}
                >
                  <Text className={`text-sm font-semibold ${durationMinutes === d ? "text-white" : "text-gray-500"}`}>
                    {d < 60 ? `${d}m` : `${d / 60}h`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              className="bg-indigo-600 rounded-xl py-4 items-center"
              onPress={() => {
                if (!title.trim()) return;
                createMutation.mutate();
              }}
              activeOpacity={0.8}
              style={{
                shadowColor: "#6366f1",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Text className="text-white font-bold text-base">Add Event</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
