"use client";

import { ClipboardCheck } from "lucide-react";
import { WidgetShell } from "./widget-shell";
import type { WidgetProps } from "./widget-shell";

interface HomeworkStatusWidgetProps extends WidgetProps {
  dashboardData: {
    stats: {
      weekHomeworkRate: number;
      overdueCount: number;
    };
  };
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
}

export function HomeworkStatusWidget({
  dashboardData,
  column,
  isEditing,
  dragAttributes,
  dragListeners,
}: HomeworkStatusWidgetProps) {
  const { weekHomeworkRate, overdueCount } = dashboardData.stats;
  const ratePercent = Math.round(weekHomeworkRate * 100);

  if (column === "sidebar") {
    return (
      <WidgetShell
        title="Homework Status"
        icon={ClipboardCheck}
        isEditing={isEditing}
        dragAttributes={dragAttributes}
        dragListeners={dragListeners}
      >
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Completion</span>
          <span className="font-medium">{ratePercent}%</span>
        </div>
        {overdueCount > 0 && (
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-muted-foreground">Overdue</span>
            <span className="font-medium text-amber-600">{overdueCount}</span>
          </div>
        )}
      </WidgetShell>
    );
  }

  return (
    <WidgetShell
      title="Homework Status"
      icon={ClipboardCheck}
      isEditing={isEditing}
      dragAttributes={dragAttributes}
      dragListeners={dragListeners}
    >
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Weekly completion rate</span>
            <span className="font-medium">{ratePercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${ratePercent}%` }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-md border p-3 text-sm">
          <span className="text-muted-foreground">Overdue assignments</span>
          <span className={overdueCount > 0 ? "font-medium text-amber-600" : "font-medium text-muted-foreground"}>
            {overdueCount}
          </span>
        </div>
      </div>
    </WidgetShell>
  );
}
