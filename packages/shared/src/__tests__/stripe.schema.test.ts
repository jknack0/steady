import { describe, it, expect } from "vitest";
import {
  CheckoutSessionStatusEnum,
  CreateCheckoutSessionSchema,
  ChargeCardSchema,
  ProvisionStripeSchema,
  SaveStripeKeysSchema,
} from "../schemas/stripe";

describe("Stripe Schemas", () => {
  describe("CheckoutSessionStatusEnum", () => {
    it("accepts valid statuses", () => {
      for (const status of ["OPEN", "COMPLETED", "EXPIRED"]) {
        const result = CheckoutSessionStatusEnum.safeParse(status);
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid status", () => {
      const result = CheckoutSessionStatusEnum.safeParse("PENDING");
      expect(result.success).toBe(false);
    });

    it("rejects empty string", () => {
      const result = CheckoutSessionStatusEnum.safeParse("");
      expect(result.success).toBe(false);
    });
  });

  describe("CreateCheckoutSessionSchema", () => {
    it("accepts valid invoiceId", () => {
      const result = CreateCheckoutSessionSchema.safeParse({
        invoiceId: "inv-123",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.invoiceId).toBe("inv-123");
      }
    });

    it("rejects empty invoiceId", () => {
      const result = CreateCheckoutSessionSchema.safeParse({ invoiceId: "" });
      expect(result.success).toBe(false);
    });

    it("rejects invoiceId exceeding 200 chars", () => {
      const result = CreateCheckoutSessionSchema.safeParse({
        invoiceId: "x".repeat(201),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("ChargeCardSchema", () => {
    it("accepts valid invoiceId and savedPaymentMethodId", () => {
      const result = ChargeCardSchema.safeParse({
        invoiceId: "inv-1",
        savedPaymentMethodId: "pm-abc",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.invoiceId).toBe("inv-1");
        expect(result.data.savedPaymentMethodId).toBe("pm-abc");
      }
    });

    it("rejects missing savedPaymentMethodId", () => {
      const result = ChargeCardSchema.safeParse({ invoiceId: "inv-1" });
      expect(result.success).toBe(false);
    });

    it("rejects missing invoiceId", () => {
      const result = ChargeCardSchema.safeParse({
        savedPaymentMethodId: "pm-abc",
      });
      expect(result.success).toBe(false);
    });

    it("rejects oversized strings", () => {
      const result = ChargeCardSchema.safeParse({
        invoiceId: "x".repeat(201),
        savedPaymentMethodId: "y".repeat(201),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("ProvisionStripeSchema", () => {
    it("accepts valid practiceId", () => {
      const result = ProvisionStripeSchema.safeParse({
        practiceId: "prac-1",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.practiceId).toBe("prac-1");
      }
    });

    it("rejects empty practiceId", () => {
      const result = ProvisionStripeSchema.safeParse({ practiceId: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("SaveStripeKeysSchema", () => {
    it("accepts valid practiceId, apiKey, and webhookSecret", () => {
      const result = SaveStripeKeysSchema.safeParse({
        practiceId: "prac-1",
        apiKey: "sk_test_abc123",
        webhookSecret: "whsec_xyz789",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.practiceId).toBe("prac-1");
        expect(result.data.apiKey).toBe("sk_test_abc123");
        expect(result.data.webhookSecret).toBe("whsec_xyz789");
      }
    });

    it("rejects missing fields", () => {
      const missingApiKey = SaveStripeKeysSchema.safeParse({
        practiceId: "prac-1",
        webhookSecret: "whsec_xyz",
      });
      expect(missingApiKey.success).toBe(false);

      const missingWebhookSecret = SaveStripeKeysSchema.safeParse({
        practiceId: "prac-1",
        apiKey: "sk_test_abc",
      });
      expect(missingWebhookSecret.success).toBe(false);
    });

    it("rejects apiKey exceeding 500 chars", () => {
      const result = SaveStripeKeysSchema.safeParse({
        practiceId: "prac-1",
        apiKey: "x".repeat(501),
        webhookSecret: "whsec_valid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects webhookSecret exceeding 500 chars", () => {
      const result = SaveStripeKeysSchema.safeParse({
        practiceId: "prac-1",
        apiKey: "sk_test_valid",
        webhookSecret: "x".repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });
});
