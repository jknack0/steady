"use client";

import { WidgetShell } from "@/components/dashboard-widgets";
import type { WidgetProps } from "@/components/dashboard-widgets";
import { FileText } from "lucide-react";

interface SessionWithNotes {
  id: string;
  scheduledAt: string;
  status: string;
  clinicianNotes?: string | null;
  participantSummary?: string | null;
}

interface ClientNotesProps extends WidgetProps {
  widgetId: string;
  dashboardData?: {
    enrollment?: {
      sessions?: SessionWithNotes[];
    };
    enrollments?: Array<{
      sessions?: SessionWithNotes[];
    }>;
  };
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
}

export function ClientNotesWidget({
  settings,
  isEditing,
  column,
  dashboardData,
  dragAttributes,
  dragListeners,
}: ClientNotesProps) {
  const itemCount = typeof settings.itemCount === "number" ? settings.itemCount : 5;

  // Gather sessions with notes from all enrollments
  const allSessions: SessionWithNotes[] = [];
  const enrollments = dashboardData?.enrollments ?? [];
  for (const enrollment of enrollments) {
    for (const session of enrollment.sessions ?? []) {
      if (session.clinicianNotes || session.participantSummary) {
        allSessions.push(session);
      }
    }
  }

  const sessions = allSessions
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .slice(0, itemCount);

  if (sessions.length === 0) {
    return (
      <WidgetShell title="Session Notes" icon={FileText} isEditing={isEditing} dragAttributes={dragAttributes} dragListeners={dragListeners}>
        <p className="text-sm text-muted-foreground py-4 text-center">No session notes yet</p>
      </WidgetShell>
    );
  }

  if (column === "sidebar") {
    return (
      <WidgetShell title="Session Notes" icon={FileText} isEditing={isEditing} dragAttributes={dragAttributes} dragListeners={dragListeners}>
        <div className="space-y-2">
          {sessions.map((s) => (
            <div key={s.id} className="text-sm">
              <span className="text-xs text-muted-foreground">
                {new Date(s.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              <p className="text-xs truncate">
                {s.clinicianNotes ?? s.participantSummary ?? ""}
              </p>
            </div>
          ))}
        </div>
      </WidgetShell>
    );
  }

  return (
    <WidgetShell title="Session Notes" icon={FileText} isEditing={isEditing} dragAttributes={dragAttributes} dragListeners={dragListeners}>
      <div className="space-y-3">
        {sessions.map((s) => (
          <div key={s.id} className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground mb-1">
              {new Date(s.scheduledAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            {s.clinicianNotes && (
              <div className="mb-1">
                <p className="text-xs font-medium text-muted-foreground">Clinician Notes</p>
                <p className="text-sm whitespace-pre-line line-clamp-3">{s.clinicianNotes}</p>
              </div>
            )}
            {s.participantSummary && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Participant Summary</p>
                <p className="text-sm whitespace-pre-line line-clamp-3">{s.participantSummary}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </WidgetShell>
  );
}
