import { z } from "zod";

// ── Enums ──────────────────────────────────────────────

export const InvoiceStatusEnum = z.enum([
  "DRAFT",
  "SENT",
  "PAID",
  "PARTIALLY_PAID",
  "OVERDUE",
  "VOID",
]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusEnum>;

export const PaymentMethodEnum = z.enum([
  "CASH",
  "CHECK",
  "CREDIT_CARD",
  "INSURANCE",
  "OTHER",
]);
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;

// ── Line Item ──────────────────────────────────────────

export const CreateInvoiceLineItemSchema = z.object({
  appointmentId: z.string().optional(),
  serviceCodeId: z.string(),
  description: z.string().max(200).optional(),
  unitPriceCents: z.number().int().min(0).optional(),
  quantity: z.number().int().min(1).default(1),
  dateOfService: z.string().max(20).optional(),
  placeOfServiceCode: z.string().max(10).optional(),
  modifiers: z.array(z.string().max(10)).max(4).default([]),
});
export type CreateInvoiceLineItemInput = z.infer<typeof CreateInvoiceLineItemSchema>;

// ── Create Invoice ─────────────────────────────────────

export const CreateInvoiceSchema = z.object({
  participantId: z.string(),
  lineItems: z.array(CreateInvoiceLineItemSchema).min(1, "At least one line item is required"),
  notes: z.string().max(2000).optional(),
  taxCents: z.number().int().min(0).default(0),
  diagnosisCodes: z.array(z.string().min(1).max(20)).max(4).default([]),
  dueDate: z.string().max(20).optional(),
});
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;

// ── Update Invoice (DRAFT only) ────────────────────────

export const UpdateInvoiceSchema = z.object({
  notes: z.string().max(2000).optional(),
  taxCents: z.number().int().min(0).optional(),
  lineItems: z.array(CreateInvoiceLineItemSchema).min(1).optional(),
  diagnosisCodes: z.array(z.string().min(1).max(20)).max(4).optional(),
  dueDate: z.string().max(20).optional(),
});
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>;

// ── Payment ────────────────────────────────────────────

export const CreatePaymentSchema = z.object({
  amountCents: z.number().int().min(1, "Amount must be at least 1 cent"),
  method: PaymentMethodEnum,
  reference: z.string().max(200).optional(),
  receivedAt: z.string().datetime().optional(),
});
export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;

// ── Query ──────────────────────────────────────────────

export const ListInvoicesQuerySchema = z.object({
  status: z.string().optional(),
  participantId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListInvoicesQuery = z.infer<typeof ListInvoicesQuerySchema>;
