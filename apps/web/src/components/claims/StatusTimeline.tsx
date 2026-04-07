"use client";

import { ClaimStatusBadge } from "./ClaimStatusBadge";

interface StatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string;
  reason?: string | null;
  createdAt: string;
}

interface StatusTimelineProps {
  history: StatusHistoryEntry[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function actorLabel(changedBy: string): string {
  if (changedBy === "system") return "System";
  return "You";
}

export function StatusTimeline({ history }: StatusTimelineProps) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No status history available.</p>
    );
  }

  return (
    <ol className="relative space-y-0" aria-label="Claim status history">
      {history.map((entry, i) => (
        <li
          key={entry.id}
          className="relative flex items-start gap-3 pb-6 last:pb-0"
          aria-label={`Status changed to ${entry.toStatus} on ${formatDate(entry.createdAt)}`}
        >
          {/* Vertical line */}
          {i < history.length - 1 && (
            <div className="absolute left-[7px] top-5 h-full w-px bg-border" />
          )}

          {/* Dot */}
          <div className="relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-primary bg-background" />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <ClaimStatusBadge status={entry.toStatus} />
              <span className="text-xs text-muted-foreground">
                {formatDate(entry.createdAt)} {formatTime(entry.createdAt)}
              </span>
              <span className="text-xs text-muted-foreground">
                {actorLabel(entry.changedBy)}
              </span>
            </div>
            {entry.reason && (
              <p className="mt-1 text-xs text-muted-foreground">{entry.reason}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
