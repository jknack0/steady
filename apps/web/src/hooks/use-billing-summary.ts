"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface BillingSummary {
  totalOutstandingCents: number;
  totalReceivedThisMonthCents: number;
  overdueCount: number;
  invoiceCountsByStatus: Record<string, number>;
}

export function useBillingSummary() {
  return useQuery<BillingSummary>({
    queryKey: ["billing-summary"],
    queryFn: () => api.get("/api/billing/summary"),
  });
}
