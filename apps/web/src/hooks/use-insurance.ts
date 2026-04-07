"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useInsurance(participantId: string | undefined) {
  return useQuery({
    queryKey: ["insurance", participantId],
    queryFn: () => api.get(`/api/insurance/${participantId}`),
    enabled: !!participantId,
  });
}

export function useUpsertInsurance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ participantId, data }: { participantId: string; data: any }) =>
      api.put(`/api/insurance/${participantId}`, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["insurance", vars.participantId] });
    },
  });
}

export function useRemoveInsurance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (participantId: string) =>
      api.delete(`/api/insurance/${participantId}`),
    onSuccess: (_d, participantId) => {
      qc.invalidateQueries({ queryKey: ["insurance", participantId] });
    },
  });
}

export function useCheckEligibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ participantId, serviceCode }: { participantId: string; serviceCode?: string }) =>
      api.post(`/api/insurance/${participantId}/eligibility`, { serviceCode }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["insurance", vars.participantId] });
    },
  });
}
