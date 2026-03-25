"use client";

import { WidgetShell } from "@/components/dashboard-widgets";
import type { WidgetProps } from "@/components/dashboard-widgets";
import { ClipboardList } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";

interface HomeworkInstance {
  id: string;
  status: string;
  dueDate?: string | null;
  completedAt?: string | null;
  part?: { id: string; title: string } | null;
  title?: string | null;
}

interface ClientHomeworkProps extends WidgetProps {
  widgetId: string;
  dashboardData?: {
    participantId?: string;
  };
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
}

export function ClientHomeworkWidget({
  isEditing,
  column,
  dashboardData,
  dragAttributes,
  dragListeners,
}: ClientHomeworkProps) {
  const participantId = dashboardData?.participantId;

  const { data: homework } = useQuery<HomeworkInstance[]>({
    queryKey: ["client-homework", participantId],
    queryFn: () => api.get(`/api/clinician/participants/${participantId}/homework`),
    enabled: !!participantId,
  });

  const items = homework ?? [];
  const assigned = items.filter((h) => h.status === "PENDING" || h.status === "ASSIGNED").length;
  const completed = items.filter((h) => h.status === "COMPLETED").length;
  const overdue = items.filter((h) => {
    if (h.status === "COMPLETED" || h.status === "SKIPPED") return false;
    if (!h.dueDate) return false;
    return new Date(h.dueDate) < new Date();
  }).length;

  if (column === "sidebar") {
    return (
      <WidgetShell title="Homework" icon={ClipboardList} isEditing={isEditing} dragAttributes={dragAttributes} dragListeners={dragListeners}>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No homework</p>
        ) : (
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Assigned</span>
              <span className="font-medium">{assigned}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-medium">{completed}</span>
            </div>
            {overdue > 0 && (
              <div className="flex justify-between">
                <span className="text-red-600">Overdue</span>
                <span className="font-medium text-red-600">{overdue}</span>
              </div>
            )}
          </div>
        )}
      </WidgetShell>
    );
  }

  return (
    <WidgetShell title="Homework" icon={ClipboardList} isEditing={isEditing} dragAttributes={dragAttributes} dragListeners={dragListeners}>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No homework assigned</p>
      ) : (
        <div className="space-y-2">
          {/* Summary row */}
          <div className="flex gap-4 text-sm pb-2 border-b">
            <span className="text-muted-foreground">Assigned: <span className="font-medium text-foreground">{assigned}</span></span>
            <span className="text-muted-foreground">Completed: <span className="font-medium text-foreground">{completed}</span></span>
            {overdue > 0 && <span className="text-red-600">Overdue: <span className="font-medium">{overdue}</span></span>}
          </div>
          {/* Item list */}
          {items.slice(0, 15).map((h) => {
            const title = h.part?.title ?? h.title ?? "Homework";
            const isOverdue = h.status !== "COMPLETED" && h.status !== "SKIPPED" && h.dueDate && new Date(h.dueDate) < new Date();
            return (
              <div key={h.id} className="flex items-center justify-between text-sm py-1">
                <span className="truncate flex-1">{title}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {h.dueDate && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(h.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                  <Badge
                    variant={h.status === "COMPLETED" ? "default" : isOverdue ? "destructive" : "secondary"}
                    className="text-xs capitalize"
                  >
                    {isOverdue ? "overdue" : h.status.toLowerCase()}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </WidgetShell>
  );
}
