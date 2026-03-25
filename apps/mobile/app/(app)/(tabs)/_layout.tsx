import { Tabs, router } from "expo-router";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useConfig } from "../../../lib/config-context";

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
  const { isModuleEnabled } = useConfig();

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
        headerRight: () => (
          <TouchableOpacity onPress={() => router.push("/(app)/app-settings")} style={{ marginRight: 16 }}>
            <Ionicons name="settings-outline" size={22} color="#2D2D2D" />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          headerTitle: () => <BrandHeader />,
          title: "Today",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="today-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="program"
        options={{
          headerTitle: () => <BrandHeader />,
          title: "Program",
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
            <Ionicons name="list-outline" size={size} color={color} />
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
      <Tabs.Screen name="programs" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
