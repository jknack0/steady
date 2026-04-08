"use client";

import type { ParticipantDetail } from "@/hooks/use-clinician-participants";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";

interface SessionHistoryProps {
  sessions: ParticipantDetail["enrollments"][0]["sessions"];
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-600",
  NO_SHOW: "bg-red-100 text-red-800",
};

export function SessionHistory({ sessions }: SessionHistoryProps) {
  return (
    <div className="rounded-lg border p-5">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Calendar className="h-4 w-4" /> Session History
      </h3>
      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sessions yet.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-2 rounded border"
            >
              <div>
                <p className="text-sm font-medium">
                  {new Date(s.scheduledAt).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                {s.clinicianNotes && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {s.clinicianNotes}
                  </p>
                )}
              </div>
              <Badge
                variant="outline"
                className={cn("text-xs", STATUS_COLORS[s.status])}
              >
                {s.status.toLowerCase().replace("_", " ")}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
