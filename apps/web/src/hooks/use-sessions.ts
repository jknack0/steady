"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { buildQueryString } from "@/lib/query-utils";

// ── Response types ─────────────────────────────────────────

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
  recentJournal: Array<{
    id: string;
    entryDate: string;
    regulationScore: number | null;
    freeformContent: string | null;
  }>;
  lastSession: {
    notes: string | null;
    date: string;
    moduleCompletedId: string | null;
  } | null;
  quickStats: {
    tasksCompleted: number;
    tasksTotal: number;
    journalEntries: number;
    taskCompletionRate: number;
  };
  trackerSummaries: Array<{
    id: string;
    name: string;
    fields: Array<{
      id: string;
      label: string;
      fieldType: string;
      options: unknown;
    }>;
    fieldTrends: Record<string, Array<{ date: string; value: number }>>;
    recentEntries: Array<{ date: string; responses: Record<string, unknown> }>;
    entryCount: number;
  }>;
}

// ── Mutation input types ───────────────────────────────────

export interface UpdateSessionInput {
  scheduledAt?: string;
  videoCallUrl?: string | null;
  clinicianNotes?: string | null;
  participantSummary?: string | null;
  status?: string;
  durationMinutes?: number;
}

export interface CompleteSessionInput {
  clinicianNotes?: string;
  participantSummary?: string;
  moduleCompletedId?: string;
  tasksToAssign?: Array<{
    title: string;
    description?: string;
    dueDate?: string;
  }>;
}

// ── Hooks ──────────────────────────────────────────────────

export function useSessions(params?: {
  status?: string;
  enrollmentId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const qs = buildQueryString(params ?? {});

  return useQuery<Session[]>({
    queryKey: queryKeys.sessions.all(params),
    queryFn: () => api.get(`/api/sessions${qs ? `?${qs}` : ""}`),
  });
}

export function usePrepareSession(sessionId: string) {
  return useQuery<PrepareSessionData>({
    queryKey: queryKeys.sessions.prepare(sessionId),
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
    mutationFn: (data: UpdateSessionInput) =>
      api.put<Session>(`/api/sessions/${sessionId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

export function useCompleteSession(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CompleteSessionInput) =>
      api.put<Session>(`/api/sessions/${sessionId}/complete`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["clinician-participant"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}
