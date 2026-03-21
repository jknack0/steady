"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface ParticipantRow {
  participantId: string;
  participantProfileId: string;
  enrollmentId: string;
  name: string;
  email: string;
  programId: string;
  programTitle: string;
  currentModule: { id: string; title: string } | null;
  homeworkStatus: "COMPLETE" | "PARTIAL" | "NOT_STARTED";
  homeworkRate: number;
  completedHomework: number;
  totalHomework: number;
  lastActive: string | null;
  statusIndicator: "green" | "amber" | "red";
  enrollmentStatus: string;
}

interface ParticipantListResponse {
  participants: ParticipantRow[];
  programs: Array<{ id: string; title: string }>;
}

export interface ParticipantDetail {
  participant: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  participantProfileId: string;
  enrollments: Array<{
    id: string;
    status: string;
    enrolledAt: string;
    completedAt: string | null;
    currentModuleId: string | null;
    program: {
      id: string;
      title: string;
      description: string | null;
      cadence: string;
    };
    moduleProgress: Array<{
      moduleId: string;
      moduleTitle: string;
      sortOrder: number;
      estimatedMinutes: number | null;
      status: string;
      unlockedAt: string | null;
      completedAt: string | null;
    }>;
    homeworkProgress: Array<{
      partId: string;
      partTitle: string;
      moduleId: string;
      status: string;
      completedAt: string | null;
    }>;
    sessions: Array<{
      id: string;
      scheduledAt: string;
      status: string;
      clinicianNotes: string | null;
      participantSummary: string | null;
    }>;
  }>;
  journalEntries: Array<{
    id: string;
    entryDate: string;
    freeformContent: string | null;
    regulationScore: number | null;
  }>;
  smartGoals: Array<{
    partTitle: string;
    goals: any;
    completedAt: string | null;
  }>;
  clinicianTasks: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
  }>;
}

export function useClinicianParticipants(params?: {
  search?: string;
  programId?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.programId) qs.set("programId", params.programId);
  const query = qs.toString();

  return useQuery<ParticipantListResponse>({
    queryKey: ["clinician-participants", params],
    queryFn: () =>
      api.get<ParticipantListResponse>(
        `/api/clinician/participants${query ? `?${query}` : ""}`
      ),
  });
}

export function useClinicianParticipant(id: string) {
  return useQuery<ParticipantDetail>({
    queryKey: ["clinician-participant", id],
    queryFn: () => api.get(`/api/clinician/participants/${id}`),
    enabled: !!id,
  });
}

export function usePushTask(participantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description?: string; dueDate?: string }) =>
      api.post(`/api/clinician/participants/${participantId}/push-task`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinician-participant", participantId] });
    },
  });
}

export function useUnlockModule(participantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { enrollmentId: string; moduleId: string }) =>
      api.post(`/api/clinician/participants/${participantId}/unlock-module`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinician-participant", participantId] });
    },
  });
}

export function useManageEnrollment(participantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      enrollmentId,
      action,
    }: {
      enrollmentId: string;
      action: "pause" | "resume" | "drop" | "reset-progress";
    }) =>
      api.put(
        `/api/clinician/participants/${participantId}/enrollment/${enrollmentId}`,
        { action }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinician-participant", participantId] });
      queryClient.invalidateQueries({ queryKey: ["clinician-participants"] });
    },
  });
}
