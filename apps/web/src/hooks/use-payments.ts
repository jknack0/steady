"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function usePayments(invoiceId: string) {
  return useQuery({
    queryKey: ["payments", invoiceId],
    queryFn: () => api.get(`/api/invoices/${invoiceId}/payments`),
    enabled: !!invoiceId,
  });
}

export function useRecordPayment(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post(`/api/invoices/${invoiceId}/payments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["billing-summary"] });
    },
  });
}

export function useDeletePayment(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) =>
      api.delete(`/api/invoices/${invoiceId}/payments/${paymentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["billing-summary"] });
    },
  });
}
