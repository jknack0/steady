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

function mockTask(overrides: Record<string, any> = {}) {
  return {
    id: "task-1",
    participantId: "test-participant-profile-id",
    title: "Test Task",
    description: null,
    estimatedMinutes: null,
    dueDate: null,
    energyLevel: null,
    category: null,
    status: "TODO",
    sortOrder: 0,
    isRecurring: false,
    recurrenceRule: null,
    sourceType: "MANUAL",
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── POST /api/participant/tasks ────────────────────────────────────────────

describe("POST /api/participant/tasks", () => {
  it("creates a task with valid title", async () => {
    const created = mockTask({ title: "Buy groceries" });
    db.task.create.mockResolvedValue(created as any);

    const res = await request(app)
      .post("/api/participant/tasks")
      .set(...participantAuthHeader())
      .send({ title: "Buy groceries" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("Buy groceries");
    expect(db.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          participantId: "test-participant-profile-id",
          title: "Buy groceries",
          sourceType: "MANUAL",
        }),
      })
    );
  });

  it("creates a task with all optional fields", async () => {
    const dueDate = new Date("2026-04-01T10:00:00Z").toISOString();
    const created = mockTask({
      title: "Study session",
      description: "Chapter 5",
      estimatedMinutes: 45,
      dueDate: new Date(dueDate),
      energyLevel: "LOW",
      category: "STUDY",
      isRecurring: true,
      recurrenceRule: "RRULE:FREQ=DAILY",
    });
    db.task.create.mockResolvedValue(created as any);

    const res = await request(app)
      .post("/api/participant/tasks")
      .set(...participantAuthHeader())
      .send({
        title: "Study session",
        description: "Chapter 5",
        estimatedMinutes: 45,
        dueDate,
        energyLevel: "LOW",
        category: "STUDY",
        isRecurring: true,
        recurrenceRule: "RRULE:FREQ=DAILY",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it("trims whitespace from title", async () => {
    const created = mockTask({ title: "Trimmed" });
    db.task.create.mockResolvedValue(created as any);

    await request(app)
      .post("/api/participant/tasks")
      .set(...participantAuthHeader())
      .send({ title: "  Trimmed  " });

    expect(db.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "Trimmed" }),
      })
    );
  });

  it("returns 400 for missing title", async () => {
    const res = await request(app)
      .post("/api/participant/tasks")
      .set(...participantAuthHeader())
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Title is required");
  });

  it("returns 400 for empty title", async () => {
    const res = await request(app)
      .post("/api/participant/tasks")
      .set(...participantAuthHeader())
      .send({ title: "" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Title is required");
  });

  it("returns 400 for whitespace-only title", async () => {
    const res = await request(app)
      .post("/api/participant/tasks")
      .set(...participantAuthHeader())
      .send({ title: "   " });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Title is required");
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app)
      .post("/api/participant/tasks")
      .send({ title: "Test" });

    expect(res.status).toBe(401);
  });

  it("returns 403 for clinician role", async () => {
    const res = await request(app)
      .post("/api/participant/tasks")
      .set(...authHeader({ role: "CLINICIAN" }))
      .send({ title: "Test" });

    expect(res.status).toBe(403);
  });
});

// ─── GET /api/participant/tasks ─────────────────────────────────────────────

describe("GET /api/participant/tasks", () => {
  it("lists tasks for the participant", async () => {
    const tasks = [
      mockTask({ id: "t1", title: "Task 1" }),
      mockTask({ id: "t2", title: "Task 2" }),
    ];
    db.task.findMany.mockResolvedValue(tasks as any);

    const res = await request(app)
      .get("/api/participant/tasks")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.cursor).toBeNull();
  });

  it("filters by status", async () => {
    db.task.findMany.mockResolvedValue([] as any);

    await request(app)
      .get("/api/participant/tasks?status=DONE")
      .set(...participantAuthHeader());

    expect(db.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          participantId: "test-participant-profile-id",
          status: "DONE",
        }),
      })
    );
  });

  it("excludes archived tasks by default (status=ALL not specified)", async () => {
    db.task.findMany.mockResolvedValue([] as any);

    await request(app)
      .get("/api/participant/tasks")
      .set(...participantAuthHeader());

    expect(db.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { not: "ARCHIVED" },
        }),
      })
    );
  });

  it("filters by category", async () => {
    db.task.findMany.mockResolvedValue([] as any);

    await request(app)
      .get("/api/participant/tasks?category=STUDY")
      .set(...participantAuthHeader());

    expect(db.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: "STUDY",
        }),
      })
    );
  });

  it("supports cursor-based pagination", async () => {
    // Return 51 items to simulate hasMore
    const tasks = Array.from({ length: 51 }, (_, i) =>
      mockTask({ id: `t-${i}` })
    );
    db.task.findMany.mockResolvedValue(tasks as any);

    const res = await request(app)
      .get("/api/participant/tasks?limit=50")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(50);
    expect(res.body.cursor).toBe("t-49");
  });

  it("passes cursor to prisma when provided", async () => {
    db.task.findMany.mockResolvedValue([] as any);

    await request(app)
      .get("/api/participant/tasks?cursor=some-cursor-id")
      .set(...participantAuthHeader());

    expect(db.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 1,
        cursor: { id: "some-cursor-id" },
      })
    );
  });

  it("caps limit at 100", async () => {
    db.task.findMany.mockResolvedValue([] as any);

    await request(app)
      .get("/api/participant/tasks?limit=999")
      .set(...participantAuthHeader());

    expect(db.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 101, // 100 + 1 for pagination check
      })
    );
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/participant/tasks");
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/participant/tasks/:id ───────────────────────────────────────

