"use client";

import { WidgetShell } from "@/components/dashboard-widgets";
import type { WidgetProps } from "@/components/dashboard-widgets";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ClientAlertsProps extends WidgetProps {
  widgetId: string;
  dashboardData?: {
    enrollment?: {
      homeworkProgress?: Array<{
        partId: string;
        partTitle: string;
        status: string;
      }>;
      sessions?: Array<{
        id: string;
        scheduledAt: string;
        status: string;
      }>;
    };
    enrollments?: Array<{
      homeworkProgress?: Array<{
        partId: string;
        partTitle: string;
        status: string;
      }>;
      sessions?: Array<{
        id: string;
        scheduledAt: string;
        status: string;
      }>;
    }>;
  };
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
}

interface Alert {
  id: string;
  type: "overdue_homework" | "missed_session" | "no_recent_activity";
  label: string;
  detail: string;
}

export function ClientAlertsWidget({
  isEditing,
  column,
  dashboardData,
  dragAttributes,
  dragListeners,
}: ClientAlertsProps) {
  const alerts: Alert[] = [];

  // Check for overdue/incomplete homework across enrollments
  const enrollments = dashboardData?.enrollments ?? [];
  for (const enrollment of enrollments) {
    const incompleteHw = (enrollment.homeworkProgress ?? []).filter(
      (h) => h.status !== "COMPLETED" && h.status !== "SKIPPED"
    );
    for (const hw of incompleteHw) {
      alerts.push({
        id: `hw-${hw.partId}`,
        type: "overdue_homework",
        label: "Incomplete homework",
        detail: hw.partTitle,
      });
    }

    // Check for missed/no-show sessions
    const missedSessions = (enrollment.sessions ?? []).filter(
      (s) => s.status === "NO_SHOW" || s.status === "CANCELLED"
    );
    for (const s of missedSessions.slice(0, 3)) {
      alerts.push({
        id: `session-${s.id}`,
        type: "missed_session",
        label: s.status === "NO_SHOW" ? "No-show" : "Cancelled",
        detail: new Date(s.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      });
    }
  }

  if (alerts.length === 0) {
    return (
      <WidgetShell title="Alerts" icon={AlertTriangle} isEditing={isEditing} dragAttributes={dragAttributes} dragListeners={dragListeners}>
        <p className="text-sm text-muted-foreground py-4 text-center">No alerts</p>
      </WidgetShell>
    );
  }

  if (column === "sidebar") {
    return (
      <WidgetShell title="Alerts" icon={AlertTriangle} isEditing={isEditing} className="border-amber-200 bg-amber-50/50" dragAttributes={dragAttributes} dragListeners={dragListeners}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-amber-700">{alerts.length} alert{alerts.length !== 1 ? "s" : ""}</span>
          <Badge variant="destructive" className="text-xs">{alerts.length}</Badge>
        </div>
      </WidgetShell>
    );
  }

  return (
    <WidgetShell title="Alerts" icon={AlertTriangle} isEditing={isEditing} className="border-amber-200 bg-amber-50/50" dragAttributes={dragAttributes} dragListeners={dragListeners}>
      <div className="space-y-2">
        {alerts.map((alert) => (
          <div key={alert.id} className="flex items-center gap-3 rounded-md border border-amber-100 bg-white p-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{alert.label}</p>
              <p className="text-xs text-muted-foreground truncate">{alert.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </WidgetShell>
  );
}
