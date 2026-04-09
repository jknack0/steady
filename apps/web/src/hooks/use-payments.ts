"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { CreatePaymentInput } from "@steady/shared";

// ── Response type ──────────────────────────────────────────

export interface Payment {
  id: string;
  invoiceId: string;
  amountCents: number;
  method: "CASH" | "CHECK" | "CREDIT_CARD" | "INSURANCE" | "OTHER";
  reference: string | null;
  receivedAt: string;
  stripePaymentIntentId: string | null;
  createdAt: string;
}

// ── Hooks ──────────────────────────────────────────────────

export function usePayments(invoiceId: string) {
  return useQuery<Payment[]>({
    queryKey: queryKeys.payments.byInvoice(invoiceId),
    queryFn: () => api.get<Payment[]>(`/api/invoices/${invoiceId}/payments`),
    enabled: !!invoiceId,
  });
}

export function useRecordPayment(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePaymentInput) =>
      api.post<Payment>(`/api/invoices/${invoiceId}/payments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.byInvoice(invoiceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(invoiceId) });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.summary });
    },
  });
}

export function useDeletePayment(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) =>
      api.delete(`/api/invoices/${invoiceId}/payments/${paymentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.byInvoice(invoiceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(invoiceId) });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.summary });
    },
  });
}
