"use client";

import { BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { WidgetShell } from "./widget-shell";
import type { WidgetProps } from "./widget-shell";

interface JournalActivityWidgetProps extends WidgetProps {
  dashboardData: unknown;
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
}

interface JournalEntry {
  id: string;
  title: string;
  createdAt: string;
  clientName?: string;
}

export function JournalActivityWidget({
  column,
  settings,
  isEditing,
  dragAttributes,
  dragListeners,
}: JournalActivityWidgetProps) {
  const itemCount =
    typeof settings.itemCount === "number" ? settings.itemCount : 5;

  const { data, isLoading } = useQuery({
    queryKey: ["journal", "dashboard", itemCount],
    queryFn: () => api.get<JournalEntry[]>(`/api/journal?take=${itemCount}`),
  });

  const entries = data ?? [];

  if (column === "sidebar") {
    return (
      <WidgetShell
        title="Journal Activity"
        icon={BookOpen}
        isEditing={isEditing}
        dragAttributes={dragAttributes}
        dragListeners={dragListeners}
      >
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <p className="text-sm">
            <span className="font-medium">{entries.length}</span>{" "}
            <span className="text-muted-foreground">recent entries</span>
          </p>
        )}
      </WidgetShell>
    );
  }

  return (
    <WidgetShell
      title="Journal Activity"
      icon={BookOpen}
      isEditing={isEditing}
      dragAttributes={dragAttributes}
      dragListeners={dragListeners}
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Loading...
        </p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No recent journal entries.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-md border p-3 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{entry.title || "Untitled"}</p>
                {entry.clientName && (
                  <p className="text-xs text-muted-foreground">{entry.clientName}</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0 ml-2">
                {new Date(entry.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
