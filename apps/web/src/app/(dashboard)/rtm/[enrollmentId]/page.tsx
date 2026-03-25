"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CPT_CODES, getCptRate, getCptDescription } from "@steady/shared";
import {
  useRtmClientDetail,
  useLogRtmTime,
  useUpdateBillingPeriod,
  type TimeLogEntry,
  type EngagementEvent,
} from "@/hooks/use-rtm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Timer,
  Check,
  X,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  CircleDot,
  BookOpen,
  MessageSquare,
  ClipboardList,
  Send,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatShortDate, formatMoney } from "@/lib/format";
import { ACTIVITY_TYPES, ACTIVITY_LABELS, QUICK_LOG_PRESETS } from "@/lib/rtm-constants";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";

const CPT_INFO: Record<string, { description: string; rate: number }> = CPT_CODES;

const EVENT_TYPE_ICONS: Record<string, typeof ClipboardList> = {
  tracker_completion: ClipboardList,
  homework_completion: BookOpen,
  journal_entry: FileText,
  session_attendance: MessageSquare,
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function daysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  end.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
}

function eventTypeLabel(eventType: string): string {
  return eventType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Billability helpers ─────────────────────────────────────────────────────

interface BillabilityItem {
  label: string;
  status: "done" | "warning" | "missing";
  detail: string;
  shortDetail: string;
  action?: { label: string; minutes?: number; interactive?: boolean };
}

function computeBillability(period: NonNullable<ReturnType<typeof useRtmClientDetail>["data"]>["currentPeriod"]): {
  items: BillabilityItem[];
  eligibleCodes: string[];
  missingCodes: Array<{ code: string; reason: string }>;
  potentialRevenue: number;
} {
  if (!period) return { items: [], eligibleCodes: [], missingCodes: [], potentialRevenue: 0 };

  const items: BillabilityItem[] = [];
  const eligibleCodes = [...period.eligibleCodes];
  const missingCodes: Array<{ code: string; reason: string }> = [];

  // Engagement days
  const engagementMet = period.engagementDays >= 16;
  items.push({
    label: "Engagement Days",
    status: engagementMet ? "done" : period.engagementDays >= 12 ? "warning" : "missing",
    detail: `${period.engagementDays}/16 required (30-day total: ${period.engagementDays}/30)`,
    shortDetail: engagementMet ? "DONE" : `${16 - period.engagementDays} MORE DAYS`,
  });

  // Monitoring time
  const minutesMet = period.clinicianMinutes >= 20;
  const minutesPartial = period.clinicianMinutes >= 10;
  items.push({
    label: "Monitoring Time",
    status: minutesMet ? "done" : minutesPartial ? "warning" : "missing",
    detail: `${period.clinicianMinutes}/20 minutes required`,
    shortDetail: minutesMet ? "DONE" : `${20 - period.clinicianMinutes} MORE MIN`,
    action: minutesMet
      ? undefined
      : {
          label: `Log ${20 - period.clinicianMinutes} min`,
          minutes: 20 - period.clinicianMinutes,
        },
  });

  // Interactive communication
  items.push({
    label: "Live Interaction",
    status: period.hasInteractiveCommunication ? "done" : "missing",
    detail: period.hasInteractiveCommunication
      ? `Recorded${period.interactiveCommunicationDate ? ` on ${formatShortDate(period.interactiveCommunicationDate)}` : ""}`
      : "Not recorded yet",
    shortDetail: period.hasInteractiveCommunication ? "DONE" : "REQUIRED",
    action: period.hasInteractiveCommunication
      ? undefined
      : { label: "Log Interaction", interactive: true },
  });

  // Determine missing codes
  if (!eligibleCodes.includes("98978") && !eligibleCodes.includes("98986")) {
    if (!engagementMet) {
      missingCodes.push({ code: "98978", reason: `needs ${16 - period.engagementDays} more engagement days` });
    }
  }
  if (!eligibleCodes.includes("98980")) {
    const reasons: string[] = [];
    if (!minutesMet) reasons.push(`${20 - period.clinicianMinutes} more min`);
    if (!period.hasInteractiveCommunication) reasons.push("live interaction");
    if (reasons.length > 0) {
      missingCodes.push({ code: "98980", reason: `needs ${reasons.join(" + ")}` });
    }
  }

  // Revenue
  let potentialRevenue = 0;
  const allPotentialCodes = [...new Set([...eligibleCodes, ...missingCodes.map((m) => m.code)])];
  for (const code of allPotentialCodes) {
    if (CPT_INFO[code]) potentialRevenue += CPT_INFO[code].rate;
  }

  return { items, eligibleCodes, missingCodes, potentialRevenue };
}

// ── Engagement Calendar ─────────────────────────────────────────────────────

function EngagementCalendar({
  periodStart,
  periodEnd,
  calendar,
  engagementDays,
}: {
  periodStart: string;
  periodEnd: string;
  calendar: Record<string, boolean>;
  engagementDays: number;
}) {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: { key: string; engaged: boolean; isToday: boolean; isFuture: boolean }[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = cursor.toISOString().split("T")[0];
    const cursorMidnight = new Date(cursor);
    cursorMidnight.setHours(0, 0, 0, 0);
    days.push({
      key,
      engaged: calendar[key] === true,
      isToday: cursorMidnight.getTime() === today.getTime(),
      isFuture: cursorMidnight > today,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  const thresholdMet = engagementDays >= 16;

  return (
    <div>
      {/* GitHub-style heatmap — single horizontal row */}
      <div className="flex items-center gap-[3px]">
        {days.map((day) => (
          <div
            key={day.key}
            className={cn(
              "w-3 h-3 rounded-sm transition-colors",
              day.isFuture
                ? "bg-gray-100"
                : day.engaged
                  ? "bg-green-500"
                  : "bg-gray-200",
              day.isToday && "ring-1 ring-primary ring-offset-1"
            )}
            title={`${day.key}${day.engaged ? " — engaged" : ""}`}
          />
        ))}
      </div>

      {/* Legend + stats */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-gray-200" />
            No activity
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
            Engaged
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {engagementDays}/30 days | threshold{" "}
          {thresholdMet ? (
            <span className="text-green-600 font-medium">met</span>
          ) : (
            <span className="text-amber-600 font-medium">
              {16 - engagementDays} more needed
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

// ── Activity Timeline ───────────────────────────────────────────────────────

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

// ── Detail Page ─────────────────────────────────────────────────────────────

export function RtmClientDetailContent({ enrollmentId, hideHeader = false }: { enrollmentId: string; hideHeader?: boolean }) {

  const { data, isLoading, error } = useRtmClientDetail(enrollmentId);
  const logTime = useLogRtmTime();
  const updatePeriod = useUpdateBillingPeriod();

  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [duration, setDuration] = useState("");
  const [activityType, setActivityType] = useState("");
  const [description, setDescription] = useState("");
  const [isInteractive, setIsInteractive] = useState(false);
  const [quickLogInteractive, setQuickLogInteractive] = useState(false);

  function resetLogForm() {
    setDuration("");
    setActivityType("");
    setDescription("");
    setIsInteractive(false);
  }

  function handleLogTime() {
    if (!duration || !activityType) return;
    logTime.mutate(
      {
        rtmEnrollmentId: enrollmentId,
        durationMinutes: parseInt(duration, 10),
        activityType,
        description: description.trim() || undefined,
        isInteractiveCommunication: isInteractive,
      },
      {
        onSuccess: () => {
          resetLogForm();
          setLogDialogOpen(false);
        },
      }
    );
  }

  function handleQuickLog(
    minutes: number,
    activity: string,
    interactive: boolean
  ) {
    logTime.mutate({
      rtmEnrollmentId: enrollmentId,
      durationMinutes: minutes,
      activityType: activity,
      isInteractiveCommunication: interactive,
    });
  }

  function handleMarkBilled() {
    if (!data?.currentPeriod?.id) return;
    updatePeriod.mutate({
      id: data.currentPeriod.id,
      data: { status: "BILLED" },
    });
  }

  // Loading
  if (isLoading) {
    return <LoadingState />;
  }

  // Error
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        Failed to load client details. Make sure the API server is running.
      </div>
    );
  }

  if (!data) return null;

  const p = data.currentPeriod;
  const billability = p ? computeBillability(p) : null;
  const timeline = buildTimeline(data.engagementCalendar || [], data.timeLogs);

  // Determine secondary action button
  function renderSecondaryAction() {
    if (!p) return null;

    if (p.status === "BILLED") return null;

    // Superbill generated (FINALIZED) -> Mark as Billed
    if (p.status === "FINALIZED") {
      return (
        <Button
          variant="outline"
          onClick={handleMarkBilled}
          disabled={updatePeriod.isPending}
        >
          {updatePeriod.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          Mark as Billed
        </Button>
      );
    }

    // Billable -> Generate Superbill
    if (billability && billability.eligibleCodes.length > 0 && p.billingTier !== "NONE") {
      return (
        <Link href={`/rtm/${enrollmentId}/superbill/${p.id}`}>
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Generate Superbill
          </Button>
        </Link>
      );
    }

    // At risk -> Send Reminder
    if (billability && billability.items.some((i) => i.status === "missing")) {
      return (
        <Button variant="outline">
          <Send className="h-4 w-4 mr-2" />
          Send Reminder
        </Button>
      );
    }

    return null;
  }

  const statusLabel =
    data.enrollmentStatus === "ACTIVE"
      ? "Active"
      : data.enrollmentStatus === "PENDING_CONSENT"
        ? "Pending Consent"
        : data.enrollmentStatus;

  return (
    <div className="max-w-5xl">
      {!hideHeader && (
        <PageHeader
          title={data.clientName}
          subtitle="RTM Enrollment"
          actions={
            <div className="flex gap-2 shrink-0">
              <Button onClick={() => setLogDialogOpen(true)}>
                <Timer className="h-4 w-4 mr-2" />
                Log Time
              </Button>
              {renderSecondaryAction()}
            </div>
          }
        />
      )}

      {p ? (
        <div className="space-y-6">
          {/* ── Billability Checklist ─────────────────────────────── */}
          {billability && (
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  Billability Checklist
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {billability.items.map((item) => {
                    const StatusIcon =
                      item.status === "done"
                        ? CheckCircle2
                        : item.status === "warning"
                          ? AlertCircle
                          : X;
                    const statusColor =
                      item.status === "done"
                        ? "text-green-600"
                        : item.status === "warning"
                          ? "text-amber-500"
                          : "text-red-500";

                    return (
                      <div
                        key={item.label}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <StatusIcon
                            className={cn("h-5 w-5 shrink-0", statusColor)}
                          />
                          <span className="text-sm font-medium">
                            {item.label}:
                          </span>
                          <span className="text-sm text-muted-foreground truncate">
                            {item.detail}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 ml-7 sm:ml-0">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs whitespace-nowrap",
                              item.status === "done"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : item.status === "warning"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                            )}
                          >
                            {item.shortDetail}
                          </Badge>
                          {item.action && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={logTime.isPending}
                              onClick={() => {
                                if (item.action?.interactive) {
                                  setIsInteractive(true);
                                  setActivityType("INTERACTIVE_COMMUNICATION");
                                  setDuration("5");
                                  setLogDialogOpen(true);
                                } else if (item.action?.minutes) {
                                  handleQuickLog(
                                    item.action.minutes,
                                    "DATA_REVIEW",
                                    false
                                  );
                                }
                              }}
                            >
                              {item.action.label}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Separator className="my-4" />

                <div className="space-y-1 text-sm">
                  {billability.eligibleCodes.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground whitespace-nowrap">
                        Eligible Codes:
                      </span>
                      <span className="font-medium">
                        {(() => {
                          const counts = new Map<string, number>();
                          for (const code of billability.eligibleCodes) {
                            counts.set(code, (counts.get(code) || 0) + 1);
                          }
                          return Array.from(counts.entries()).map(([code, count]) => {
                            const info = CPT_INFO[code];
                            const unitLabel = count > 1 ? ` x${count}` : "";
                            return `${code}${unitLabel}${info ? ` (${formatMoney(info.rate * count)})` : ""}`;
                          }).join(", ");
                        })()}
                      </span>
                    </div>
                  )}

                  {billability.missingCodes.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground whitespace-nowrap">
                        Missing:
                      </span>
                      <span className="text-sm">
                        {billability.missingCodes.map((m) => {
                          const info = CPT_INFO[m.code];
                          return `${m.code}${info ? ` (${formatMoney(info.rate)})` : ""} — ${m.reason}`;
                        }).join("; ")}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-muted-foreground">
                      Potential revenue this period:
                    </span>
                    <span className="font-bold text-lg">
                      {formatMoney(billability.potentialRevenue)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── 30-Day Engagement Calendar ────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                30-Day Engagement Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.engagementCalendar ? (
                <EngagementCalendar
                  periodStart={p.periodStart}
                  periodEnd={p.periodEnd}
                  calendar={Object.fromEntries(
                    (data.engagementCalendar as Array<{ date: string }>).map((d) => [d.date, true])
                  )}
                  engagementDays={p.engagementDays}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Calendar data unavailable.
                </p>
              )}
            </CardContent>
          </Card>

          {/* ── Quick Log Time ────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Quick Log Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">
                    {p.clinicianMinutes}/20 minutes logged
                  </span>
                  <span
                    className={cn(
                      "font-medium",
                      p.clinicianMinutes >= 20
                        ? "text-green-600"
                        : "text-muted-foreground"
                    )}
                  >
                    {p.clinicianMinutes >= 20
                      ? "Threshold met"
                      : `${20 - p.clinicianMinutes} min remaining`}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      p.clinicianMinutes >= 20
                        ? "bg-green-500"
                        : p.clinicianMinutes >= 10
                          ? "bg-amber-500"
                          : "bg-red-400"
                    )}
                    style={{
                      width: `${Math.min((p.clinicianMinutes / 20) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Preset buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {QUICK_LOG_PRESETS.map((preset) => (
                  <Button
                    key={preset.minutes}
                    variant="outline"
                    size="sm"
                    className="h-9"
                    disabled={logTime.isPending}
                    onClick={() =>
                      handleQuickLog(
                        preset.minutes,
                        preset.activity,
                        quickLogInteractive
                      )
                    }
                  >
                    {logTime.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {preset.label}
                  </Button>
                ))}
              </div>

              {/* Interactive toggle + custom entry */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="quick-interactive"
                    checked={quickLogInteractive}
                    onCheckedChange={(checked) =>
                      setQuickLogInteractive(checked === true)
                    }
                  />
                  <Label
                    htmlFor="quick-interactive"
                    className="text-sm font-normal cursor-pointer"
                  >
                    This was a live interaction
                  </Label>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLogDialogOpen(true)}
                  className="text-muted-foreground"
                >
                  Custom entry...
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── Activity Timeline ─────────────────────────────────── */}
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

          {/* ── Previous Periods ───────────────────────────────────── */}
          {data.previousPeriods.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Previous Periods ({data.previousPeriods.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">
                          Period
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2 hidden sm:table-cell">
                          Engagement
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2 hidden sm:table-cell">
                          Minutes
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">
                          Revenue
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">
                          Status
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2 hidden sm:table-cell" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.previousPeriods.map((period) => {
                        const revenue = period.eligibleCodes.reduce(
                          (sum, code) =>
                            sum + (CPT_INFO[code]?.rate ?? 0),
                          0
                        );
                        return (
                          <tr
                            key={period.id}
                            className="hover:bg-accent/50 transition-colors"
                          >
                            <td className="px-4 py-2.5 text-sm">
                              {formatShortDate(period.periodStart)} &ndash;{" "}
                              {formatShortDate(period.periodEnd)}
                            </td>
                            <td className="px-4 py-2.5 text-sm hidden sm:table-cell">
                              {period.engagementDays} days
                            </td>
                            <td className="px-4 py-2.5 text-sm hidden sm:table-cell">
                              {period.clinicianMinutes} min
                            </td>
                            <td className="px-4 py-2.5 text-sm font-medium">
                              {revenue > 0
                                ? formatMoney(revenue)
                                : "--"}
                            </td>
                            <td className="px-4 py-2.5">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  period.status === "BILLED"
                                    ? "bg-gray-100 text-gray-700 border-gray-200"
                                    : period.status === "FINALIZED"
                                      ? "bg-blue-100 text-blue-700 border-blue-200"
                                      : "bg-green-100 text-green-800 border-green-200"
                                )}
                              >
                                {period.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 hidden sm:table-cell">
                              {(period.status === "FINALIZED" ||
                                period.status === "BILLED") && (
                                <Link
                                  href={`/rtm/${enrollmentId}/superbill/${period.id}`}
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  View Superbill
                                </Link>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No active billing period</h3>
            <p className="text-muted-foreground mt-1">
              A billing period will be created when the client begins engaging
              with the program.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Log Time Dialog (custom entry) ─────────────────────── */}
      <Dialog
        open={logDialogOpen}
        onOpenChange={(v) => {
          if (!v) resetLogForm();
          setLogDialogOpen(v);
        }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Log Monitoring Time</DialogTitle>
            <DialogDescription>
              Record time spent monitoring {data.clientName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="detail-duration">Duration (minutes)</Label>
              <Input
                id="detail-duration"
                type="number"
                min="1"
                max="120"
                placeholder="e.g. 15"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="detail-activity">Activity Type</Label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger id="detail-activity">
                  <SelectValue placeholder="Select activity type" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="detail-description">Description</Label>
              <Textarea
                id="detail-description"
                placeholder="Brief description of the activity..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="detail-interactive"
                checked={isInteractive}
                onCheckedChange={(checked) =>
                  setIsInteractive(checked === true)
                }
              />
              <Label
                htmlFor="detail-interactive"
                className="text-sm font-normal cursor-pointer"
              >
                This included a live interaction with the client
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLogDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLogTime}
              disabled={logTime.isPending || !duration || !activityType}
            >
              {logTime.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Log Time
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RtmClientDetailPage() {
  const params = useParams();
  const enrollmentId = params.enrollmentId as string;
  return <RtmClientDetailContent enrollmentId={enrollmentId} />;
}
