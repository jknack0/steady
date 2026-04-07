"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useSavedCards(participantId: string | undefined) {
  return useQuery({
    queryKey: ["saved-cards", participantId],
    queryFn: () => api.get(`/api/stripe/customers/${participantId}/cards`),
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
        queryKey: ["saved-cards", vars.participantId],
      });
    },
  });
}
