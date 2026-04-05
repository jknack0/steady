"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ParticipantSearchResult } from "@/lib/appointment-types";

export function useParticipantSearch(query: string, enabled: boolean) {
  return useQuery<ParticipantSearchResult[]>({
    queryKey: ["participant-search", query],
    queryFn: () => api.get(`/api/participants/search?q=${encodeURIComponent(query)}`),
    enabled: enabled && query.length >= 2,
    staleTime: 30_000,
  });
}

export interface CreateParticipantInput {
  firstName: string;
  lastName: string;
  email: string;
}

export function useCreateParticipant() {
  const queryClient = useQueryClient();
  return useMutation<ParticipantSearchResult, Error, CreateParticipantInput>({
    mutationFn: (data) => api.post("/api/participants", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participant-search"] });
    },
  });
}
