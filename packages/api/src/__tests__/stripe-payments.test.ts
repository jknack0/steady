import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { authHeader, participantAuthHeader } from "./helpers";

const mdb = vi.hoisted(() => {
  const m = (extra?: Record<string, any>) => ({
    create: vi.fn(), findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null), findUnique: vi.fn().mockResolvedValue(null),
    findUniqueOrThrow: vi.fn(), update: vi.fn(), delete: vi.fn(),
    count: vi.fn().mockResolvedValue(0), upsert: vi.fn(), deleteMany: vi.fn(),
    createMany: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn(), updateMany: vi.fn(),
    ...extra,
  });
  return {
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
    $transaction: vi.fn().mockImplementation(async (fn: any) => {
      if (typeof fn === "function") return fn(mdb);
      return Promise.all(fn);
    }),
    program: m(), module: m(), part: m(), enrollment: m(), user: m(),
    homeworkInstance: m(), moduleProgress: m(), partProgress: m(),
    task: m(), journalEntry: m(), calendarEvent: m(), session: m(),
    participantProfile: m(), clinicianProfile: m(),
    notificationPreference: m(), practice: m(),
    practiceMembership: m(), auditLog: m(), appointment: m(),
    location: m(), serviceCode: m(), dailyTracker: m(),
    dailyTrackerField: m(), dailyTrackerEntry: m(),
    rtmEngagementEvent: m(), rtmEnrollment: m(),
    rtmBillingPeriod: m(), rtmClinicianTimeLog: m(),
    clinicianConfig: m(), clientConfig: m(),
    clinicianBillingProfile: m(), clinicianClient: m(),
    patientInvitation: m(), refreshToken: m({ updateMany: vi.fn() }),
    reviewTemplate: m(), sessionReview: m(),
    enrollmentOverride: m(), streakRecord: m(),
    waitlistEntry: m(),
    invoice: m(), invoiceLineItem: m(), payment: m(),
    stripeCustomer: m(), savedPaymentMethod: m(), checkoutSession: m(),
  };
});

vi.mock("@steady/db", () => ({
  prisma: mdb,
  PrismaClient: vi.fn(),
  runWithAuditUser: vi.fn((_u: any, fn: any) => fn()),
  getAuditUserId: vi.fn().mockReturnValue(null),
}));

// Mock stripe npm package
const mockStripeInstance = {
  checkout: { sessions: { create: vi.fn() } },
  paymentIntents: { create: vi.fn() },
  customers: { create: vi.fn() },
  paymentMethods: { list: vi.fn(), detach: vi.fn() },
};
vi.mock("stripe", () => {
  return { default: vi.fn(() => mockStripeInstance) };
});

// Mock stripe services to avoid real Stripe calls
const mockCreateCheckoutSession = vi.fn();
const mockChargeCardOnFile = vi.fn();
const mockListSavedCards = vi.fn();
const mockRemoveCard = vi.fn();
const mockGetConnectionStatus = vi.fn();

vi.mock("../services/stripe-checkout", () => ({ createCheckoutSession: mockCreateCheckoutSession }));
vi.mock("../services/stripe-payments", () => ({ chargeCardOnFile: mockChargeCardOnFile }));
vi.mock("../services/stripe-customers", () => ({ listSavedCards: mockListSavedCards, removeCard: mockRemoveCard }));
vi.mock("../services/stripe-connect", () => ({ getConnectionStatus: mockGetConnectionStatus }));

const { default: app } = await import("../app");

