"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

// ── Response types ─────────────────────────────────────────

export interface DiagnosisCode {
  id: string;
  code: string;
  description: string;
  category: string;
  isCommon: boolean;
  createdAt: string;
}

export interface DiagnosisCodeSearchResult {
  results: DiagnosisCode[];
  recent: DiagnosisCode[];
}

// ── Hook ───────────────────────────────────────────────────

export function useDiagnosisCodeSearch(query: string, participantId?: string) {
  return useQuery<DiagnosisCodeSearchResult>({
    queryKey: queryKeys.diagnosisCodes.search(query, participantId),
    queryFn: () => {
      const params = new URLSearchParams({ q: query });
      if (participantId) params.set("participantId", participantId);
      return api.get<DiagnosisCodeSearchResult>(`/api/diagnosis-codes?${params}`);
    },
    enabled: query.length >= 2,
  });
}
