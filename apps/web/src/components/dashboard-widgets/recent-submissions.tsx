"use client";

import { CheckCircle2 } from "lucide-react";
import { WidgetShell } from "./widget-shell";
import type { WidgetProps } from "./widget-shell";

interface RecentSubmissionsWidgetProps extends WidgetProps {
  dashboardData: {
    recentHomework: Array<{
      id: string;
      title: string;
      clientName: string;
      completedAt: string;
      hasResponses: boolean;
    }>;
  };
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function RecentSubmissionsWidget({
  dashboardData,
  column,
  settings,
  isEditing,
  dragAttributes,
  dragListeners,
}: RecentSubmissionsWidgetProps) {
  const itemCount =
    typeof settings.itemCount === "number" ? settings.itemCount : 10;
  const recentHomework = dashboardData.recentHomework.slice(0, itemCount);

  if (column === "sidebar") {
    return (
      <WidgetShell
        title="Recent Submissions"
        icon={CheckCircle2}
        isEditing={isEditing}
        dragAttributes={dragAttributes}
        dragListeners={dragListeners}
      >
        {recentHomework.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No recent submissions.
          </p>
        ) : (
          <div className="space-y-3">
            {recentHomework.map((hw) => (
              <div key={hw.id} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{hw.clientName}</p>
                  <p className="text-xs text-muted-foreground">{hw.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {hw.completedAt && timeAgo(new Date(hw.completedAt))}
                    {hw.hasResponses && " \u00b7 Has responses"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </WidgetShell>
    );
  }

  return (
    <WidgetShell
      title="Recent Submissions"
      icon={CheckCircle2}
      isEditing={isEditing}
      dragAttributes={dragAttributes}
      dragListeners={dragListeners}
    >
      {recentHomework.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No recent submissions.
        </p>
      ) : (
        <div className="space-y-3">
          {recentHomework.map((hw) => (
            <div key={hw.id} className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{hw.clientName}</p>
                <p className="text-xs text-muted-foreground">{hw.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {hw.completedAt && timeAgo(new Date(hw.completedAt))}
                  {hw.hasResponses && " \u00b7 Has responses"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
