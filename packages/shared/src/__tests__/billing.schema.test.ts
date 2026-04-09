import { describe, it, expect } from "vitest";
import {
  CreateInvoiceSchema,
  UpdateInvoiceSchema,
  CreatePaymentSchema,
  ListInvoicesQuerySchema,
  InvoiceStatusEnum,
  PaymentMethodEnum,
} from "../schemas/billing";

describe("Billing Schemas", () => {
  describe("CreateInvoiceSchema", () => {
    it("accepts valid payload", () => {
      const result = CreateInvoiceSchema.safeParse({
        participantId: "pp-1",
        lineItems: [
          { serviceCodeId: "sc-1", quantity: 1 },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.taxCents).toBe(0);
        expect(result.data.lineItems[0].quantity).toBe(1);
      }
    });

    it("rejects empty lineItems", () => {
      const result = CreateInvoiceSchema.safeParse({
        participantId: "pp-1",
        lineItems: [],
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing participantId", () => {
      const result = CreateInvoiceSchema.safeParse({
        lineItems: [{ serviceCodeId: "sc-1" }],
      });
      expect(result.success).toBe(false);
    });

    it("applies default taxCents = 0", () => {
      const result = CreateInvoiceSchema.safeParse({
        participantId: "pp-1",
        lineItems: [{ serviceCodeId: "sc-1" }],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.taxCents).toBe(0);
      }
    });

    it("applies default quantity = 1", () => {
      const result = CreateInvoiceSchema.safeParse({
        participantId: "pp-1",
        lineItems: [{ serviceCodeId: "sc-1" }],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.lineItems[0].quantity).toBe(1);
      }
    });

    it("accepts optional fields", () => {
      const result = CreateInvoiceSchema.safeParse({
        participantId: "pp-1",
        lineItems: [
          {
            serviceCodeId: "sc-1",
            appointmentId: "appt-1",
            description: "Custom description",
            unitPriceCents: 15000,
            quantity: 2,
          },
        ],
        notes: "Test note",
        taxCents: 500,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBe("Test note");
        expect(result.data.taxCents).toBe(500);
        expect(result.data.lineItems[0].unitPriceCents).toBe(15000);
      }
    });
  });

  describe("UpdateInvoiceSchema", () => {
    it("accepts partial update", () => {
      const result = UpdateInvoiceSchema.safeParse({ notes: "Updated" });
      expect(result.success).toBe(true);
    });

    it("accepts empty object", () => {
      const result = UpdateInvoiceSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("CreatePaymentSchema", () => {
    it("accepts valid payment", () => {
      const result = CreatePaymentSchema.safeParse({
        amountCents: 14000,
        method: "CREDIT_CARD",
      });
      expect(result.success).toBe(true);
    });

    it("rejects zero amountCents", () => {
      const result = CreatePaymentSchema.safeParse({
        amountCents: 0,
        method: "CASH",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid method", () => {
      const result = CreatePaymentSchema.safeParse({
        amountCents: 5000,
        method: "BITCOIN",
      });
      expect(result.success).toBe(false);
    });

    it("accepts optional reference and receivedAt", () => {
      const result = CreatePaymentSchema.safeParse({
        amountCents: 5000,
        method: "CHECK",
        reference: "Check #1234",
        receivedAt: "2026-04-05T10:00:00Z",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("ListInvoicesQuerySchema", () => {
    it("applies default limit = 50", () => {
      const result = ListInvoicesQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    it("accepts all filter params", () => {
      const result = ListInvoicesQuerySchema.safeParse({
        status: "SENT,PAID",
        participantId: "pp-1",
        from: "2026-01-01",
        to: "2026-04-01",
        cursor: "inv-5",
        limit: "25",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("Enums", () => {
    it("InvoiceStatusEnum accepts all valid statuses", () => {
      for (const s of ["DRAFT", "SENT", "PAID", "PARTIALLY_PAID", "OVERDUE", "VOID"]) {
        expect(InvoiceStatusEnum.safeParse(s).success).toBe(true);
      }
    });

    it("PaymentMethodEnum accepts all valid methods", () => {
      for (const m of ["CASH", "CHECK", "CREDIT_CARD", "INSURANCE", "OTHER"]) {
        expect(PaymentMethodEnum.safeParse(m).success).toBe(true);
      }
    });
  });
});
