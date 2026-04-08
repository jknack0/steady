"use client";

import type { TimeLogEntry, EngagementEvent } from "@/hooks/use-rtm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatShortDate } from "@/lib/format";
import { ACTIVITY_LABELS } from "@/lib/rtm-constants";
import {
  Clock,
  CircleDot,
  BookOpen,
  FileText,
  MessageSquare,
  ClipboardList,
} from "lucide-react";

const EVENT_TYPE_ICONS: Record<string, typeof ClipboardList> = {
  tracker_completion: ClipboardList,
  homework_completion: BookOpen,
  journal_entry: FileText,
  session_attendance: MessageSquare,
};

interface TimelineItem {
  id: string;
  date: string;
  timestamp: string;
  type: "engagement" | "time_log";
  icon: typeof ClipboardList;
  title: string;
  description: string;
  isInteractive?: boolean;
  durationMinutes?: number;
}

function eventTypeLabel(eventType: string): string {
  return eventType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildTimeline(
  engagementEvents: EngagementEvent[],
  timeLogs: TimeLogEntry[]
): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const day of engagementEvents) {
    for (const evt of day.events) {
      const evtType = typeof evt === "string" ? evt : evt.type;
      const evtTimestamp = typeof evt === "string" ? day.date : evt.timestamp || day.date;
      const IconComponent =
        EVENT_TYPE_ICONS[evtType.toLowerCase()] ||
        EVENT_TYPE_ICONS[evtType] ||
        CircleDot;
      items.push({
        id: `eng-${day.date}-${evtType}`,
        date: day.date,
        timestamp: evtTimestamp,
        type: "engagement",
        icon: IconComponent,
        title: eventTypeLabel(evtType),
        description: `Client activity on ${formatShortDate(day.date)}`,
      });
    }
  }

  for (const log of timeLogs) {
    items.push({
      id: log.id,
      date: log.activityDate,
      timestamp: log.activityDate,
      type: "time_log",
      icon: Clock,
      title: ACTIVITY_LABELS[log.activityType] || log.activityType,
      description: log.description || `${log.durationMinutes} min logged`,
      isInteractive: log.isInteractiveCommunication,
      durationMinutes: log.durationMinutes,
    });
  }

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return items;
}

interface ActivityTimelineProps {
  engagementEvents: EngagementEvent[];
  timeLogs: TimeLogEntry[];
}

export function ActivityTimeline({
  engagementEvents,
  timeLogs,
}: ActivityTimelineProps) {
  const timeline = buildTimeline(engagementEvents, timeLogs);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No activity recorded for this period yet.
          </p>
        ) : (
          <div className="space-y-1">
            {timeline.map((item, idx) => {
              const Icon = item.icon;
              const isTimeLog = item.type === "time_log";
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start gap-3 py-2.5 px-3 rounded-md",
                    isTimeLog
                      ? "bg-blue-50/60 border border-blue-100"
                      : idx % 2 === 0
                        ? "bg-muted/30"
                        : ""
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 mt-0.5 shrink-0",
                      isTimeLog
                        ? "text-blue-600"
                        : "text-green-600"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {item.title}
                      </span>
                      {item.isInteractive && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200"
                        >
                          Live
                        </Badge>
                      )}
                      {item.durationMinutes && (
                        <span className="text-xs text-muted-foreground">
                          {item.durationMinutes} min
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.description}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {formatShortDate(item.date)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
