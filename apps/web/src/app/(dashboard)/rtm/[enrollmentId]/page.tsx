"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CPT_CODES } from "@steady/shared";
import {
  useRtmClientDetail,
  useLogRtmTime,
  useUpdateBillingPeriod,
} from "@/hooks/use-rtm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LogTimeDialog } from "@/components/rtm/LogTimeDialog";
import {
  Loader2,
  Timer,
  Check,
  Calendar,
  FileText,
  Send,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatShortDate, formatMoney } from "@/lib/format";
import { QUICK_LOG_PRESETS } from "@/lib/rtm-constants";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { computeBillability } from "@/lib/rtm-utils";
import { EngagementCalendar } from "@/components/rtm/EngagementCalendar";
import { BillabilityCard } from "@/components/rtm/BillabilityCard";
import { ActivityTimeline } from "@/components/rtm/ActivityTimeline";

const CPT_INFO: Record<string, { description: string; rate: number }> = CPT_CODES;

// Helpers, EngagementCalendar, BillabilityCard, and ActivityTimeline
// have been extracted to lib/rtm-utils.ts and components/rtm/

// ── Detail Page ─────────────────────────────────────────────────────────────

function RtmClientDetailContent({ enrollmentId, hideHeader = false }: { enrollmentId: string; hideHeader?: boolean }) {

  const { data, isLoading, error } = useRtmClientDetail(enrollmentId);
  const logTime = useLogRtmTime();
  const updatePeriod = useUpdateBillingPeriod();

  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [logPresetInteractive, setLogPresetInteractive] = useState(false);
  const [quickLogInteractive, setQuickLogInteractive] = useState(false);

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
            <BillabilityCard
              billability={billability}
              isLogging={logTime.isPending}
              onLogAction={(action) => {
                if (action.interactive) {
                  setLogPresetInteractive(true);
                  setLogDialogOpen(true);
                } else if (action.minutes) {
                  handleQuickLog(action.minutes, "DATA_REVIEW", false);
                }
              }}
            />
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
          <ActivityTimeline
            engagementEvents={data.engagementCalendar || []}
            timeLogs={data.timeLogs}
          />

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
      <LogTimeDialog
        open={logDialogOpen}
        onOpenChange={(v) => {
          setLogDialogOpen(v);
          if (!v) setLogPresetInteractive(false);
        }}
        clients={[]}
        preselectedEnrollmentId={enrollmentId}
        presetInteractive={logPresetInteractive}
        clientName={data.clientName}
      />
    </div>
  );
}

export default function RtmClientDetailPage() {
  const params = useParams();
  const enrollmentId = params.enrollmentId as string;
  return <RtmClientDetailContent enrollmentId={enrollmentId} />;
}
