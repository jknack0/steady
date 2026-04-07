import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { authHeader, participantAuthHeader } from "./helpers";

// Comprehensive mock that satisfies all modules loaded by app.ts
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
    recurringSeries: m(), appointmentReminder: m(),
    // New insurance billing models
    patientInsurance: m(),
    insuranceClaim: m(),
    claimStatusHistory: m(),
    diagnosisCode: m(),
  };
});

vi.mock("@steady/db", () => ({
  prisma: mdb,
  PrismaClient: vi.fn(),
  runWithAuditUser: vi.fn((_u: any, fn: any) => fn()),
  getAuditUserId: vi.fn().mockReturnValue(null),
}));

const { default: app } = await import("../app");

// ── Helpers ──────────────────────────────────────────

function mockInsurance(overrides: Record<string, any> = {}) {
  return {
    id: "ins-1", participantId: "pp-1", payerId: "PAYER001", payerName: "Aetna",
    subscriberId: "SUB123", groupNumber: "GRP456", relationshipToSubscriber: "SELF",
    policyHolderFirstName: null, policyHolderLastName: null, policyHolderDob: null,
    policyHolderGender: null, isActive: true, cachedEligibility: null,
    eligibilityCheckedAt: null, createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
}

function own() {
  mdb.practiceMembership.findFirst.mockResolvedValue({ practiceId: "practice-1", role: "OWNER" });
}
function clin() {
  mdb.practiceMembership.findFirst.mockResolvedValue({ practiceId: "practice-1", role: "CLINICIAN" });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── PUT /api/insurance/:participantId ─────────────────

describe("Insurance Routes", () => {
  describe("PUT /api/insurance/:participantId", () => {
    it("creates insurance for a participant owned by clinician", async () => {
      clin();
      mdb.clinicianClient.findFirst.mockResolvedValue({ clinicianId: "test-clinician-profile-id", participantId: "pp-1" });
      mdb.patientInsurance.upsert.mockResolvedValue(mockInsurance());

      const res = await request(app)
        .put("/api/insurance/pp-1")
        .set(...authHeader())
        .send({
          payerId: "PAYER001",
          payerName: "Aetna",
          subscriberId: "SUB123",
          groupNumber: "GRP456",
          relationshipToSubscriber: "SELF",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payerId).toBe("PAYER001");
      expect(res.body.data.payerName).toBe("Aetna");
    });

    it("updates existing insurance for a participant", async () => {
      clin();
      mdb.clinicianClient.findFirst.mockResolvedValue({ clinicianId: "test-clinician-profile-id", participantId: "pp-1" });
      mdb.patientInsurance.upsert.mockResolvedValue(mockInsurance({ payerName: "Blue Cross" }));

      const res = await request(app)
        .put("/api/insurance/pp-1")
        .set(...authHeader())
        .send({
          payerId: "PAYER002",
          payerName: "Blue Cross",
          subscriberId: "SUB999",
          relationshipToSubscriber: "SELF",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.payerName).toBe("Blue Cross");
    });

    it("requires policyHolder fields when relationship is SPOUSE", async () => {
      clin();
      mdb.clinicianClient.findFirst.mockResolvedValue({ clinicianId: "test-clinician-profile-id", participantId: "pp-1" });

      const res = await request(app)
        .put("/api/insurance/pp-1")
        .set(...authHeader())
        .send({
          payerId: "PAYER001",
          payerName: "Aetna",
          subscriberId: "SUB123",
          relationshipToSubscriber: "SPOUSE",
          // Missing policyHolderFirstName, policyHolderLastName, policyHolderDob
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("accepts policyHolder fields when relationship is SPOUSE", async () => {
      clin();
      mdb.clinicianClient.findFirst.mockResolvedValue({ clinicianId: "test-clinician-profile-id", participantId: "pp-1" });
      mdb.patientInsurance.upsert.mockResolvedValue(
        mockInsurance({
          relationshipToSubscriber: "SPOUSE",
          policyHolderFirstName: "John",
          policyHolderLastName: "Doe",
          policyHolderDob: "1980-01-15",
        })
      );

      const res = await request(app)
        .put("/api/insurance/pp-1")
        .set(...authHeader())
        .send({
          payerId: "PAYER001",
          payerName: "Aetna",
          subscriberId: "SUB123",
          relationshipToSubscriber: "SPOUSE",
          policyHolderFirstName: "John",
          policyHolderLastName: "Doe",
          policyHolderDob: "1980-01-15",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.relationshipToSubscriber).toBe("SPOUSE");
      expect(res.body.data.policyHolderFirstName).toBe("John");
    });

    it("requires policyHolder fields when relationship is CHILD", async () => {
      clin();
      mdb.clinicianClient.findFirst.mockResolvedValue({ clinicianId: "test-clinician-profile-id", participantId: "pp-1" });

      const res = await request(app)
        .put("/api/insurance/pp-1")
        .set(...authHeader())
        .send({
          payerId: "PAYER001",
          payerName: "Aetna",
          subscriberId: "SUB123",
          relationshipToSubscriber: "CHILD",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 401 without auth", async () => {
      const res = await request(app)
        .put("/api/insurance/pp-1")
        .send({ payerId: "PAYER001", payerName: "Aetna", subscriberId: "SUB123", relationshipToSubscriber: "SELF" });

      expect(res.status).toBe(401);
    });

    it("returns 403 for participant role", async () => {
      const res = await request(app)
        .put("/api/insurance/pp-1")
        .set(...participantAuthHeader())
        .send({ payerId: "PAYER001", payerName: "Aetna", subscriberId: "SUB123", relationshipToSubscriber: "SELF" });

      expect(res.status).toBe(403);
    });

    it("returns 404 when clinician does not own participant", async () => {
      clin();
      mdb.clinicianClient.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .put("/api/insurance/pp-1")
        .set(...authHeader())
        .send({
          payerId: "PAYER001",
          payerName: "Aetna",
          subscriberId: "SUB123",
          relationshipToSubscriber: "SELF",
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("returns 400 for missing payerId", async () => {
      clin();
      mdb.clinicianClient.findFirst.mockResolvedValue({ clinicianId: "test-clinician-profile-id", participantId: "pp-1" });

      const res = await request(app)
        .put("/api/insurance/pp-1")
        .set(...authHeader())
        .send({
          payerName: "Aetna",
          subscriberId: "SUB123",
          relationshipToSubscriber: "SELF",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 400 for missing payerName", async () => {
      clin();
      mdb.clinicianClient.findFirst.mockResolvedValue({ clinicianId: "test-clinician-profile-id", participantId: "pp-1" });

      const res = await request(app)
        .put("/api/insurance/pp-1")
        .set(...authHeader())
        .send({
          payerId: "PAYER001",
          subscriberId: "SUB123",
          relationshipToSubscriber: "SELF",
        });

      expect(res.status).toBe(400);
    });

    it("returns 400 for missing subscriberId", async () => {
      clin();
      mdb.clinicianClient.findFirst.mockResolvedValue({ clinicianId: "test-clinician-profile-id", participantId: "pp-1" });

      const res = await request(app)
        .put("/api/insurance/pp-1")
        .set(...authHeader())
        .send({
          payerId: "PAYER001",
          payerName: "Aetna",
          relationshipToSubscriber: "SELF",
        });

      expect(res.status).toBe(400);
    });

    it("returns 400 for missing relationshipToSubscriber", async () => {
      clin();
      mdb.clinicianClient.findFirst.mockResolvedValue({ clinicianId: "test-clinician-profile-id", participantId: "pp-1" });

      const res = await request(app)
        .put("/api/insurance/pp-1")
        .set(...authHeader())
        .send({
          payerId: "PAYER001",
          payerName: "Aetna",
          subscriberId: "SUB123",
        });

      expect(res.status).toBe(400);
    });
  });

  // ── GET /api/insurance/:participantId ─────────────────

  describe("GET /api/insurance/:participantId", () => {
    it("returns insurance for a participant", async () => {
      clin();
      mdb.clinicianClient.findFirst.mockResolvedValue({ clinicianId: "test-clinician-profile-id", participantId: "pp-1" });
      mdb.patientInsurance.findFirst.mockResolvedValue(mockInsurance());

      const res = await request(app)
        .get("/api/insurance/pp-1")
        .set(...authHeader());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payerId).toBe("PAYER001");
    });

    it("returns null when participant has no insurance", async () => {
      clin();
      mdb.clinicianClient.findFirst.mockResolvedValue({ clinicianId: "test-clinician-profile-id", participantId: "pp-1" });
      mdb.patientInsurance.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get("/api/insurance/pp-1")
        .set(...authHeader());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();
    });

    it("returns 401 without auth", async () => {
      const res = await request(app).get("/api/insurance/pp-1");
      expect(res.status).toBe(401);
    });

    it("returns 403 for participant role", async () => {
      const res = await request(app)
        .get("/api/insurance/pp-1")
        .set(...participantAuthHeader());
      expect(res.status).toBe(403);
    });

    it("returns 404 when clinician does not own participant", async () => {
      clin();
      mdb.clinicianClient.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get("/api/insurance/pp-1")
        .set(...authHeader());

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ── DELETE /api/insurance/:participantId ───────────────

  describe("DELETE /api/insurance/:participantId", () => {
    it("soft deletes insurance (sets isActive=false)", async () => {
      clin();
      mdb.clinicianClient.findFirst.mockResolvedValue({ clinicianId: "test-clinician-profile-id", participantId: "pp-1" });
      mdb.patientInsurance.findFirst.mockResolvedValue(mockInsurance());
      mdb.patientInsurance.update.mockResolvedValue(mockInsurance({ isActive: false }));

      const res = await request(app)
        .delete("/api/insurance/pp-1")
        .set(...authHeader());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mdb.patientInsurance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false }),
        })
      );
    });

    it("returns 404 when no active insurance exists", async () => {
      clin();
      mdb.clinicianClient.findFirst.mockResolvedValue({ clinicianId: "test-clinician-profile-id", participantId: "pp-1" });
      mdb.patientInsurance.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .delete("/api/insurance/pp-1")
        .set(...authHeader());

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("returns 401 without auth", async () => {
      const res = await request(app).delete("/api/insurance/pp-1");
      expect(res.status).toBe(401);
    });

    it("returns 404 when clinician does not own participant", async () => {
      clin();
      mdb.clinicianClient.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .delete("/api/insurance/pp-1")
        .set(...authHeader());

      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/insurance/:participantId/eligibility ────

  describe("POST /api/insurance/:participantId/eligibility", () => {
    it("returns cached eligibility when fresh (< 24h)", async () => {
      clin();
      mdb.clinicianClient.findFirst.mockResolvedValue({ clinicianId: "test-clinician-profile-id", participantId: "pp-1" });
      mdb.patientInsurance.findFirst.mockResolvedValue(
        mockInsurance({
          cachedEligibility: { coverageActive: true, copayAmountCents: 2500, coinsurancePercent: 20 },
          eligibilityCheckedAt: new Date(), // fresh — within 24h
        })
      );

      const res = await request(app)
        .post("/api/insurance/pp-1/eligibility")
        .set(...authHeader());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cachedEligibility).toBeDefined();
      expect(res.body.data.eligibilityCheckedAt).toBeDefined();
    });

    it("returns 404 when no active insurance exists", async () => {
      clin();
      mdb.clinicianClient.findFirst.mockResolvedValue({ clinicianId: "test-clinician-profile-id", participantId: "pp-1" });
      mdb.patientInsurance.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/insurance/pp-1/eligibility")
        .set(...authHeader());

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("returns 401 without auth", async () => {
      const res = await request(app).post("/api/insurance/pp-1/eligibility");
      expect(res.status).toBe(401);
    });

    it("returns 404 when clinician does not own participant", async () => {
      clin();
      mdb.clinicianClient.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/insurance/pp-1/eligibility")
        .set(...authHeader());

      expect(res.status).toBe(404);
    });
  });
});
