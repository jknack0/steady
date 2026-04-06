import { useEffect, useRef } from "react";
import { usePathname } from "expo-router";
import { api } from "./api";

const SCREEN_CATEGORY_MAP: Record<string, string> = {
  "/(app)/(tabs)/tasks": "TASK",
  "/(app)/(tabs)/journal": "MORNING_CHECKIN",
  "/(app)/(tabs)/program": "HOMEWORK",
};

const DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Tracks screen engagement and notifies the API to reset notification
 * escalation counters when the participant visits a relevant screen.
 * Debounced to fire at most once per category per 5-minute window.
 */
export function useEngagementTracking(): void {
  const pathname = usePathname();
  const lastSent = useRef<Record<string, number>>({});

  useEffect(() => {
    const category = SCREEN_CATEGORY_MAP[pathname];
    if (!category) return;

    const now = Date.now();
    const last = lastSent.current[category] || 0;
    if (now - last < DEBOUNCE_MS) return;

    lastSent.current[category] = now;
    api.engageNotification(category).catch(() => {
      // Fire-and-forget; don't block navigation
    });
  }, [pathname]);
}
