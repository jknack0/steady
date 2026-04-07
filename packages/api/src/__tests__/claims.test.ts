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
  encryptField: vi.fn((v: string) => `encrypted:${v}`),
  decryptField: vi.fn((v: string) => v),
}));

vi.mock("../services/stedi-client", () => ({
  checkClaimStatus: vi.fn().mockResolvedValue({ status: "PAID" }),
  isStediError: vi.fn().mockReturnValue(false),
}));

vi.mock("../services/stedi-config", () => ({
  getEncryptedKey: vi.fn().mockResolvedValue("mock-encrypted-key"),
  getStediConfig: vi.fn().mockResolvedValue({ configured: true, keyLastFour: "ab12" }),
  setStediKey: vi.fn(),
  testStediConnection: vi.fn(),
}));

const { default: app } = await import("../app");

// ── Helpers ──────────────────────────────────────────

function mockClaim(overrides: Record<string, any> = {}) {
  return {
    id: "claim-1", practiceId: "practice-1", clinicianId: "test-clinician-profile-id",
    participantId: "pp-1", appointmentId: "appt-1", patientInsuranceId: "ins-1",
    status: "DRAFT", stediTransactionId: null, stediIdempotencyKey: "idem-1",
    serviceCode: "90834", servicePriceCents: 14000, placeOfServiceCode: "02",
    dateOfService: new Date("2026-04-01"), diagnosisCodes: ["F90.0"],
    submittedAt: null, respondedAt: null, rejectionReason: null,
    retentionExpiresAt: new Date("2033-04-01"), retryCount: 0,
    createdAt: new Date(), updatedAt: new Date(),
    statusHistory: [], participant: { id: "pp-1", user: { firstName: "Jane", lastName: "Doe" } },
    patientInsurance: { payerName: "Aetna" },
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

// ── POST /api/claims ────────────────────────────────

describe("Claim Routes", () => {
  describe("POST /api/claims", () => {
    it("creates a claim for an attended appointment with insurance", async () => {
      clin();
      mdb.appointment.findUnique.mockResolvedValue({
        id: "appt-1", practiceId: "practice-1", clinicianId: "test-clinician-profile-id",
        participantId: "pp-1", status: "ATTENDED",
        serviceCode: { code: "90834", defaultPriceCents: 14000 },
        location: { type: "TELEHEALTH" },
      });
      mdb.patientInsurance.findFirst.mockResolvedValue({
        id: "ins-1", participantId: "pp-1", isActive: true, payerId: "PAYER001",
      });
      mdb.insuranceClaim.findFirst.mockResolvedValue(null); // no existing claim
      mdb.insuranceClaim.create.mockResolvedValue(mockClaim());

      const res = await request(app)
        .post("/api/claims")
        .set(...authHeader())
        .send({
          appointmentId: "appt-1",
          diagnosisCodes: ["F90.0"],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("DRAFT");
      expect(res.body.data.appointmentId).toBe("appt-1");
    });

    it("returns 400 for missing appointmentId", async () => {
      clin();
      const res = await request(app)
        .post("/api/claims")
        .set(...authHeader())
        .send({ diagnosisCodes: ["F90.0"] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 400 for missing diagnosisCodes", async () => {
      clin();
      const res = await request(app)
        .post("/api/claims")
        .set(...authHeader())
        .send({ appointmentId: "appt-1" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 400 for empty diagnosisCodes array", async () => {
      clin();
      const res = await request(app)
        .post("/api/claims")
        .set(...authHeader())
        .send({ appointmentId: "appt-1", diagnosisCodes: [] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 409 when appointment is not ATTENDED", async () => {
      clin();
      mdb.appointment.findUnique.mockResolvedValue({
        id: "appt-1", practiceId: "practice-1", clinicianId: "test-clinician-profile-id",
        participantId: "pp-1", status: "SCHEDULED",
        serviceCode: { code: "90834", defaultPriceCents: 14000 },
      });

      const res = await request(app)
        .post("/api/claims")
        .set(...authHeader())
        .send({ appointmentId: "appt-1", diagnosisCodes: ["F90.0"] });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/attended/i);
    });

    it("returns 404 when participant has no active insurance", async () => {
      clin();
      mdb.appointment.findUnique.mockResolvedValue({
        id: "appt-1", practiceId: "practice-1", clinicianId: "test-clinician-profile-id",
        participantId: "pp-1", status: "ATTENDED",
        serviceCode: { code: "90834", defaultPriceCents: 14000 },
      });
      mdb.patientInsurance.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/claims")
        .set(...authHeader())
        .send({ appointmentId: "appt-1", diagnosisCodes: ["F90.0"] });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/insurance/i);
    });

    it("returns 409 when a claim already exists for the appointment", async () => {
      clin();
      mdb.appointment.findUnique.mockResolvedValue({
        id: "appt-1", practiceId: "practice-1", clinicianId: "test-clinician-profile-id",
        participantId: "pp-1", status: "ATTENDED",
        serviceCode: { code: "90834", defaultPriceCents: 14000 },
      });
      mdb.patientInsurance.findFirst.mockResolvedValue({ id: "ins-1", isActive: true });
      mdb.insuranceClaim.findFirst.mockResolvedValue(mockClaim()); // existing claim

      const res = await request(app)
        .post("/api/claims")
        .set(...authHeader())
        .send({ appointmentId: "appt-1", diagnosisCodes: ["F90.0"] });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/claim.*exists/i);
    });

    it("returns 404 for nonexistent appointment", async () => {
      clin();
      mdb.appointment.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/claims")
        .set(...authHeader())
        .send({ appointmentId: "bad-id", diagnosisCodes: ["F90.0"] });

      expect(res.status).toBe(404);
    });

    it("returns 401 without auth", async () => {
      const res = await request(app)
        .post("/api/claims")
        .send({ appointmentId: "appt-1", diagnosisCodes: ["F90.0"] });

      expect(res.status).toBe(401);
    });

    it("returns 403 for participant role", async () => {
      const res = await request(app)
        .post("/api/claims")
        .set(...participantAuthHeader())
        .send({ appointmentId: "appt-1", diagnosisCodes: ["F90.0"] });

      expect(res.status).toBe(403);
    });
  });

  // ── GET /api/claims ─────────────────────────────────

  describe("GET /api/claims", () => {
    it("returns paginated claims for clinician", async () => {
      clin();
      const claims = [mockClaim(), mockClaim({ id: "claim-2" })];
      mdb.insuranceClaim.findMany.mockResolvedValue(claims);

      const res = await request(app)
        .get("/api/claims")
        .set(...authHeader());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.cursor).toBeNull();
    });

    it("returns cursor when there are more results", async () => {
      clin();
      const claims = Array.from({ length: 51 }, (_, i) =>
        mockClaim({ id: `claim-${i}` })
      );
      mdb.insuranceClaim.findMany.mockResolvedValue(claims);

      const res = await request(app)
        .get("/api/claims?limit=50")
        .set(...authHeader());

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(50);
      expect(res.body.cursor).toBe("claim-49");
    });

    it("filters by status", async () => {
      clin();
      mdb.insuranceClaim.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get("/api/claims?status=SUBMITTED")
        .set(...authHeader());

      expect(res.status).toBe(200);
      expect(mdb.insuranceClaim.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "SUBMITTED" }),
        })
      );
    });

    it("owner sees all practice claims", async () => {
      own();
      mdb.insuranceClaim.findMany.mockResolvedValue([
        mockClaim(),
        mockClaim({ id: "claim-2", clinicianId: "other-clinician-id" }),
      ]);

      const res = await request(app)
        .get("/api/claims")
        .set(...authHeader());

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      // Owner query should scope by practiceId, not clinicianId
      expect(mdb.insuranceClaim.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ practiceId: "practice-1" }),
        })
      );
    });

    it("non-owner sees only own patients claims", async () => {
      clin();
      mdb.insuranceClaim.findMany.mockResolvedValue([mockClaim()]);

      const res = await request(app)
        .get("/api/claims")
        .set(...authHeader());

      expect(res.status).toBe(200);
      // Non-owner query should scope by clinicianId
      expect(mdb.insuranceClaim.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clinicianId: "test-clinician-profile-id" }),
        })
      );
    });

    it("returns 401 without auth", async () => {
      const res = await request(app).get("/api/claims");
      expect(res.status).toBe(401);
    });

    it("returns 403 for participant role", async () => {
      const res = await request(app)
        .get("/api/claims")
        .set(...participantAuthHeader());
      expect(res.status).toBe(403);
    });
  });

  // ── GET /api/claims/:id ───────────────────────────────

  describe("GET /api/claims/:id", () => {
    it("returns claim detail with statusHistory", async () => {
      clin();
      const claim = mockClaim({
        statusHistory: [
          { id: "sh-1", status: "DRAFT", timestamp: new Date("2026-04-01"), detail: null },
          { id: "sh-2", status: "SUBMITTED", timestamp: new Date("2026-04-02"), detail: null },
        ],
      });
      mdb.insuranceClaim.findFirst.mockResolvedValue(claim);

      const res = await request(app)
        .get("/api/claims/claim-1")
        .set(...authHeader());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe("claim-1");
      expect(res.body.data.statusHistory).toHaveLength(2);
    });

    it("returns 404 when claim not found", async () => {
      clin();
      mdb.insuranceClaim.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get("/api/claims/nonexistent")
        .set(...authHeader());

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("returns 404 for claim owned by different clinician (non-owner)", async () => {
      clin();
      // findFirst with ownership check returns null for wrong clinician
      mdb.insuranceClaim.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get("/api/claims/claim-other")
        .set(...authHeader());

      expect(res.status).toBe(404);
    });

    it("returns 401 without auth", async () => {
      const res = await request(app).get("/api/claims/claim-1");
      expect(res.status).toBe(401);
    });
  });

  // ── POST /api/claims/:id/refresh-status ───────────────

  describe("POST /api/claims/:id/refresh-status", () => {
    it("refreshes status for a SUBMITTED claim", async () => {
      clin();
      mdb.insuranceClaim.findFirst.mockResolvedValue(mockClaim({ status: "SUBMITTED", stediTransactionId: "txn-1" }));
      mdb.insuranceClaim.update.mockResolvedValue(mockClaim({ status: "PAID" }));
      mdb.claimStatusHistory.create.mockResolvedValue({});

      const res = await request(app)
        .post("/api/claims/claim-1/refresh-status")
        .set(...authHeader());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns 409 for a DRAFT claim (not yet submitted)", async () => {
      clin();
      mdb.insuranceClaim.findFirst.mockResolvedValue(mockClaim({ status: "DRAFT" }));

      const res = await request(app)
        .post("/api/claims/claim-1/refresh-status")
        .set(...authHeader());

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/submitted/i);
    });

    it("returns 409 for a PAID claim (terminal state)", async () => {
      clin();
      mdb.insuranceClaim.findFirst.mockResolvedValue(mockClaim({ status: "PAID" }));

      const res = await request(app)
        .post("/api/claims/claim-1/refresh-status")
        .set(...authHeader());

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("returns 409 for a DENIED claim (terminal state)", async () => {
      clin();
      mdb.insuranceClaim.findFirst.mockResolvedValue(mockClaim({ status: "DENIED" }));

      const res = await request(app)
        .post("/api/claims/claim-1/refresh-status")
        .set(...authHeader());

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("returns 404 when claim not found", async () => {
      clin();
      mdb.insuranceClaim.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/claims/nonexistent/refresh-status")
        .set(...authHeader());

      expect(res.status).toBe(404);
    });

    it("returns 401 without auth", async () => {
      const res = await request(app).post("/api/claims/claim-1/refresh-status");
      expect(res.status).toBe(401);
    });
  });

  // ── PUT /api/claims/:id/resubmit ─────────────────────

  describe("PUT /api/claims/:id/resubmit", () => {
    it("resubmits a REJECTED claim (resets to DRAFT)", async () => {
      clin();
      mdb.insuranceClaim.findFirst.mockResolvedValue(mockClaim({ status: "REJECTED", rejectionReason: "Invalid code" }));
      mdb.insuranceClaim.update.mockResolvedValue(mockClaim({ status: "DRAFT", rejectionReason: null }));
      mdb.claimStatusHistory.create.mockResolvedValue({});

      const res = await request(app)
        .put("/api/claims/claim-1/resubmit")
        .set(...authHeader());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("DRAFT");
    });

    it("returns 409 for a DRAFT claim (not rejected)", async () => {
      clin();
      mdb.insuranceClaim.findFirst.mockResolvedValue(mockClaim({ status: "DRAFT" }));

      const res = await request(app)
        .put("/api/claims/claim-1/resubmit")
        .set(...authHeader());

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("returns 409 for a PAID claim (cannot resubmit)", async () => {
      clin();
      mdb.insuranceClaim.findFirst.mockResolvedValue(mockClaim({ status: "PAID" }));

      const res = await request(app)
        .put("/api/claims/claim-1/resubmit")
        .set(...authHeader());

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("returns 409 for a SUBMITTED claim (cannot resubmit while in-flight)", async () => {
      clin();
      mdb.insuranceClaim.findFirst.mockResolvedValue(mockClaim({ status: "SUBMITTED" }));

      const res = await request(app)
        .put("/api/claims/claim-1/resubmit")
        .set(...authHeader());

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("returns 409 for a DENIED claim (terminal, cannot resubmit)", async () => {
      clin();
      mdb.insuranceClaim.findFirst.mockResolvedValue(mockClaim({ status: "DENIED" }));

      const res = await request(app)
        .put("/api/claims/claim-1/resubmit")
        .set(...authHeader());

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("returns 404 when claim not found", async () => {
      clin();
      mdb.insuranceClaim.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .put("/api/claims/nonexistent/resubmit")
        .set(...authHeader());

      expect(res.status).toBe(404);
    });

    it("returns 401 without auth", async () => {
      const res = await request(app).put("/api/claims/claim-1/resubmit");
      expect(res.status).toBe(401);
    });
  });

  // ── State Machine Guards ──────────────────────────────

  describe("Claim State Machine", () => {
    it("cannot transition PAID to DRAFT (via resubmit)", async () => {
      clin();
      mdb.insuranceClaim.findFirst.mockResolvedValue(mockClaim({ status: "PAID" }));

      const res = await request(app)
        .put("/api/claims/claim-1/resubmit")
        .set(...authHeader());

      expect(res.status).toBe(409);
    });

    it("cannot refresh status on DENIED (terminal)", async () => {
      clin();
      mdb.insuranceClaim.findFirst.mockResolvedValue(mockClaim({ status: "DENIED" }));

      const res = await request(app)
        .post("/api/claims/claim-1/refresh-status")
        .set(...authHeader());

      expect(res.status).toBe(409);
    });

    it("cannot refresh status on DRAFT (not submitted yet)", async () => {
      clin();
      mdb.insuranceClaim.findFirst.mockResolvedValue(mockClaim({ status: "DRAFT" }));

      const res = await request(app)
        .post("/api/claims/claim-1/refresh-status")
        .set(...authHeader());

      expect(res.status).toBe(409);
    });
  });
});
