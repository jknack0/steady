"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { buildQueryString } from "@/lib/query-utils";

export interface SeriesView {
  id: string;
  practiceId: string;
  clinicianId: string;
  participantId: string;
  participant: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  serviceCode: {
    id: string;
    code: string;
    description: string;
    defaultDurationMinutes: number;
  } | null;
  location: {
    id: string;
    name: string;
    type: string;
  } | null;
  appointmentType: string;
  internalNote: string | null;
  recurrenceRule: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  seriesStartDate: string;
  seriesEndDate: string | null;
  isActive: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSeriesResult {
  series: SeriesView;
  appointmentsCreated: number;
  conflicts: string[];
}

export interface ListSeriesParams {
  participantId?: string;
  isActive?: boolean;
  cursor?: string;
  limit?: number;
}

export function useRecurringSeries(params: ListSeriesParams = {}) {
  const qs = buildQueryString(params as unknown as Record<string, string | number | boolean | undefined>);
  return useQuery<SeriesView[]>({
    queryKey: queryKeys.recurringSeries.all(params as Record<string, unknown>),
    queryFn: () => api.get(`/api/recurring-series${qs ? `?${qs}` : ""}`),
  });
}

export function useRecurringSeriesDetail(id: string) {
  return useQuery<SeriesView>({
    queryKey: queryKeys.recurringSeries.detail(id),
    queryFn: () => api.get(`/api/recurring-series/${id}`),
    enabled: !!id,
  });
}

export function useCreateSeries() {
  const queryClient = useQueryClient();
  return useMutation<CreateSeriesResult, Error, Record<string, unknown>>({
    mutationFn: (data) => api.post("/api/recurring-series", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-series"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

export function useUpdateSeries(id: string) {
  const queryClient = useQueryClient();
  return useMutation<{ series: SeriesView; appointmentsRegenerated: number }, Error, Record<string, unknown>>({
    mutationFn: (data) => api.patch(`/api/recurring-series/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-series"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

export function usePauseSeries(id: string) {
  const queryClient = useQueryClient();
  return useMutation<SeriesView, Error, void>({
    mutationFn: () => api.post(`/api/recurring-series/${id}/pause`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-series"] });
    },
  });
}

export function useResumeSeries(id: string) {
  const queryClient = useQueryClient();
  return useMutation<{ series: SeriesView; appointmentsCreated: number }, Error, void>({
    mutationFn: () => api.post(`/api/recurring-series/${id}/resume`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-series"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

export function useDeleteSeries(id: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: () => api.delete(`/api/recurring-series/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-series"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}
