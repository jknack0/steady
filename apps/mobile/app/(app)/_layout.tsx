import { Stack } from "expo-router";
import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "../../lib/auth-context";

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack>
      <Stack.Screen
        name="programs"
        options={{ title: "My Programs", headerTitleStyle: { fontWeight: "bold" } }}
      />
      <Stack.Screen
        name="program/[enrollmentId]"
        options={{ title: "Program" }}
      />
      <Stack.Screen
        name="part/[partId]"
        options={{ title: "Content" }}
      />
    </Stack>
  );
}
