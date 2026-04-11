import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { mockInvitation } from "./helpers";

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

// ── POST /api/auth/register-with-invite ─────────────────

describe("POST /api/auth/register-with-invite", () => {
  const validPayload = {
    inviteCode: "STEADY-AB12",
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    password: "securePass123",
  };

  it("creates account and returns tokens (201)", async () => {
    // Invitation lookup
    db.patientInvitation.findUnique.mockResolvedValue(mockInvitation() as any);

    // Email not already registered
    db.user.findUnique.mockResolvedValue(null);

    // Transaction mock
    const mockUser = {
      id: "new-user-id",
      email: "jane@example.com",
      firstName: "Jane",
      lastName: "Doe",
      role: "PARTICIPANT",
      participantProfile: { id: "new-pp-id" },
    };

    db.$transaction.mockImplementation(async (fn: any) => {
      // Create a mock tx that returns expected data
      const tx = {
        user: {
          create: vi.fn().mockResolvedValue(mockUser),
        },
        clinicianClient: {
          create: vi.fn().mockResolvedValue({}),
        },
        clinicianConfig: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
        clientConfig: {
          create: vi.fn().mockResolvedValue({}),
        },
        enrollment: {
          create: vi.fn().mockResolvedValue({}),
        },
        patientInvitation: {
          update: vi.fn().mockResolvedValue({}),
        },
      };
      return fn(tx);
    });

    const res = await request(app)
      .post("/api/auth/register-with-invite")
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBe("jane@example.com");
    expect(res.body.data.user.role).toBe("PARTICIPANT");
  });

  it("returns 400 for invalid code format", async () => {
    const res = await request(app)
      .post("/api/auth/register-with-invite")
      .send({ ...validPayload, inviteCode: "BADCODE" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 for nonexistent code", async () => {
    db.patientInvitation.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/auth/register-with-invite")
      .send(validPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/invalid invite code/i);
  });

  it("returns 409 for already used code", async () => {
    db.patientInvitation.findUnique.mockResolvedValue(
      mockInvitation({ status: "ACCEPTED" }) as any
    );

    const res = await request(app)
      .post("/api/auth/register-with-invite")
      .send(validPayload);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/already been used/i);
  });

  it("returns 410 for expired code", async () => {
    db.patientInvitation.findUnique.mockResolvedValue(
      mockInvitation({
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      }) as any
    );

    const res = await request(app)
      .post("/api/auth/register-with-invite")
      .send(validPayload);

    expect(res.status).toBe(410);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/expired/i);
  });

  it("returns 409 when email already registered", async () => {
    db.patientInvitation.findUnique.mockResolvedValue(mockInvitation() as any);
    db.user.findUnique.mockResolvedValue({ id: "existing-user", email: "jane@example.com" } as any);

    const res = await request(app)
      .post("/api/auth/register-with-invite")
      .send(validPayload);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/already registered/i);
  });

  it("returns 400 for missing fields", async () => {
    const res = await request(app)
      .post("/api/auth/register-with-invite")
      .send({ inviteCode: "STEADY-AB12" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 for short password", async () => {
    const res = await request(app)
      .post("/api/auth/register-with-invite")
      .send({ ...validPayload, password: "short" });

    expect(res.status).toBe(400);
  });

  it("returns 400 for revoked code", async () => {
    db.patientInvitation.findUnique.mockResolvedValue(
      mockInvitation({ status: "REVOKED" }) as any
    );

    const res = await request(app)
      .post("/api/auth/register-with-invite")
      .send(validPayload);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid invite code/i);
  });
});
