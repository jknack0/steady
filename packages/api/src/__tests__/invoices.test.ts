import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { authHeader } from "./helpers";

// Comprehensive mock that satisfies all modules loaded by app.ts
const mdb = vi.hoisted(() => {
  const m = (extra?: Record<string, any>) => ({
    create: vi.fn(), findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null), findUnique: vi.fn().mockResolvedValue(null),
    findUniqueOrThrow: vi.fn(), update: vi.fn(), delete: vi.fn(),
    count: vi.fn().mockResolvedValue(0), upsert: vi.fn(), deleteMany: vi.fn(),
    createMany: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn(),
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
    participantId: "pp-1", invoiceNumber: "INV-001", status: "DRAFT",
    issuedAt: null, dueAt: null, subtotalCents: 14000, taxCents: 0,
    totalCents: 14000, paidCents: 0, notes: null,
    createdAt: new Date(), updatedAt: new Date(),
    lineItems: [{
      id: "li-1", invoiceId: "inv-1", appointmentId: null, serviceCodeId: "sc-1",
      description: "Psychotherapy, 45 min", unitPriceCents: 14000, quantity: 1, totalCents: 14000,
      serviceCode: { id: "sc-1", code: "90834", description: "Psychotherapy, 45 min" },
      appointment: null,
    }],
    payments: [],
    participant: { id: "pp-1", user: { firstName: "Jane", lastName: "Doe", email: "jane@test.com" } },
    clinician: { id: "test-clinician-profile-id", user: { firstName: "Dr.", lastName: "Smith" } },
    ...overrides,
  };
}

function own() {
  mdb.practiceMembership.findFirst.mockResolvedValue({ practiceId: "practice-1", role: "OWNER" });
}
function clin() {
  mdb.practiceMembership.findFirst.mockResolvedValue({ practiceId: "practice-1", role: "CLINICIAN" });
}

describe("Invoice Routes", () => {
  describe("POST /api/invoices", () => {
    it("creates a draft invoice with line items", async () => {
      own();
      mdb.participantProfile.findUnique.mockResolvedValue({ id: "pp-1" });
      mdb.serviceCode.findFirst.mockResolvedValue({
        id: "sc-1", practiceId: "practice-1", description: "Psychotherapy, 45 min", defaultPriceCents: 14000,
      });
      mdb.invoice.findFirst.mockResolvedValue(null);
      mdb.invoice.create.mockResolvedValue(mockInvoice());

      const res = await request(app).post("/api/invoices").set(...authHeader())
        .send({ participantId: "pp-1", lineItems: [{ serviceCodeId: "sc-1" }] });
      expect(res.status).toBe(201);
      expect(res.body.data.invoiceNumber).toBe("INV-001");
    });

    it("returns 400 for empty line items", async () => {
      own();
      const res = await request(app).post("/api/invoices").set(...authHeader())
        .send({ participantId: "pp-1", lineItems: [] });
      expect(res.status).toBe(400);
    });

    it("returns 400 for missing participantId", async () => {
      own();
      const res = await request(app).post("/api/invoices").set(...authHeader())
        .send({ lineItems: [{ serviceCodeId: "sc-1" }] });
      expect(res.status).toBe(400);
    });

    it("returns 404 for cross-practice service code", async () => {
      own();
      mdb.participantProfile.findUnique.mockResolvedValue({ id: "pp-1" });
      mdb.serviceCode.findFirst.mockResolvedValue(null);
      const res = await request(app).post("/api/invoices").set(...authHeader())
        .send({ participantId: "pp-1", lineItems: [{ serviceCodeId: "sc-other" }] });
      expect(res.status).toBe(404);
    });

    it("returns 404 for cross-practice participant", async () => {
      own();
      mdb.participantProfile.findUnique.mockResolvedValue(null);
      const res = await request(app).post("/api/invoices").set(...authHeader())
        .send({ participantId: "pp-other", lineItems: [{ serviceCodeId: "sc-1" }] });
      expect(res.status).toBe(404);
    });

    it("returns 401 without auth token", async () => {
      const res = await request(app).post("/api/invoices")
        .send({ participantId: "pp-1", lineItems: [{ serviceCodeId: "sc-1" }] });
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/invoices", () => {
    it("lists invoices", async () => {
      own();
      mdb.invoice.findMany.mockResolvedValue([mockInvoice(), mockInvoice({ id: "inv-2" })]);
      const res = await request(app).get("/api/invoices").set(...authHeader());
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it("filters by status", async () => {
      own();
      mdb.invoice.findMany.mockResolvedValue([mockInvoice({ status: "SENT" })]);
      const res = await request(app).get("/api/invoices?status=SENT").set(...authHeader());
      expect(res.status).toBe(200);
    });

    it("non-owner sees only own invoices", async () => {
      clin();
      mdb.invoice.findMany.mockResolvedValue([]);
      const res = await request(app).get("/api/invoices").set(...authHeader());
      expect(res.status).toBe(200);
      const call = mdb.invoice.findMany.mock.calls.at(-1)[0];
      expect(call.where.clinicianId).toBe("test-clinician-profile-id");
    });

    it("owner sees all practice invoices", async () => {
      own();
      mdb.invoice.findMany.mockResolvedValue([]);
      const res = await request(app).get("/api/invoices").set(...authHeader());
      expect(res.status).toBe(200);
      const call = mdb.invoice.findMany.mock.calls.at(-1)[0];
      expect(call.where.clinicianId).toBeUndefined();
    });
  });

  describe("GET /api/invoices/:id", () => {
    it("returns invoice with line items", async () => {
      own();
      mdb.invoice.findFirst.mockResolvedValue(mockInvoice());
      const res = await request(app).get("/api/invoices/inv-1").set(...authHeader());
      expect(res.status).toBe(200);
      expect(res.body.data.lineItems).toHaveLength(1);
    });

    it("returns 404 for cross-practice invoice", async () => {
      own();
      mdb.invoice.findFirst.mockResolvedValue(null);
      const res = await request(app).get("/api/invoices/inv-x").set(...authHeader());
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/invoices/:id", () => {
    it("updates draft invoice notes", async () => {
      own();
      mdb.invoice.findFirst.mockResolvedValue(mockInvoice());
      mdb.invoice.update.mockResolvedValue(mockInvoice({ notes: "Updated" }));
      const res = await request(app).patch("/api/invoices/inv-1").set(...authHeader())
        .send({ notes: "Updated" });
      expect(res.status).toBe(200);
      expect(res.body.data.notes).toBe("Updated");
    });

    it("returns 409 for non-draft", async () => {
      own();
      mdb.invoice.findFirst.mockResolvedValue(mockInvoice({ status: "SENT" }));
      const res = await request(app).patch("/api/invoices/inv-1").set(...authHeader())
        .send({ notes: "x" });
      expect(res.status).toBe(409);
    });
  });

  describe("POST /api/invoices/:id/send", () => {
    it("transitions DRAFT to SENT", async () => {
      own();
      mdb.invoice.findFirst.mockResolvedValue(mockInvoice());
      mdb.invoice.update.mockResolvedValue(mockInvoice({ status: "SENT", issuedAt: new Date() }));
      const res = await request(app).post("/api/invoices/inv-1/send").set(...authHeader());
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("SENT");
    });

    it("rejects non-draft", async () => {
      own();
      mdb.invoice.findFirst.mockResolvedValue(mockInvoice({ status: "SENT" }));
      const res = await request(app).post("/api/invoices/inv-1/send").set(...authHeader());
      expect(res.status).toBe(409);
    });
  });

  describe("POST /api/invoices/:id/void", () => {
    it("transitions to VOID", async () => {
      own();
      mdb.invoice.findFirst.mockResolvedValue(mockInvoice({ status: "SENT" }));
      mdb.invoice.update.mockResolvedValue(mockInvoice({ status: "VOID" }));
      mdb.auditLog.create.mockResolvedValue({});
      const res = await request(app).post("/api/invoices/inv-1/void").set(...authHeader());
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("VOID");
    });

    it("rejects already void", async () => {
      own();
      mdb.invoice.findFirst.mockResolvedValue(mockInvoice({ status: "VOID" }));
      const res = await request(app).post("/api/invoices/inv-1/void").set(...authHeader());
      expect(res.status).toBe(409);
    });
  });

  describe("DELETE /api/invoices/:id", () => {
    it("deletes draft", async () => {
      own();
      mdb.invoice.findFirst.mockResolvedValue(mockInvoice());
      mdb.invoice.delete.mockResolvedValue({});
      const res = await request(app).delete("/api/invoices/inv-1").set(...authHeader());
      expect(res.status).toBe(204);
    });

    it("rejects non-draft", async () => {
      own();
      mdb.invoice.findFirst.mockResolvedValue(mockInvoice({ status: "SENT" }));
      const res = await request(app).delete("/api/invoices/inv-1").set(...authHeader());
      expect(res.status).toBe(409);
    });
  });

  describe("POST /api/invoices/from-appointment/:appointmentId", () => {
    it("creates from attended appointment", async () => {
      own();
      mdb.appointment.findFirst.mockResolvedValue({
        id: "appt-1", practiceId: "practice-1", clinicianId: "test-clinician-profile-id",
        participantId: "pp-1", serviceCodeId: "sc-1", status: "ATTENDED",
        serviceCode: { id: "sc-1", description: "Psychotherapy, 45 min", defaultPriceCents: 14000 },
      });
      mdb.invoiceLineItem.findFirst.mockResolvedValue(null);
      mdb.participantProfile.findUnique.mockResolvedValue({ id: "pp-1" });
      mdb.serviceCode.findFirst.mockResolvedValue({
        id: "sc-1", practiceId: "practice-1", description: "Psychotherapy, 45 min", defaultPriceCents: 14000,
      });
      mdb.invoice.findFirst.mockResolvedValue(null);
      mdb.invoice.create.mockResolvedValue(mockInvoice());

      const res = await request(app).post("/api/invoices/from-appointment/appt-1").set(...authHeader());
      expect(res.status).toBe(201);
    });

    it("rejects non-attended", async () => {
      own();
      mdb.appointment.findFirst.mockResolvedValue({
        id: "appt-1", practiceId: "practice-1", clinicianId: "test-clinician-profile-id",
        status: "SCHEDULED", serviceCode: { id: "sc-1" },
      });
      const res = await request(app).post("/api/invoices/from-appointment/appt-1").set(...authHeader());
      expect(res.status).toBe(409);
    });

    it("returns 404 for missing appointment", async () => {
      own();
      mdb.appointment.findFirst.mockResolvedValue(null);
      const res = await request(app).post("/api/invoices/from-appointment/x").set(...authHeader());
      expect(res.status).toBe(404);
    });
  });
});
