import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export type InvoiceStatus = "SENT" | "PAID" | "PARTIALLY_PAID" | "OVERDUE";

export interface ParticipantInvoiceListItem {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issuedAt: string | null;
  dueAt: string | null;
  totalCents: number;
  paidCents: number;
  clinician: {
    firstName: string | null;
    lastName: string | null;
  } | null;
}

export interface ParticipantInvoiceDetail {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issuedAt: string | null;
  dueAt: string | null;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  paidCents: number;
  lineItems: Array<{
    id: string;
    description: string;
    unitPriceCents: number;
    quantity: number;
    totalCents: number;
  }>;
  payments: Array<{
    id: string;
    amountCents: number;
    method: string;
    receivedAt: string;
  }>;
  clinician: {
    firstName: string | null;
    lastName: string | null;
  } | null;
}

export function useMyInvoices() {
  const query = useQuery({
    queryKey: ["my-invoices"],
    queryFn: async () => {
      const res = await api.getMyInvoices();
      if (!res.success) {
        throw new Error(res.error || "Failed to load invoices");
      }
      return {
        data: (res.data as ParticipantInvoiceListItem[]) || [],
        cursor: ((res as unknown) as { cursor: string | null }).cursor ?? null,
      };
    },
    staleTime: 60_000,
  });

  return {
    data: query.data?.data ?? [],
    cursor: query.data?.cursor ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useMyInvoice(id: string) {
  return useQuery({
    queryKey: ["my-invoice", id],
    queryFn: async () => {
      const res = await api.getMyInvoice(id);
      if (!res.success) {
        throw new Error(res.error || "Failed to load invoice");
      }
      return res.data as ParticipantInvoiceDetail;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useOutstandingInvoiceCount() {
  return useQuery({
    queryKey: ["outstanding-invoice-count"],
    queryFn: async () => {
      const res = await api.getOutstandingInvoiceCount();
      if (!res.success) return 0;
      return (res.data as { count: number })?.count ?? 0;
    },
    staleTime: 120_000,
  });
}
