"use client";

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  CreateClaimInput,
  ResubmitClaimInput,
  ClaimStatus,
} from "@steady/shared";

// ── Response types ─────────────────────────────────────────

export interface ClaimStatusHistoryEntry {
  id: string;
  claimId: string;
  fromStatus: ClaimStatus | null;
  toStatus: ClaimStatus;
  changedBy: string;
  reason: string | null;
  createdAt: string;
}

export interface Claim {
  id: string;
  practiceId: string;
  clinicianId: string;
  participantId: string;
  appointmentId: string;
  patientInsuranceId: string;
  status: ClaimStatus;
  stediTransactionId: string | null;
  stediIdempotencyKey: string;
  serviceCode: string;
  modifiers: string[];
  servicePriceCents: number;
  placeOfServiceCode: string;
  dateOfService: string;
  diagnosisCodes: string[];
  submittedAt: string | null;
  respondedAt: string | null;
  rejectionReason: string | null;
  retentionExpiresAt: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  statusHistory: ClaimStatusHistoryEntry[];
  participant: {
    id: string;
    user: { firstName: string; lastName: string };
  };
  patientInsurance: {
    payerName: string;
  };
}

/** Shape returned in list endpoint (no statusHistory). */
export interface ClaimListItem {
  id: string;
  practiceId: string;
  clinicianId: string;
  participantId: string;
  appointmentId: string;
  patientInsuranceId: string;
  status: ClaimStatus;
  stediTransactionId: string | null;
  serviceCode: string;
  modifiers: string[];
  servicePriceCents: number;
  placeOfServiceCode: string;
  dateOfService: string;
  diagnosisCodes: string[];
  submittedAt: string | null;
  respondedAt: string | null;
  rejectionReason: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  participant: {
    id: string;
    user: { firstName: string; lastName: string };
  };
  patientInsurance: {
    payerName: string;
  };
}

/**
 * Fetches claims with cursor-based pagination using useInfiniteQuery.
 * Uses api.getRaw to get both data and cursor from the response envelope,
 * with proper auth refresh handling.
 */

interface ClaimsPage {
  data: ClaimListItem[];
  cursor: string | null;
}

export function useClaims(filters?: { status?: string }) {
  const result = useInfiniteQuery<ClaimsPage>({
    queryKey: ["claims", filters],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (filters?.status) params.set("status", filters.status);
      if (pageParam) params.set("cursor", pageParam as string);
      return api.getRaw<ClaimsPage>(`/api/claims?${params}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor ?? undefined,
  });

  return {
    claims: result.data?.pages.flatMap((p) => p.data) ?? [],
    isLoading: result.isLoading,
    isFetchingNextPage: result.isFetchingNextPage,
    hasNextPage: result.hasNextPage,
    fetchNextPage: result.fetchNextPage,
  };
}

export function useClaim(claimId: string | undefined) {
  return useQuery<Claim>({
    queryKey: queryKeys.claims.detail(claimId ?? ""),
    queryFn: () => api.get<Claim>(`/api/claims/${claimId}`),
    enabled: !!claimId,
  });
}

export function useCreateClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateClaimInput) =>
      api.post<Claim>("/api/claims", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["claims"] });
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["appointment"] });
    },
  });
}

export function useSubmitClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (claimId: string) =>
      api.post<Claim>(`/api/claims/${claimId}/submit`),
    onSuccess: (_d, claimId) => {
      qc.invalidateQueries({ queryKey: queryKeys.claims.detail(claimId) });
      qc.invalidateQueries({ queryKey: ["claims"] });
    },
  });
}

export function useRefreshClaimStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (claimId: string) =>
      api.post<Claim>(`/api/claims/${claimId}/refresh-status`),
    onSuccess: (_d, claimId) => {
      qc.invalidateQueries({ queryKey: queryKeys.claims.detail(claimId) });
      qc.invalidateQueries({ queryKey: ["claims"] });
    },
  });
}

export function useResubmitClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      claimId,
      data,
    }: {
      claimId: string;
      data?: ResubmitClaimInput;
    }) => api.put<Claim>(`/api/claims/${claimId}/resubmit`, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.claims.detail(vars.claimId),
      });
      qc.invalidateQueries({ queryKey: ["claims"] });
    },
  });
}
