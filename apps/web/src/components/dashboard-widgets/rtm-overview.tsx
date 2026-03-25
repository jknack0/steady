"use client";

import { HeartPulse } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { WidgetShell } from "./widget-shell";
import type { WidgetProps } from "./widget-shell";

interface RtmOverviewWidgetProps extends WidgetProps {
  dashboardData: unknown;
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
}

interface RtmDashboardData {
  enrollments?: Array<{ id: string; status: string }>;
  billingPeriods?: Array<{ id: string; status: string }>;
  totalEnrollments?: number;
  activeBillingPeriods?: number;
}

export function RtmOverviewWidget({
  column,
  isEditing,
  dragAttributes,
  dragListeners,
}: RtmOverviewWidgetProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["rtm", "dashboard-widget"],
    queryFn: () => api.get<RtmDashboardData>("/api/rtm/dashboard"),
  });

  const rtmData = data;
  const enrollmentCount =
    rtmData?.totalEnrollments ?? rtmData?.enrollments?.length ?? 0;
  const activeBilling =
    rtmData?.activeBillingPeriods ?? rtmData?.billingPeriods?.filter((b) => b.status === "ACTIVE")?.length ?? 0;

  if (column === "sidebar") {
    return (
      <WidgetShell
        title="RTM Overview"
        icon={HeartPulse}
        isEditing={isEditing}
        dragAttributes={dragAttributes}
        dragListeners={dragListeners}
      >
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Enrollments</span>
            <span className="font-medium">{enrollmentCount}</span>
          </div>
        )}
      </WidgetShell>
    );
  }

  return (
    <WidgetShell
      title="RTM Overview"
      icon={HeartPulse}
      isEditing={isEditing}
      dragAttributes={dragAttributes}
      dragListeners={dragListeners}
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Loading...
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-md border p-4 text-center">
            <p className="text-2xl font-bold">{enrollmentCount}</p>
            <p className="text-xs text-muted-foreground mt-1">RTM Enrollments</p>
          </div>
          <div className="rounded-md border p-4 text-center">
            <p className="text-2xl font-bold">{activeBilling}</p>
            <p className="text-xs text-muted-foreground mt-1">Active Billing Periods</p>
          </div>
        </div>
      )}
    </WidgetShell>
  );
}
