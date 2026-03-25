"use client";

import { AlertTriangle, Flame } from "lucide-react";
import { WidgetShell } from "./widget-shell";
import type { WidgetProps } from "./widget-shell";

interface CheckinAlertsWidgetProps extends WidgetProps {
  dashboardData: {
    alerts: Array<{
      clientName: string;
      field: string;
      value: number;
      max: number;
      date: string;
    }>;
  };
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
}

export function CheckinAlertsWidget({
  dashboardData,
  column,
  isEditing,
  dragAttributes,
  dragListeners,
}: CheckinAlertsWidgetProps) {
  const alerts = dashboardData.alerts;

  if (alerts.length === 0) {
    return (
      <WidgetShell
        title="Check-in Alerts"
        icon={AlertTriangle}
        isEditing={isEditing}
        dragAttributes={dragAttributes}
        dragListeners={dragListeners}
      >
        <p className="text-sm text-muted-foreground py-4 text-center">
          No alerts right now.
        </p>
      </WidgetShell>
    );
  }

  if (column === "sidebar") {
    return (
      <WidgetShell
        title="Check-in Alerts"
        icon={AlertTriangle}
        isEditing={isEditing}
        className="border-red-200 bg-red-50/50"
        dragAttributes={dragAttributes}
        dragListeners={dragListeners}
      >
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <Flame className="h-3 w-3 text-red-500 shrink-0" />
              <span className="truncate">{alert.clientName}</span>
              <span className="text-xs text-red-600 shrink-0">
                {alert.value}/{alert.max}
              </span>
            </div>
          ))}
        </div>
      </WidgetShell>
    );
  }

  return (
    <WidgetShell
      title="Check-in Alerts"
      icon={AlertTriangle}
      isEditing={isEditing}
      className="border-red-200 bg-red-50/50"
      dragAttributes={dragAttributes}
      dragListeners={dragListeners}
    >
      <div className="space-y-2">
        {alerts.map((alert, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-md bg-white border border-red-100 p-3"
          >
            <Flame className="h-4 w-4 text-red-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium">{alert.clientName}</span>
                {" reported "}
                <span className="font-medium text-red-600">
                  {alert.field}: {alert.value}/{alert.max}
                </span>
              </p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {new Date(alert.date + "T00:00:00").toLocaleDateString("en-US", {
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
