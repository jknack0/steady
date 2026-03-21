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
  scheduleHomeworkReminder: vi.fn().mockResolvedValue(undefined),
  scheduleTaskReminder: vi.fn().mockResolvedValue(undefined),
  recordDismissal: vi.fn().mockResolvedValue(undefined),
  registerNotificationWorkers: vi.fn().mockResolvedValue(undefined),
  queueNotification: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ── POST /api/sessions ──────────────────────────────

describe("POST /api/sessions", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/sessions");
    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .post("/api/sessions")
      .set(...participantAuthHeader())
      .send({ enrollmentId: "e1", scheduledAt: new Date().toISOString() });
    expect(res.status).toBe(403);
  });

  it("returns 400 for missing fields", async () => {
    const res = await request(app)
      .post("/api/sessions")
      .set(...authHeader())
      .send({});
    expect(res.status).toBe(400);
  });

  it("creates a session with calendar event and schedules reminders", async () => {
    const scheduledAt = new Date(Date.now() + 86400000).toISOString();

    db.enrollment.findUnique.mockResolvedValue({
      id: "enroll-1",
      participant: {
        id: "pp-1",
        user: { id: "user-1", firstName: "Jane", lastName: "Doe" },
      },
      program: { title: "Test Program" },
    } as any);

    const mockSession = {
      id: "session-1",
      enrollmentId: "enroll-1",
      scheduledAt: new Date(scheduledAt),
      status: "SCHEDULED",
      videoCallUrl: null,
    };

    db.$transaction.mockResolvedValue([mockSession, {}] as any);

    const res = await request(app)
      .post("/api/sessions")
      .set(...authHeader())
      .send({ enrollmentId: "enroll-1", scheduledAt });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("SCHEDULED");

    const { scheduleSessionReminders } = await import("../services/notifications");
    expect(scheduleSessionReminders).toHaveBeenCalledWith("user-1", "session-1", expect.any(Date));
  });
});

// ── PUT /api/sessions/:id ───────────────────────────

describe("PUT /api/sessions/:id", () => {
  it("cancels reminders when session is cancelled", async () => {
    db.session.findUnique.mockResolvedValue({
      id: "session-1",
      enrollmentId: "enroll-1",
      scheduledAt: new Date(),
      status: "SCHEDULED",
      enrollment: { participant: { user: { id: "user-1" } } },
    } as any);
    db.session.update.mockResolvedValue({ id: "session-1", status: "CANCELLED" } as any);

    const res = await request(app)
      .put("/api/sessions/session-1")
      .set(...authHeader())
      .send({ status: "CANCELLED" });

    expect(res.status).toBe(200);
    const { cancelSessionReminders } = await import("../services/notifications");
    expect(cancelSessionReminders).toHaveBeenCalledWith("session-1");
  });

  it("returns 404 for nonexistent session", async () => {
    db.session.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .put("/api/sessions/bad-id")
      .set(...authHeader())
      .send({ status: "CANCELLED" });
    expect(res.status).toBe(404);
  });
});

// ── PUT /api/sessions/:id/complete ──────────────────

describe("PUT /api/sessions/:id/complete", () => {
  it("completes session, marks module done, unlocks next, pushes tasks", async () => {
    db.session.findUnique.mockResolvedValue({
      id: "session-1",
      status: "SCHEDULED",
      enrollmentId: "enroll-1",
      enrollment: {
        participant: { id: "pp-1", user: { id: "user-1" } },
        program: {
          modules: [
            { id: "mod-1", sortOrder: 0 },
            { id: "mod-2", sortOrder: 1 },
          ],
        },
      },
    } as any);

    db.session.update.mockResolvedValue({ id: "session-1", status: "COMPLETED" } as any);
    db.moduleProgress.upsert.mockResolvedValue({} as any);
    db.enrollment.update.mockResolvedValue({} as any);
    db.task.create.mockResolvedValue({
      id: "task-1",
      title: "Review strategies",
      dueDate: null,
    } as any);

    const res = await request(app)
      .put("/api/sessions/session-1/complete")
      .set(...authHeader())
      .send({
        clinicianNotes: "Good session",
        moduleCompletedId: "mod-1",
        tasksToAssign: [{ title: "Review strategies" }],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("COMPLETED");

    // Module completed + next unlocked
    expect(db.moduleProgress.upsert).toHaveBeenCalledTimes(2);

    // Task pushed
    expect(db.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Review strategies",
          sourceType: "SESSION",
          sourceId: "session-1",
        }),
      })
    );
  });

  it("returns 409 if session not in SCHEDULED state", async () => {
    db.session.findUnique.mockResolvedValue({
      id: "session-1",
      status: "COMPLETED",
      enrollment: { participant: { user: { id: "user-1" } } },
    } as any);

    const res = await request(app)
      .put("/api/sessions/session-1/complete")
      .set(...authHeader())
      .send({ clinicianNotes: "test" });

    expect(res.status).toBe(409);
  });
});

// ── GET /api/sessions/upcoming (participant) ────────

describe("GET /api/sessions/upcoming", () => {
  it("returns 403 for clinician role", async () => {
    const res = await request(app)
      .get("/api/sessions/upcoming")
      .set(...authHeader());
    expect(res.status).toBe(403);
  });

  it("returns next scheduled session for participant", async () => {
    db.enrollment.findFirst.mockResolvedValue({ id: "enroll-1" } as any);
    db.session.findFirst.mockResolvedValue({
      id: "session-1",
      scheduledAt: new Date("2026-03-25T14:00:00Z"),
      videoCallUrl: "https://zoom.us/j/123",
      enrollment: {
        program: { title: "Test Program", clinicianId: "cp-1" },
      },
    } as any);
    db.clinicianProfile.findUnique.mockResolvedValue({
      user: { firstName: "Dr.", lastName: "Smith" },
    } as any);

    const res = await request(app)
      .get("/api/sessions/upcoming")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: "session-1",
      videoCallUrl: "https://zoom.us/j/123",
      clinicianName: "Dr. Smith",
      programTitle: "Test Program",
    });
  });

  it("returns null when no upcoming sessions", async () => {
    db.enrollment.findFirst.mockResolvedValue({ id: "enroll-1" } as any);
    db.session.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/sessions/upcoming")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });
});

// ── GET /api/sessions/history (participant) ─────────

describe("GET /api/sessions/history", () => {
  it("returns past sessions for participant", async () => {
    db.enrollment.findMany.mockResolvedValue([{ id: "enroll-1" }] as any);
    db.session.findMany.mockResolvedValue([
      {
        id: "session-1",
        scheduledAt: new Date("2026-03-15"),
        status: "COMPLETED",
        participantSummary: "Went well",
        enrollment: { program: { title: "Test", clinicianId: "cp-1" } },
        moduleCompleted: { title: "Module 1" },
      },
    ] as any);

    const res = await request(app)
      .get("/api/sessions/history")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].moduleCompleted).toBe("Module 1");
  });
});
