"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function useCreateCheckoutSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) =>
      api.post("/api/stripe/payments/checkout", { invoiceId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: queryKeys.billing.summary });
    },
  });
}

export function useChargeCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      invoiceId,
      savedPaymentMethodId,
    }: {
      invoiceId: string;
      savedPaymentMethodId: string;
    }) =>
      api.post("/api/stripe/payments/charge", {
        invoiceId,
        savedPaymentMethodId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: queryKeys.billing.summary });
    },
  });
}

export function useStripeConnectionStatus() {
  return useQuery<{ connected: boolean; accountId: string | null; keyLastFour: string | null }>({
    queryKey: queryKeys.stripe.connectionStatus,
    queryFn: () => api.get("/api/stripe/connection-status"),
  });
}
