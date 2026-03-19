import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";

interface Enrollment {
  id: string;
  status: "ACTIVE" | "INVITED";
  program: {
    id: string;
    title: string;
    description: string | null;
    coverImageUrl: string | null;
    cadence: string;
    status: string;
  };
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    ACTIVE: { bg: "#ecfdf5", text: "#059669", label: "Active" },
    INVITED: { bg: "#fef3c7", text: "#d97706", label: "New Invitation" },
  };
  const c = config[status as keyof typeof config] || { bg: "#f3f4f6", text: "#6b7280", label: status };

  return (
    <View style={{ backgroundColor: c.bg }} className="rounded-full px-3 py-1">
      <Text style={{ color: c.text }} className="text-xs font-semibold">
        {c.label}
      </Text>
    </View>
  );
}

function EnrollmentCard({ enrollment }: { enrollment: Enrollment }) {
  const queryClient = useQueryClient();

  const acceptMutation = useMutation({
    mutationFn: () => api.acceptEnrollment(enrollment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
    },
  });

  const handlePress = () => {
    if (enrollment.status === "ACTIVE") {
      router.push(`/(app)/program/${enrollment.id}`);
    }
  };

  const cadenceLabel = enrollment.program.cadence === "WEEKLY" ? "Weekly" :
    enrollment.program.cadence === "BIWEEKLY" ? "Biweekly" : "Self-paced";

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl p-5 mb-4"
      onPress={handlePress}
      disabled={enrollment.status === "INVITED"}
      activeOpacity={0.7}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 mr-3">
          <Text className="text-lg font-bold text-gray-900" numberOfLines={2}>
            {enrollment.program.title}
          </Text>
        </View>
        <StatusBadge status={enrollment.status} />
      </View>

      {enrollment.program.description ? (
        <Text className="text-sm text-gray-500 mb-4 leading-5" numberOfLines={2}>
          {enrollment.program.description}
        </Text>
      ) : null}

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Ionicons name="time-outline" size={14} color="#9ca3af" />
          <Text className="text-xs text-gray-400 ml-1 font-medium">
            {cadenceLabel}
          </Text>
        </View>

        {enrollment.status === "INVITED" ? (
          <TouchableOpacity
            className={`rounded-xl px-5 py-2.5 ${acceptMutation.isPending ? "bg-indigo-400" : "bg-indigo-600"}`}
            onPress={() => acceptMutation.mutate()}
            disabled={acceptMutation.isPending}
            activeOpacity={0.8}
          >
            {acceptMutation.isPending ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-white font-semibold text-sm">Accept Invite</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View className="flex-row items-center">
            <Text className="text-indigo-600 text-sm font-semibold mr-1">Open</Text>
            <Ionicons name="chevron-forward" size={14} color="#6366f1" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ProgramsScreen() {
  const { logout, user } = useAuth();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["enrollments"],
    queryFn: async () => {
      const res = await api.getEnrollments();
      if (!res.success) throw new Error(res.error);
      return res.data as Enrollment[];
    },
  });

  return (
    <View className="flex-1 bg-gray-50">
      {/* Greeting Bar */}
      <View className="bg-white px-5 py-4 flex-row justify-between items-center" style={{
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
      }}>
        <View>
          <Text className="text-base font-bold text-gray-900">
            Hi, {user?.firstName || "there"}
          </Text>
          <Text className="text-xs text-gray-400 mt-0.5">Welcome back</Text>
        </View>
        <TouchableOpacity
          onPress={logout}
          className="flex-row items-center bg-gray-50 rounded-xl px-3 py-2"
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={16} color="#ef4444" />
          <Text className="text-sm text-red-500 font-medium ml-1.5">Sign Out</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-4">
            <Ionicons name="cloud-offline-outline" size={28} color="#ef4444" />
          </View>
          <Text className="text-lg font-semibold text-gray-900 mb-1">Connection Error</Text>
          <Text className="text-gray-400 text-center text-sm mb-5">
            Could not load your programs. Please try again.
          </Text>
          <TouchableOpacity
            className="bg-indigo-600 rounded-xl px-6 py-3"
            onPress={() => refetch()}
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !data || data.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-indigo-50 items-center justify-center mb-5">
            <Ionicons name="library-outline" size={36} color="#6366f1" />
          </View>
          <Text className="text-xl font-bold text-gray-900 mb-2">No Programs Yet</Text>
          <Text className="text-gray-400 text-center text-sm leading-5">
            Your clinician will invite you to a program. Check back soon!
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EnrollmentCard enrollment={item} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6366f1" />
          }
        />
      )}
    </View>
  );
}
