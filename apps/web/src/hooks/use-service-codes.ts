"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ServiceCodeRef } from "@/lib/appointment-types";

export function useServiceCodes() {
  return useQuery<ServiceCodeRef[]>({
    queryKey: ["service-codes"],
    queryFn: () => api.get("/api/service-codes"),
  });
}
