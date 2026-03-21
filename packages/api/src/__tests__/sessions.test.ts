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

// Mock the notification service
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

  it("creates a session and schedules reminders", async () => {
    const scheduledAt = new Date(Date.now() + 86400000).toISOString();

    db.enrollment.findUnique.mockResolvedValue({
      id: "enroll-1",
      participant: {
        user: { id: "user-1" },
      },
    } as any);

    db.session.create.mockResolvedValue({
      id: "session-1",
      enrollmentId: "enroll-1",
      scheduledAt: new Date(scheduledAt),
      status: "SCHEDULED",
      videoCallUrl: null,
    } as any);

    const res = await request(app)
      .post("/api/sessions")
      .set(...authHeader())
      .send({ enrollmentId: "enroll-1", scheduledAt });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("SCHEDULED");

    // Verify reminders were scheduled
    const { scheduleSessionReminders } = await import("../services/notifications");
    expect(scheduleSessionReminders).toHaveBeenCalledWith(
      "user-1",
      "session-1",
      expect.any(Date)
    );
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
      enrollment: {
        participant: { user: { id: "user-1" } },
      },
    } as any);

    db.session.update.mockResolvedValue({
      id: "session-1",
      status: "CANCELLED",
    } as any);

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

// ── POST /api/notifications/dismiss ─────────────────

describe("POST /api/notifications/dismiss", () => {
  it("records a dismissal", async () => {
    const res = await request(app)
      .post("/api/notifications/dismiss")
      .set(...participantAuthHeader())
      .send({ category: "MORNING_CHECKIN" });

    expect(res.status).toBe(200);

    const { recordDismissal } = await import("../services/notifications");
    expect(recordDismissal).toHaveBeenCalledWith(
      expect.any(String),
      "MORNING_CHECKIN"
    );
  });

  it("returns 400 for invalid category", async () => {
    const res = await request(app)
      .post("/api/notifications/dismiss")
      .set(...participantAuthHeader())
      .send({ category: "INVALID" });

    expect(res.status).toBe(400);
  });
});
