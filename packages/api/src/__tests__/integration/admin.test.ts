import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../app";
import { testPrisma, TEST_IDS, clinicianAuthHeader, participantAuthHeader } from "./setup";

// Admin auth helper
function adminAuthHeader(): [string, string] {
  const token = jwt.sign(
    {
      userId: "integ-admin-user",
      role: "ADMIN",
    },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );
  return ["Authorization", `Bearer ${token}`];
}

describe("Admin Routes (integration)", () => {
  beforeAll(async () => {
    // Create an admin user
    await testPrisma.user.create({
      data: {
        id: "integ-admin-user",
        email: "integ-admin@test.local",
        passwordHash: "$2b$10$fakehashfakehashfakehashfakehashfakehashfakehashfa",
        role: "ADMIN",
        firstName: "Test",
        lastName: "Admin",
      },
    });

    // Create some audit log entries
    await testPrisma.auditLog.createMany({
      data: [
        {
          userId: TEST_IDS.clinicianUserId,
          action: "CREATE",
          resourceType: "Program",
          resourceId: TEST_IDS.programId,
        },
        {
          userId: TEST_IDS.clinicianUserId,
          action: "UPDATE",
          resourceType: "Program",
          resourceId: TEST_IDS.programId,
        },
        {
          userId: TEST_IDS.participantUserId,
          action: "CREATE",
          resourceType: "JournalEntry",
          resourceId: "some-entry-id",
        },
      ],
    });
  });

  afterAll(async () => {
    await testPrisma.auditLog.deleteMany({
      where: { userId: { in: [TEST_IDS.clinicianUserId, TEST_IDS.participantUserId] } },
    });
    await testPrisma.user.delete({ where: { id: "integ-admin-user" } }).catch(() => {});
  });

  // ── Audit Logs ────────────────────────────────────────

  it("GET /api/admin/audit-logs — lists audit logs", async () => {
    const res = await request(app)
      .get("/api/admin/audit-logs")
      .set(...adminAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("GET /api/admin/audit-logs — filters by userId", async () => {
    const res = await request(app)
      .get(`/api/admin/audit-logs?userId=${TEST_IDS.clinicianUserId}`)
      .set(...adminAuthHeader());

    expect(res.status).toBe(200);
    for (const log of res.body.data) {
      expect(log.userId).toBe(TEST_IDS.clinicianUserId);
    }
  });

  it("GET /api/admin/audit-logs — filters by resourceType", async () => {
    const res = await request(app)
      .get("/api/admin/audit-logs?resourceType=Program")
      .set(...adminAuthHeader());

    expect(res.status).toBe(200);
    for (const log of res.body.data) {
      expect(log.resourceType).toBe("Program");
    }
  });

  it("GET /api/admin/audit-logs — filters by action", async () => {
    const res = await request(app)
      .get("/api/admin/audit-logs?action=CREATE")
      .set(...adminAuthHeader());

    expect(res.status).toBe(200);
    for (const log of res.body.data) {
      expect(log.action).toBe("CREATE");
    }
  });

  // ── Audit Log Stats ───────────────────────────────────

  it("GET /api/admin/audit-logs/stats — returns summary", async () => {
    const res = await request(app)
      .get("/api/admin/audit-logs/stats")
      .set(...adminAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThan(0);
    expect(Array.isArray(res.body.data.byAction)).toBe(true);
    expect(Array.isArray(res.body.data.byResource)).toBe(true);
  });

  // ── Auth ──────────────────────────────────────────────

  it("GET /api/admin/audit-logs — 401 without auth", async () => {
    const res = await request(app).get("/api/admin/audit-logs");
    expect(res.status).toBe(401);
  });

  it("GET /api/admin/audit-logs — 403 as clinician", async () => {
    const res = await request(app)
      .get("/api/admin/audit-logs")
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(403);
  });

  it("GET /api/admin/audit-logs — 403 as participant", async () => {
    const res = await request(app)
      .get("/api/admin/audit-logs")
      .set(...participantAuthHeader());

    expect(res.status).toBe(403);
  });
});
