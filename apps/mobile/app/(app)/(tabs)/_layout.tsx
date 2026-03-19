import { Tabs } from "expo-router";
import { View, Text, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";

function BrandHeader() {
  return (
    <View className="flex-row items-center">
      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#5B8A8A", alignItems: "center", justifyContent: "center", marginRight: 8 }}>
        <Ionicons name="pulse" size={16} color="white" />
      </View>
      <Text style={{ fontSize: 18, fontFamily: "PlusJakartaSans_700Bold", color: "#2D2D2D", letterSpacing: -0.3 }}>Steady</Text>
      <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", color: "#8A8A8A", marginLeft: 6, marginTop: 2 }}>with ADHD</Text>
    </View>
  );
}

export default function TabsLayout() {
  // Read enrollment count to toggle "Program" vs "Programs" label
  const { data: enrollments } = useQuery({
    queryKey: ["enrollments"],
    queryFn: async () => {
      const res = await api.getEnrollments();
      if (!res.success) throw new Error(res.error);
      return res.data as any[];
    },
    staleTime: Infinity, // Don't refetch here — programs.tsx handles it
  });

  const programLabel = enrollments?.length === 1 ? "Program" : "Programs";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#5B8A8A",
        tabBarInactiveTintColor: "#8A8A8A",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#D4D0CB",
          borderTopWidth: 1,
          paddingBottom: 28,
          paddingTop: 10,
          height: 92,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: "#F7F5F2",
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: "#D4D0CB",
        },
        headerTitleStyle: {
          fontFamily: "PlusJakartaSans_700Bold",
          fontSize: 18,
          color: "#2D2D2D",
        },
      }}
    >
      <Tabs.Screen
        name="programs"
        options={{
          headerTitle: () => <BrandHeader />,
          title: programLabel,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          headerTitle: () => <BrandHeader />,
          title: "Tasks",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkbox-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          headerTitle: () => <BrandHeader />,
          title: "Calendar",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          headerTitle: () => <BrandHeader />,
          title: "Journal",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
