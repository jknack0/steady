import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { authHeader, participantAuthHeader, createTestToken } from "./helpers";

const db = vi.mocked(prisma);

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    compare: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function adminAuthHeader() {
  return authHeader({ role: "ADMIN" });
}

const mockAuditLog = (overrides: any = {}) => ({
  id: "audit-1",
  userId: "user-1",
  action: "CREATE",
  resourceType: "Program",
  resourceId: "prog-1",
  metadata: null,
  timestamp: new Date("2026-03-20T12:00:00Z"),
  ...overrides,
});

// ── GET /api/admin/audit-logs ───────────────────────

describe("GET /api/admin/audit-logs", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/admin/audit-logs");
    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .get("/api/admin/audit-logs")
      .set(...participantAuthHeader());
    expect(res.status).toBe(403);
  });

  it("returns 403 for clinician role", async () => {
    const res = await request(app)
      .get("/api/admin/audit-logs")
      .set(...authHeader());
    expect(res.status).toBe(403);
  });

  it("returns audit logs for admin", async () => {
    db.auditLog.findMany.mockResolvedValue([mockAuditLog()] as any);

    const res = await request(app)
      .get("/api/admin/audit-logs")
      .set(...adminAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].action).toBe("CREATE");
    expect(res.body.data[0].resourceType).toBe("Program");
  });

  it("supports filtering by userId", async () => {
    db.auditLog.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/admin/audit-logs?userId=user-1")
      .set(...adminAuthHeader());

    expect(res.status).toBe(200);
    expect(db.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1" }),
      })
    );
  });

  it("supports filtering by resourceType and action", async () => {
    db.auditLog.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/admin/audit-logs?resourceType=Program&action=CREATE")
      .set(...adminAuthHeader());

    expect(res.status).toBe(200);
    expect(db.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          resourceType: "Program",
          action: "CREATE",
        }),
      })
    );
  });

  it("supports date range filtering", async () => {
    db.auditLog.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/admin/audit-logs?startDate=2026-03-01T00:00:00Z&endDate=2026-03-21T00:00:00Z")
      .set(...adminAuthHeader());

    expect(res.status).toBe(200);
    expect(db.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          timestamp: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        }),
      })
    );
  });

  it("supports cursor-based pagination", async () => {
    const logs = Array.from({ length: 51 }, (_, i) =>
      mockAuditLog({ id: `audit-${i}` })
    );
    db.auditLog.findMany.mockResolvedValue(logs as any);

    const res = await request(app)
      .get("/api/admin/audit-logs?limit=50")
      .set(...adminAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(50);
    expect(res.body.cursor).toBe("audit-49");
  });
});

// ── GET /api/admin/audit-logs/stats ─────────────────

describe("GET /api/admin/audit-logs/stats", () => {
  it("returns audit stats for admin", async () => {
    db.auditLog.count.mockResolvedValue(100 as any);
    db.auditLog.groupBy.mockResolvedValueOnce([
      { action: "CREATE", _count: 60 },
      { action: "UPDATE", _count: 30 },
      { action: "DELETE", _count: 10 },
    ] as any);
    db.auditLog.groupBy.mockResolvedValueOnce([
      { resourceType: "Program", _count: 40 },
      { resourceType: "Module", _count: 30 },
    ] as any);

    const res = await request(app)
      .get("/api/admin/audit-logs/stats")
      .set(...adminAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(100);
    expect(res.body.data.byAction).toHaveLength(3);
    expect(res.body.data.byResource).toHaveLength(2);
  });
});
