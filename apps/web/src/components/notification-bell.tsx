"use client";

import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRtmDashboard } from "@/hooks/use-rtm";

export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const { data } = useRtmDashboard(isAuthenticated);
  const hasNotifications =
    ((data?.summary.clientsApproaching ?? 0) +
      (data?.summary.clientsAtRisk ?? 0)) > 0;

  return (
    <button
      className="relative rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      aria-label="Notifications"
    >
      <Bell className="h-4.5 w-4.5" />
      {hasNotifications && (
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
      )}
    </button>
  );
}
