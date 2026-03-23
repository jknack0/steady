import { Stack, Redirect } from "expo-router";
import { View, Text, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth-context";
import { ConfigProvider } from "../../lib/config-context";
import { RtmConsentModal } from "../../components/rtm-consent-modal";

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#5B8A8A" }}>
        <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Ionicons name="pulse" size={32} color="white" />
        </View>
        <Text style={{ fontSize: 24, fontFamily: "PlusJakartaSans_700Bold", color: "white", letterSpacing: -0.3 }}>Steady</Text>
        <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_500Medium", color: "rgba(255,255,255,0.7)", marginTop: 4 }}>with ADHD</Text>
        <ActivityIndicator size="small" color="white" style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <ConfigProvider>
    <RtmConsentModal />
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#F7F5F2",
        },
        headerTintColor: "#5B8A8A",
        headerTitleStyle: {
          fontFamily: "PlusJakartaSans_700Bold",
          color: "#2D2D2D",
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="(tabs)"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="program/[enrollmentId]"
        options={{ title: "Program", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="part/[partId]"
        options={{ title: "Content", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="insights"
        options={{ title: "My Insights", headerBackTitle: "Back" }}
      />
    </Stack>
    </ConfigProvider>
  );
}
