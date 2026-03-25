"use client";

import { GraduationCap } from "lucide-react";
import { WidgetShell } from "./widget-shell";
import type { WidgetProps } from "./widget-shell";

interface ProgramProgressWidgetProps extends WidgetProps {
  dashboardData: {
    stats: {
      totalClients: number;
      publishedPrograms: number;
    };
  };
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
}

export function ProgramProgressWidget({
  dashboardData,
  column,
  isEditing,
  dragAttributes,
  dragListeners,
}: ProgramProgressWidgetProps) {
  const { totalClients, publishedPrograms } = dashboardData.stats;

  if (column === "sidebar") {
    return (
      <WidgetShell
        title="Program Progress"
        icon={GraduationCap}
        isEditing={isEditing}
        dragAttributes={dragAttributes}
        dragListeners={dragListeners}
      >
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Enrolled</span>
          <span className="font-medium">{totalClients}</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-muted-foreground">Programs</span>
          <span className="font-medium">{publishedPrograms}</span>
        </div>
      </WidgetShell>
    );
  }

  return (
    <WidgetShell
      title="Program Progress"
      icon={GraduationCap}
      isEditing={isEditing}
      dragAttributes={dragAttributes}
      dragListeners={dragListeners}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-md border p-4 text-center">
          <p className="text-2xl font-bold">{totalClients}</p>
          <p className="text-xs text-muted-foreground mt-1">Enrolled Clients</p>
        </div>
        <div className="rounded-md border p-4 text-center">
          <p className="text-2xl font-bold">{publishedPrograms}</p>
          <p className="text-xs text-muted-foreground mt-1">Published Programs</p>
        </div>
      </div>
    </WidgetShell>
  );
}
