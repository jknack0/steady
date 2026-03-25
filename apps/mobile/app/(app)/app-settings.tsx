import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

interface NotificationPref {
  category: string;
  enabled: boolean;
  preferredTime: string | null;
}

const CATEGORY_META: Record<string, { label: string; description: string; icon: string }> = {
  MORNING_CHECKIN: {
    label: "Morning Check-in",
    description: "Daily reminder to journal how you're feeling",
    icon: "sunny-outline",
  },
  HOMEWORK: {
    label: "Homework",
    description: "Reminders for program homework assignments",
    icon: "document-text-outline",
  },
  SESSION: {
    label: "Sessions",
    description: "Alerts before scheduled sessions",
    icon: "people-outline",
  },
  TASK: {
    label: "Tasks & Calendar",
    description: "Reminders for tasks and upcoming calendar events",
    icon: "checkbox-outline",
  },
  WEEKLY_REVIEW: {
    label: "Weekly Review",
    description: "Sunday reflection on your week's progress",
    icon: "bar-chart-outline",
  },
};

export default function SettingsScreen() {
  const { logout, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const res = await api.getNotificationPreferences();
      if (!res.success) throw new Error(res.error);
      return res.data as NotificationPref[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (prefs: Array<{ category: string; enabled: boolean }>) => {
      const res = await api.updateNotificationPreferences(prefs);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });

  const toggleCategory = (category: string, currentEnabled: boolean) => {
    updateMutation.mutate([{ category, enabled: !currentEnabled }]);
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => logout() },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F7F5F2" }} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Profile section */}
      <View style={{ backgroundColor: "#FFFFFF", marginTop: 16, marginHorizontal: 16, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#F0EDE8" }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#E3EDED", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="person" size={24} color="#5B8A8A" />
          </View>
          <View style={{ marginLeft: 14, flex: 1 }}>
            <Text style={{ fontSize: 18, fontFamily: "PlusJakartaSans_700Bold", color: "#2D2D2D" }}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A", marginTop: 2 }}>
              {user?.email}
            </Text>
          </View>
        </View>
      </View>

      {/* Notifications section */}
      <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#8A8A8A", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 28, marginBottom: 10, marginHorizontal: 20 }}>
        Notifications
      </Text>
      <View style={{ backgroundColor: "#FFFFFF", marginHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: "#F0EDE8", overflow: "hidden" }}>
        {isLoading ? (
          <View style={{ padding: 32, alignItems: "center" }}>
            <ActivityIndicator color="#5B8A8A" />
          </View>
        ) : (
          preferences?.map((pref, index) => {
            const meta = CATEGORY_META[pref.category];
            if (!meta) return null;
            return (
              <View
                key={pref.category}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                  borderTopWidth: index > 0 ? 1 : 0,
                  borderTopColor: "#F0EDE8",
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#E3EDED", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={meta.icon as any} size={18} color="#5B8A8A" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 15, fontFamily: "PlusJakartaSans_600SemiBold", color: "#2D2D2D" }}>{meta.label}</Text>
                  <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A", marginTop: 2 }}>{meta.description}</Text>
                </View>
                <Switch
                  value={pref.enabled}
                  onValueChange={() => toggleCategory(pref.category, pref.enabled)}
                  trackColor={{ false: "#D4D0CB", true: "#5B8A8A" }}
                  thumbColor="#FFFFFF"
                />
              </View>
            );
          })
        )}
      </View>

      {/* Sign out */}
      <View style={{ marginTop: 32, marginHorizontal: 16 }}>
        <TouchableOpacity
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#F0EDE8",
          }}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_600SemiBold", color: "#C47070" }}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", color: "#D4D0CB", textAlign: "center", marginTop: 24 }}>
        Steady with ADHD v1.0
      </Text>
    </ScrollView>
  );
}
