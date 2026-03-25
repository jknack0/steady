"use client";

import { ListTodo } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { WidgetShell } from "./widget-shell";
import type { WidgetProps } from "./widget-shell";

interface TodoProgressWidgetProps extends WidgetProps {
  dashboardData: unknown;
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
}

interface TasksData {
  total?: number;
  completed?: number;
  tasks?: Array<{ id: string; status: string }>;
}

export function TodoProgressWidget({
  column,
  isEditing,
  dragAttributes,
  dragListeners,
}: TodoProgressWidgetProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["tasks", "dashboard-widget"],
    queryFn: () =>
      api.get<TasksData | Array<{ id: string; status: string }>>("/api/tasks?take=50"),
  });

  let total = 0;
  let completed = 0;

  if (data) {
    if (Array.isArray(data)) {
      total = data.length;
      completed = data.filter(
        (t) => t.status === "COMPLETED" || t.status === "DONE"
      ).length;
    } else {
      total = data.total ?? data.tasks?.length ?? 0;
      completed =
        data.completed ??
        data.tasks?.filter(
          (t) => t.status === "COMPLETED" || t.status === "DONE"
        ).length ??
        0;
    }
  }

  const pending = total - completed;
  const ratePercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (column === "sidebar") {
    return (
      <WidgetShell
        title="To-Do Progress"
        icon={ListTodo}
        isEditing={isEditing}
        dragAttributes={dragAttributes}
        dragListeners={dragListeners}
      >
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Done</span>
            <span className="font-medium">
              {completed}/{total}
            </span>
          </div>
        )}
      </WidgetShell>
    );
  }

  return (
    <WidgetShell
      title="To-Do Progress"
      icon={ListTodo}
      isEditing={isEditing}
      dragAttributes={dragAttributes}
      dragListeners={dragListeners}
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Loading...
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Completion</span>
              <span className="font-medium">{ratePercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${ratePercent}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border p-3 text-center">
              <p className="text-lg font-bold">{completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-lg font-bold">{pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </div>
      )}
    </WidgetShell>
  );
}
