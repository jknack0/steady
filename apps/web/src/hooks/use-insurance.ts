"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { UpsertInsuranceInput } from "@steady/shared";

// ── Response types ─────────────────────────────────────────

export interface InsuranceData {
  id: string;
  participantId: string;
  payerId: string;
  payerName: string;
  subscriberId: string;
  groupNumber: string | null;
  relationshipToSubscriber: "SELF" | "SPOUSE" | "CHILD" | "OTHER";
  policyHolderFirstName: string | null;
  policyHolderLastName: string | null;
  policyHolderDob: string | null;
  policyHolderGender: string | null;
  isActive: boolean;
  cachedEligibility: unknown | null;
  eligibilityCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Query hooks ────────────────────────────────────────────

/**
 * Fetches insurance for a participant.
 *
 * @param participantId - The participant profile ID.
 * @param options.suppress404 - When true, a 404 response is swallowed and
 *   `data` resolves to `null` instead of throwing. Useful in contexts where
 *   "no insurance on file" is an expected (non-error) state.
 */
export function useInsurance(
  participantId: string | undefined,
  options?: { suppress404?: boolean },
) {
  const suppress404 = options?.suppress404 ?? false;

  const query = useQuery<InsuranceData | null>({
    queryKey: queryKeys.insurance.byParticipant(participantId ?? ""),
    queryFn: async () => {
      try {
        return await api.get<InsuranceData>(`/api/insurance/${participantId}`);
      } catch (err) {
        if (suppress404) return null;
        throw err;
      }
    },
    enabled: !!participantId,
  });

  return suppress404
    ? {
        ...query,
        insurance: query.data ?? null,
        hasInsurance: !!query.data && query.data.isActive !== false,
        payerName: query.data?.payerName ?? null,
      }
    : query;
}

// ── Mutation hooks ─────────────────────────────────────────

export function useUpsertInsurance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      participantId,
      data,
    }: {
      participantId: string;
      data: UpsertInsuranceInput;
    }) => api.put<InsuranceData>(`/api/insurance/${participantId}`, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.insurance.byParticipant(vars.participantId),
      });
    },
  });
}

export function useRemoveInsurance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (participantId: string) =>
      api.delete(`/api/insurance/${participantId}`),
    onSuccess: (_d, participantId) => {
      qc.invalidateQueries({
        queryKey: queryKeys.insurance.byParticipant(participantId),
      });
    },
  });
}

export function useCheckEligibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      participantId,
      serviceCode,
    }: {
      participantId: string;
      serviceCode?: string;
    }) =>
      api.post(`/api/insurance/${participantId}/eligibility`, { serviceCode }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.insurance.byParticipant(vars.participantId),
      });
    },
  });
}
