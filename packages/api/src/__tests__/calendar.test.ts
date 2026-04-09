import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { participantAuthHeader, authHeader } from "./helpers";

const db = vi.mocked(prisma);

vi.mock("../services/notifications", () => ({
  scheduleTaskReminder: vi.fn().mockResolvedValue(undefined),
  cancelSessionReminders: vi.fn().mockResolvedValue(undefined),
  cancelHomeworkReminders: vi.fn().mockResolvedValue(undefined),
  scheduleHomeworkReminder: vi.fn().mockResolvedValue(undefined),
  scheduleSessionReminders: vi.fn().mockResolvedValue(undefined),
  recordDismissal: vi.fn().mockResolvedValue(undefined),
  registerNotificationWorkers: vi.fn().mockResolvedValue(undefined),
  queueNotification: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function mockEvent(overrides: Record<string, any> = {}) {
  return {
    id: "event-1",
    participantId: "test-participant-profile-id",
    title: "Test Event",
    startTime: new Date("2026-04-01T09:00:00Z"),
    endTime: new Date("2026-04-01T10:00:00Z"),
    eventType: "TIME_BLOCK",
    color: null,
    taskId: null,
    task: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── POST /api/participant/calendar ─────────────────────────────────────────

describe("POST /api/participant/calendar", () => {
  it("creates an event with valid input", async () => {
    const created = mockEvent({ title: "Morning routine" });
    db.calendarEvent.create.mockResolvedValue(created as any);

    const res = await request(app)
      .post("/api/participant/calendar")
      .set(...participantAuthHeader())
      .send({
        title: "Morning routine",
        startTime: "2026-04-01T09:00:00Z",
        endTime: "2026-04-01T10:00:00Z",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("Morning routine");
    expect(db.calendarEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          participantId: "test-participant-profile-id",
          title: "Morning routine",
          eventType: "TIME_BLOCK",
        }),
      })
    );
  });

  it("creates an event with eventType and color", async () => {
    const created = mockEvent({ eventType: "APPOINTMENT", color: "#FF0000" });
    db.calendarEvent.create.mockResolvedValue(created as any);

    const res = await request(app)
      .post("/api/participant/calendar")
      .set(...participantAuthHeader())
      .send({
        title: "Doctor visit",
        startTime: "2026-04-01T14:00:00Z",
        endTime: "2026-04-01T15:00:00Z",
        eventType: "APPOINTMENT",
        color: "#FF0000",
      });

    expect(res.status).toBe(201);
  });

  it("creates an event linked to a task", async () => {
    db.task.findFirst.mockResolvedValue({ id: "task-1", participantId: "test-participant-profile-id" } as any);
    const created = mockEvent({ taskId: "task-1" });
    db.calendarEvent.create.mockResolvedValue(created as any);

    const res = await request(app)
      .post("/api/participant/calendar")
      .set(...participantAuthHeader())
      .send({
        title: "Work on task",
        startTime: "2026-04-01T09:00:00Z",
        endTime: "2026-04-01T10:00:00Z",
        taskId: "task-1",
      });

    expect(res.status).toBe(201);
    expect(db.task.findFirst).toHaveBeenCalledWith({
      where: { id: "task-1", participantId: "test-participant-profile-id" },
    });
  });

  it("returns 404 when linking to a non-existent task", async () => {
    db.task.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/participant/calendar")
      .set(...participantAuthHeader())
      .send({
        title: "Work on task",
        startTime: "2026-04-01T09:00:00Z",
        endTime: "2026-04-01T10:00:00Z",
        taskId: "nonexistent-task",
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Task not found");
  });

  it("returns 400 for missing title", async () => {
    const res = await request(app)
      .post("/api/participant/calendar")
      .set(...participantAuthHeader())
      .send({
        startTime: "2026-04-01T09:00:00Z",
        endTime: "2026-04-01T10:00:00Z",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 for empty title", async () => {
    const res = await request(app)
      .post("/api/participant/calendar")
      .set(...participantAuthHeader())
      .send({
        title: "   ",
        startTime: "2026-04-01T09:00:00Z",
        endTime: "2026-04-01T10:00:00Z",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Title is required");
  });

  it("returns 400 for missing startTime and endTime", async () => {
    const res = await request(app)
      .post("/api/participant/calendar")
      .set(...participantAuthHeader())
      .send({ title: "Event" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 for invalid date format", async () => {
    const res = await request(app)
      .post("/api/participant/calendar")
      .set(...participantAuthHeader())
      .send({
        title: "Event",
        startTime: "not-a-date",
        endTime: "also-not-a-date",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid date format");
  });

  it("returns 400 when endTime is before startTime", async () => {
    const res = await request(app)
      .post("/api/participant/calendar")
      .set(...participantAuthHeader())
      .send({
        title: "Backwards event",
        startTime: "2026-04-01T10:00:00Z",
        endTime: "2026-04-01T09:00:00Z",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("endTime must be after startTime");
  });

  it("returns 400 when endTime equals startTime", async () => {
    const res = await request(app)
      .post("/api/participant/calendar")
      .set(...participantAuthHeader())
      .send({
        title: "Zero duration",
        startTime: "2026-04-01T10:00:00Z",
        endTime: "2026-04-01T10:00:00Z",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("endTime must be after startTime");
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app)
      .post("/api/participant/calendar")
      .send({
        title: "Test",
        startTime: "2026-04-01T09:00:00Z",
        endTime: "2026-04-01T10:00:00Z",
      });

    expect(res.status).toBe(401);
  });

  it("returns 403 for clinician role", async () => {
    const res = await request(app)
      .post("/api/participant/calendar")
      .set(...authHeader({ role: "CLINICIAN" }))
      .send({
        title: "Test",
        startTime: "2026-04-01T09:00:00Z",
        endTime: "2026-04-01T10:00:00Z",
      });

    expect(res.status).toBe(403);
  });
});

// ─── GET /api/participant/calendar ──────────────────────────────────────────

describe("GET /api/participant/calendar", () => {
  it("lists events within a date range", async () => {
    const events = [
      mockEvent({ id: "e1", title: "Event 1" }),
      mockEvent({ id: "e2", title: "Event 2" }),
    ];
    db.calendarEvent.findMany.mockResolvedValue(events as any);

    const res = await request(app)
      .get("/api/participant/calendar?start=2026-04-01T00:00:00Z&end=2026-04-30T23:59:59Z")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(db.calendarEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          participantId: "test-participant-profile-id",
          startTime: { gte: expect.any(Date) },
          endTime: { lte: expect.any(Date) },
        }),
        orderBy: { startTime: "asc" },
      })
    );
  });

  it("returns 400 when start is missing", async () => {
    const res = await request(app)
      .get("/api/participant/calendar?end=2026-04-30T23:59:59Z")
      .set(...participantAuthHeader());

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("start and end query params are required");
  });

  it("returns 400 when end is missing", async () => {
    const res = await request(app)
      .get("/api/participant/calendar?start=2026-04-01T00:00:00Z")
      .set(...participantAuthHeader());

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("start and end query params are required");
  });

  it("returns 400 for invalid date format in query params", async () => {
    const res = await request(app)
      .get("/api/participant/calendar?start=bad-date&end=also-bad")
      .set(...participantAuthHeader());

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid date format");
  });

  it("includes linked task data", async () => {
    const events = [
      mockEvent({
        id: "e1",
        taskId: "task-1",
        task: { id: "task-1", title: "Linked Task", status: "TODO" },
      }),
    ];
    db.calendarEvent.findMany.mockResolvedValue(events as any);

    const res = await request(app)
      .get("/api/participant/calendar?start=2026-04-01T00:00:00Z&end=2026-04-30T23:59:59Z")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data[0].task).toBeDefined();
    expect(res.body.data[0].task.title).toBe("Linked Task");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .get("/api/participant/calendar?start=2026-04-01&end=2026-04-30");
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/participant/calendar/:id ────────────────────────────────────

describe("PATCH /api/participant/calendar/:id", () => {
  it("updates an event's title", async () => {
    const existing = mockEvent();
    const updated = mockEvent({ title: "Updated Event" });
    db.calendarEvent.findFirst.mockResolvedValue(existing as any);
    db.calendarEvent.update.mockResolvedValue(updated as any);

    const res = await request(app)
      .patch("/api/participant/calendar/event-1")
      .set(...participantAuthHeader())
      .send({ title: "Updated Event" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("Updated Event");
  });

  it("updates event times", async () => {
    db.calendarEvent.findFirst.mockResolvedValue(mockEvent() as any);
    db.calendarEvent.update.mockResolvedValue(mockEvent() as any);

    await request(app)
      .patch("/api/participant/calendar/event-1")
      .set(...participantAuthHeader())
      .send({
        startTime: "2026-04-01T11:00:00Z",
        endTime: "2026-04-01T12:00:00Z",
      });

    expect(db.calendarEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          startTime: expect.any(Date),
          endTime: expect.any(Date),
        }),
      })
    );
  });

  it("returns 404 if event not found or not owned", async () => {
    db.calendarEvent.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/participant/calendar/nonexistent")
      .set(...participantAuthHeader())
      .send({ title: "Nope" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Event not found");
  });

  it("verifies ownership via participantId", async () => {
    db.calendarEvent.findFirst.mockResolvedValue(null);

    await request(app)
      .patch("/api/participant/calendar/event-1")
      .set(...participantAuthHeader())
      .send({ title: "X" });

    expect(db.calendarEvent.findFirst).toHaveBeenCalledWith({
      where: {
        id: "event-1",
        participantId: "test-participant-profile-id",
        deletedAt: null,
      },
    });
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .patch("/api/participant/calendar/event-1")
      .send({ title: "X" });
    expect(res.status).toBe(401);
  });
});

// ─── DELETE /api/participant/calendar/:id ───────────────────────────────────

describe("DELETE /api/participant/calendar/:id", () => {
  it("deletes an event", async () => {
    db.calendarEvent.findFirst.mockResolvedValue(mockEvent() as any);
    db.calendarEvent.update.mockResolvedValue(mockEvent() as any);

    const res = await request(app)
      .delete("/api/participant/calendar/event-1")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(db.calendarEvent.update).toHaveBeenCalledWith({
      where: { id: "event-1" },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it("returns 404 if event not found or not owned", async () => {
    db.calendarEvent.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .delete("/api/participant/calendar/nonexistent")
      .set(...participantAuthHeader());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Event not found");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).delete("/api/participant/calendar/event-1");
    expect(res.status).toBe(401);
  });
});
