"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function usePayerSearch(query: string) {
  return useQuery({
    queryKey: ["payers", query],
    queryFn: () => api.get(`/api/payers?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
  });
}
