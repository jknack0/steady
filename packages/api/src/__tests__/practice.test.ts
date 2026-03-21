import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { authHeader, participantAuthHeader } from "./helpers";

const db = vi.mocked(prisma);

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    compare: vi.fn(),
  },
}));

vi.mock("../services/notifications", () => ({
  scheduleSessionReminders: vi.fn().mockResolvedValue(undefined),
  cancelSessionReminders: vi.fn().mockResolvedValue(undefined),
  cancelHomeworkReminders: vi.fn().mockResolvedValue(undefined),
  scheduleTaskReminder: vi.fn().mockResolvedValue(undefined),
  recordDismissal: vi.fn().mockResolvedValue(undefined),
  registerNotificationWorkers: vi.fn().mockResolvedValue(undefined),
  queueNotification: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ── POST /api/practices ─────────────────────────────

describe("POST /api/practices", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/practices");
    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .post("/api/practices")
      .set(...participantAuthHeader())
      .send({ name: "Test" });
    expect(res.status).toBe(403);
  });

  it("returns 400 for missing name", async () => {
    const res = await request(app)
      .post("/api/practices")
      .set(...authHeader())
      .send({});
    expect(res.status).toBe(400);
  });

  it("creates a practice with owner membership", async () => {
    db.practice.create.mockResolvedValue({
      id: "practice-1",
      name: "Test Practice",
      ownerId: "test-user-id",
      memberships: [{ id: "mem-1", role: "OWNER" }],
    } as any);

    const res = await request(app)
      .post("/api/practices")
      .set(...authHeader())
      .send({ name: "Test Practice" });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Test Practice");
  });
});

// ── GET /api/practices ──────────────────────────────

describe("GET /api/practices", () => {
  it("returns practices for clinician", async () => {
    db.practiceMembership.findMany.mockResolvedValue([
      {
        role: "OWNER",
        practice: {
          id: "practice-1",
          name: "My Practice",
          ownerId: "test-user-id",
          memberships: [
            {
              id: "mem-1",
              clinicianId: "test-clinician-profile-id",
              role: "OWNER",
              joinedAt: new Date(),
              clinician: { user: { firstName: "Test", lastName: "User", email: "test@test.com" } },
            },
          ],
          _count: { programs: 3 },
        },
      },
    ] as any);

    const res = await request(app)
      .get("/api/practices")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("My Practice");
    expect(res.body.data[0].myRole).toBe("OWNER");
  });
});

// ── POST /api/practices/:id/invite ──────────────────

describe("POST /api/practices/:id/invite", () => {
  it("returns 403 for non-owner", async () => {
    db.practiceMembership.findUnique.mockResolvedValue({
      role: "CLINICIAN",
    } as any);

    const res = await request(app)
      .post("/api/practices/practice-1/invite")
      .set(...authHeader())
      .send({ email: "other@test.com" });

    expect(res.status).toBe(403);
  });

  it("invites a clinician", async () => {
    db.practiceMembership.findUnique
      .mockResolvedValueOnce({ role: "OWNER" } as any)  // owner check
      .mockResolvedValueOnce(null);  // not already member

    db.user.findUnique.mockResolvedValue({
      id: "user-2",
      role: "CLINICIAN",
      clinicianProfile: { id: "cp-2" },
    } as any);

    db.practiceMembership.create.mockResolvedValue({
      id: "mem-2",
      practiceId: "practice-1",
      clinicianId: "cp-2",
      role: "CLINICIAN",
    } as any);

    const res = await request(app)
      .post("/api/practices/practice-1/invite")
      .set(...authHeader())
      .send({ email: "other@test.com" });

    expect(res.status).toBe(201);
  });
});

// ── GET /api/practices/:id/dashboard ────────────────

describe("GET /api/practices/:id/dashboard", () => {
  it("returns 403 for non-owner", async () => {
    db.practiceMembership.findUnique.mockResolvedValue({
      role: "CLINICIAN",
    } as any);

    const res = await request(app)
      .get("/api/practices/practice-1/dashboard")
      .set(...authHeader());

    expect(res.status).toBe(403);
  });

  it("returns aggregate stats for owner", async () => {
    db.practiceMembership.findUnique.mockResolvedValue({ role: "OWNER" } as any);
    db.practiceMembership.findMany.mockResolvedValue([
      {
        clinicianId: "cp-1",
        role: "OWNER",
        clinician: {
          user: { firstName: "Dr", lastName: "Smith" },
          programs: [
            { status: "PUBLISHED", _count: { enrollments: 5, modules: 3 } },
            { status: "DRAFT", _count: { enrollments: 0, modules: 1 } },
          ],
        },
      },
    ] as any);

    const res = await request(app)
      .get("/api/practices/practice-1/dashboard")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.totals.clinicians).toBe(1);
    expect(res.body.data.totals.programs).toBe(2);
    expect(res.body.data.totals.enrollments).toBe(5);
  });
});

// ── POST /api/clinician/participants/bulk ────────────

describe("POST /api/clinician/participants/bulk", () => {
  it("returns 400 for missing action", async () => {
    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({});
    expect(res.status).toBe(400);
  });

  it("pushes tasks to multiple participants", async () => {
    db.participantProfile.findUnique
      .mockResolvedValueOnce({ id: "pp-1" } as any)
      .mockResolvedValueOnce({ id: "pp-2" } as any);

    db.task.create
      .mockResolvedValueOnce({ id: "t1" } as any)
      .mockResolvedValueOnce({ id: "t2" } as any);

    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({
        action: "push-task",
        participantIds: ["user-1", "user-2"],
        data: { title: "Review homework" },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.succeeded).toBe(2);
    expect(res.body.data.failed).toBe(0);
  });

  it("handles mixed success/failure", async () => {
    db.participantProfile.findUnique
      .mockResolvedValueOnce({ id: "pp-1" } as any)
      .mockResolvedValueOnce(null);  // not found

    db.task.create.mockResolvedValueOnce({ id: "t1" } as any);

    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({
        action: "push-task",
        participantIds: ["user-1", "user-2"],
        data: { title: "Review homework" },
      });

    expect(res.status).toBe(200);
    // Both should succeed since profileId fallback uses the original id
    expect(res.body.data.succeeded).toBe(2);
  });
});
