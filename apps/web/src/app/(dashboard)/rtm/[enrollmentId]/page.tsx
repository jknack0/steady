"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useRtmClientDetail,
  useLogRtmTime,
  useUpdateBillingPeriod,
  type TimeLogEntry,
} from "@/hooks/use-rtm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  ArrowLeft,
  Timer,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Constants ───────────────────────────────────────────────────────────────

const ACTIVITY_TYPES = [
  { value: "DATA_REVIEW", label: "Data Review" },
  { value: "PROGRAM_ADJUSTMENT", label: "Program Adjustment" },
  { value: "OUTCOME_ANALYSIS", label: "Outcome Analysis" },
  { value: "INTERACTIVE_COMMUNICATION", label: "Interactive Communication" },
  { value: "OTHER", label: "Other" },
];

const ACTIVITY_LABELS: Record<string, string> = {
  DATA_REVIEW: "Data Review",
  PROGRAM_ADJUSTMENT: "Program Adjustment",
  OUTCOME_ANALYSIS: "Outcome Analysis",
  INTERACTIVE_COMMUNICATION: "Interactive Communication",
  OTHER: "Other",
};

const CPT_DESCRIPTIONS: Record<string, { description: string; rate: string }> = {
  "98975": { description: "RTM initial setup (device/platform)", rate: "$21" },
  "98976": { description: "RTM device supply (musculoskeletal)", rate: "$52" },
  "98977": { description: "RTM device supply (respiratory)", rate: "$52" },
  "98978": { description: "RTM device supply (cognitive behavioral)", rate: "$52" },
  "98980": { description: "RTM treatment management, first 20 min", rate: "$51" },
  "98981": { description: "RTM treatment management, addl 20 min", rate: "$42" },
};

// ── Engagement Calendar ─────────────────────────────────────────────────────

function EngagementCalendar({
  periodStart,
  periodEnd,
  calendar,
}: {
  periodStart: string;
  periodEnd: string;
  calendar: Record<string, boolean>;
}) {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: { date: Date; key: string; engaged: boolean; isToday: boolean; inRange: boolean }[] = [];

  // Build all days in range
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = cursor.toISOString().split("T")[0];
    const cursorMidnight = new Date(cursor);
    cursorMidnight.setHours(0, 0, 0, 0);

    days.push({
      date: new Date(cursor),
      key,
      engaged: calendar[key] === true,
      isToday: cursorMidnight.getTime() === today.getTime(),
      inRange: cursorMidnight <= today,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {/* Day labels */}
      {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
        <div
          key={i}
          className="text-xs text-center text-muted-foreground font-medium pb-1"
        >
          {d}
        </div>
      ))}

      {/* Offset for first day of period */}
      {Array.from({ length: start.getDay() }).map((_, i) => (
        <div key={`pad-${i}`} />
      ))}

      {/* Day cells */}
      {days.map((day) => (
        <div
          key={day.key}
          className={cn(
            "aspect-square rounded-md flex items-center justify-center text-xs font-medium transition-colors",
            day.engaged
              ? "bg-green-500 text-white"
              : day.inRange
                ? "bg-gray-100 text-gray-400"
                : "bg-gray-50 text-gray-300",
            day.isToday && "ring-2 ring-primary ring-offset-1"
          )}
          title={`${day.key}${day.engaged ? " — engaged" : ""}`}
        >
          {day.date.getDate()}
        </div>
      ))}
    </div>
  );
}

// ── Detail Page ─────────────────────────────────────────────────────────────

