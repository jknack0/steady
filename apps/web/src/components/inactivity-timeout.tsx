"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"] as const;

/**
 * HIPAA compliance: automatic logoff after 30 minutes of inactivity.
 * Monitors user activity events and triggers logout when the timeout expires.
 */
export function InactivityTimeout() {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogout = useCallback(async () => {
    await logout();
    router.push("/login?reason=timeout");
  }, [logout, router]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(handleLogout, TIMEOUT_MS);
  }, [handleLogout]);

  useEffect(() => {
    if (!isAuthenticated) return;

    resetTimer();

    const onActivity = () => resetTimer();

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
    };
  }, [isAuthenticated, resetTimer]);

  return null;
}
