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

// ── GET /api/practices/:id/stats ─────────────────────

describe("GET /api/practices/:id/stats", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/practices/practice-1/stats");
    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .get("/api/practices/practice-1/stats")
      .set(...participantAuthHeader());
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-member", async () => {
    db.practiceMembership.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/practices/practice-1/stats")
      .set(...authHeader());
    expect(res.status).toBe(404);
  });

  it("returns 403 for non-owner clinician", async () => {
    db.practiceMembership.findUnique.mockResolvedValue({
      id: "mem-1",
      practiceId: "practice-1",
      clinicianId: "test-clinician-profile-id",
      role: "CLINICIAN",
      joinedAt: new Date(),
    } as any);

    const res = await request(app)
      .get("/api/practices/practice-1/stats")
      .set(...authHeader());
    expect(res.status).toBe(403);
  });

  it("returns aggregate stats for practice owner", async () => {
    db.practiceMembership.findUnique.mockResolvedValue({
      id: "mem-1",
      practiceId: "practice-1",
      clinicianId: "test-clinician-profile-id",
      role: "OWNER",
      joinedAt: new Date(),
    } as any);

    // getPracticeStats calls
    db.practiceMembership.findMany.mockResolvedValue([
      {
        id: "mem-1",
        practiceId: "practice-1",
        clinicianId: "clin-1",
        role: "OWNER",
        clinician: {
          id: "clin-1",
          user: { firstName: "Dr.", lastName: "Smith" },
        },
      },
    ] as any);

    db.program.findMany.mockResolvedValue([
      {
        id: "prog-1",
        clinicianId: "clin-1",
        status: "PUBLISHED",
        _count: { enrollments: 5 },
      },
    ] as any);

    db.enrollment.count.mockResolvedValue(3);
    db.enrollment.findMany.mockResolvedValue([
      { participantId: "p-1" },
      { participantId: "p-2" },
    ] as any);
    db.appointment.count.mockResolvedValue(2);

    const res = await request(app)
      .get("/api/practices/practice-1/stats")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totals).toBeDefined();
    expect(res.body.data.totals.clinicians).toBe(1);
    expect(res.body.data.totals.programs).toBe(1);
    expect(res.body.data.clinicianStats).toHaveLength(1);
    expect(res.body.data.clinicianStats[0].name).toBe("Dr. Smith");
  });
});

// ── GET /api/practices/:id/participants ─────────────

describe("GET /api/practices/:id/participants", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/practices/practice-1/participants");
    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .get("/api/practices/practice-1/participants")
      .set(...participantAuthHeader());
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-member", async () => {
    db.practiceMembership.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/practices/practice-1/participants")
      .set(...authHeader());
    expect(res.status).toBe(404);
  });

  it("returns 403 for non-owner clinician", async () => {
    db.practiceMembership.findUnique.mockResolvedValue({
      id: "mem-1",
      practiceId: "practice-1",
      clinicianId: "test-clinician-profile-id",
      role: "CLINICIAN",
      joinedAt: new Date(),
    } as any);

    const res = await request(app)
      .get("/api/practices/practice-1/participants")
      .set(...authHeader());
    expect(res.status).toBe(403);
  });

  it("returns paginated participant list for owner", async () => {
    db.practiceMembership.findUnique.mockResolvedValue({
      id: "mem-1",
      practiceId: "practice-1",
      clinicianId: "test-clinician-profile-id",
      role: "OWNER",
      joinedAt: new Date(),
    } as any);

    // getPracticeParticipants calls
    db.practiceMembership.findMany.mockResolvedValue([
      { clinicianId: "clin-1" },
    ] as any);

    db.enrollment.findMany.mockResolvedValue([
      {
        id: "enroll-1",
        participantId: "p-1",
        status: "ACTIVE",
        enrolledAt: new Date("2026-01-15"),
        participant: {
          id: "p-1",
          user: { firstName: "Jane", lastName: "Doe", email: "jane@test.com" },
        },
        program: {
          title: "ADHD Mastery",
          clinicianId: "clin-1",
          clinician: {
            id: "clin-1",
            user: { firstName: "Dr.", lastName: "Smith" },
          },
        },
      },
    ] as any);

    const res = await request(app)
      .get("/api/practices/practice-1/participants")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("Jane Doe");
    expect(res.body.data[0].clinicianName).toBe("Dr. Smith");
    expect(res.body.data[0].programTitle).toBe("ADHD Mastery");
    expect(res.body.data[0].enrollmentStatus).toBe("ACTIVE");
    expect(res.body.cursor).toBeNull();
  });

  it("returns empty array for practice with no participants", async () => {
    db.practiceMembership.findUnique.mockResolvedValue({
      id: "mem-1",
      practiceId: "practice-1",
      clinicianId: "test-clinician-profile-id",
      role: "OWNER",
      joinedAt: new Date(),
    } as any);

    db.practiceMembership.findMany.mockResolvedValue([
      { clinicianId: "clin-1" },
    ] as any);

    db.enrollment.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/practices/practice-1/participants")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.cursor).toBeNull();
  });

  it("passes search parameter to service", async () => {
    db.practiceMembership.findUnique.mockResolvedValue({
      id: "mem-1",
      practiceId: "practice-1",
      clinicianId: "test-clinician-profile-id",
      role: "OWNER",
      joinedAt: new Date(),
    } as any);

    db.practiceMembership.findMany.mockResolvedValue([
      { clinicianId: "clin-1" },
    ] as any);

    db.enrollment.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/practices/practice-1/participants?search=jane")
      .set(...authHeader());

    expect(res.status).toBe(200);
    // Verify enrollment.findMany was called with a search filter
    expect(db.enrollment.findMany).toHaveBeenCalled();
    const callArgs = db.enrollment.findMany.mock.calls[0][0] as any;
    expect(callArgs.where.participant).toBeDefined();
  });
});
