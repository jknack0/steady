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

const EVENT_COLORS: Record<string, string> = {
  TIME_BLOCK: "#6366f1",
  SESSION: "#f59e0b",
  CATCH_UP: "#10b981",
  EXTERNAL_SYNC: "#8b5cf6",
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
    return events.filter((e) => new Date(e.startTime).toDateString() === dateStr);
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
      <View className="bg-white border-b border-gray-200 px-4 py-2">
        <View className="flex-row items-center justify-between mb-2">
          <TouchableOpacity onPress={() => navigateWeek(-1)}>
            <Text className="text-indigo-600 text-lg font-bold">‹</Text>
          </TouchableOpacity>
          <Text className="text-base font-semibold text-gray-800">
            {selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </Text>
          <TouchableOpacity onPress={() => navigateWeek(1)}>
            <Text className="text-indigo-600 text-lg font-bold">›</Text>
          </TouchableOpacity>
        </View>

        {/* Day pills */}
        <View className="flex-row justify-between">
          {weekDays.map((d) => (
            <TouchableOpacity
              key={d.toISOString()}
              className={`items-center py-2 px-2 rounded-xl ${
                isSelected(d) ? "bg-indigo-600" : isToday(d) ? "bg-indigo-50" : ""
              }`}
              onPress={() => setSelectedDate(d)}
            >
              <Text
                className={`text-xs mb-0.5 ${
                  isSelected(d) ? "text-indigo-200" : "text-gray-400"
                }`}
              >
                {d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)}
              </Text>
              <Text
                className={`text-base font-semibold ${
                  isSelected(d) ? "text-white" : isToday(d) ? "text-indigo-600" : "text-gray-800"
                }`}
              >
                {d.getDate()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Day view */}
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        <View className="px-4 py-3">
          <Text className="text-sm font-semibold text-gray-600 mb-2">
            {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </Text>

          {todayEvents.length === 0 ? (
            <View className="items-center py-12">
              <Text className="text-4xl mb-3">📅</Text>
              <Text className="text-gray-500">No events today</Text>
              <Text className="text-gray-400 text-sm mt-1">Tap + to schedule a time block</Text>
            </View>
          ) : (
            <View className="space-y-2">
              {todayEvents.map((event) => {
                const start = new Date(event.startTime);
                const end = new Date(event.endTime);
                const color = event.color || EVENT_COLORS[event.eventType] || "#6366f1";

                return (
                  <TouchableOpacity
                    key={event.id}
                    className="flex-row rounded-lg overflow-hidden bg-white shadow-sm"
                    onLongPress={() => {
                      Alert.alert("Delete Event", `Delete "${event.title}"?`, [
                        { text: "Cancel", style: "cancel" },
                        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(event.id) },
                      ]);
                    }}
                  >
                    <View style={{ backgroundColor: color, width: 4 }} />
                    <View className="flex-1 px-3 py-3">
                      <Text className="text-base font-medium text-gray-800">{event.title}</Text>
                      <Text className="text-sm text-gray-500 mt-0.5">
                        {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        {" — "}
                        {end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </Text>
                      {event.task && (
                        <Text className="text-xs text-indigo-500 mt-1">
                          Linked: {event.task.title}
                        </Text>
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
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-indigo-600 items-center justify-center shadow-lg"
        onPress={() => setShowAdd(true)}
      >
        <Text className="text-white text-2xl">+</Text>
      </TouchableOpacity>

      {/* Add Event Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-end"
        >
          <TouchableOpacity className="flex-1" onPress={() => setShowAdd(false)} />
          <View className="bg-white rounded-t-2xl px-5 pb-8 pt-4 shadow-lg">
            <Text className="text-lg font-bold text-gray-800 mb-4">New Time Block</Text>

            <TextInput
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-base mb-3"
              placeholder="What are you working on?"
              value={title}
              onChangeText={setTitle}
              autoFocus
            />

            <Text className="text-sm font-medium text-gray-600 mb-1.5">Start Time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
              <View className="flex-row gap-2">
                {HOURS.map((h) => (
                  <TouchableOpacity
                    key={h}
                    className={`px-3 py-1.5 rounded-full ${
                      startHour === h ? "bg-indigo-600" : "bg-gray-100"
                    }`}
                    onPress={() => setStartHour(h)}
                  >
                    <Text className={`text-sm ${startHour === h ? "text-white" : "text-gray-600"}`}>
                      {formatHour(h)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text className="text-sm font-medium text-gray-600 mb-1.5">Duration</Text>
            <View className="flex-row gap-2 mb-4">
              {[30, 60, 90, 120].map((d) => (
                <TouchableOpacity
                  key={d}
                  className={`px-3 py-1.5 rounded-full ${
                    durationMinutes === d ? "bg-indigo-600" : "bg-gray-100"
                  }`}
                  onPress={() => setDurationMinutes(d)}
                >
                  <Text className={`text-sm ${durationMinutes === d ? "text-white" : "text-gray-600"}`}>
                    {d < 60 ? `${d}m` : `${d / 60}h`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              className="bg-indigo-600 rounded-lg py-3 items-center"
              onPress={() => {
                if (!title.trim()) return;
                createMutation.mutate();
              }}
            >
              <Text className="text-white font-semibold text-base">Add Event</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
