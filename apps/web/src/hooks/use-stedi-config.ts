"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface StediConfig {
  configured: boolean;
  keyLastFour: string | null;
}

export function useStediConfig() {
  return useQuery<StediConfig>({
    queryKey: queryKeys.config.stedi,
    queryFn: () => api.get<StediConfig>("/api/config/stedi"),
  });
}

export function useSetStediKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (apiKey: string) =>
      api.put("/api/config/stedi", { apiKey }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.config.stedi });
    },
  });
}

export function useTestStediConnection() {
  return useMutation({
    mutationFn: () =>
      api.post("/api/config/stedi/test"),
  });
}