export default function RtmClientDetailPage() {
  const params = useParams();
  const enrollmentId = params.enrollmentId as string;

  const { data, isLoading, error } = useRtmClientDetail(enrollmentId);
  const logTime = useLogRtmTime();
  const updatePeriod = useUpdateBillingPeriod();

  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [duration, setDuration] = useState("");
  const [activityType, setActivityType] = useState("");
  const [description, setDescription] = useState("");
  const [isInteractive, setIsInteractive] = useState(false);
  const [previousExpanded, setPreviousExpanded] = useState(false);

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

  function handleMarkBilled() {
    if (!data?.currentPeriod?.id) return;
    updatePeriod.mutate({
      id: data.currentPeriod.id,
      data: { status: "BILLED" },
    });
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatShortDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        Failed to load client details. Make sure the API server is running.
      </div>
    );
  }

  if (!data) return null;

  const p = data.currentPeriod;

  return (
    <div className="max-w-5xl">
      {/* ── Back link + Header ──────────────────────────────────────── */}
      <Link
        href="/rtm"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to RTM Dashboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">{data.clientName}</h1>
          <div className="flex items-center gap-3 mt-1">
            <Badge variant="outline" className="text-xs">
              {data.monitoringType}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                data.enrollmentStatus === "ACTIVE"
                  ? "bg-green-100 text-green-800 border-green-200"
                  : "bg-gray-100 text-gray-600 border-gray-200"
              )}
            >
              {data.enrollmentStatus}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setLogDialogOpen(true)}>
            <Timer className="h-4 w-4 mr-2" />
            Log Time
          </Button>
          {p && p.status !== "BILLED" && (
            <Button
              variant="outline"
              onClick={handleMarkBilled}
              disabled={updatePeriod.isPending}
            >
              {updatePeriod.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Mark as Billed
            </Button>
          )}
        </div>
      </div>

      {/* ── Current Period ──────────────────────────────────────────── */}
      {p ? (
        <div className="space-y-6">
          {/* Period overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Current Period
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Left: stats */}
                <div className="flex-1 space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Period Dates
                    </p>
                    <p className="font-medium">
                      {formatDate(p.periodStart)} - {formatDate(p.periodEnd)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.daysElapsed} days elapsed, {p.daysRemaining} remaining
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Engagement Days
                    </p>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-bold">
                        {p.engagementDays}
                      </span>
                      <span className="text-xl text-muted-foreground mb-1">
                        /30
                      </span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mt-2">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          p.engagementDays >= 16
                            ? "bg-green-500"
                            : p.engagementDays >= 12
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        )}
                        style={{
                          width: `${Math.min((p.engagementDays / 30) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {p.engagementDays >= 16
                        ? "Threshold met (16+ days)"
                        : `${16 - p.engagementDays} more days needed to meet threshold`}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Monitoring Time
                      </p>
                      <p className="text-xl font-bold">
                        {p.clinicianMinutes} min
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.clinicianMinutes >= 20
                          ? "20 min threshold met"
                          : `${20 - p.clinicianMinutes} min remaining`}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Interactive Communication
                      </p>
                      <div className="flex items-center gap-2">
                        {p.hasInteractiveCommunication ? (
                          <>
                            <Check className="h-5 w-5 text-green-600" />
                            <span className="text-sm">
                              {p.interactiveCommunicationDate
                                ? formatShortDate(
                                    p.interactiveCommunicationDate
                                  )
                                : "Yes"}
                            </span>
                          </>
                        ) : (
                          <>
                            <X className="h-5 w-5 text-red-400" />
                            <span className="text-sm text-muted-foreground">
                              Not yet
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: calendar grid */}
                <div className="lg:w-72">
                  <p className="text-sm font-medium mb-3">
                    Engagement Calendar
                  </p>
                  {"engagementCalendar" in p && p.engagementCalendar ? (
                    <EngagementCalendar
                      periodStart={p.periodStart}
                      periodEnd={p.periodEnd}
                      calendar={
                        p.engagementCalendar as Record<string, boolean>
                      }
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Calendar data unavailable.
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-green-500" />
                      Engaged
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-gray-100 border" />
                      No activity
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Engagement Events ──────────────────────────────────── */}
          {data.engagementCalendar?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Engagement Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.engagementCalendar.map((day) => (
                    <div key={day.date} className="flex gap-4">
                      <div className="text-sm font-medium text-muted-foreground w-20 shrink-0 pt-0.5">
                        {formatShortDate(day.date)}
                      </div>
                      <div className="flex-1">
                        <ul className="space-y-1">
                          {day.events.map((evt, i) => (
                            <li
                              key={i}
                              className="text-sm flex items-center gap-2"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                              {evt.type.replace(/_/g, " ").toLowerCase()}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Clinician Time Logs ───────────────────────────────── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Clinician Time Logs
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                Total: <span className="font-bold text-foreground">{p.clinicianMinutes} min</span>
              </div>
            </CardHeader>
            <CardContent>
              {data.timeLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No time logged for this period yet.
                </p>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">
                          Date
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">
                          Activity
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">
                          Duration
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">
                          Description
                        </th>
                        <th className="text-center text-xs font-medium text-muted-foreground px-4 py-2">
                          Interactive
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.timeLogs.map((log: TimeLogEntry) => (
                        <tr
                          key={log.id}
                          className="hover:bg-accent/50 transition-colors"
                        >
                          <td className="px-4 py-2 text-sm">
                            {formatShortDate(log.activityDate)}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {ACTIVITY_LABELS[log.activityType] ||
                              log.activityType}
                          </td>
                          <td className="px-4 py-2 text-sm font-medium">
                            {log.durationMinutes} min
                          </td>
                          <td className="px-4 py-2 text-sm text-muted-foreground max-w-xs truncate">
                            {log.description || "--"}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {log.isInteractiveCommunication ? (
                              <Check className="h-4 w-4 text-green-600 mx-auto" />
                            ) : (
                              <span className="text-muted-foreground">--</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Eligible CPT Codes ────────────────────────────────── */}
          {p.eligibleCodes && p.eligibleCodes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Eligible CPT Codes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {p.eligibleCodes.map((code) => {
                    const info = CPT_DESCRIPTIONS[code];
                    return (
                      <div
                        key={code}
                        className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                          <div>
                            <span className="text-sm font-mono font-bold">
                              {code}
                            </span>
                            {info && (
                              <p className="text-xs text-muted-foreground">
                                {info.description}
                              </p>
                            )}
                          </div>
                        </div>
                        {info && (
                          <span className="text-sm font-medium text-green-700">
                            {info.rate}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Previous Periods ──────────────────────────────────── */}
          {data.previousPeriods.length > 0 && (
            <Card>
              <CardHeader>
                <button
                  className="flex items-center justify-between w-full"
                  onClick={() => setPreviousExpanded(!previousExpanded)}
                >
                  <CardTitle className="text-lg">
                    Previous Periods ({data.previousPeriods.length})
                  </CardTitle>
                  {previousExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
              </CardHeader>
              {previousExpanded && (
                <CardContent>
                  <div className="space-y-3">
                    {data.previousPeriods.map((period) => (
                      <div
                        key={period.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border gap-2"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {formatDate(period.periodStart)} -{" "}
                            {formatDate(period.periodEnd)}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{period.engagementDays} days</span>
                            <span>{period.clinicianMinutes} min</span>
                            <span>
                              {period.eligibleCodes.length} codes
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
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
                          <Badge variant="outline" className="text-xs">
                            {period.billingTier}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
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

      {/* ── Log Time Dialog ──────────────────────────────────────── */}
      <Dialog
        open={logDialogOpen}
        onOpenChange={(v) => {
          if (!v) resetLogForm();
          setLogDialogOpen(v);
        }}
      >
        <DialogContent className="sm:max-w-md">
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
              disabled={
                logTime.isPending || !duration || !activityType
              }
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
