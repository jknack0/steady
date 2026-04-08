"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { buildQueryString } from "@/lib/query-utils";
import type {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  InvoiceStatus,
  PaymentMethod,
} from "@steady/shared";

// ── Response types ─────────────────────────────────────────

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  appointmentId: string | null;
  serviceCodeId: string;
  description: string | null;
  unitPriceCents: number;
  quantity: number;
  totalCents: number;
  dateOfService: string | null;
  placeOfServiceCode: string | null;
  modifiers: string[];
  createdAt: string;
}

export interface Invoice {
  id: string;
  practiceId: string;
  clinicianId: string;
  participantId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issuedAt: string | null;
  dueAt: string | null;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  paidCents: number;
  notes: string | null;
  diagnosisCodes: string[];
  paymentLinkUrl: string | null;
  paymentLinkExpiresAt: string | null;
  balanceDueSourceInvoiceId: string | null;
  createdAt: string;
  updatedAt: string;
  lineItems: InvoiceLineItem[];
  payments: Array<{
    id: string;
    amountCents: number;
    method: PaymentMethod;
    reference: string | null;
    receivedAt: string;
    createdAt: string;
  }>;
  participant?: {
    id: string;
    user: { firstName: string; lastName: string; email: string };
  };
  clinician?: {
    id: string;
    user: { firstName: string; lastName: string };
  };
}

/** Shape returned by the list endpoint (subset, with counts). */
export interface InvoiceListItem {
  id: string;
  practiceId: string;
  clinicianId: string;
  participantId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issuedAt: string | null;
  dueAt: string | null;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  paidCents: number;
  notes: string | null;
  diagnosisCodes: string[];
  createdAt: string;
  updatedAt: string;
  participant: {
    id: string;
    user: { firstName: string; lastName: string; email: string };
  };
  clinician: {
    id: string;
    user: { firstName: string; lastName: string };
  };
  _count: { lineItems: number; payments: number };
}

export interface ListInvoicesParams {
  status?: string;
  participantId?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

// ── Hooks ──────────────────────────────────────────────────

export function useInvoices(params: ListInvoicesParams) {
  return useQuery<InvoiceListItem[]>({
    queryKey: queryKeys.invoices.all(params as Record<string, unknown>),
    queryFn: () =>
      api.get<InvoiceListItem[]>(
        `/api/invoices?${buildQueryString(params as unknown as Record<string, string | number | undefined>)}`,
      ),
  });
}

export function useInvoice(id: string) {
  return useQuery<Invoice>({
    queryKey: queryKeys.invoices.detail(id),
    queryFn: () => api.get<Invoice>(`/api/invoices/${id}`),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInvoiceInput) =>
      api.post<Invoice>("/api/invoices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.summary });
    },
  });
}

export function useUpdateInvoice(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateInvoiceInput) =>
      api.patch<Invoice>(`/api/invoices/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(id) });
    },
  });
}

export function useSendInvoice(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<Invoice>(`/api/invoices/${id}/send`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.summary });
    },
  });
}

export function useVoidInvoice(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<Invoice>(`/api/invoices/${id}/void`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.summary });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.summary });
    },
  });
}

export function useCreateInvoiceFromAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appointmentId: string) =>
      api.post<Invoice>(`/api/invoices/from-appointment/${appointmentId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.summary });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointment"] });
    },
  });
}
