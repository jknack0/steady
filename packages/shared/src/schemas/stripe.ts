import { z } from "zod";

// ── Enums ──────────────────────────────────────────────

export const CheckoutSessionStatusEnum = z.enum(["OPEN", "COMPLETED", "EXPIRED"]);
export type CheckoutSessionStatus = z.infer<typeof CheckoutSessionStatusEnum>;

// ── Checkout Session ───────────────────────────────────

export const CreateCheckoutSessionSchema = z.object({
  invoiceId: z.string().min(1).max(200),
});
export type CreateCheckoutSessionInput = z.infer<typeof CreateCheckoutSessionSchema>;

// ── Charge Card ────────────────────────────────────────

export const ChargeCardSchema = z.object({
  invoiceId: z.string().min(1).max(200),
  savedPaymentMethodId: z.string().min(1).max(200),
});
export type ChargeCardInput = z.infer<typeof ChargeCardSchema>;

// ── Admin Provisioning ─────────────────────────────────

export const ProvisionStripeSchema = z.object({
  practiceId: z.string().min(1).max(200),
});
export type ProvisionStripeInput = z.infer<typeof ProvisionStripeSchema>;

// ── Save Stripe Keys ───────────────────────────────────

export const SaveStripeKeysSchema = z.object({
  practiceId: z.string().min(1).max(200),
  apiKey: z.string().min(1).max(500),
  webhookSecret: z.string().min(1).max(500),
});
export type SaveStripeKeysInput = z.infer<typeof SaveStripeKeysSchema>;
