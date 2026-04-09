import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { authHeader } from "./helpers";

const mdb = vi.hoisted(() => {
  const m = (extra?: Record<string, any>) => ({
    create: vi.fn(), findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null), findUnique: vi.fn().mockResolvedValue(null),
    findUniqueOrThrow: vi.fn(), update: vi.fn(), delete: vi.fn(),
    count: vi.fn().mockResolvedValue(0), upsert: vi.fn(), deleteMany: vi.fn(),
    createMany: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn(), ...extra,
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
  };
});

vi.mock("@steady/db", () => ({
  prisma: mdb,
  PrismaClient: vi.fn(),
  runWithAuditUser: vi.fn((_u: any, fn: any) => fn()),
  getAuditUserId: vi.fn().mockReturnValue(null),
}));

const { default: app } = await import("../app");

function mockInvoice(overrides: Record<string, any> = {}) {
  return {
    id: "inv-1", practiceId: "practice-1", clinicianId: "test-clinician-profile-id",
    status: "SENT", subtotalCents: 14000, taxCents: 0, totalCents: 14000, paidCents: 0,
    ...overrides,
  };
}

function own() {
  mdb.practiceMembership.findFirst.mockResolvedValue({ practiceId: "practice-1", role: "OWNER" });
}

describe("Payment Routes", () => {
  describe("POST /api/invoices/:id/payments", () => {
    it("records payment", async () => {
      own();
      mdb.invoice.findFirst.mockResolvedValue(mockInvoice());
      mdb.payment.create.mockResolvedValue({
        id: "pay-1", invoiceId: "inv-1", amountCents: 7000, method: "CREDIT_CARD", receivedAt: new Date(),
      });
      mdb.payment.findMany.mockResolvedValue([{ amountCents: 7000 }]);
      mdb.invoice.findUniqueOrThrow.mockResolvedValue(mockInvoice());
      mdb.invoice.update.mockResolvedValue({});

      const res = await request(app).post("/api/invoices/inv-1/payments").set(...authHeader())
        .send({ amountCents: 7000, method: "CREDIT_CARD" });
      expect(res.status).toBe(201);
      expect(res.body.data.amountCents).toBe(7000);
    });

    it("transitions to PAID when fully paid", async () => {
      own();
      mdb.invoice.findFirst.mockResolvedValue(mockInvoice());
      mdb.payment.create.mockResolvedValue({ id: "pay-1", amountCents: 14000, method: "CASH" });
      mdb.payment.findMany.mockResolvedValue([{ amountCents: 14000 }]);
      mdb.invoice.findUniqueOrThrow.mockResolvedValue(mockInvoice());
      mdb.invoice.update.mockResolvedValue({});

      const res = await request(app).post("/api/invoices/inv-1/payments").set(...authHeader())
        .send({ amountCents: 14000, method: "CASH" });
      expect(res.status).toBe(201);
      const call = mdb.invoice.update.mock.calls.at(-1)[0];
      expect(call.data.status).toBe("PAID");
    });

    it("transitions to PARTIALLY_PAID", async () => {
      own();
      mdb.invoice.findFirst.mockResolvedValue(mockInvoice());
      mdb.payment.create.mockResolvedValue({ id: "pay-1", amountCents: 5000, method: "CHECK" });
      mdb.payment.findMany.mockResolvedValue([{ amountCents: 5000 }]);
      mdb.invoice.findUniqueOrThrow.mockResolvedValue(mockInvoice());
      mdb.invoice.update.mockResolvedValue({});

      const res = await request(app).post("/api/invoices/inv-1/payments").set(...authHeader())
        .send({ amountCents: 5000, method: "CHECK" });
      expect(res.status).toBe(201);
      const call = mdb.invoice.update.mock.calls.at(-1)[0];
      expect(call.data.status).toBe("PARTIALLY_PAID");
    });

    it("rejects draft invoice", async () => {
      own();
      mdb.invoice.findFirst.mockResolvedValue(mockInvoice({ status: "DRAFT" }));
      const res = await request(app).post("/api/invoices/inv-1/payments").set(...authHeader())
        .send({ amountCents: 7000, method: "CASH" });
      expect(res.status).toBe(409);
    });

    it("rejects void invoice", async () => {
      own();
      mdb.invoice.findFirst.mockResolvedValue(mockInvoice({ status: "VOID" }));
      const res = await request(app).post("/api/invoices/inv-1/payments").set(...authHeader())
        .send({ amountCents: 7000, method: "CASH" });
      expect(res.status).toBe(409);
    });

    it("rejects zero amount", async () => {
      own();
      const res = await request(app).post("/api/invoices/inv-1/payments").set(...authHeader())
        .send({ amountCents: 0, method: "CASH" });
      expect(res.status).toBe(400);
    });

    it("rejects missing method", async () => {
      own();
      const res = await request(app).post("/api/invoices/inv-1/payments").set(...authHeader())
        .send({ amountCents: 5000 });
      expect(res.status).toBe(400);
    });

    it("returns 401 without auth", async () => {
      const res = await request(app).post("/api/invoices/inv-1/payments")
        .send({ amountCents: 5000, method: "CASH" });
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/invoices/:id/payments", () => {
    it("lists payments", async () => {
      own();
      mdb.invoice.findFirst.mockResolvedValue(mockInvoice());
      mdb.payment.findMany.mockResolvedValue([{ id: "pay-1", amountCents: 7000 }]);
      const res = await request(app).get("/api/invoices/inv-1/payments").set(...authHeader());
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it("returns 404 for missing invoice", async () => {
      own();
      mdb.invoice.findFirst.mockResolvedValue(null);
      const res = await request(app).get("/api/invoices/inv-x/payments").set(...authHeader());
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/invoices/:id/payments/:paymentId", () => {
    it("removes payment and recalculates", async () => {
      own();
      mdb.invoice.findFirst.mockResolvedValue(mockInvoice({ paidCents: 7000 }));
      mdb.payment.findFirst.mockResolvedValue({ id: "pay-1", invoiceId: "inv-1" });
      mdb.payment.delete.mockResolvedValue({});
      mdb.payment.findMany.mockResolvedValue([]);
      mdb.invoice.findUniqueOrThrow.mockResolvedValue(mockInvoice());
      mdb.invoice.update.mockResolvedValue({});

      const res = await request(app).delete("/api/invoices/inv-1/payments/pay-1").set(...authHeader());
      expect(res.status).toBe(204);
      const call = mdb.invoice.update.mock.calls.at(-1)[0];
      expect(call.data.status).toBe("SENT");
    });

    it("returns 404 for missing payment", async () => {
      own();
      mdb.invoice.findFirst.mockResolvedValue(mockInvoice());
      mdb.payment.findFirst.mockResolvedValue(null);
      const res = await request(app).delete("/api/invoices/inv-1/payments/pay-x").set(...authHeader());
      expect(res.status).toBe(404);
    });
  });
});
