"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

// ── Response type ──────────────────────────────────────────────────────────

export interface ClinicianConfigData {
  id: string;
  clinicianId: string;
  providerType: string;
  presetId: string | null;
  primaryModality: string | null;
  enabledModules: string[];
  dashboardLayout: Array<{
    widgetId: string;
    visible: boolean;
    column?: string;
    order?: number;
    settings?: Record<string, unknown>;
  }>;
  clientOverviewLayout?: Array<{
    widgetId: string;
    visible: boolean;
    column?: string;
    order?: number;
    settings?: Record<string, unknown>;
  }> | null;
  defaultTrackerPreset: string | null;
  defaultAssessments: Array<{ instrumentId: string; frequency: string }> | null;
  practiceName: string | null;
  practiceLogoUrl: string | null;
  brandColor: string | null;
  setupCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Query hooks ─────────────────────────────────────────────────────────────

export function useClinicianConfig() {
  return useQuery<ClinicianConfigData | null>({
    queryKey: ["clinician-config"],
    queryFn: () => api.get("/api/config"),
  });
}

// ── Mutation hooks ──────────────────────────────────────────────────────────

export function useSaveClinicianConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      providerType: string;
      primaryModality?: string;
      enabledModules: string[];
      dashboardLayout: Array<{
        widgetId: string;
        visible: boolean;
        column?: string;
        order?: number;
        settings?: Record<string, unknown>;
      }>;
      defaultTrackerPreset?: string;
      defaultAssessments?: Array<{ instrumentId: string; frequency: string }>;
      practiceName?: string;
      brandColor?: string;
    }) => api.put("/api/config", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinician-config"] });
    },
  });
}

export function useSaveDashboardLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      dashboardLayout?: Array<{
        widgetId: string;
        visible: boolean;
        column: string;
        order: number;
        settings: Record<string, unknown>;
      }>;
      clientOverviewLayout?: Array<{
        widgetId: string;
        visible: boolean;
        column: string;
        order: number;
        settings: Record<string, unknown>;
      }>;
    }) => api.patch("/api/config/dashboard-layout", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinician-config"] });
    },
  });
}

export function useCreateConfigFromPreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (presetId: string) => api.post("/api/config/from-preset", { presetId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinician-config"] });
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
    },
  });
}
