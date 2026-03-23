"use client";

import { useState } from "react";
import Link from "next/link";
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
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Timer,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Helpers ─────────────────────────────────────────────────────────────────

function getClientStatus(client: RtmClientRow): "billable" | "approaching" | "at-risk" | "no-period" {
  const p = client.currentPeriod;
  if (!p) return "no-period";

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

const statusBadge: Record<string, { label: string; className: string }> = {
  billable: {
    label: "Billable",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  approaching: {
    label: "Approaching",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  "at-risk": {
    label: "At Risk",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  "no-period": {
    label: "No Period",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
};

const rowTint: Record<string, string> = {
  billable: "bg-green-50/60",
  approaching: "bg-yellow-50/60",
  "at-risk": "bg-red-50/40",
  "no-period": "",
};

const ACTIVITY_TYPES = [
  { value: "DATA_REVIEW", label: "Data Review" },
  { value: "PROGRAM_ADJUSTMENT", label: "Program Adjustment" },
  { value: "OUTCOME_ANALYSIS", label: "Outcome Analysis" },
  { value: "INTERACTIVE_COMMUNICATION", label: "Interactive Communication" },
  { value: "OTHER", label: "Other" },
];

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

// ── Log Time Dialog ─────────────────────────────────────────────────────────

interface LogTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: RtmClientRow[];
  preselectedEnrollmentId?: string;
}

function LogTimeDialog({
  open,
  onOpenChange,
  clients,
  preselectedEnrollmentId,
}: LogTimeDialogProps) {
  const [enrollmentId, setEnrollmentId] = useState(preselectedEnrollmentId || "");
  const [duration, setDuration] = useState("");
  const [activityType, setActivityType] = useState("");
  const [description, setDescription] = useState("");
  const [isInteractive, setIsInteractive] = useState(false);
  const logTime = useLogRtmTime();

  function resetForm() {
    setEnrollmentId(preselectedEnrollmentId || "");
    setDuration("");
    setActivityType("");
    setDescription("");
    setIsInteractive(false);
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

  // Sync preselectedEnrollmentId when it changes
  const effectiveEnrollmentId = preselectedEnrollmentId || enrollmentId;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Monitoring Time</DialogTitle>
          <DialogDescription>
            Record time spent on RTM monitoring activities.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
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

// ── Main Dashboard Page ─────────────────────────────────────────────────────

export default function RtmDashboardPage() {
  const { data, isLoading, error } = useRtmDashboard();
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [logPreselected, setLogPreselected] = useState<string | undefined>(
    undefined
  );

  function openLogDialog(enrollmentId?: string) {
    setLogPreselected(enrollmentId);
    setLogDialogOpen(true);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">RTM Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Remote Therapeutic Monitoring — billing status and client engagement
          </p>
        </div>
        <Button onClick={() => openLogDialog()}>
          <Timer className="mr-2 h-4 w-4" />
          Log Time
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          Failed to load RTM dashboard. Make sure the API server is running.
        </div>
      )}

      {data && (
        <>
          {/* ── Summary Cards ─────────────────────────────────────────── */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Clients
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.summary.totalActiveClients}
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-green-700">
                  Billable
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">
                  {data.summary.clientsBillable}
                </div>
              </CardContent>
            </Card>

            <Card className="border-yellow-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-yellow-700">
                  Approaching
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-700">
                  {data.summary.clientsApproaching}
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-red-700">
                  At Risk
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">
                  {data.summary.clientsAtRisk}
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-300 bg-green-50/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-green-800">
                  Est. Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-800">
                  {formatCurrency(data.summary.estimatedRevenue)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Minutes
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.summary.totalMonitoringMinutes}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Client Table ──────────────────────────────────────────── */}
          {data.clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">
                No active RTM enrollments
              </h3>
              <p className="text-muted-foreground mt-1 text-center max-w-md">
                Enable RTM on a client&apos;s profile to start monitoring.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                      Client
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                      Engagement Days
                    </th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">
                      Threshold
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                      Monitoring Time
                    </th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">
                      Live Interaction
                    </th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">
                      Status
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.clients.map((client) => {
                    const status = getClientStatus(client);
                    const p = client.currentPeriod;
                    const badge = statusBadge[status];

                    return (
                      <tr
                        key={client.rtmEnrollmentId}
                        className={cn(
                          "hover:bg-accent/50 transition-colors",
                          rowTint[status]
                        )}
                      >
                        {/* Client name */}
                        <td className="px-4 py-3">
                          <Link
                            href={`/rtm/${client.rtmEnrollmentId}`}
                            className="font-medium text-sm hover:underline"
                          >
                            {client.clientName}
                          </Link>
                        </td>

                        {/* Engagement days */}
                        <td className="px-4 py-3">
                          {p ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium whitespace-nowrap">
                                {p.engagementDays}/30
                              </span>
                              {p.engagementDays > 0 && (
                                <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
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
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              --
                            </span>
                          )}
                        </td>

                        {/* Threshold status */}
                        <td className="px-4 py-3 text-center">
                          {p ? (
                            p.engagementDays >= 16 ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                            ) : p.engagementDays >= 12 ? (
                              <AlertTriangle className="h-5 w-5 text-yellow-600 mx-auto" />
                            ) : (
                              <X className="h-5 w-5 text-red-500 mx-auto" />
                            )
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </td>

                        {/* Monitoring time */}
                        <td className="px-4 py-3">
                          <span className="text-sm">
                            {p ? `${p.clinicianMinutes} min` : "--"}
                          </span>
                        </td>

                        {/* Live interaction */}
                        <td className="px-4 py-3 text-center">
                          {p ? (
                            p.hasInteractiveCommunication ? (
                              <Check className="h-5 w-5 text-green-600 mx-auto" />
                            ) : (
                              <X className="h-5 w-5 text-red-400 mx-auto" />
                            )
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </td>

                        {/* Status badge */}
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant="outline"
                            className={cn("text-xs", badge.className)}
                          >
                            {badge.label}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                openLogDialog(client.rtmEnrollmentId)
                              }
                            >
                              <Timer className="h-4 w-4 mr-1" />
                              Log Time
                            </Button>
                            <Link href={`/rtm/${client.rtmEnrollmentId}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
      />
    </div>
  );
}
