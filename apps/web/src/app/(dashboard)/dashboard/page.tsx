"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { useClinicianConfig, useSaveDashboardLayout } from "@/hooks/use-config";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { WidgetGrid } from "@/components/widget-grid";
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

  const layout = (config?.dashboardLayout ?? []) as PartialDashboardLayoutItem[];
  const enabledModules = config?.enabledModules ?? [];
  const registry = Object.values(WIDGET_REGISTRY);
  const normalizedLayout = normalizeDashboardLayout(layout, registry);

  // Auto-save with debounce when editing layout changes
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");

  useEffect(() => {
    if (!editingLayout) return;
    const current = JSON.stringify(editingLayout);
    if (current === lastSavedRef.current) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveLayout.mutate({ dashboardLayout: editingLayout });
      lastSavedRef.current = current;
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [editingLayout, saveLayout]);

  const toggleCustomize = useCallback(() => {
    if (isCustomizing) {
      // Save immediately on close if there are unsaved changes
      if (editingLayout && JSON.stringify(editingLayout) !== lastSavedRef.current) {
        saveLayout.mutate({ dashboardLayout: editingLayout });
      }
      setIsCustomizing(false);
      setEditingLayout(null);
    } else {
      setEditingLayout([...normalizedLayout]);
      lastSavedRef.current = JSON.stringify(normalizedLayout);
      setIsCustomizing(true);
    }
  }, [isCustomizing, normalizedLayout, editingLayout, saveLayout]);

  if (isLoading) return <LoadingState />;
  if (!dashboardData) return null;

  const greeting = getGreeting();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title={`${greeting}, ${user?.firstName}`}
        subtitle={`${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · ${dashboardData.stats.todaySessionCount} sessions today`}
        actions={
          <Button
            variant={isCustomizing ? "default" : "ghost"}
            size="sm"
            onClick={toggleCustomize}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            {isCustomizing ? "Done" : "Customize"}
          </Button>
        }
      />

      <WidgetGrid
        layout={isCustomizing && editingLayout ? editingLayout : normalizedLayout}
        isEditing={isCustomizing}
        dashboardData={dashboardData}
        onLayoutChange={isCustomizing ? setEditingLayout : undefined}
        enabledModules={enabledModules}
      />
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
