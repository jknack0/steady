"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

interface StediConfig {
  configured: boolean;
  keyLastFour: string | null;
}

export function useStediConfig() {
  return useQuery({
    queryKey: ["stedi-config"],
    queryFn: () => api.get("/api/config/stedi") as Promise<StediConfig>,
  });
}

export function useSetStediKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (apiKey: string) =>
      api.put("/api/config/stedi", { apiKey }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stedi-config"] });
    },
  });
}

export function useTestStediConnection() {
  return useMutation({
    mutationFn: () =>
      api.post("/api/config/stedi/test"),
  });
}
