"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

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
    queryKey: ["practices"],
    queryFn: () => api.get("/api/practices"),
  });
}

export function usePracticeStats(practiceId: string | undefined) {
  return useQuery<PracticeStatsData>({
    queryKey: ["practice-stats", practiceId],
    queryFn: () => api.get(`/api/practices/${practiceId}/stats`),
    enabled: !!practiceId,
  });
}

export function usePracticeParticipants(
  practiceId: string | undefined,
  params?: { search?: string; cursor?: string },
) {
  return useQuery<PracticeParticipantsResponse>({
    queryKey: ["practice-participants", practiceId, params],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params?.search) qs.set("search", params.search);
      if (params?.cursor) qs.set("cursor", params.cursor);
      const query = qs.toString();
      // The API returns { success, data, cursor } and api.get returns .data
      // But the data here is the array, and cursor is at top level
      const result = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/practices/${practiceId}/participants${query ? `?${query}` : ""}`,
        { credentials: "include", headers: { "Content-Type": "application/json" } },
      );
      const json = await result.json();
      if (!result.ok) throw new Error(json.error || "Failed to fetch");
      return { data: json.data, cursor: json.cursor };
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
      queryClient.invalidateQueries({ queryKey: ["practices"] });
      queryClient.invalidateQueries({ queryKey: ["practice-stats", practiceId] });
    },
  });
}

export function useRemoveMember(practiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      api.delete(`/api/practices/${practiceId}/members/${memberId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practices"] });
      queryClient.invalidateQueries({ queryKey: ["practice-stats", practiceId] });
    },
  });
}

export function useUpdatePracticeName(practiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) =>
      api.put(`/api/practices/${practiceId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practices"] });
    },
  });
}
