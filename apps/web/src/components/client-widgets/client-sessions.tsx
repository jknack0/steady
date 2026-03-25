"use client";

import { WidgetShell } from "@/components/dashboard-widgets";
import type { WidgetProps } from "@/components/dashboard-widgets";
import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SessionItem {
  id: string;
  scheduledAt: string;
  status: string;
  clinicianNotes?: string | null;
  participantSummary?: string | null;
}

interface ClientSessionsProps extends WidgetProps {
  widgetId: string;
  dashboardData?: {
    enrollment?: {
      sessions?: SessionItem[];
      program?: { title?: string };
    };
    enrollments?: Array<{
      sessions?: SessionItem[];
      program?: { title?: string };
    }>;
  };
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  COMPLETED: "default",
  SCHEDULED: "secondary",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

export function ClientSessionsWidget({
  settings,
  isEditing,
  column,
  dashboardData,
  dragAttributes,
  dragListeners,
}: ClientSessionsProps) {
  const itemCount = (typeof settings.itemCount === "number" ? settings.itemCount : 10);

  // Gather sessions from all enrollments
  const allSessions: (SessionItem & { programTitle?: string })[] = [];
  const enrollments = dashboardData?.enrollments ?? [];
  for (const enrollment of enrollments) {
    for (const session of enrollment.sessions ?? []) {
      allSessions.push({ ...session, programTitle: enrollment.program?.title });
    }
  }

  // Sort by date descending and limit
  const sessions = allSessions
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .slice(0, itemCount);

  if (sessions.length === 0) {
    return (
      <WidgetShell title="Sessions" icon={Calendar} isEditing={isEditing} dragAttributes={dragAttributes} dragListeners={dragListeners}>
        <p className="text-sm text-muted-foreground py-4 text-center">No sessions yet</p>
      </WidgetShell>
    );
  }

  if (column === "sidebar") {
    return (
      <WidgetShell title="Sessions" icon={Calendar} isEditing={isEditing} dragAttributes={dragAttributes} dragListeners={dragListeners}>
        <div className="space-y-2">
          {sessions.slice(0, 5).map((s) => (
            <div key={s.id} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate">
                {new Date(s.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              <Badge variant={STATUS_VARIANTS[s.status] ?? "outline"} className="text-xs capitalize">
                {s.status.toLowerCase().replace("_", " ")}
              </Badge>
            </div>
          ))}
        </div>
      </WidgetShell>
    );
  }

  return (
    <WidgetShell title="Sessions" icon={Calendar} isEditing={isEditing} dragAttributes={dragAttributes} dragListeners={dragListeners}>
      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 text-xs font-medium text-muted-foreground pb-1 border-b">
          <span>Date</span>
          <span>Program</span>
          <span>Status</span>
        </div>
        {sessions.map((s) => (
          <div key={s.id} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center text-sm py-1">
            <span>
              {new Date(s.scheduledAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="text-xs text-muted-foreground truncate max-w-[160px]">
              {s.programTitle ?? "—"}
            </span>
            <Badge variant={STATUS_VARIANTS[s.status] ?? "outline"} className="text-xs capitalize">
              {s.status.toLowerCase().replace("_", " ")}
            </Badge>
          </div>
        ))}
      </div>
    </WidgetShell>
  );
}
