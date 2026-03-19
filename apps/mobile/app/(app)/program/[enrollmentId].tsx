import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../lib/api";
import { ModuleCard, type ProgramData } from "../../../lib/program-components";

export default function ProgramScreen() {
  const { enrollmentId } = useLocalSearchParams<{ enrollmentId: string }>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["program", enrollmentId],
    queryFn: async () => {
      const res = await api.getProgram(enrollmentId!);
      if (!res.success) throw new Error(res.error);
      return res.data as ProgramData;
    },
    enabled: !!enrollmentId,
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F5F2" }}>
        <ActivityIndicator size="large" color="#5B8A8A" />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F5F2", paddingHorizontal: 32 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#F5E6E6", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Ionicons name="cloud-offline-outline" size={28} color="#D4A0A0" />
        </View>
        <Text style={{ fontSize: 18, fontFamily: "PlusJakartaSans_600SemiBold", color: "#2D2D2D", marginBottom: 4 }}>Failed to load program</Text>
        <TouchableOpacity
          style={{ backgroundColor: "#5B8A8A", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 16 }}
          onPress={() => refetch()}
          activeOpacity={0.8}
        >
          <Text style={{ color: "white", fontFamily: "PlusJakartaSans_600SemiBold" }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: data.program.title }} />
      <ScrollView style={{ flex: 1, backgroundColor: "#F7F5F2" }}>
        {/* Program header */}
        <View style={{ backgroundColor: "#FFFFFF", paddingHorizontal: 20, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: "#F0EDE8" }}>
          <Text style={{ fontSize: 20, fontFamily: "PlusJakartaSans_700Bold", color: "#2D2D2D" }}>{data.program.title}</Text>
          {data.program.description ? (
            <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: "#5A5A5A", marginTop: 6, lineHeight: 20 }}>{data.program.description}</Text>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
            <Ionicons name="time-outline" size={14} color="#8A8A8A" />
            <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", color: "#8A8A8A", marginLeft: 4, textTransform: "uppercase" }}>
              {data.program.cadence}
            </Text>
          </View>
        </View>

        {/* Modules */}
        <View style={{ padding: 16 }}>
          {data.modules.map((mod) => (
            <ModuleCard
              key={mod.id}
              mod={mod}
              enrollmentId={data.enrollmentId}
              isCurrent={mod.id === data.currentModuleId}
            />
          ))}
        </View>
      </ScrollView>
    </>
  );
}
