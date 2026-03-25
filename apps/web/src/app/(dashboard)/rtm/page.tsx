"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useRtmDashboard,
  useLogRtmTime,
  type RtmClientRow,
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
  DollarSign,
  Users,
  CheckCircle2,
  Clock,
  Timer,
  Check,
  X,
  Bell,
  FileText,
  MessageSquare,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { daysAgoLabel, formatCurrency } from "@/lib/format";
import { ACTIVITY_TYPES, TIME_PRESETS, type TimePreset } from "@/lib/rtm-constants";
import { LoadingState } from "@/components/loading-state";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

// ── Types ───────────────────────────────────────────────────────────────────

type ClientStatus = "billable" | "approaching" | "at-risk" | "billed" | "no-period";
type TabFilter = "all" | "needs-action" | "billable";

// ── Helpers ─────────────────────────────────────────────────────────────────

function getClientStatus(client: RtmClientRow): ClientStatus {
  const p = client.currentPeriod;
  if (!p) return "no-period";
  if (p.status === "BILLED") return "billed";

  const isBillable =
    p.engagementDays >= 16 &&
    p.clinicianMinutes >= 20 &&
    p.hasInteractiveCommunication;
  if (isBillable) return "billable";

  const isApproaching =
    (p.engagementDays >= 12 && p.engagementDays <= 15) ||
    (p.clinicianMinutes >= 10 && p.clinicianMinutes < 20);
  if (isApproaching) return "approaching";

  return "at-risk";
}

const STATUS_SORT_ORDER: Record<ClientStatus, number> = {
  "at-risk": 0,
  approaching: 1,
  billable: 2,
  billed: 3,
  "no-period": 4,
};

// ── Billability Check Item ──────────────────────────────────────────────────

function BillabilityCheck({
  passed,
  passedLabel,
  failedLabel,
  variant,
}: {
  passed: boolean;
  passedLabel: string;
  failedLabel: string;
  variant: "green" | "yellow" | "red";
}) {
  if (passed) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
        <span className="text-green-700">{passedLabel}</span>
      </div>
    );
  }
  const colorMap = {
    green: "text-green-600",
    yellow: "text-yellow-600",
    red: "text-red-600",
  };
  const iconColorMap = {
    green: "text-green-500",
    yellow: "text-yellow-500",
    red: "text-red-500",
  };
  return (
    <div className="flex items-center gap-2 text-sm">
      <X className={cn("h-4 w-4 shrink-0", iconColorMap[variant])} />
      <span className={colorMap[variant]}>{failedLabel}</span>
    </div>
  );
}

// ── Engagement Progress Bar ─────────────────────────────────────────────────

function EngagementProgressBar({ days }: { days: number }) {
  const pct = Math.min((days / 30) * 100, 100);
  const thresholdPct = (16 / 30) * 100;

  return (
    <div className="relative w-full h-2.5 bg-gray-200 rounded-full overflow-visible mt-1">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          days >= 16
            ? "bg-green-500"
            : days >= 12
              ? "bg-yellow-500"
              : "bg-red-400"
        )}
        style={{ width: `${pct}%` }}
      />
      {/* Threshold marker at 16 */}
      <div
        className="absolute top-[-3px] w-0.5 h-4 bg-gray-500"
        style={{ left: `${thresholdPct}%` }}
        title="16-day threshold"
      />
    </div>
  );
}

// ── Log Time Dialog ─────────────────────────────────────────────────────────

interface LogTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: RtmClientRow[];
  preselectedEnrollmentId?: string;
  presetInteractive?: boolean;
}

