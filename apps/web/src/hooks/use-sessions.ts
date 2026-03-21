"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface Session {
  id: string;
  scheduledAt: string;
  status: string;
  videoCallUrl: string | null;
  clinicianNotes: string | null;
  participantSummary: string | null;
  participantId: string;
  participantName: string;
  participantEmail: string;
  programId: string;
  programTitle: string;
  enrollmentId: string;
  moduleCompleted: { id: string; title: string } | null;
}

export interface PrepareSessionData {
  session: { id: string; scheduledAt: string; status: string };
  participant: { id: string; name: string };
  program: { title: string };
  currentModuleId: string | null;
  moduleProgress: Array<{ moduleId: string; title: string; status: string }>;
  homeworkByModule: Array<{
    moduleId: string;
    moduleTitle: string;
    homework: Array<{ partId: string; title: string; completed: boolean }>;
  }>;
  recentTasks: Array<{ id: string; title: string; status: string }>;
  recentJournal: Array<{ id: string; entryDate: string; regulationScore: number | null; freeformContent: string | null }>;
  lastSession: { notes: string | null; date: string; moduleCompletedId: string | null } | null;
  quickStats: { tasksCompleted: number; tasksTotal: number; journalEntries: number; taskCompletionRate: number };
}

export function useSessions(params?: {
  status?: string;
  enrollmentId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.enrollmentId) qs.set("enrollmentId", params.enrollmentId);
  if (params?.startDate) qs.set("startDate", params.startDate);
  if (params?.endDate) qs.set("endDate", params.endDate);
  const query = qs.toString();

  return useQuery<Session[]>({
    queryKey: ["sessions", params],
    queryFn: () => api.get(`/api/sessions${query ? `?${query}` : ""}`),
  });
}

export function usePrepareSession(sessionId: string) {
  return useQuery<PrepareSessionData>({
    queryKey: ["session-prepare", sessionId],
    queryFn: () => api.get(`/api/sessions/${sessionId}/prepare`),
    enabled: !!sessionId,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      enrollmentId: string;
      scheduledAt: string;
      videoCallUrl?: string;
      durationMinutes?: number;
    }) => api.post<Session>("/api/sessions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

export function useUpdateSession(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) =>
      api.put<Session>(`/api/sessions/${sessionId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

export function useCompleteSession(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      clinicianNotes?: string;
      participantSummary?: string;
      moduleCompletedId?: string;
      tasksToAssign?: Array<{ title: string; description?: string; dueDate?: string }>;
    }) => api.put<Session>(`/api/sessions/${sessionId}/complete`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["clinician-participant"] });
    },
  });
}
