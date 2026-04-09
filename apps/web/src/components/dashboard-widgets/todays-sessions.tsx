"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Calendar, ArrowRight, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WidgetShell } from "./widget-shell";
import type { WidgetProps } from "./widget-shell";

interface TodaysSessionsWidgetProps extends WidgetProps {
  dashboardData: {
    todaySessions: Array<{
      id: string;
      scheduledAt: string;
      status: string;
      clientName: string;
      programTitle: string;
      videoCallUrl: string | null;
    }>;
  };
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
}

export function TodaysSessionsWidget({
  dashboardData,
  column,
  isEditing,
  dragAttributes,
  dragListeners,
}: TodaysSessionsWidgetProps) {
  const sessions = dashboardData.todaySessions;

  const headerAction = (
    <Link
      href="/appointments"
      className="text-xs text-primary hover:underline flex items-center gap-1"
    >
      View all <ArrowRight className="h-3 w-3" />
    </Link>
  );

  if (column === "sidebar") {
    return (
      <WidgetShell
        title="Today's Sessions"
        icon={Calendar}
        isEditing={isEditing}
        headerAction={headerAction}
        dragAttributes={dragAttributes}
        dragListeners={dragListeners}
      >
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No sessions scheduled today.
          </p>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center gap-2 text-sm">
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(session.scheduledAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                <span className="truncate">{session.clientName}</span>
              </div>
            ))}
          </div>
        )}
      </WidgetShell>
    );
  }

  return (
    <WidgetShell
      title="Today's Sessions"
      icon={Calendar}
      isEditing={isEditing}
      headerAction={headerAction}
      dragAttributes={dragAttributes}
      dragListeners={dragListeners}
    >
      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No sessions scheduled today.
        </p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center gap-3 rounded-md border p-3"
            >
              <div
                className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  session.status === "COMPLETED"
                    ? "bg-green-500"
                    : session.status === "SCHEDULED"
                      ? "bg-blue-500"
                      : "bg-gray-400"
                )}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{session.clientName}</p>
                <p className="text-xs text-muted-foreground">
                  {session.programTitle}
                </p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(session.scheduledAt).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
              {session.status === "SCHEDULED" && (
                <Link href={`/appointments/prep/${session.id}`}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                  >
                    Prepare
                  </Button>
                </Link>
              )}
              {session.videoCallUrl && session.status === "SCHEDULED" && (
                <a
                  href={session.videoCallUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" variant="ghost" className="h-7 px-2">
                    <Video className="h-3.5 w-3.5" />
                  </Button>
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
