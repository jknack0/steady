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

function own() {
  mdb.practiceMembership.findFirst.mockResolvedValue({ practiceId: "practice-1", role: "OWNER" });
}
function clin() {
  mdb.practiceMembership.findFirst.mockResolvedValue({ practiceId: "practice-1", role: "CLINICIAN" });
}

describe("Billing Summary Routes", () => {
  describe("GET /api/billing/summary", () => {
    it("returns summary with all fields", async () => {
      own();
      mdb.invoice.findMany.mockResolvedValue([
        { totalCents: 14000, paidCents: 5000 },
        { totalCents: 28000, paidCents: 0 },
      ]);
      mdb.payment.findMany.mockResolvedValue([
        { amountCents: 5000 }, { amountCents: 10000 },
      ]);
      mdb.invoice.count.mockResolvedValue(0);

      const res = await request(app).get("/api/billing/summary").set(...authHeader());
      expect(res.status).toBe(200);
      expect(res.body.data.totalOutstandingCents).toBe(37000);
      expect(res.body.data.totalReceivedThisMonthCents).toBe(15000);
    });

    it("scopes to clinician for non-owner", async () => {
      clin();
      mdb.invoice.findMany.mockResolvedValue([]);
      mdb.payment.findMany.mockResolvedValue([]);
      mdb.invoice.count.mockResolvedValue(0);

      const res = await request(app).get("/api/billing/summary").set(...authHeader());
      expect(res.status).toBe(200);
      const call = mdb.invoice.findMany.mock.calls.at(-1)[0];
      expect(call.where.clinicianId).toBe("test-clinician-profile-id");
    });

    it("returns zeros for new practice", async () => {
      own();
      mdb.invoice.findMany.mockResolvedValue([]);
      mdb.payment.findMany.mockResolvedValue([]);
      mdb.invoice.count.mockResolvedValue(0);

      const res = await request(app).get("/api/billing/summary").set(...authHeader());
      expect(res.status).toBe(200);
      expect(res.body.data.totalOutstandingCents).toBe(0);
    });

    it("returns 401 without auth", async () => {
      const res = await request(app).get("/api/billing/summary");
      expect(res.status).toBe(401);
    });
  });
});
