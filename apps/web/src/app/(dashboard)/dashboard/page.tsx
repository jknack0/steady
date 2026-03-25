"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { useClinicianConfig, useSaveDashboardLayout } from "@/hooks/use-config";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { WidgetGrid } from "@/components/widget-grid";
import { CustomizePanel } from "@/components/customize-panel";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { normalizeDashboardLayout, WIDGET_REGISTRY } from "@steady/shared";
import type { DashboardLayoutItem, PartialDashboardLayoutItem } from "@steady/shared";

interface DashboardData {
  stats: {
    totalClients: number;
    publishedPrograms: number;
    todaySessionCount: number;
    weekHomeworkRate: number;
    overdueCount: number;
  };
  todaySessions: Array<{
    id: string;
    scheduledAt: string;
    status: string;
    clientName: string;
    programTitle: string;
    videoCallUrl: string | null;
  }>;
  recentHomework: Array<{
    id: string;
    title: string;
    clientName: string;
    completedAt: string;
    hasResponses: boolean;
  }>;
  overdueHomework: Array<{
    id: string;
    title: string;
    clientName: string;
    dueDate: string;
  }>;
  alerts: Array<{
    clientName: string;
    field: string;
    value: number;
    max: number;
    date: string;
  }>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: config } = useClinicianConfig();
  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ["clinician-dashboard"],
    queryFn: () => api.get("/api/clinician/dashboard"),
    refetchInterval: 60000,
  });
  const saveLayout = useSaveDashboardLayout();
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [editingLayout, setEditingLayout] = useState<DashboardLayoutItem[] | null>(null);

  const searchParams = useSearchParams();

  const layout = (config?.dashboardLayout ?? []) as PartialDashboardLayoutItem[];
  const enabledModules = config?.enabledModules ?? [];
  const registry = Object.values(WIDGET_REGISTRY);
  const normalizedLayout = normalizeDashboardLayout(layout, registry);

  const handleCustomizeOpen = useCallback(() => {
    setEditingLayout([...normalizedLayout]);
    setIsCustomizing(true);
  }, [normalizedLayout]);

  const handleSave = useCallback(async (newLayout: DashboardLayoutItem[]) => {
    await saveLayout.mutateAsync({ dashboardLayout: newLayout });
  }, [saveLayout]);

  const handleClose = useCallback(() => {
    setIsCustomizing(false);
    setEditingLayout(null);
  }, []);

  // Auto-open customize panel from URL param (?customize=true)
  useEffect(() => {
    if (searchParams.get("customize") === "true" && !isCustomizing && normalizedLayout.length > 0) {
      handleCustomizeOpen();
    }
    // Only run on mount / when search params change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (isLoading) return <LoadingState />;
  if (!dashboardData) return null;

  const greeting = getGreeting();

  return (
    <div className="flex gap-0">
      <div className="flex-1 min-w-0 max-w-6xl mx-auto space-y-6">
        <PageHeader
          title={`${greeting}, ${user?.firstName}`}
          subtitle={`${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · ${dashboardData.stats.todaySessionCount} sessions today`}
          actions={
            <Button variant="ghost" size="sm" onClick={handleCustomizeOpen} className="gap-2">
              <Settings className="h-4 w-4" />
              Customize
            </Button>
          }
        />

        <WidgetGrid
          layout={isCustomizing && editingLayout ? editingLayout : normalizedLayout}
          isEditing={isCustomizing}
          dashboardData={dashboardData}
          onLayoutChange={isCustomizing ? setEditingLayout : undefined}
        />
      </div>

      {isCustomizing && editingLayout && (
        <CustomizePanel
          layout={editingLayout}
          enabledModules={enabledModules}
          onSave={handleSave}
          onClose={handleClose}
          isSaving={saveLayout.isPending}
        />
      )}
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
