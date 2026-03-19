import "../global.css";
import { useEffect, useRef } from "react";
import { Slot, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../lib/auth-context";
import { useFonts } from "expo-font";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { View, ActivityIndicator } from "react-native";
import * as Notifications from "expo-notifications";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function useNotificationListeners() {
  const router = useRouter();
  const responseListener = useRef<{ remove(): void }>();

  useEffect(() => {
    // Handle notification taps — navigate to the right screen
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string> | undefined;
      if (!data?.type) return;

      switch (data.type) {
        case "morning_checkin":
        case "weekly_review":
          router.push("/(app)/(tabs)/journal");
          break;
        case "homework":
          if (data.partId && data.enrollmentId) {
            router.push({ pathname: "/(app)/part/[partId]", params: { partId: data.partId, enrollmentId: data.enrollmentId } });
          }
          break;
        case "task_reminder":
          router.push("/(app)/(tabs)/tasks");
          break;
        case "calendar_reminder":
        case "session_reminder":
          router.push("/(app)/(tabs)/calendar");
          break;
      }
    });

    return () => {
      responseListener.current?.remove();
    };
  }, [router]);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useNotificationListeners();

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: "#5B8A8A", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Slot />
        <StatusBar style="dark" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
