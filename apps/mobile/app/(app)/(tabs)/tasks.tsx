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

const ENERGY_CONFIG: Record<string, { bg: string; text: string; icon: string }> = {
  LOW: { bg: "#ecfdf5", text: "#059669", icon: "leaf-outline" },
  MEDIUM: { bg: "#fef9c3", text: "#ca8a04", icon: "flash-outline" },
  HIGH: { bg: "#fef2f2", text: "#dc2626", icon: "flame-outline" },
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
        className="bg-white rounded-2xl p-4 mb-3 mx-4"
        style={{
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
        <View className="flex-row items-start">
          <TouchableOpacity
            className="mt-0.5 mr-3"
            onPress={() => toggleMutation.mutate({ id: item.id, currentStatus: item.status })}
          >
            <View
              className={`w-6 h-6 rounded-lg items-center justify-center ${
                isDone ? "bg-indigo-600" : "border-2 border-gray-300"
              }`}
            >
              {isDone && <Ionicons name="checkmark" size={16} color="white" />}
            </View>
          </TouchableOpacity>

          <View className="flex-1">
            <Text
              className={`text-base font-medium ${
                isDone ? "text-gray-400 line-through" : "text-gray-900"
              }`}
            >
              {item.title}
            </Text>

            {item.description ? (
              <Text className="text-sm text-gray-400 mt-1" numberOfLines={1}>
                {item.description}
              </Text>
            ) : null}

            <View className="flex-row items-center flex-wrap gap-2 mt-2">
              {item.dueDate && (
                <View className="flex-row items-center bg-gray-50 rounded-lg px-2 py-1">
                  <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
                  <Text className="text-xs text-gray-500 ml-1 font-medium">
                    {formatDueDate(item.dueDate)}
                  </Text>
                </View>
              )}
              {energy && (
                <View
                  className="flex-row items-center rounded-lg px-2 py-1"
                  style={{ backgroundColor: energy.bg }}
                >
                  <Ionicons name={energy.icon as any} size={12} color={energy.text} />
                  <Text className="text-xs ml-1 font-medium" style={{ color: energy.text }}>
                    {item.energyLevel!.charAt(0) + item.energyLevel!.slice(1).toLowerCase()}
                  </Text>
                </View>
              )}
              {item.category && (
                <View className="bg-indigo-50 rounded-lg px-2 py-1">
                  <Text className="text-xs text-indigo-600 font-medium">{item.category}</Text>
                </View>
              )}
              {item.estimatedMinutes && (
                <View className="flex-row items-center bg-gray-50 rounded-lg px-2 py-1">
                  <Ionicons name="time-outline" size={12} color="#9ca3af" />
                  <Text className="text-xs text-gray-500 ml-1">{item.estimatedMinutes}m</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Filter tabs */}
      <View className="flex-row px-4 py-3 bg-white" style={{
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
      }}>
        {(["TODO", "DONE", "ALL"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            className={`px-5 py-2 mr-2 rounded-xl ${
              filter === f ? "bg-indigo-600" : "bg-gray-100"
            }`}
            onPress={() => setFilter(f)}
            activeOpacity={0.7}
          >
            <Text className={`text-sm font-semibold ${filter === f ? "text-white" : "text-gray-500"}`}>
              {f === "TODO" ? "To Do" : f === "DONE" ? "Done" : "All"}
            </Text>
          </TouchableOpacity>
        ))}
        <View className="flex-1 items-end justify-center">
          <Text className="text-xs text-gray-400 font-medium">
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
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#6366f1" />
        }
        ListEmptyComponent={
          <View className="items-center py-20">
            <View className="w-16 h-16 rounded-full bg-indigo-50 items-center justify-center mb-4">
              <Ionicons
                name={filter === "DONE" ? "trophy-outline" : "checkbox-outline"}
                size={28}
                color="#6366f1"
              />
            </View>
            <Text className="text-lg font-semibold text-gray-900 mb-1">
              {filter === "DONE" ? "No completed tasks" : "No tasks yet"}
            </Text>
            <Text className="text-sm text-gray-400">Tap + to add your first task</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 rounded-2xl bg-indigo-600 items-center justify-center"
        onPress={() => {
          setEditingTask(null);
          resetForm();
          setShowAdd(true);
        }}
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

      {/* Add/Edit Modal */}
      <Modal visible={showAdd || !!editingTask} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-end"
        >
          <TouchableOpacity
            className="flex-1 bg-black/30"
            onPress={() => { setShowAdd(false); setEditingTask(null); }}
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

            <Text className="text-xl font-bold text-gray-900 mb-5">
              {editingTask ? "Edit Task" : "New Task"}
            </Text>

            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-base mb-3 bg-gray-50"
              placeholder="What do you need to do?"
              placeholderTextColor="#9ca3af"
              value={title}
              onChangeText={setTitle}
              autoFocus
            />

            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-base mb-4 bg-gray-50"
              placeholder="Notes (optional)"
              placeholderTextColor="#9ca3af"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            {/* Energy Level */}
            <Text className="text-sm font-semibold text-gray-600 mb-2">Energy Level</Text>
            <View className="flex-row gap-2 mb-4">
              {ENERGY_LEVELS.map((e) => {
                const config = ENERGY_CONFIG[e];
                const selected = energyLevel === e;
                return (
                  <TouchableOpacity
                    key={e}
                    className="flex-row items-center px-3.5 py-2 rounded-xl"
                    style={{
                      backgroundColor: selected ? config.bg : "#f3f4f6",
                      borderWidth: selected ? 1.5 : 0,
                      borderColor: selected ? config.text : "transparent",
                    }}
                    onPress={() => setEnergyLevel(energyLevel === e ? null : e)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={config.icon as any}
                      size={14}
                      color={selected ? config.text : "#9ca3af"}
                    />
                    <Text
                      className="text-sm ml-1.5 font-medium"
                      style={{ color: selected ? config.text : "#6b7280" }}
                    >
                      {e.charAt(0) + e.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Category */}
            <Text className="text-sm font-semibold text-gray-600 mb-2">Category</Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  className={`px-3.5 py-2 rounded-xl ${
                    category === c ? "bg-indigo-600" : "bg-gray-100"
                  }`}
                  onPress={() => setCategory(category === c ? null : c)}
                  activeOpacity={0.7}
                >
                  <Text className={`text-sm font-medium ${category === c ? "text-white" : "text-gray-500"}`}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              className="bg-indigo-600 rounded-xl py-4 items-center"
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
              style={{
                shadowColor: "#6366f1",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Text className="text-white font-bold text-base">
                {editingTask ? "Save Changes" : "Add Task"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
