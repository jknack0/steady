import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../lib/api";

interface Task {
  id: string;
  title: string;
  description: string | null;
  estimatedMinutes: number | null;
  dueDate: string | null;
  energyLevel: string | null;
  category: string | null;
  status: string;
  completedAt: string | null;
}

function getNextHour(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

function formatTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function formatDateShort(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const DURATION_OPTIONS = [
  { label: "15m", value: 15 },
  { label: "30m", value: 30 },
  { label: "45m", value: 45 },
  { label: "1h", value: 60 },
  { label: "1.5h", value: 90 },
  { label: "2h", value: 120 },
];

const ENERGY_CONFIG: Record<string, { bg: string; text: string; icon: string; selectedBorder: string }> = {
  LOW: { bg: "#E8F0E7", text: "#8FAE8B", icon: "leaf-outline", selectedBorder: "#8FAE8B" },
  MEDIUM: { bg: "#F5ECD7", text: "#C4A84D", icon: "flash-outline", selectedBorder: "#C4A84D" },
  HIGH: { bg: "#F5E6E6", text: "#D4A0A0", icon: "flame-outline", selectedBorder: "#D4A0A0" },
};

const CATEGORIES = ["Work", "Health", "Home", "Personal", "Study"];
const ENERGY_LEVELS = ["LOW", "MEDIUM", "HIGH"];

export default function TasksScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "TODO" | "DONE">("TODO");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [energyLevel, setEnergyLevel] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [schedulingTask, setSchedulingTask] = useState<Task | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date>(getNextHour());
  const [scheduleDuration, setScheduleDuration] = useState(60);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["tasks", filter],
    queryFn: async () => {
      const res = await api.getTasks({ status: filter });
      if (!res.success) throw new Error(res.error);
      return res.data as Task[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.createTask({
        title,
        description: description || undefined,
        energyLevel: energyLevel || undefined,
        category: category || undefined,
      });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      resetForm();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === "DONE" ? "TODO" : "DONE";
      const res = await api.updateTask(id, { status: newStatus });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.deleteTask(id);
      if (!res.success) throw new Error(res.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.updateTask(id, data);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setEditingTask(null);
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!schedulingTask) return;
      const startTime = scheduleDate.toISOString();
      const endTime = new Date(scheduleDate.getTime() + scheduleDuration * 60 * 1000).toISOString();
      const res = await api.createCalendarEvent({
        title: schedulingTask.title,
        startTime,
        endTime,
        eventType: "TIME_BLOCK",
        taskId: schedulingTask.id,
      });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      const scheduledDateISO = scheduleDate.toISOString();
      // Mark the task as done now that it's scheduled
      if (schedulingTask) {
        api.updateTask(schedulingTask.id, { status: "DONE" }).then(() => {
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
        });
      }
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      setSchedulingTask(null);
      router.push({ pathname: "/(app)/(tabs)/calendar", params: { date: scheduledDateISO } });
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to schedule task");
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setEnergyLevel(null);
    setCategory(null);
    setShowAdd(false);
  };

  const handleDelete = (task: Task) => {
    Alert.alert("Archive Task", `Archive "${task.title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Archive", style: "destructive", onPress: () => deleteMutation.mutate(task.id) },
    ]);
  };

  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const taskCount = data?.length || 0;

  const renderTask = ({ item }: { item: Task }) => {
    const isDone = item.status === "DONE";
    const energy = item.energyLevel ? ENERGY_CONFIG[item.energyLevel] : null;

    return (
      <TouchableOpacity
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          marginHorizontal: 16,
          borderWidth: 1,
          borderColor: "#F0EDE8",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
          opacity: isDone ? 0.7 : 1,
        }}
        onPress={() => {
          setEditingTask(item);
          setTitle(item.title);
          setDescription(item.description || "");
          setEnergyLevel(item.energyLevel);
          setCategory(item.category);
        }}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                fontFamily: "PlusJakartaSans_500Medium",
                color: isDone ? "#8A8A8A" : "#2D2D2D",
                textDecorationLine: isDone ? "line-through" : "none",
              }}
            >
              {item.title}
            </Text>

            {item.description ? (
              <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A", marginTop: 4 }} numberOfLines={1}>
                {item.description}
              </Text>
            ) : null}

            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {item.dueDate && (
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F0EDE8", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Ionicons name="calendar-outline" size={12} color="#8A8A8A" />
                  <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", color: "#5A5A5A", marginLeft: 4 }}>
                    {formatDueDate(item.dueDate)}
                  </Text>
                </View>
              )}
              {energy && (
                <View
                  style={{ flexDirection: "row", alignItems: "center", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: energy.bg }}
                >
                  <Ionicons name={energy.icon as any} size={12} color={energy.text} />
                  <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", marginLeft: 4, color: energy.text }}>
                    {item.energyLevel!.charAt(0) + item.energyLevel!.slice(1).toLowerCase()}
                  </Text>
                </View>
              )}
              {item.category && (
                <View style={{ backgroundColor: "#E3EDED", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", color: "#5B8A8A" }}>{item.category}</Text>
                </View>
              )}
              {item.estimatedMinutes && (
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F0EDE8", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Ionicons name="time-outline" size={12} color="#8A8A8A" />
                  <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", color: "#5A5A5A", marginLeft: 4 }}>{item.estimatedMinutes}m</Text>
                </View>
              )}
            </View>
          </View>

          {!isDone && (
            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: "#E3EDED",
                alignItems: "center",
                justifyContent: "center",
                marginLeft: 12,
              }}
              onPress={(e) => {
                e.stopPropagation();
                setSchedulingTask(item);
                setScheduleDate(getNextHour());
                setScheduleDuration(item.estimatedMinutes || 60);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={20} color="#5B8A8A" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F5F2" }}>
      {/* Filter tabs */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#F0EDE8" }}>
        {(["TODO", "DONE", "ALL"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={{
              paddingHorizontal: 20,
              paddingVertical: 8,
              marginRight: 8,
              borderRadius: 12,
              backgroundColor: filter === f ? "#5B8A8A" : "#F0EDE8",
            }}
            onPress={() => setFilter(f)}
            activeOpacity={0.7}
          >
            <Text style={{
              fontSize: 14,
              fontFamily: "PlusJakartaSans_600SemiBold",
              color: filter === f ? "#FFFFFF" : "#5A5A5A",
            }}>
              {f === "TODO" ? "To Do" : f === "DONE" ? "Done" : "All"}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1, alignItems: "flex-end", justifyContent: "center" }}>
          <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", color: "#8A8A8A" }}>
            {taskCount} {taskCount === 1 ? "task" : "tasks"}
          </Text>
        </View>
      </View>

      <FlatList
        data={data || []}
        keyExtractor={(item) => item.id}
        renderItem={renderTask}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#5B8A8A" />
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 80 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#E3EDED", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Ionicons
                name={filter === "DONE" ? "trophy-outline" : "checkbox-outline"}
                size={28}
                color="#5B8A8A"
              />
            </View>
            <Text style={{ fontSize: 18, fontFamily: "PlusJakartaSans_600SemiBold", color: "#2D2D2D", marginBottom: 4 }}>
              {filter === "DONE" ? "No completed tasks" : "No tasks yet"}
            </Text>
            <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A" }}>Tap + to add your first task</Text>
          </View>
        }
      />

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
        onPress={() => {
          setEditingTask(null);
          resetForm();
          setShowAdd(true);
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* Schedule Modal */}
      <Modal visible={!!schedulingTask} transparent animationType="slide">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "flex-end" }}
          onPress={() => setSchedulingTask(null)}
          activeOpacity={1}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingBottom: 40,
              paddingTop: 20,
            }}>
              {/* Handle bar */}
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#D4D0CB", alignSelf: "center", marginBottom: 20 }} />

              <Text style={{ fontSize: 20, fontFamily: "PlusJakartaSans_700Bold", color: "#2D2D2D", marginBottom: 4 }}>
                Schedule Task
              </Text>
              <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A", marginBottom: 20 }} numberOfLines={1}>
                {schedulingTask?.title}
              </Text>

              {/* Date selector */}
              <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#5A5A5A", marginBottom: 8 }}>Day</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {Array.from({ length: 7 }).map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() + i);
                    d.setHours(scheduleDate.getHours(), scheduleDate.getMinutes(), 0, 0);
                    const isSelected = d.toDateString() === scheduleDate.toDateString();
                    const dayName = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short" });
                    const dayNum = d.getDate();
                    return (
                      <TouchableOpacity
                        key={i}
                        style={{
                          width: 64,
                          paddingVertical: 10,
                          borderRadius: 12,
                          backgroundColor: isSelected ? "#5B8A8A" : "#F0EDE8",
                          alignItems: "center",
                        }}
                        onPress={() => {
                          const newDate = new Date(scheduleDate);
                          newDate.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                          setScheduleDate(newDate);
                        }}
                      >
                        <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_500Medium", color: isSelected ? "rgba(255,255,255,0.7)" : "#8A8A8A" }}>{dayName}</Text>
                        <Text style={{ fontSize: 18, fontFamily: "PlusJakartaSans_700Bold", color: isSelected ? "#FFFFFF" : "#2D2D2D", marginTop: 2 }}>{dayNum}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Time selector */}
              <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#5A5A5A", marginBottom: 8 }}>Time</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {Array.from({ length: 28 }).map((_, i) => {
                    const hour = 6 + Math.floor(i / 2);
                    const minute = (i % 2) * 30;
                    if (hour > 21) return null;
                    const t = new Date(scheduleDate);
                    t.setHours(hour, minute, 0, 0);
                    const isToday = scheduleDate.toDateString() === new Date().toDateString();
                    const now = new Date();
                    const isPast = isToday && (hour < now.getHours() || (hour === now.getHours() && minute < now.getMinutes()));
                    const isSelected = scheduleDate.getHours() === hour && scheduleDate.getMinutes() === minute;
                    if (isPast) return null;
                    return (
                      <TouchableOpacity
                        key={i}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 10,
                          backgroundColor: isSelected ? "#5B8A8A" : "#F0EDE8",
                        }}
                        onPress={() => {
                          const newDate = new Date(scheduleDate);
                          newDate.setHours(hour, minute, 0, 0);
                          setScheduleDate(newDate);
                        }}
                      >
                        <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_500Medium", color: isSelected ? "#FFFFFF" : "#5A5A5A" }}>
                          {formatTime(t)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Duration selector */}
              <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#5A5A5A", marginBottom: 8 }}>Duration</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
                {DURATION_OPTIONS.map((opt) => {
                  const isSelected = scheduleDuration === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor: isSelected ? "#5B8A8A" : "#F0EDE8",
                        alignItems: "center",
                      }}
                      onPress={() => setScheduleDuration(opt.value)}
                    >
                      <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: isSelected ? "#FFFFFF" : "#5A5A5A" }}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Summary */}
              <View style={{ backgroundColor: "#F7F5F2", borderRadius: 12, padding: 14, marginBottom: 20, flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="calendar" size={18} color="#5B8A8A" />
                <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_500Medium", color: "#2D2D2D", marginLeft: 10 }}>
                  {formatDateShort(scheduleDate)} at {formatTime(scheduleDate)} · {scheduleDuration}min
                </Text>
              </View>

              <TouchableOpacity
                style={{
                  backgroundColor: "#5B8A8A",
                  borderRadius: 12,
                  paddingVertical: 16,
                  alignItems: "center",
                }}
                onPress={() => scheduleMutation.mutate()}
                disabled={scheduleMutation.isPending}
                activeOpacity={0.8}
              >
                <Text style={{ color: "white", fontFamily: "PlusJakartaSans_700Bold", fontSize: 16 }}>
                  {scheduleMutation.isPending ? "Scheduling..." : "Schedule on Calendar"}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal visible={showAdd || !!editingTask} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.25)" }}
            onPress={() => { setShowAdd(false); setEditingTask(null); }}
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

            <Text style={{ fontSize: 20, fontFamily: "PlusJakartaSans_700Bold", color: "#2D2D2D", marginBottom: 20 }}>
              {editingTask ? "Edit Task" : "New Task"}
            </Text>

            <TextInput
              style={{ borderWidth: 1, borderColor: "#D4D0CB", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, fontFamily: "PlusJakartaSans_400Regular", color: "#2D2D2D", marginBottom: 12, backgroundColor: "#F7F5F2" }}
              placeholder="What do you need to do?"
              placeholderTextColor="#D4D0CB"
              value={title}
              onChangeText={setTitle}
              autoFocus
            />

            <TextInput
              style={{ borderWidth: 1, borderColor: "#D4D0CB", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, fontFamily: "PlusJakartaSans_400Regular", color: "#2D2D2D", marginBottom: 16, backgroundColor: "#F7F5F2" }}
              placeholder="Notes (optional)"
              placeholderTextColor="#D4D0CB"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            {/* Energy Level */}
            <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#5A5A5A", marginBottom: 8 }}>Energy Level</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              {ENERGY_LEVELS.map((e) => {
                const config = ENERGY_CONFIG[e];
                const selected = energyLevel === e;
                return (
                  <TouchableOpacity
                    key={e}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 12,
                      backgroundColor: selected ? config.bg : "#F0EDE8",
                      borderWidth: selected ? 1.5 : 0,
                      borderColor: selected ? config.selectedBorder : "transparent",
                    }}
                    onPress={() => setEnergyLevel(energyLevel === e ? null : e)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={config.icon as any}
                      size={14}
                      color={selected ? config.text : "#8A8A8A"}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: "PlusJakartaSans_500Medium",
                        marginLeft: 6,
                        color: selected ? config.text : "#5A5A5A",
                      }}
                    >
                      {e.charAt(0) + e.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Category */}
            <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#5A5A5A", marginBottom: 8 }}>Category</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 12,
                    backgroundColor: category === c ? "#5B8A8A" : "#F0EDE8",
                  }}
                  onPress={() => setCategory(category === c ? null : c)}
                  activeOpacity={0.7}
                >
                  <Text style={{
                    fontSize: 14,
                    fontFamily: "PlusJakartaSans_500Medium",
                    color: category === c ? "#FFFFFF" : "#5A5A5A",
                  }}>
                    {c}
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
                if (editingTask) {
                  updateMutation.mutate({
                    id: editingTask.id,
                    data: { title, description, energyLevel, category },
                  });
                } else {
                  createMutation.mutate();
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: "white", fontFamily: "PlusJakartaSans_700Bold", fontSize: 16 }}>
                {editingTask ? "Save Changes" : "Add Task"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
