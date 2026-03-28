import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { authHeader, participantAuthHeader, mockInvitation } from "./helpers";

const db = vi.mocked(prisma);

// Mock the queue service to prevent real pg-boss connections
vi.mock("../services/queue", () => ({
  getQueue: vi.fn().mockResolvedValue({
    send: vi.fn().mockResolvedValue("job-id"),
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const CLINICIAN_PROFILE_ID = "test-clinician-profile-id";

// ── POST /api/invitations ──────────────────────────────

describe("POST /api/invitations", () => {
  it("creates an invitation (201)", async () => {
    db.patientInvitation.findFirst.mockResolvedValue(null);
    db.patientInvitation.findUnique.mockResolvedValue(null);
    db.patientInvitation.create.mockResolvedValue(mockInvitation() as any);

    const res = await request(app)
      .post("/api/invitations")
      .set(...authHeader())
      .send({
        patientName: "Jane Doe",
        patientEmail: "jane@example.com",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.status).toBe("PENDING");
    expect(db.patientInvitation.create).toHaveBeenCalled();
  });

  it("creates invitation with programId", async () => {
    db.patientInvitation.findFirst.mockResolvedValue(null);
    db.patientInvitation.findUnique.mockResolvedValue(null);
    db.program.findFirst.mockResolvedValue({ id: "prog-1", clinicianId: CLINICIAN_PROFILE_ID } as any);
    db.patientInvitation.create.mockResolvedValue(
      mockInvitation({ programId: "prog-1" }) as any
    );

    const res = await request(app)
      .post("/api/invitations")
      .set(...authHeader())
      .send({
        patientName: "Jane Doe",
        patientEmail: "jane@example.com",
        programId: "prog-1",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/invitations")
      .send({ patientName: "Jane", patientEmail: "jane@example.com" });

    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .post("/api/invitations")
      .set(...participantAuthHeader())
      .send({ patientName: "Jane", patientEmail: "jane@example.com" });

    expect(res.status).toBe(403);
  });

  it("returns 400 for validation errors", async () => {
    const res = await request(app)
      .post("/api/invitations")
      .set(...authHeader())
      .send({ patientName: "", patientEmail: "not-an-email" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 when patientEmail is missing", async () => {
    const res = await request(app)
      .post("/api/invitations")
      .set(...authHeader())
      .send({ patientName: "Jane" });

    expect(res.status).toBe(400);
  });

  it("returns 409 for duplicate active invitation", async () => {
    db.patientInvitation.findFirst.mockResolvedValue(mockInvitation() as any);

    const res = await request(app)
      .post("/api/invitations")
      .set(...authHeader())
      .send({
        patientName: "Jane Doe",
        patientEmail: "jane@example.com",
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/active invitation/i);
  });
});

// ── GET /api/invitations ────────────────────────────────

describe("GET /api/invitations", () => {
  it("returns paginated list (200)", async () => {
    const invitations = [mockInvitation(), mockInvitation({ id: "invitation-2" })];
    db.patientInvitation.findMany.mockResolvedValue(invitations as any);

    const res = await request(app)
      .get("/api/invitations")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.cursor).toBeNull();
  });

  it("returns cursor when there are more results", async () => {
    // Return 51 items to simulate hasMore
    const invitations = Array.from({ length: 51 }, (_, i) =>
      mockInvitation({ id: `inv-${i}` })
    );
    db.patientInvitation.findMany.mockResolvedValue(invitations as any);

    const res = await request(app)
      .get("/api/invitations?limit=50")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(50);
    expect(res.body.cursor).toBe("inv-49");
  });

  it("filters by status", async () => {
    db.patientInvitation.findMany.mockResolvedValue([] as any);

    const res = await request(app)
      .get("/api/invitations?status=PENDING")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(db.patientInvitation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "PENDING" }),
      })
    );
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/invitations");
    expect(res.status).toBe(401);
  });
});

// ── GET /api/invitations/:id ────────────────────────────

describe("GET /api/invitations/:id", () => {
  it("returns single invitation (200)", async () => {
    db.patientInvitation.findFirst.mockResolvedValue(mockInvitation() as any);

    const res = await request(app)
      .get("/api/invitations/invitation-1")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe("invitation-1");
  });

  it("returns 404 when not found", async () => {
    db.patientInvitation.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/invitations/nonexistent")
      .set(...authHeader());

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 404 for invitation owned by different clinician", async () => {
    // findFirst with ownership check returns null for wrong clinician
    db.patientInvitation.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/invitations/invitation-1")
      .set(...authHeader());

    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/invitations/invitation-1");
    expect(res.status).toBe(401);
  });
});

// ── POST /api/invitations/:id/resend ────────────────────

describe("POST /api/invitations/:id/resend", () => {
  it("resends email (200)", async () => {
    db.patientInvitation.findFirst.mockResolvedValue(mockInvitation() as any);
    db.patientInvitation.update.mockResolvedValue(
      mockInvitation({ emailSendCount: 1 }) as any
    );

    const res = await request(app)
      .post("/api/invitations/invitation-1/resend")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(db.patientInvitation.update).toHaveBeenCalled();
  });

  it("returns 404 when not found", async () => {
    db.patientInvitation.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/invitations/nonexistent/resend")
      .set(...authHeader());

    expect(res.status).toBe(404);
  });

  it("returns 409 for non-pending invitation", async () => {
    db.patientInvitation.findFirst.mockResolvedValue(
      mockInvitation({ status: "ACCEPTED" }) as any
    );

    const res = await request(app)
      .post("/api/invitations/invitation-1/resend")
      .set(...authHeader());

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/invitations/invitation-1/resend");
    expect(res.status).toBe(401);
  });
});

// ── POST /api/invitations/:id/revoke ────────────────────

describe("POST /api/invitations/:id/revoke", () => {
  it("revokes invitation (200)", async () => {
    db.patientInvitation.findFirst.mockResolvedValue(mockInvitation() as any);
    db.patientInvitation.update.mockResolvedValue(
      mockInvitation({ status: "REVOKED", revokedAt: new Date() }) as any
    );

    const res = await request(app)
      .post("/api/invitations/invitation-1/revoke")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("REVOKED");
  });

  it("returns 404 when not found", async () => {
    db.patientInvitation.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/invitations/nonexistent/revoke")
      .set(...authHeader());

    expect(res.status).toBe(404);
  });

  it("returns 409 for already accepted invitation", async () => {
    db.patientInvitation.findFirst.mockResolvedValue(
      mockInvitation({ status: "ACCEPTED" }) as any
    );

    const res = await request(app)
      .post("/api/invitations/invitation-1/revoke")
      .set(...authHeader());

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/invitations/invitation-1/revoke");
    expect(res.status).toBe(401);
  });
});
