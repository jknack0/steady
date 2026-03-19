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

const ENERGY_COLORS: Record<string, string> = {
  LOW: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-red-100 text-red-700",
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

  const renderTask = ({ item }: { item: Task }) => (
    <TouchableOpacity
      className="flex-row items-start px-4 py-3 border-b border-gray-100 bg-white"
      onPress={() => {
        setEditingTask(item);
        setTitle(item.title);
        setDescription(item.description || "");
        setEnergyLevel(item.energyLevel);
        setCategory(item.category);
      }}
      onLongPress={() => handleDelete(item)}
    >
      <TouchableOpacity
        className="mt-0.5 mr-3"
        onPress={() => toggleMutation.mutate({ id: item.id, currentStatus: item.status })}
      >
        <View
          className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
            item.status === "DONE" ? "bg-indigo-600 border-indigo-600" : "border-gray-300"
          }`}
        >
          {item.status === "DONE" && <Text className="text-white text-xs font-bold">✓</Text>}
        </View>
      </TouchableOpacity>

      <View className="flex-1">
        <Text
          className={`text-base ${
            item.status === "DONE" ? "text-gray-400 line-through" : "text-gray-800"
          }`}
        >
          {item.title}
        </Text>

        {item.description ? (
          <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}

        <View className="flex-row items-center gap-2 mt-1">
          {item.dueDate && (
            <Text className="text-xs text-gray-500">{formatDueDate(item.dueDate)}</Text>
          )}
          {item.energyLevel && (
            <Text className={`text-xs px-2 py-0.5 rounded-full ${ENERGY_COLORS[item.energyLevel]}`}>
              {item.energyLevel.toLowerCase()} energy
            </Text>
          )}
          {item.category && (
            <Text className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {item.category}
            </Text>
          )}
          {item.estimatedMinutes && (
            <Text className="text-xs text-gray-400">{item.estimatedMinutes}min</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Filter tabs */}
      <View className="flex-row px-4 py-2 bg-white border-b border-gray-200">
        {(["TODO", "DONE", "ALL"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            className={`px-4 py-1.5 mr-2 rounded-full ${
              filter === f ? "bg-indigo-600" : "bg-gray-100"
            }`}
            onPress={() => setFilter(f)}
          >
            <Text className={`text-sm font-medium ${filter === f ? "text-white" : "text-gray-600"}`}>
              {f === "TODO" ? "To Do" : f === "DONE" ? "Done" : "All"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={data || []}
        keyExtractor={(item) => item.id}
        renderItem={renderTask}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Text className="text-4xl mb-3">✅</Text>
            <Text className="text-gray-500 text-base">
              {filter === "DONE" ? "No completed tasks yet" : "No tasks yet"}
            </Text>
            <Text className="text-gray-400 text-sm mt-1">Tap + to add one</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-indigo-600 items-center justify-center shadow-lg"
        onPress={() => {
          setEditingTask(null);
          resetForm();
          setShowAdd(true);
        }}
      >
        <Text className="text-white text-2xl">+</Text>
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal visible={showAdd || !!editingTask} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-end"
        >
          <TouchableOpacity className="flex-1" onPress={() => { setShowAdd(false); setEditingTask(null); }} />
          <View className="bg-white rounded-t-2xl px-5 pb-8 pt-4 shadow-lg">
            <Text className="text-lg font-bold text-gray-800 mb-4">
              {editingTask ? "Edit Task" : "New Task"}
            </Text>

            <TextInput
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-base mb-3"
              placeholder="What do you need to do?"
              value={title}
              onChangeText={setTitle}
              autoFocus
            />

            <TextInput
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-base mb-3"
              placeholder="Notes (optional)"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            {/* Energy Level */}
            <Text className="text-sm font-medium text-gray-600 mb-1.5">Energy Level</Text>
            <View className="flex-row gap-2 mb-3">
              {ENERGY_LEVELS.map((e) => (
                <TouchableOpacity
                  key={e}
                  className={`px-3 py-1.5 rounded-full ${
                    energyLevel === e ? "bg-indigo-600" : "bg-gray-100"
                  }`}
                  onPress={() => setEnergyLevel(energyLevel === e ? null : e)}
                >
                  <Text className={`text-sm ${energyLevel === e ? "text-white" : "text-gray-600"}`}>
                    {e.charAt(0) + e.slice(1).toLowerCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Category */}
            <Text className="text-sm font-medium text-gray-600 mb-1.5">Category</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  className={`px-3 py-1.5 rounded-full ${
                    category === c ? "bg-indigo-600" : "bg-gray-100"
                  }`}
                  onPress={() => setCategory(category === c ? null : c)}
                >
                  <Text className={`text-sm ${category === c ? "text-white" : "text-gray-600"}`}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              className="bg-indigo-600 rounded-lg py-3 items-center"
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
            >
              <Text className="text-white font-semibold text-base">
                {editingTask ? "Save Changes" : "Add Task"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
