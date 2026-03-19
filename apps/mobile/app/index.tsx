import { Redirect } from "expo-router";
import { View, Text, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/auth-context";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#5B8A8A" }}>
        <View style={{ alignItems: "center" }}>
          <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <Ionicons name="pulse" size={40} color="white" />
          </View>
          <Text style={{ fontSize: 30, fontFamily: "PlusJakartaSans_700Bold", color: "white", letterSpacing: -0.5 }}>
            Steady
          </Text>
          <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_500Medium", color: "rgba(255,255,255,0.7)", marginTop: 4, letterSpacing: 1 }}>
            with ADHD
          </Text>
          <ActivityIndicator size="small" color="white" style={{ marginTop: 32 }} />
        </View>
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(app)/(tabs)/programs" />;
  }

  return <Redirect href="/(auth)/login" />;
}
