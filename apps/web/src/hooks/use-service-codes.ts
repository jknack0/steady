"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { ServiceCodeRef } from "@/lib/appointment-types";

export function useServiceCodes() {
  return useQuery<ServiceCodeRef[]>({
    queryKey: queryKeys.serviceCodes.all,
    queryFn: () => api.get("/api/service-codes"),
  });
}
