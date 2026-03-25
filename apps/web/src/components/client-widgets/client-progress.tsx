"use client";

import { WidgetShell } from "@/components/dashboard-widgets";
import type { WidgetProps } from "@/components/dashboard-widgets";
import { Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ModuleProgressItem {
  moduleId: string;
  moduleTitle: string;
  sortOrder: number;
  status: string;
  unlockedAt?: string | null;
  completedAt?: string | null;
}

interface ClientProgressProps extends WidgetProps {
  widgetId: string;
  dashboardData?: {
    enrollment?: {
      id?: string;
      enrolledAt?: string;
      status?: string;
      program?: { title?: string };
      moduleProgress?: ModuleProgressItem[];
    };
  };
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
}

export function ClientProgressWidget({
  isEditing,
  column,
  dashboardData,
  dragAttributes,
  dragListeners,
}: ClientProgressProps) {
  const enrollment = dashboardData?.enrollment;
  const moduleProgress = enrollment?.moduleProgress ?? [];
  const totalModules = moduleProgress.length;
  const completedModules = moduleProgress.filter((m) => m.status === "COMPLETED").length;
  const percent = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  if (!enrollment) {
    return (
      <WidgetShell title="Program Progress" icon={Target} isEditing={isEditing} dragAttributes={dragAttributes} dragListeners={dragListeners}>
        <p className="text-sm text-muted-foreground py-4 text-center">No enrollment data</p>
      </WidgetShell>
    );
  }

  const progressBar = (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-muted-foreground">Modules</span>
        <span className="font-medium">{completedModules}/{totalModules} ({percent}%)</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );

  if (column === "sidebar") {
    return (
      <WidgetShell title="Program Progress" icon={Target} isEditing={isEditing} dragAttributes={dragAttributes} dragListeners={dragListeners}>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground truncate">{enrollment.program?.title}</p>
          {progressBar}
        </div>
      </WidgetShell>
    );
  }

  return (
    <WidgetShell title="Program Progress" icon={Target} isEditing={isEditing} dragAttributes={dragAttributes} dragListeners={dragListeners}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{enrollment.program?.title}</p>
          {enrollment.enrolledAt && (
            <span className="text-xs text-muted-foreground">
              Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          )}
        </div>
        {progressBar}
        {moduleProgress.length > 0 && (
          <div className="space-y-1">
            {moduleProgress
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((m) => (
                <div key={m.moduleId} className="flex items-center justify-between text-sm py-1">
                  <span className="truncate flex-1">{m.moduleTitle}</span>
                  <Badge
                    variant={m.status === "COMPLETED" ? "default" : m.status === "IN_PROGRESS" ? "secondary" : "outline"}
                    className="text-xs capitalize"
                  >
                    {m.status.toLowerCase().replace("_", " ")}
                  </Badge>
                </div>
              ))}
          </div>
        )}
      </div>
    </WidgetShell>
  );
}
