"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

// ── Types ───────────────────────────────────────────────

interface PracticeTotals {
  clinicians: number;
  programs: number;
  publishedPrograms: number;
  enrollments: number;
  activeParticipants: number;
  upcomingAppointments: number;
}

interface ClinicianStat {
  clinicianId: string;
  name: string;
  role: string;
  totalPrograms: number;
  publishedPrograms: number;
  totalEnrollments: number;
  activeParticipants: number;
}

interface PracticeStatsData {
  totals: PracticeTotals;
  clinicianStats: ClinicianStat[];
}

interface PracticeParticipantRow {
  participantId: string;
  name: string;
  email: string;
  clinicianName: string;
  clinicianId: string;
  programTitle: string;
  enrollmentStatus: string;
  enrolledAt: string;
}

interface PracticeParticipantsResponse {
  data: PracticeParticipantRow[];
  cursor: string | null;
}

interface PracticeMember {
  id: string;
  clinicianId: string;
  role: string;
  name: string;
  email: string;
  joinedAt: string;
}

interface PracticeInfo {
  id: string;
  name: string;
  ownerId: string;
  myRole: string;
  memberCount: number;
  programCount: number;
  members: PracticeMember[];
}

// ── Hooks ───────────────────────────────────────────────

export function usePractices() {
  return useQuery<PracticeInfo[]>({
    queryKey: queryKeys.practices.all,
    queryFn: () => api.get("/api/practices"),
  });
}

export function usePracticeStats(practiceId: string | undefined) {
  return useQuery<PracticeStatsData>({
    queryKey: queryKeys.practices.stats(practiceId ?? ""),
    queryFn: () => api.get(`/api/practices/${practiceId}/stats`),
    enabled: !!practiceId,
  });
}

export function usePracticeParticipants(
  practiceId: string | undefined,
  params?: { search?: string; cursor?: string },
) {
  return useQuery<PracticeParticipantsResponse>({
    queryKey: queryKeys.practices.participants(practiceId ?? "", params),
    queryFn: () => {
      const qs = new URLSearchParams();
      if (params?.search) qs.set("search", params.search);
      if (params?.cursor) qs.set("cursor", params.cursor);
      const query = qs.toString();
      return api.getRaw<PracticeParticipantsResponse>(
        `/api/practices/${practiceId}/participants${query ? `?${query}` : ""}`,
      );
    },
    enabled: !!practiceId,
  });
}

export function useInviteClinician(practiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string }) =>
      api.post(`/api/practices/${practiceId}/invite`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.practices.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.practices.stats(practiceId) });
    },
  });
}

export function useRemoveMember(practiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      api.delete(`/api/practices/${practiceId}/members/${memberId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.practices.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.practices.stats(practiceId) });
    },
  });
}

export function useUpdatePracticeName(practiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) =>
      api.put(`/api/practices/${practiceId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.practices.all });
    },
  });
}
