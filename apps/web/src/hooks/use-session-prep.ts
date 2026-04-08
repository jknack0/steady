"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface SessionPrepData {
  appointment: {
    id: string;
    startAt: string;
    endAt: string;
    status: string;
    appointmentType: string;
    internalNote: string | null;
    participantName: string | null;
  };
  enrollment: {
    id: string;
    programTitle: string;
  } | null;
  review: {
    id: string;
    responses: Array<{ questionId: string; question: string; answer: string }>;
    barriers: string[];
    submittedAt: string;
  } | null;
  homeworkStatus: Array<{
    moduleId: string;
    moduleTitle: string;
    items: Array<{ partId: string; title: string; completed: boolean }>;
  }>;
  quickStats: {
    tasksCompleted: number;
    tasksTotal: number;
    journalEntries: number;
    taskCompletionRate: number;
  };
  lastSessionNotes: {
    notes: string | null;
    date: string;
    moduleCompletedId: string | null;
  } | null;
}

export function useSessionPrep(appointmentId: string) {
  return useQuery<SessionPrepData>({
    queryKey: queryKeys.sessions.prep(appointmentId),
    queryFn: () => api.get(`/api/appointments/${appointmentId}/prep`),
    enabled: !!appointmentId,
  });
}
