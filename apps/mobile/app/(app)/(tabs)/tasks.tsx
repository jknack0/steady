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
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

const ENERGY_CONFIG: Record<string, { bg: string; text: string; icon: string; selectedBorder: string }> = {
  LOW: { bg: "#E8F0E7", text: "#8FAE8B", icon: "leaf-outline", selectedBorder: "#8FAE8B" },
  MEDIUM: { bg: "#F5ECD7", text: "#C4A84D", icon: "flash-outline", selectedBorder: "#C4A84D" },
  HIGH: { bg: "#F5E6E6", text: "#D4A0A0", icon: "flame-outline", selectedBorder: "#D4A0A0" },
};

const CATEGORIES = ["Work", "Health", "Home", "Personal", "Study"];
const ENERGY_LEVELS = ["LOW", "MEDIUM", "HIGH"];

export default function TasksScreen() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "TODO" | "DONE">("TODO");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [energyLevel, setEnergyLevel] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <TouchableOpacity
            style={{ marginTop: 2, marginRight: 12 }}
            onPress={() => toggleMutation.mutate({ id: item.id, currentStatus: item.status })}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isDone ? "#5B8A8A" : "transparent",
                borderWidth: isDone ? 0 : 2,
                borderColor: isDone ? undefined : "#D4D0CB",
              }}
            >
              {isDone && <Ionicons name="checkmark" size={16} color="white" />}
            </View>
          </TouchableOpacity>

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
