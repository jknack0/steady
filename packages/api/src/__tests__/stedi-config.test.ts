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
  testConnection: vi.fn().mockResolvedValue(true),
  searchPayers: vi.fn().mockResolvedValue([]),
  isStediError: vi.fn().mockReturnValue(false),
}));

const { default: app } = await import("../app");

// ── Helpers ──────────────────────────────────────────

function own() {
  mdb.practiceMembership.findFirst.mockResolvedValue({ practiceId: "practice-1", role: "OWNER" });
}
function clin() {
  mdb.practiceMembership.findFirst.mockResolvedValue({ practiceId: "practice-1", role: "CLINICIAN" });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Stedi Config Routes", () => {
  // ── GET /api/config/stedi ───────────────────────────

  describe("GET /api/config/stedi", () => {
    it("returns configured status with key last four digits", async () => {
      own();
      mdb.practice.findUnique.mockResolvedValue({
        id: "practice-1",
        stediApiKeyEncrypted: "encrypted-key-data",
        stediApiKeyLastFour: "ab12",
      });

      const res = await request(app)
        .get("/api/config/stedi")
        .set(...authHeader());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.configured).toBe(true);
      expect(res.body.data.keyLastFour).toBe("ab12");
    });

    it("returns configured=false when no key is set", async () => {
      own();
      mdb.practice.findUnique.mockResolvedValue({
        id: "practice-1",
        stediApiKeyEncrypted: null,
        stediApiKeyLastFour: null,
      });

      const res = await request(app)
        .get("/api/config/stedi")
        .set(...authHeader());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.configured).toBe(false);
      expect(res.body.data.keyLastFour).toBeNull();
    });

    it("non-owner clinician can view config status", async () => {
      clin();
      mdb.practice.findUnique.mockResolvedValue({
        id: "practice-1",
        stediApiKeyEncrypted: "encrypted-key-data",
        stediApiKeyLastFour: "ab12",
      });

      const res = await request(app)
        .get("/api/config/stedi")
        .set(...authHeader());

      expect(res.status).toBe(200);
      expect(res.body.data.configured).toBe(true);
    });

    it("never returns the full API key", async () => {
      own();
      mdb.practice.findUnique.mockResolvedValue({
        id: "practice-1",
        stediApiKeyEncrypted: "encrypted-key-data",
        stediApiKeyLastFour: "ab12",
      });

      const res = await request(app)
        .get("/api/config/stedi")
        .set(...authHeader());

      expect(res.status).toBe(200);
      expect(res.body.data).not.toHaveProperty("stediApiKeyEncrypted");
      expect(res.body.data).not.toHaveProperty("apiKey");
      expect(res.body.data).not.toHaveProperty("key");
    });

    it("returns 401 without auth", async () => {
      const res = await request(app).get("/api/config/stedi");
      expect(res.status).toBe(401);
    });

    it("returns 403 for participant role", async () => {
      const res = await request(app)
        .get("/api/config/stedi")
        .set(...participantAuthHeader());
      expect(res.status).toBe(403);
    });
  });

  // ── PUT /api/config/stedi ───────────────────────────

  describe("PUT /api/config/stedi", () => {
    it("owner can store an encrypted API key", async () => {
      own();
      mdb.practice.update.mockResolvedValue({
        id: "practice-1",
        stediApiKeyEncrypted: "encrypted-new-key",
        stediApiKeyLastFour: "yz89",
      });

      const res = await request(app)
        .put("/api/config/stedi")
        .set(...authHeader())
        .send({ apiKey: "stedi_live_abcdefghijklmnopqrstuvwxyz89" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.configured).toBe(true);
      expect(res.body.data.keyLastFour).toBe("yz89");
    });

    it("returns 403 for non-owner clinician", async () => {
      clin();

      const res = await request(app)
        .put("/api/config/stedi")
        .set(...authHeader())
        .send({ apiKey: "stedi_live_somekey1234" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("returns 400 for missing apiKey", async () => {
      own();

      const res = await request(app)
        .put("/api/config/stedi")
        .set(...authHeader())
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 400 for empty apiKey", async () => {
      own();

      const res = await request(app)
        .put("/api/config/stedi")
        .set(...authHeader())
        .send({ apiKey: "" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 401 without auth", async () => {
      const res = await request(app)
        .put("/api/config/stedi")
        .send({ apiKey: "stedi_live_somekey1234" });

      expect(res.status).toBe(401);
    });

    it("returns 403 for participant role", async () => {
      const res = await request(app)
        .put("/api/config/stedi")
        .set(...participantAuthHeader())
        .send({ apiKey: "stedi_live_somekey1234" });

      expect(res.status).toBe(403);
    });

    it("does not return the full key in the response", async () => {
      own();
      mdb.practice.update.mockResolvedValue({
        id: "practice-1",
        stediApiKeyEncrypted: "encrypted-new-key",
        stediApiKeyLastFour: "yz89",
      });

      const res = await request(app)
        .put("/api/config/stedi")
        .set(...authHeader())
        .send({ apiKey: "stedi_live_abcdefghijklmnopqrstuvwxyz89" });

      expect(res.status).toBe(200);
      expect(res.body.data).not.toHaveProperty("apiKey");
      expect(res.body.data).not.toHaveProperty("stediApiKeyEncrypted");
    });
  });

  // ── POST /api/config/stedi/test ─────────────────────

  describe("POST /api/config/stedi/test", () => {
    it("returns success when key is valid", async () => {
      own();
      mdb.practice.findUnique.mockResolvedValue({
        id: "practice-1",
        stediApiKeyEncrypted: "encrypted-key-data",
        stediApiKeyLastFour: "ab12",
      });
      // The service should decrypt the key and test it against Stedi API

      const res = await request(app)
        .post("/api/config/stedi/test")
        .set(...authHeader());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("valid");
    });

    it("returns 404 when no key is configured", async () => {
      own();
      mdb.practice.findUnique.mockResolvedValue({
        id: "practice-1",
        stediApiKeyEncrypted: null,
        stediApiKeyLastFour: null,
      });

      const res = await request(app)
        .post("/api/config/stedi/test")
        .set(...authHeader());

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/configured/i);
    });

    it("non-owner clinician can test the key", async () => {
      clin();
      mdb.practice.findUnique.mockResolvedValue({
        id: "practice-1",
        stediApiKeyEncrypted: "encrypted-key-data",
        stediApiKeyLastFour: "ab12",
      });

      const res = await request(app)
        .post("/api/config/stedi/test")
        .set(...authHeader());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns 401 without auth", async () => {
      const res = await request(app).post("/api/config/stedi/test");
      expect(res.status).toBe(401);
    });

    it("returns 403 for participant role", async () => {
      const res = await request(app)
        .post("/api/config/stedi/test")
        .set(...participantAuthHeader());
      expect(res.status).toBe(403);
    });
  });
});
