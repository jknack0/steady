"use client";

import { useState } from "react";
import { useSessions, useUpdateSession, type Session } from "@/hooks/use-sessions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Calendar,
  Video,
  Clock,
  ChevronRight,
  List,
  LayoutGrid,
} from "lucide-react";
import Link from "next/link";

type ViewMode = "list" | "calendar";

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-600",
  NO_SHOW: "bg-red-100 text-red-800",
};

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SessionsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [view, setView] = useState<ViewMode>("list");

  const { data: sessions, isLoading } = useSessions(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );

  // Group sessions by date for calendar view
  const sessionsByDate = new Map<string, Session[]>();
  for (const s of sessions || []) {
    const dateKey = new Date(s.scheduledAt).toISOString().split("T")[0];
    const existing = sessionsByDate.get(dateKey) || [];
    existing.push(s);
    sessionsByDate.set(dateKey, existing);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Sessions</h1>
          <p className="text-muted-foreground">
            Manage sessions across all participants.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "calendar" ? "default" : "outline"}
            size="icon"
            onClick={() => setView("calendar")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="NO_SHOW">No Show</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !sessions || sessions.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            No sessions yet. Schedule sessions from a participant's detail page.
          </p>
        </div>
      ) : view === "list" ? (
        <ListView sessions={sessions} />
      ) : (
        <CalendarView sessionsByDate={sessionsByDate} />
      )}
    </div>
  );
}

function ListView({ sessions }: { sessions: Session[] }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Date & Time</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Participant</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Program</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
            <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">Link</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {sessions.map((s) => (
            <tr key={s.id} className="hover:bg-accent/50 transition-colors">
              <td className="px-4 py-3">
                <p className="text-sm font-medium">{formatDateTime(s.scheduledAt)}</p>
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/participants/${s.participantId}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {s.participantName}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {s.programTitle}
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline" className={cn("text-xs", STATUS_BADGE[s.status])}>
                  {s.status.toLowerCase().replace("_", " ")}
                </Badge>
              </td>
              <td className="px-4 py-3 text-center">
                {s.videoCallUrl ? (
                  <a
                    href={s.videoCallUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-primary hover:underline text-xs"
                  >
                    <Video className="h-3 w-3 mr-1" /> Join
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                {s.status === "SCHEDULED" && (
                  <Link href={`/sessions/${s.id}/prepare`}>
                    <Button variant="ghost" size="sm">
                      Prepare <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CalendarView({ sessionsByDate }: { sessionsByDate: Map<string, Session[]> }) {
  const sortedDates = Array.from(sessionsByDate.keys()).sort();

  return (
    <div className="space-y-4">
      {sortedDates.map((dateKey) => {
        const daySessions = sessionsByDate.get(dateKey)!;
        const dateObj = new Date(dateKey + "T00:00:00");

        return (
          <div key={dateKey} className="rounded-lg border p-4">
            <h3 className="font-semibold text-sm mb-3">
              {dateObj.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h3>
            <div className="space-y-2">
              {daySessions
                .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                .map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-background"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium w-20">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {formatTime(s.scheduledAt)}
                      </div>
                      <div>
                        <Link
                          href={`/participants/${s.participantId}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {s.participantName}
                        </Link>
                        <p className="text-xs text-muted-foreground">{s.programTitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("text-xs", STATUS_BADGE[s.status])}>
                        {s.status.toLowerCase().replace("_", " ")}
                      </Badge>
                      {s.status === "SCHEDULED" && (
                        <Link href={`/sessions/${s.id}/prepare`}>
                          <Button variant="ghost" size="sm">Prepare</Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
