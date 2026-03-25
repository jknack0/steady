"use client";

import { Clock, ClipboardList } from "lucide-react";
import { WidgetShell } from "./widget-shell";
import type { WidgetProps } from "./widget-shell";

interface OverdueHomeworkWidgetProps extends WidgetProps {
  dashboardData: {
    overdueHomework: Array<{
      id: string;
      title: string;
      clientName: string;
      dueDate: string;
    }>;
  };
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
}

export function OverdueHomeworkWidget({
  dashboardData,
  column,
  isEditing,
  dragAttributes,
  dragListeners,
}: OverdueHomeworkWidgetProps) {
  const overdueHomework = dashboardData.overdueHomework;

  if (overdueHomework.length === 0) {
    return (
      <WidgetShell
        title="Overdue Homework"
        icon={Clock}
        isEditing={isEditing}
        dragAttributes={dragAttributes}
        dragListeners={dragListeners}
      >
        <p className="text-sm text-muted-foreground py-4 text-center">
          No overdue homework.
        </p>
      </WidgetShell>
    );
  }

  if (column === "sidebar") {
    return (
      <WidgetShell
        title={`Overdue Homework (${overdueHomework.length})`}
        icon={Clock}
        isEditing={isEditing}
        className="border-amber-200 bg-amber-50/50"
        dragAttributes={dragAttributes}
        dragListeners={dragListeners}
      >
        <div className="space-y-2">
          {overdueHomework.slice(0, 8).map((hw) => (
            <div key={hw.id} className="flex items-center gap-2 text-sm">
              <ClipboardList className="h-3 w-3 text-amber-600 shrink-0" />
              <span className="truncate">{hw.clientName}</span>
              <span className="text-xs text-red-500 shrink-0">
                {new Date(hw.dueDate + "T00:00:00").toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric" }
                )}
              </span>
            </div>
          ))}
        </div>
      </WidgetShell>
    );
  }

  return (
    <WidgetShell
      title={`Overdue Homework (${overdueHomework.length})`}
      icon={Clock}
      isEditing={isEditing}
      className="border-amber-200 bg-amber-50/50"
      dragAttributes={dragAttributes}
      dragListeners={dragListeners}
    >
      <div className="space-y-2">
        {overdueHomework.slice(0, 8).map((hw) => (
          <div
            key={hw.id}
            className="flex items-center gap-3 rounded-md bg-white border border-amber-100 p-3"
          >
            <ClipboardList className="h-4 w-4 text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{hw.clientName}</p>
              <p className="text-xs text-muted-foreground">{hw.title}</p>
            </div>
            <span className="text-xs text-red-500 shrink-0">
              Due{" "}
              {new Date(hw.dueDate + "T00:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        ))}
      </div>
    </WidgetShell>
  );
}
