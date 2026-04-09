"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface BillingSummary {
  totalOutstandingCents: number;
  totalReceivedThisMonthCents: number;
  overdueCount: number;
  invoiceCountsByStatus: Record<string, number>;
}

export function useBillingSummary() {
  return useQuery<BillingSummary>({
    queryKey: queryKeys.billing.summary,
    queryFn: () => api.get("/api/billing/summary"),
  });
}
