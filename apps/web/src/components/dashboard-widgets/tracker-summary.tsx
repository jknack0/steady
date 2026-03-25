"use client";

import { Activity, AlertTriangle } from "lucide-react";
import { WidgetShell } from "./widget-shell";
import type { WidgetProps } from "./widget-shell";

interface TrackerSummaryWidgetProps extends WidgetProps {
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

export function TrackerSummaryWidget({
  dashboardData,
  column,
  isEditing,
  dragAttributes,
  dragListeners,
}: TrackerSummaryWidgetProps) {
  const alerts = dashboardData.alerts;
  const uniqueClients = [...new Set(alerts.map((a) => a.clientName))];

  if (column === "sidebar") {
    return (
      <WidgetShell
        title="Tracker Summary"
        icon={Activity}
        isEditing={isEditing}
        dragAttributes={dragAttributes}
        dragListeners={dragListeners}
      >
        <div className="flex items-center gap-2">
          {alerts.length > 0 ? (
            <>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">
                {uniqueClients.length} client{uniqueClients.length !== 1 ? "s" : ""} with low scores
              </span>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No alerts</p>
          )}
        </div>
      </WidgetShell>
    );
  }

  return (
    <WidgetShell
      title="Tracker Summary"
      icon={Activity}
      isEditing={isEditing}
      dragAttributes={dragAttributes}
      dragListeners={dragListeners}
    >
      {alerts.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No check-in alerts at this time.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="font-medium">
              {alerts.length} alert{alerts.length !== 1 ? "s" : ""} across{" "}
              {uniqueClients.length} client{uniqueClients.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <div
                key={`${alert.clientName}-${alert.field}-${i}`}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{alert.clientName}</p>
                  <p className="text-xs text-muted-foreground">{alert.field}</p>
                </div>
                <span className="text-xs text-amber-600 font-medium shrink-0">
                  {alert.value}/{alert.max}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </WidgetShell>
  );
}
