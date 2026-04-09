"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

// ── Response type ──────────────────────────────────────────

export interface Payer {
  payerId: string;
  name: string;
}

// ── Hook ───────────────────────────────────────────────────

export function usePayerSearch(query: string) {
  return useQuery<Payer[]>({
    queryKey: queryKeys.payers.search(query),
    queryFn: () => api.get<Payer[]>(`/api/payers?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
  });
}