describe("PATCH /api/participant/tasks/:id", () => {
  it("updates a task's title", async () => {
    const existing = mockTask();
    const updated = mockTask({ title: "Updated Title" });
    db.task.findFirst.mockResolvedValue(existing as any);
    db.task.update.mockResolvedValue(updated as any);

    const res = await request(app)
      .patch("/api/participant/tasks/task-1")
      .set(...participantAuthHeader())
      .send({ title: "Updated Title" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("Updated Title");
  });

  it("sets completedAt when status changes to DONE", async () => {
    const existing = mockTask({ status: "TODO", completedAt: null });
    db.task.findFirst.mockResolvedValue(existing as any);
    db.task.update.mockResolvedValue(
      mockTask({ status: "DONE", completedAt: new Date() }) as any
    );

    await request(app)
      .patch("/api/participant/tasks/task-1")
      .set(...participantAuthHeader())
      .send({ status: "DONE" });

    expect(db.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "DONE",
          completedAt: expect.any(Date),
        }),
      })
    );
  });

  it("clears completedAt when status changes back to TODO", async () => {
    const existing = mockTask({ status: "DONE", completedAt: new Date() });
    db.task.findFirst.mockResolvedValue(existing as any);
    db.task.update.mockResolvedValue(
      mockTask({ status: "TODO", completedAt: null }) as any
    );

    await request(app)
      .patch("/api/participant/tasks/task-1")
      .set(...participantAuthHeader())
      .send({ status: "TODO" });

    expect(db.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "TODO",
          completedAt: null,
        }),
      })
    );
  });

  it("returns 404 if task not found or not owned", async () => {
    db.task.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/participant/tasks/nonexistent")
      .set(...participantAuthHeader())
      .send({ title: "Nope" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Task not found");
  });

  it("verifies ownership via participantId", async () => {
    db.task.findFirst.mockResolvedValue(null);

    await request(app)
      .patch("/api/participant/tasks/task-1")
      .set(...participantAuthHeader())
      .send({ title: "X" });

    expect(db.task.findFirst).toHaveBeenCalledWith({
      where: {
        id: "task-1",
        participantId: "test-participant-profile-id",
      },
    });
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .patch("/api/participant/tasks/task-1")
      .send({ title: "X" });
    expect(res.status).toBe(401);
  });
});

// ─── DELETE /api/participant/tasks/:id ──────────────────────────────────────

describe("DELETE /api/participant/tasks/:id", () => {
  it("archives a task (sets status to ARCHIVED)", async () => {
    const existing = mockTask();
    db.task.findFirst.mockResolvedValue(existing as any);
    db.task.update.mockResolvedValue(mockTask({ status: "ARCHIVED" }) as any);

    const res = await request(app)
      .delete("/api/participant/tasks/task-1")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(db.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "task-1" },
        data: { status: "ARCHIVED" },
      })
    );
  });

  it("returns 404 if task not found or not owned", async () => {
    db.task.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .delete("/api/participant/tasks/nonexistent")
      .set(...participantAuthHeader());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Task not found");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).delete("/api/participant/tasks/task-1");
    expect(res.status).toBe(401);
  });
});