function own() {
  mdb.practiceMembership.findFirst.mockResolvedValue({ practiceId: "practice-1", role: "OWNER" });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Stripe Payment Routes", () => {
  // ── Auth tests ─────────────────────────────────────────
  describe("Auth — 401 without token", () => {
    it("POST /api/stripe/payments/checkout returns 401", async () => {
      const res = await request(app).post("/api/stripe/payments/checkout").send({ invoiceId: "inv-1" });
      expect(res.status).toBe(401);
    });

    it("POST /api/stripe/payments/charge returns 401", async () => {
      const res = await request(app).post("/api/stripe/payments/charge")
        .send({ invoiceId: "inv-1", savedPaymentMethodId: "spm-1" });
      expect(res.status).toBe(401);
    });

    it("GET /api/stripe/customers/:id/cards returns 401", async () => {
      const res = await request(app).get("/api/stripe/customers/pp-1/cards");
      expect(res.status).toBe(401);
    });

    it("DELETE /api/stripe/customers/:id/cards/:cardId returns 401", async () => {
      const res = await request(app).delete("/api/stripe/customers/pp-1/cards/card-1");
      expect(res.status).toBe(401);
    });

    it("GET /api/stripe/connection-status returns 401", async () => {
      const res = await request(app).get("/api/stripe/connection-status");
      expect(res.status).toBe(401);
    });
  });

  // ── Role test ──────────────────────────────────────────
  describe("Role — 403 for participant", () => {
    it("rejects participant role on checkout", async () => {
      const res = await request(app).post("/api/stripe/payments/checkout")
        .set(...participantAuthHeader())
        .send({ invoiceId: "inv-1" });
      expect(res.status).toBe(403);
    });
  });

  // ── Checkout session tests ─────────────────────────────
  describe("POST /api/stripe/payments/checkout", () => {
    it("creates checkout session successfully", async () => {
      own();
      mockCreateCheckoutSession.mockResolvedValue({
        url: "https://checkout.stripe.com/session-1",
        sessionId: "cs_test_1",
      });

      const res = await request(app).post("/api/stripe/payments/checkout")
        .set(...authHeader())
        .send({ invoiceId: "inv-1" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.url).toBe("https://checkout.stripe.com/session-1");
      expect(res.body.data.sessionId).toBe("cs_test_1");
    });

    it("returns 404 when invoice not found", async () => {
      own();
      mockCreateCheckoutSession.mockResolvedValue({
        error: "not_found",
        message: "Invoice not found",
      });

      const res = await request(app).post("/api/stripe/payments/checkout")
        .set(...authHeader())
        .send({ invoiceId: "inv-missing" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("returns 409 for PAID invoice", async () => {
      own();
      mockCreateCheckoutSession.mockResolvedValue({
        error: "invalid_status",
        message: "Invoice is already paid",
      });

      const res = await request(app).post("/api/stripe/payments/checkout")
        .set(...authHeader())
        .send({ invoiceId: "inv-paid" });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  // ── Charge card tests ──────────────────────────────────
  describe("POST /api/stripe/payments/charge", () => {
    it("charges card successfully", async () => {
      own();
      mockChargeCardOnFile.mockResolvedValue({
        data: {
          payment: { id: "pay-1", amountCents: 14000, method: "STRIPE" },
          status: "succeeded",
        },
      });

      const res = await request(app).post("/api/stripe/payments/charge")
        .set(...authHeader())
        .send({ invoiceId: "inv-1", savedPaymentMethodId: "spm-1" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payment.id).toBe("pay-1");
      expect(res.body.data.status).toBe("succeeded");
    });

    it("returns 404 when card not found", async () => {
      own();
      mockChargeCardOnFile.mockResolvedValue({
        error: "card_not_found",
        message: "Saved payment method not found",
      });

      const res = await request(app).post("/api/stripe/payments/charge")
        .set(...authHeader())
        .send({ invoiceId: "inv-1", savedPaymentMethodId: "spm-missing" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("returns 403 for forbidden", async () => {
      own();
      mockChargeCardOnFile.mockResolvedValue({
        error: "forbidden",
        message: "Not authorized to charge this card",
      });

      const res = await request(app).post("/api/stripe/payments/charge")
        .set(...authHeader())
        .send({ invoiceId: "inv-1", savedPaymentMethodId: "spm-1" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("returns 409 for PAID invoice", async () => {
      own();
      mockChargeCardOnFile.mockResolvedValue({
        error: "invalid_status",
        message: "Invoice is already paid",
      });

      const res = await request(app).post("/api/stripe/payments/charge")
        .set(...authHeader())
        .send({ invoiceId: "inv-1", savedPaymentMethodId: "spm-1" });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("returns 402 on payment decline", async () => {
      own();
      mockChargeCardOnFile.mockResolvedValue({
        error: "payment_failed",
        message: "Card was declined",
      });

      const res = await request(app).post("/api/stripe/payments/charge")
        .set(...authHeader())
        .send({ invoiceId: "inv-1", savedPaymentMethodId: "spm-1" });

      expect(res.status).toBe(402);
      expect(res.body.success).toBe(false);
    });
  });

  // ── Saved cards tests ──────────────────────────────────
  describe("GET /api/stripe/customers/:participantId/cards", () => {
    it("lists saved cards for owned participant", async () => {
      own();
      mdb.clinicianClient.findFirst.mockResolvedValue({
        clinicianId: "test-clinician-profile-id",
        clientId: "pp-1",
      });
      mockListSavedCards.mockResolvedValue([
        { id: "spm-1", brand: "visa", last4: "4242", expMonth: 12, expYear: 2028 },
      ]);

      const res = await request(app).get("/api/stripe/customers/pp-1/cards")
        .set(...authHeader());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].last4).toBe("4242");
    });

    it("returns 403 for unowned participant", async () => {
      own();
      mdb.clinicianClient.findFirst.mockResolvedValue(null);

      const res = await request(app).get("/api/stripe/customers/pp-other/cards")
        .set(...authHeader());

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Not authorized");
    });
  });

  describe("DELETE /api/stripe/customers/:participantId/cards/:cardId", () => {
    it("removes card successfully", async () => {
      own();
      mdb.clinicianClient.findFirst.mockResolvedValue({
        clinicianId: "test-clinician-profile-id",
        clientId: "pp-1",
      });
      mockRemoveCard.mockResolvedValue({ success: true });

      const res = await request(app).delete("/api/stripe/customers/pp-1/cards/spm-1")
        .set(...authHeader());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns 403 when removing card for unowned participant", async () => {
      own();
      mdb.clinicianClient.findFirst.mockResolvedValue(null);

      const res = await request(app).delete("/api/stripe/customers/pp-other/cards/spm-1")
        .set(...authHeader());

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Not authorized");
    });
  });

  // ── Connection status test ─────────────────────────────
  describe("GET /api/stripe/connection-status", () => {
    it("returns connection status", async () => {
      own();
      mockGetConnectionStatus.mockResolvedValue({
        connected: true,
        accountId: "acct_test_123",
        chargesEnabled: true,
      });

      const res = await request(app).get("/api/stripe/connection-status")
        .set(...authHeader());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.connected).toBe(true);
      expect(res.body.data.accountId).toBe("acct_test_123");
    });
  });

  // ── COND-8 ownership verification ─────────────────────
  describe("COND-8 ownership checks", () => {
    it("returns 403 for list cards when clinicianClient.findFirst returns null", async () => {
      own();
      mdb.clinicianClient.findFirst.mockResolvedValue(null);

      const res = await request(app).get("/api/stripe/customers/pp-unowned/cards")
        .set(...authHeader());

      expect(res.status).toBe(403);
    });

    it("returns 403 for delete card when clinicianClient.findFirst returns null", async () => {
      own();
      mdb.clinicianClient.findFirst.mockResolvedValue(null);

      const res = await request(app).delete("/api/stripe/customers/pp-unowned/cards/spm-1")
        .set(...authHeader());

      expect(res.status).toBe(403);
    });

    it("verifies clinicianClient.findFirst is called with correct IDs", async () => {
      own();
      mdb.clinicianClient.findFirst.mockResolvedValue({
        clinicianId: "test-clinician-profile-id",
        clientId: "pp-target",
      });
      mockListSavedCards.mockResolvedValue([]);

      await request(app).get("/api/stripe/customers/pp-target/cards")
        .set(...authHeader());

      expect(mdb.clinicianClient.findFirst).toHaveBeenCalledWith({
        where: {
          clinicianId: "test-clinician-profile-id",
          clientId: "pp-target",
        },
      });
    });
  });
});
