"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useDiagnosisCodeSearch(query: string, participantId?: string) {
  return useQuery({
    queryKey: ["diagnosis-codes", query, participantId],
    queryFn: () => {
      const params = new URLSearchParams({ q: query });
      if (participantId) params.set("participantId", participantId);
      return api.get(`/api/diagnosis-codes?${params}`);
    },
    enabled: query.length >= 2,
  });
}