function LogTimeDialog({
  open,
  onOpenChange,
  clients,
  preselectedEnrollmentId,
  presetInteractive,
}: LogTimeDialogProps) {
  const [enrollmentId, setEnrollmentId] = useState(preselectedEnrollmentId || "");
  const [duration, setDuration] = useState("");
  const [activityType, setActivityType] = useState("");
  const [description, setDescription] = useState("");
  const [isInteractive, setIsInteractive] = useState(presetInteractive || false);
  const logTime = useLogRtmTime();

  const effectiveEnrollmentId = preselectedEnrollmentId || enrollmentId;

  // Find the selected client to show progress
  const selectedClient = clients.find(
    (c) => c.rtmEnrollmentId === effectiveEnrollmentId
  );
  const currentMinutes = selectedClient?.currentPeriod?.clinicianMinutes ?? 0;

  useEffect(() => {
    if (preselectedEnrollmentId) setEnrollmentId(preselectedEnrollmentId);
  }, [preselectedEnrollmentId]);

  useEffect(() => {
    if (presetInteractive) {
      setIsInteractive(true);
      setActivityType("INTERACTIVE_COMMUNICATION");
    }
  }, [presetInteractive]);

  function resetForm() {
    setEnrollmentId(preselectedEnrollmentId || "");
    setDuration("");
    setActivityType("");
    setDescription("");
    setIsInteractive(presetInteractive || false);
  }

  function applyPreset(preset: TimePreset) {
    setDuration(String(preset.duration));
    setActivityType(preset.activityType);
    setDescription(preset.description);
    setIsInteractive(preset.isInteractive ?? false);
  }

  function handleSubmit() {
    if (!effectiveEnrollmentId || !duration || !activityType) return;
    logTime.mutate(
      {
        rtmEnrollmentId: effectiveEnrollmentId,
        durationMinutes: parseInt(duration, 10),
        activityType,
        description: description.trim() || undefined,
        isInteractiveCommunication: isInteractive,
      },
      {
        onSuccess: () => {
          resetForm();
          onOpenChange(false);
        },
      }
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Monitoring Time</DialogTitle>
          <DialogDescription>
            Record time spent on RTM monitoring activities.
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        {effectiveEnrollmentId && (
          <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {currentMinutes}/20 min logged this period
            </span>
            <div className="ml-auto h-1.5 w-20 rounded-full bg-gray-200">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  currentMinutes >= 20 ? "bg-green-500" : "bg-blue-500"
                )}
                style={{ width: `${Math.min((currentMinutes / 20) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Quick presets */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Quick Presets
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {TIME_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                className="justify-start text-xs h-auto py-2"
                onClick={() => applyPreset(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          {/* Client select */}
          {!preselectedEnrollmentId && (
            <div className="space-y-2">
              <Label htmlFor="log-client">Client</Label>
              <Select value={effectiveEnrollmentId} onValueChange={setEnrollmentId}>
                <SelectTrigger id="log-client">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.rtmEnrollmentId} value={c.rtmEnrollmentId}>
                      {c.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="log-duration">Duration (minutes)</Label>
            <Input
              id="log-duration"
              type="number"
              min="1"
              max="120"
              placeholder="e.g. 15"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>

          {/* Activity type */}
          <div className="space-y-2">
            <Label htmlFor="log-activity">Activity Type</Label>
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger id="log-activity">
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

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="log-description">Description</Label>
            <Textarea
              id="log-description"
              placeholder="Brief description of the activity..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Interactive communication checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="log-interactive"
              checked={isInteractive}
              onCheckedChange={(checked) => setIsInteractive(checked === true)}
            />
            <Label htmlFor="log-interactive" className="text-sm font-normal cursor-pointer">
              This included a live interaction with the client
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              logTime.isPending ||
              !effectiveEnrollmentId ||
              !duration ||
              !activityType
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
  );
}

// ── Client Card ─────────────────────────────────────────────────────────────

interface ClientCardProps {
  client: RtmClientRow;
  status: ClientStatus;
  onLogTime: (enrollmentId: string, presetInteractive?: boolean) => void;
  onSendReminder: (enrollmentId: string) => void;
}

function ClientCard({ client, status, onLogTime, onSendReminder }: ClientCardProps) {
  const router = useRouter();
  const p = client.currentPeriod;

  const engagementDays = p?.engagementDays ?? 0;
  const clinicianMinutes = p?.clinicianMinutes ?? 0;
  const hasInteraction = p?.hasInteractiveCommunication ?? false;
  const daysRemaining = p?.daysRemaining ?? 0;

  const engagementPassed = engagementDays >= 16;
  const minutesPassed = clinicianMinutes >= 20;
  const engagementDaysNeeded = Math.max(0, 16 - engagementDays);

  const engagementVariant: "green" | "yellow" | "red" =
    engagementDays >= 16 ? "green" : engagementDays >= 12 ? "yellow" : "red";
  const minutesVariant: "green" | "yellow" | "red" =
    clinicianMinutes >= 20 ? "green" : clinicianMinutes >= 10 ? "yellow" : "red";

  // Determine the last engagement date heuristic: use interactiveCommunicationDate
  // or periodStart as a fallback (the API doesn't give us a dedicated "last active" field)
  const lastEngagement = daysAgoLabel(p?.interactiveCommunicationDate ?? p?.periodStart ?? null);

  // Determine the single next action
  function renderNextAction() {
    if (status === "billed") {
      return (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            router.push(`/rtm/${client.rtmEnrollmentId}`);
          }}
        >
          <FileText className="h-3.5 w-3.5" />
          View Superbill
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      );
    }

    if (engagementPassed && minutesPassed && hasInteraction) {
      return (
        <Button
          size="sm"
          className="gap-1.5"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            router.push(`/rtm/${client.rtmEnrollmentId}`);
          }}
        >
          <FileText className="h-3.5 w-3.5" />
          Generate Superbill
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      );
    }

    if (!hasInteraction) {
      return (
        <Button
          size="sm"
          variant="secondary"
          className="gap-1.5"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onLogTime(client.rtmEnrollmentId, true);
          }}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Log Interaction
        </Button>
      );
    }

    if (!minutesPassed) {
      return (
        <Button
          size="sm"
          variant="secondary"
          className="gap-1.5"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onLogTime(client.rtmEnrollmentId);
          }}
        >
          <Timer className="h-3.5 w-3.5" />
          Log Time
        </Button>
      );
    }

    if (!engagementPassed && lastEngagement.isStale) {
      return (
        <Button
          size="sm"
          variant="secondary"
          className="gap-1.5"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSendReminder(client.rtmEnrollmentId);
          }}
        >
          <Bell className="h-3.5 w-3.5" />
          Send Reminder
        </Button>
      );
    }

    return null;
  }

  const cardBorder =
    status === "billable"
      ? "border-green-200"
      : status === "approaching"
        ? "border-yellow-200"
        : status === "at-risk"
          ? "border-red-200"
          : status === "billed"
            ? "border-blue-200"
            : "";

  return (
    <Link href={`/rtm/${client.rtmEnrollmentId}`} className="block">
      <Card
        className={cn(
          "transition-all hover:shadow-md hover:scale-[1.01] cursor-pointer",
          cardBorder
        )}
      >
        <CardContent className="p-4 sm:p-5">
          {/* Top row: name + badges */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="font-semibold text-base truncate">
              {client.clientName}
            </h3>
            <div className="flex items-center gap-2 shrink-0">
              {p && (
                <Badge
                  variant="outline"
                  className="text-xs tabular-nums whitespace-nowrap"
                >
                  {daysRemaining} days left
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn(
                  "text-xs whitespace-nowrap",
                  status === "billable" && "bg-green-100 text-green-800 border-green-200",
                  status === "approaching" && "bg-yellow-100 text-yellow-800 border-yellow-200",
                  status === "at-risk" && "bg-red-100 text-red-800 border-red-200",
                  status === "billed" && "bg-blue-100 text-blue-800 border-blue-200",
                  status === "no-period" && "bg-gray-100 text-gray-600 border-gray-200"
                )}
              >
                {status === "at-risk"
                  ? "At Risk"
                  : status === "no-period"
                    ? "No Period"
                    : status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            </div>
          </div>

          {p ? (
            <>
              {/* Billability checklist */}
              <div className="space-y-1.5 mb-3">
                <BillabilityCheck
                  passed={engagementPassed}
                  passedLabel="16+ engagement days"
                  failedLabel={`${engagementDays}/16 days (${engagementDaysNeeded} remaining)`}
                  variant={engagementVariant}
                />
                <BillabilityCheck
                  passed={minutesPassed}
                  passedLabel="20+ monitoring minutes"
                  failedLabel={`${clinicianMinutes}/20 min logged`}
                  variant={minutesVariant}
                />
                <BillabilityCheck
                  passed={hasInteraction}
                  passedLabel={
                    p.interactiveCommunicationDate
                      ? `Live interaction (${new Date(p.interactiveCommunicationDate).toLocaleDateString()})`
                      : "Live interaction"
                  }
                  failedLabel="Not yet"
                  variant="red"
                />
              </div>

              {/* Progress bar */}
              <EngagementProgressBar days={engagementDays} />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5 mb-3">
                <span>0</span>
                <span className="text-gray-500">16</span>
                <span>30</span>
              </div>

              {/* Last engagement + next action */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span
                  className={cn(
                    "text-xs",
                    lastEngagement.isStale
                      ? "text-red-600 font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  Last active: {lastEngagement.label}
                </span>
                <div
                  onClick={(e) => e.preventDefault()}
                  className="shrink-0"
                >
                  {renderNextAction()}
                </div>
              </div>

              {/* Quick actions row */}
              <Separator className="my-3" />
              <div className="flex items-center gap-3 text-xs">
                <button
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onLogTime(client.rtmEnrollmentId);
                  }}
                >
                  Log Time
                </button>
                <span className="text-muted-foreground/40">|</span>
                <span className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  View Details
                </span>
                <span className="text-muted-foreground/40">|</span>
                <button
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSendReminder(client.rtmEnrollmentId);
                  }}
                >
                  Send Reminder
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active billing period.
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

// ── Main Dashboard Page ─────────────────────────────────────────────────────

export function RtmDashboardContent() {
  const { data, isLoading, error } = useRtmDashboard();
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [logPreselected, setLogPreselected] = useState<string | undefined>(undefined);
  const [logPresetInteractive, setLogPresetInteractive] = useState(false);

  function openLogDialog(enrollmentId?: string, presetInteractive?: boolean) {
    setLogPreselected(enrollmentId);
    setLogPresetInteractive(presetInteractive || false);
    setLogDialogOpen(true);
  }

  function handleSendReminder(_enrollmentId: string) {
    // TODO: Wire to POST /api/rtm/enrollments/:id/reminder when endpoint is built
    // For now this is a placeholder
  }

  // Sorted and filtered clients
  const sortedClients = useMemo(() => {
    if (!data?.clients) return [];
    return [...data.clients]
      .map((c) => ({ client: c, status: getClientStatus(c) }))
      .sort((a, b) => STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status]);
  }, [data?.clients]);

  const filteredClients = useMemo(() => {
    if (activeTab === "all") return sortedClients;
    if (activeTab === "needs-action") {
      return sortedClients.filter(
        ({ status }) => status === "at-risk" || status === "approaching"
      );
    }
    // "billable"
    return sortedClients.filter(({ status }) => status === "billable");
  }, [sortedClients, activeTab]);

  const needsActionCount = sortedClients.filter(
    ({ status }) => status === "at-risk" || status === "approaching"
  ).length;

  const billableCount = sortedClients.filter(
    ({ status }) => status === "billable"
  ).length;

  const tabs: { key: TabFilter; label: string; count?: number }[] = [
    { key: "all", label: "All" },
    { key: "needs-action", label: "Needs Action", count: needsActionCount },
    { key: "billable", label: "Billable", count: billableCount },
  ];

  return (
    <div>
      <PageHeader title="Remote Therapeutic Monitoring" />

      {/* Loading */}
      {isLoading && <LoadingState />}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          Failed to load RTM dashboard. Make sure the API server is running.
        </div>
      )}

      {data && (
        <>
          {/* ── Summary bar ──────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <p className="text-sm text-muted-foreground">
              {data.summary.totalActiveClients} active clients
              {data.summary.clientsBillable > 0 && (
                <> &middot; <span className="text-green-600 font-medium">{data.summary.clientsBillable} billable</span></>
              )}
              {data.summary.clientsApproaching > 0 && (
                <> &middot; <span className="text-yellow-600 font-medium">{data.summary.clientsApproaching} approaching</span></>
              )}
              {data.summary.clientsAtRisk > 0 && (
                <> &middot; <span className="text-red-600 font-medium">{data.summary.clientsAtRisk} need attention</span></>
              )}
            </p>
            <Button size="sm" onClick={() => openLogDialog()}>
              <Timer className="mr-2 h-4 w-4" />
              Log Time
            </Button>
          </div>

          {/* ── Tab Filters ──────────────────────────────────────────── */}
          <div className="flex items-center gap-1 mb-6 border-b">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                )}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={cn(
                      "ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-medium",
                      activeTab === tab.key
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Client Cards ─────────────────────────────────────────── */}
          {data.clients.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No RTM enrollments yet"
              description="Enable RTM on any client's profile to start earning $100-150/month per client."
              action={
                <Link href="/participants">
                  <Button variant="outline" className="gap-1.5">
                    Go to Clients
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              }
            />
          ) : filteredClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
              <p className="text-muted-foreground text-sm">
                No clients match this filter.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {filteredClients.map(({ client, status }) => (
                <ClientCard
                  key={client.rtmEnrollmentId}
                  client={client}
                  status={status}
                  onLogTime={(id, interactive) => openLogDialog(id, interactive)}
                  onSendReminder={handleSendReminder}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Log Time Dialog */}
      <LogTimeDialog
        open={logDialogOpen}
        onOpenChange={setLogDialogOpen}
        clients={data?.clients || []}
        preselectedEnrollmentId={logPreselected}
        presetInteractive={logPresetInteractive}
      />
    </div>
  );
}

export default function RtmDashboardPage() {
  return <RtmDashboardContent />;
}
