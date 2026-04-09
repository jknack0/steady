"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

// ── Response type ──────────────────────────────────────────

export interface SavedCard {
  id: string;
  stripeCustomerId: string;
  stripePaymentMethodId: string;
  cardBrand: string;
  cardLastFour: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  createdAt: string;
}

// ── Hooks ──────────────────────────────────────────────────

export function useSavedCards(participantId: string | undefined) {
  return useQuery<SavedCard[]>({
    queryKey: queryKeys.savedCards.byParticipant(participantId ?? ""),
    queryFn: () =>
      api.get<SavedCard[]>(`/api/stripe/customers/${participantId}/cards`),
    enabled: !!participantId,
  });
}

export function useRemoveCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      participantId,
      cardId,
    }: {
      participantId: string;
      cardId: string;
    }) =>
      api.delete(
        `/api/stripe/customers/${participantId}/cards/${cardId}`,
      ),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.savedCards.byParticipant(vars.participantId),
      });
    },
  });
}
