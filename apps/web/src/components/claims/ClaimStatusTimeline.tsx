"use client";

import { Circle, Send, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string;
  reason: string | null;
  createdAt: string;
}

interface ClaimStatusTimelineProps {
  statusHistory: StatusHistoryEntry[];
}

const STATUS_NODE_CONFIG: Record<
  string,
  { color: string; bgColor: string; icon: React.ElementType; label: string }
> = {
  DRAFT: {
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    icon: Circle,
    label: "Created",
  },
  SUBMITTED: {
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    icon: Send,
    label: "Submitted",
  },
  ACCEPTED: {
    color: "text-teal-600",
    bgColor: "bg-teal-100",
    icon: CheckCircle2,
    label: "Accepted",
  },
  REJECTED: {
    color: "text-red-600",
    bgColor: "bg-red-100",
    icon: XCircle,
    label: "Rejected",
  },
  DENIED: {
    color: "text-red-800",
    bgColor: "bg-red-200",
    icon: XCircle,
    label: "Denied",
  },
  PAID: {
    color: "text-green-600",
    bgColor: "bg-green-100",
    icon: CheckCircle2,
    label: "Paid",
  },
};

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }) +
    " " +
    date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
}

export function ClaimStatusTimeline({ statusHistory }: ClaimStatusTimelineProps) {
  if (!statusHistory || statusHistory.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No status history available.</p>
    );
  }

  return (
    <ol className="relative space-y-0" aria-label="Claim status history">
      {statusHistory.map((entry, index) => {
        const config =
          STATUS_NODE_CONFIG[entry.toStatus] || STATUS_NODE_CONFIG.DRAFT;
        const Icon = config.icon;
        const isLast = index === statusHistory.length - 1;
        const actorLabel = entry.changedBy === "system" ? "system" : "clinician";

        return (
          <li key={entry.id} className="relative flex gap-3 pb-6 last:pb-0">
            {/* Vertical connector line */}
            {!isLast && (
              <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
            )}

            {/* Icon node */}
            <div
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                config.bgColor,
              )}
            >
              <Icon className={cn("h-4 w-4", config.color)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className={cn("text-sm font-medium", config.color)}>
                  {config.label}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatTimestamp(entry.createdAt)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                by {actorLabel}
              </p>
              {entry.reason && (
                <p className="text-xs text-muted-foreground mt-1 italic">
                  &ldquo;{entry.reason}&rdquo;
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
