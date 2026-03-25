"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  CreateDailyTrackerInput,
  UpdateDailyTrackerInput,
  CreateTrackerFromTemplateInput,
} from "@steady/shared";

export interface TrackerField {
  id: string;
  trackerId: string;
  label: string;
  fieldType: "SCALE" | "NUMBER" | "YES_NO" | "MULTI_CHECK" | "FREE_TEXT" | "TIME";
  options: any;
  sortOrder: number;
  isRequired: boolean;
}

export interface DailyTracker {
  id: string;
  programId: string | null;
  enrollmentId: string | null;
  name: string;
  description: string | null;
  reminderTime: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  fields: TrackerField[];
  _count?: { entries: number };
}

export interface TrackerTemplate {
  key: string;
  name: string;
  description: string;
  fields: Array<{
    label: string;
    fieldType: string;
    options?: any;
    isRequired: boolean;
  }>;
}

export interface TrackerEntry {
  id: string;
  trackerId: string;
  userId: string;
  date: string;
  responses: Record<string, any>;
  completedAt: string;
  createdAt: string;
}

export interface TrackerTrends {
  fields: Array<{
    id: string;
    label: string;
    fieldType: string;
    options: any;
  }>;
  fieldTrends: Record<string, Array<{ date: string; value: number }>>;
  completionRate: number;
  totalDays: number;
  completedDays: number;
  streak: number;
}

export function useTrackerTemplates() {
  return useQuery<TrackerTemplate[]>({
    queryKey: ["tracker-templates"],
    queryFn: () => api.get("/api/daily-trackers/templates"),
  });
}

export function useDailyTrackers(programId: string) {
  return useQuery<DailyTracker[]>({
    queryKey: ["daily-trackers", programId],
    queryFn: () => api.get(`/api/daily-trackers?programId=${programId}`),
    enabled: !!programId,
  });
}

export function useDailyTracker(trackerId: string) {
  return useQuery<DailyTracker>({
    queryKey: ["daily-tracker", trackerId],
    queryFn: () => api.get(`/api/daily-trackers/${trackerId}`),
    enabled: !!trackerId,
  });
}

export function useCreateDailyTracker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDailyTrackerInput) =>
      api.post<DailyTracker>("/api/daily-trackers", data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["daily-trackers", variables.programId],
      });
    },
  });
}

export function useCreateTrackerFromTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTrackerFromTemplateInput) =>
      api.post<DailyTracker>("/api/daily-trackers/from-template", data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["daily-trackers", variables.programId],
      });
    },
  });
}

export function useUpdateDailyTracker(trackerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateDailyTrackerInput) =>
      api.put<DailyTracker>(`/api/daily-trackers/${trackerId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-tracker", trackerId] });
      queryClient.invalidateQueries({ queryKey: ["daily-trackers"] });
    },
  });
}

export function useDeleteDailyTracker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (trackerId: string) =>
      api.delete(`/api/daily-trackers/${trackerId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-trackers"] });
    },
  });
}

export function useTrackerEntries(
  trackerId: string,
  userId: string,
  dateRange?: { startDate?: string; endDate?: string }
) {
  const params = new URLSearchParams({ userId });
  if (dateRange?.startDate) params.set("startDate", dateRange.startDate);
  if (dateRange?.endDate) params.set("endDate", dateRange.endDate);

  return useQuery<TrackerEntry[]>({
    queryKey: ["tracker-entries", trackerId, userId, dateRange],
    queryFn: () =>
      api.get(`/api/daily-trackers/${trackerId}/entries?${params.toString()}`),
    enabled: !!trackerId && !!userId,
  });
}

export function useTrackerTrends(trackerId: string, userId: string) {
  return useQuery<TrackerTrends>({
    queryKey: ["tracker-trends", trackerId, userId],
    queryFn: () =>
      api.get(`/api/daily-trackers/${trackerId}/trends?userId=${userId}`),
    enabled: !!trackerId && !!userId,
  });
}

export function useParticipantCheckin(participantId: string | undefined) {
  return useQuery<DailyTracker>({
    queryKey: ["participant-checkin", participantId],
    queryFn: () => api.get(`/api/daily-trackers/participant/${participantId}`),
    enabled: !!participantId,
  });
}
