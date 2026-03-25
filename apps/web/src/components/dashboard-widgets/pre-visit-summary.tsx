"use client";

import { Stethoscope, AlertTriangle, Clock } from "lucide-react";
import { WidgetShell } from "./widget-shell";
import type { WidgetProps } from "./widget-shell";

interface PreVisitSummaryWidgetProps extends WidgetProps {
  dashboardData: {
    todaySessions: Array<{
      id: string;
      scheduledAt: string;
      status: string;
      clientName: string;
      programTitle: string;
      videoCallUrl: string | null;
    }>;
    alerts: Array<{
      clientName: string;
      field: string;
      value: number;
      max: number;
      date: string;
    }>;
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

export function PreVisitSummaryWidget({
  dashboardData,
  column,
  isEditing,
  dragAttributes,
  dragListeners,
}: PreVisitSummaryWidgetProps) {
  const nextSession = dashboardData.todaySessions.find(
    (s) => s.status === "SCHEDULED"
  ) ?? dashboardData.todaySessions[0] ?? null;

  const clientAlerts = nextSession
    ? dashboardData.alerts.filter((a) => a.clientName === nextSession.clientName)
    : [];

  const clientHomework = nextSession
    ? dashboardData.recentHomework.filter(
        (h) => h.clientName === nextSession.clientName
      )
    : [];

  if (column === "sidebar") {
    return (
      <WidgetShell
        title="Pre-Visit Summary"
        icon={Stethoscope}
        isEditing={isEditing}
        dragAttributes={dragAttributes}
        dragListeners={dragListeners}
      >
        {nextSession ? (
          <div className="text-sm">
            <p className="font-medium">{nextSession.clientName}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(nextSession.scheduledAt).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No upcoming sessions</p>
        )}
      </WidgetShell>
    );
  }

  return (
    <WidgetShell
      title="Pre-Visit Summary"
      icon={Stethoscope}
      isEditing={isEditing}
      dragAttributes={dragAttributes}
      dragListeners={dragListeners}
    >
      {!nextSession ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No upcoming sessions to prepare for.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{nextSession.clientName}</span>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              {new Date(nextSession.scheduledAt).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}{" "}
              &middot; {nextSession.programTitle}
            </p>
          </div>

          {clientAlerts.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                Check-in Alerts
              </p>
              <div className="space-y-1">
                {clientAlerts.map((alert, i) => (
                  <div
                    key={`${alert.field}-${i}`}
                    className="flex items-center justify-between text-sm pl-4"
                  >
                    <span className="text-muted-foreground">{alert.field}</span>
                    <span className="text-amber-600 text-xs font-medium">
                      {alert.value}/{alert.max}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {clientHomework.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Recent Homework
              </p>
              <div className="space-y-1">
                {clientHomework.slice(0, 3).map((hw) => (
                  <div key={hw.id} className="text-sm pl-4 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                    <span className="truncate">{hw.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {clientAlerts.length === 0 && clientHomework.length === 0 && (
            <p className="text-xs text-muted-foreground text-center">
              No recent alerts or homework for this client.
            </p>
          )}
        </div>
      )}
    </WidgetShell>
  );
}
