import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

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
  const colors = {
    ACTIVE: "bg-green-100 text-green-700",
    INVITED: "bg-amber-100 text-amber-700",
  };
  const colorClass = colors[status as keyof typeof colors] || "bg-gray-100 text-gray-700";

  return (
    <View className={`rounded-full px-2.5 py-0.5 ${colorClass.split(" ")[0]}`}>
      <Text className={`text-xs font-medium ${colorClass.split(" ")[1]}`}>
        {status === "INVITED" ? "New Invitation" : status}
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

  return (
    <TouchableOpacity
      className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
      onPress={handlePress}
      disabled={enrollment.status === "INVITED"}
      activeOpacity={0.7}
    >
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-lg font-semibold text-gray-900 flex-1 mr-2" numberOfLines={2}>
          {enrollment.program.title}
        </Text>
        <StatusBadge status={enrollment.status} />
      </View>

      {enrollment.program.description ? (
        <Text className="text-sm text-gray-500 mb-3" numberOfLines={2}>
          {enrollment.program.description}
        </Text>
      ) : null}

      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-gray-400 uppercase">
          {enrollment.program.cadence}
        </Text>

        {enrollment.status === "INVITED" ? (
          <TouchableOpacity
            className={`rounded-lg px-4 py-2 ${acceptMutation.isPending ? "bg-indigo-400" : "bg-indigo-600"}`}
            onPress={() => acceptMutation.mutate()}
            disabled={acceptMutation.isPending}
          >
            {acceptMutation.isPending ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-white font-medium text-sm">Accept</Text>
            )}
          </TouchableOpacity>
        ) : (
          <Text className="text-indigo-600 text-sm font-medium">View Program</Text>
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
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-100 flex-row justify-between items-center">
        <Text className="text-sm text-gray-500">
          Hi, {user?.firstName || "there"}
        </Text>
        <TouchableOpacity onPress={logout}>
          <Text className="text-sm text-red-500 font-medium">Sign Out</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-gray-500 text-center mb-4">Failed to load programs</Text>
          <TouchableOpacity
            className="bg-indigo-600 rounded-lg px-6 py-2"
            onPress={() => refetch()}
          >
            <Text className="text-white font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !data || data.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-xl font-semibold text-gray-900 mb-2">No Programs Yet</Text>
          <Text className="text-gray-500 text-center">
            Your clinician will invite you to a program. Check back soon!
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EnrollmentCard enrollment={item} />}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6366f1" />
          }
        />
      )}
    </View>
  );
}
