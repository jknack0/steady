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
  // Default ownership check mocks — return truthy so tests pass unless overridden
  db.session.findFirst.mockResolvedValue({ id: "session-1" } as any);
  db.enrollment.findFirst.mockResolvedValue({ id: "enroll-1" } as any);
  // Restore default $transaction behavior (execute callback with mockPrisma)
  db.$transaction.mockImplementation(async (fnOrArray: any) => {
    if (typeof fnOrArray === "function") {
      return fnOrArray(db);
    }
    return Promise.all(fnOrArray);
  });
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

  it("returns empty list when participant has no enrollments", async () => {
    db.enrollment.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/sessions/history")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.cursor).toBeNull();
  });

  it("returns 403 for clinician role", async () => {
    const res = await request(app)
      .get("/api/sessions/history")
      .set(...authHeader());
    expect(res.status).toBe(403);
  });

  it("handles pagination with cursor", async () => {
    db.enrollment.findMany.mockResolvedValue([{ id: "enroll-1" }] as any);
    // Return more than limit to trigger hasMore
    const sessions = Array.from({ length: 3 }, (_, i) => ({
      id: `session-${i}`,
      scheduledAt: new Date(`2026-03-${10 + i}`),
      status: "COMPLETED",
      participantSummary: null,
      enrollment: { program: { title: "Test", clinicianId: "cp-1" } },
      moduleCompleted: null,
    }));
    db.session.findMany.mockResolvedValue(sessions as any);

    const res = await request(app)
      .get("/api/sessions/history?limit=2")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.cursor).toBe("session-1");
  });

  it("returns null moduleCompleted when no module was completed", async () => {
    db.enrollment.findMany.mockResolvedValue([{ id: "enroll-1" }] as any);
    db.session.findMany.mockResolvedValue([
      {
        id: "session-1",
        scheduledAt: new Date("2026-03-15"),
        status: "COMPLETED",
        participantSummary: null,
        enrollment: { program: { title: "Test", clinicianId: "cp-1" } },
        moduleCompleted: null,
      },
    ] as any);

    const res = await request(app)
      .get("/api/sessions/history")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data[0].moduleCompleted).toBeNull();
  });
});

// ── GET /api/sessions (clinician list) ──────────────

describe("GET /api/sessions", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/sessions");
    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .get("/api/sessions")
      .set(...participantAuthHeader());
    expect(res.status).toBe(403);
  });

  it("returns sessions list for clinician", async () => {
    db.program.findMany.mockResolvedValue([{ id: "prog-1" }] as any);
    db.session.findMany.mockResolvedValue([
      {
        id: "session-1",
        scheduledAt: new Date("2026-03-25T14:00:00Z"),
        status: "SCHEDULED",
        videoCallUrl: "https://zoom.us/j/123",
        clinicianNotes: null,
        participantSummary: null,
        enrollmentId: "enroll-1",
        enrollment: {
          participant: {
            user: { id: "user-1", firstName: "Jane", lastName: "Doe", email: "jane@test.com" },
          },
          program: { id: "prog-1", title: "Test Program" },
        },
        moduleCompleted: null,
      },
    ] as any);

    const res = await request(app)
      .get("/api/sessions")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      id: "session-1",
      participantName: "Jane Doe",
      participantEmail: "jane@test.com",
      programTitle: "Test Program",
    });
    expect(res.body.cursor).toBeNull();
  });

  it("filters by status", async () => {
    db.program.findMany.mockResolvedValue([{ id: "prog-1" }] as any);
    db.session.findMany.mockResolvedValue([] as any);

    const res = await request(app)
      .get("/api/sessions?status=COMPLETED")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("filters by date range", async () => {
    db.program.findMany.mockResolvedValue([{ id: "prog-1" }] as any);
    db.session.findMany.mockResolvedValue([] as any);

    const res = await request(app)
      .get("/api/sessions?startDate=2026-03-01&endDate=2026-03-31")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("handles pagination with cursor", async () => {
    db.program.findMany.mockResolvedValue([{ id: "prog-1" }] as any);
    const sessions = Array.from({ length: 3 }, (_, i) => ({
      id: `session-${i}`,
      scheduledAt: new Date(`2026-03-${20 + i}T14:00:00Z`),
      status: "SCHEDULED",
      videoCallUrl: null,
      clinicianNotes: null,
      participantSummary: null,
      enrollmentId: "enroll-1",
      enrollment: {
        participant: {
          user: { id: "user-1", firstName: "Jane", lastName: "Doe", email: "jane@test.com" },
        },
        program: { id: "prog-1", title: "Test" },
      },
      moduleCompleted: null,
    }));
    db.session.findMany.mockResolvedValue(sessions as any);

    const res = await request(app)
      .get("/api/sessions?limit=2")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.cursor).toBe("session-1");
  });
});

// ── PUT /api/sessions/:id (additional cases) ────────

describe("PUT /api/sessions/:id (additional)", () => {
  it("reschedules a session and re-schedules reminders", async () => {
    const oldDate = new Date("2026-03-25T14:00:00Z");
    const newDate = new Date("2026-03-26T14:00:00Z");

    db.session.findUnique.mockResolvedValue({
      id: "session-1",
      enrollmentId: "enroll-1",
      scheduledAt: oldDate,
      status: "SCHEDULED",
      enrollment: { participant: { user: { id: "user-1" } } },
    } as any);
    db.session.update.mockResolvedValue({
      id: "session-1",
      scheduledAt: newDate,
      status: "SCHEDULED",
    } as any);

    const res = await request(app)
      .put("/api/sessions/session-1")
      .set(...authHeader())
      .send({ scheduledAt: newDate.toISOString() });

    expect(res.status).toBe(200);
    const { cancelSessionReminders, scheduleSessionReminders } = await import("../services/notifications");
    expect(cancelSessionReminders).toHaveBeenCalledWith("session-1");
    expect(scheduleSessionReminders).toHaveBeenCalledWith("user-1", "session-1", expect.any(Date));
  });

  it("updates video call URL", async () => {
    db.session.findUnique.mockResolvedValue({
      id: "session-1",
      enrollmentId: "enroll-1",
      scheduledAt: new Date(),
      status: "SCHEDULED",
      enrollment: { participant: { user: { id: "user-1" } } },
    } as any);
    db.session.update.mockResolvedValue({
      id: "session-1",
      videoCallUrl: "https://zoom.us/j/new",
    } as any);

    const res = await request(app)
      .put("/api/sessions/session-1")
      .set(...authHeader())
      .send({ videoCallUrl: "https://zoom.us/j/new" });

    expect(res.status).toBe(200);
    expect(res.body.data.videoCallUrl).toBe("https://zoom.us/j/new");
  });

  it("updates clinician notes", async () => {
    db.session.findUnique.mockResolvedValue({
      id: "session-1",
      enrollmentId: "enroll-1",
      scheduledAt: new Date(),
      status: "SCHEDULED",
      enrollment: { participant: { user: { id: "user-1" } } },
    } as any);
    db.session.update.mockResolvedValue({
      id: "session-1",
      clinicianNotes: "Updated notes",
    } as any);

    const res = await request(app)
      .put("/api/sessions/session-1")
      .set(...authHeader())
      .send({ clinicianNotes: "Updated notes" });

    expect(res.status).toBe(200);
    expect(res.body.data.clinicianNotes).toBe("Updated notes");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .put("/api/sessions/session-1")
      .send({ status: "CANCELLED" });
    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .put("/api/sessions/session-1")
      .set(...participantAuthHeader())
      .send({ status: "CANCELLED" });
    expect(res.status).toBe(403);
  });
});

// ── PUT /api/sessions/:id/complete (additional) ─────

describe("PUT /api/sessions/:id/complete (additional)", () => {
  it("returns 404 for nonexistent session", async () => {
    db.session.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .put("/api/sessions/bad-id/complete")
      .set(...authHeader())
      .send({ clinicianNotes: "test" });

    expect(res.status).toBe(404);
  });

  it("completes session without module or tasks", async () => {
    db.session.findUnique.mockResolvedValue({
      id: "session-1",
      status: "SCHEDULED",
      enrollmentId: "enroll-1",
      enrollment: {
        participant: { id: "pp-1", user: { id: "user-1" } },
        program: { modules: [] },
      },
    } as any);
    db.session.update.mockResolvedValue({ id: "session-1", status: "COMPLETED" } as any);

    const res = await request(app)
      .put("/api/sessions/session-1/complete")
      .set(...authHeader())
      .send({ clinicianNotes: "Quick check-in" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("COMPLETED");
    expect(db.moduleProgress.upsert).not.toHaveBeenCalled();
    expect(db.task.create).not.toHaveBeenCalled();
  });

  it("completes session with module but no next module to unlock", async () => {
    db.session.findUnique.mockResolvedValue({
      id: "session-1",
      status: "SCHEDULED",
      enrollmentId: "enroll-1",
      enrollment: {
        participant: { id: "pp-1", user: { id: "user-1" } },
        program: {
          modules: [{ id: "mod-1", sortOrder: 0 }], // only one module
        },
      },
    } as any);
    db.session.update.mockResolvedValue({ id: "session-1", status: "COMPLETED" } as any);
    db.moduleProgress.upsert.mockResolvedValue({} as any);

    const res = await request(app)
      .put("/api/sessions/session-1/complete")
      .set(...authHeader())
      .send({ moduleCompletedId: "mod-1" });

    expect(res.status).toBe(200);
    // Only called once for marking mod-1 completed (no next module to unlock)
    expect(db.moduleProgress.upsert).toHaveBeenCalledTimes(1);
    expect(db.enrollment.update).not.toHaveBeenCalled();
  });

  it("creates tasks with dueDate and schedules reminder", async () => {
    const dueDate = new Date("2026-04-01T12:00:00Z");

    db.session.findUnique.mockResolvedValue({
      id: "session-1",
      status: "SCHEDULED",
      enrollmentId: "enroll-1",
      enrollment: {
        participant: { id: "pp-1", user: { id: "user-1" } },
        program: { modules: [] },
      },
    } as any);
    db.session.update.mockResolvedValue({ id: "session-1", status: "COMPLETED" } as any);
    db.task.create.mockResolvedValue({
      id: "task-1",
      title: "Do homework",
      dueDate,
    } as any);

    const res = await request(app)
      .put("/api/sessions/session-1/complete")
      .set(...authHeader())
      .send({
        tasksToAssign: [{ title: "Do homework", dueDate: dueDate.toISOString() }],
      });

    expect(res.status).toBe(200);
    expect(db.task.create).toHaveBeenCalled();
    const { scheduleTaskReminder } = await import("../services/notifications");
    expect(scheduleTaskReminder).toHaveBeenCalledWith("user-1", "task-1", "Do homework", dueDate);
  });

  it("skips tasks with empty titles", async () => {
    db.session.findUnique.mockResolvedValue({
      id: "session-1",
      status: "SCHEDULED",
      enrollmentId: "enroll-1",
      enrollment: {
        participant: { id: "pp-1", user: { id: "user-1" } },
        program: { modules: [] },
      },
    } as any);
    db.session.update.mockResolvedValue({ id: "session-1", status: "COMPLETED" } as any);

    const res = await request(app)
      .put("/api/sessions/session-1/complete")
      .set(...authHeader())
      .send({
        tasksToAssign: [{ title: "" }, { title: "  " }],
      });

    expect(res.status).toBe(200);
    expect(db.task.create).not.toHaveBeenCalled();
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .put("/api/sessions/session-1/complete")
      .send({ clinicianNotes: "test" });
    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .put("/api/sessions/session-1/complete")
      .set(...participantAuthHeader())
      .send({ clinicianNotes: "test" });
    expect(res.status).toBe(403);
  });
});

// ── GET /api/sessions/upcoming (additional) ─────────

describe("GET /api/sessions/upcoming (additional)", () => {
  it("returns null when participant has no active enrollment", async () => {
    db.enrollment.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/sessions/upcoming")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });
});

// ── GET /api/sessions/:id/prepare ───────────────────

describe("GET /api/sessions/:id/prepare", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/sessions/session-1/prepare");
    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .get("/api/sessions/session-1/prepare")
      .set(...participantAuthHeader());
    expect(res.status).toBe(403);
  });

  it("returns 404 for nonexistent session", async () => {
    db.session.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/sessions/bad-id/prepare")
      .set(...authHeader());

    expect(res.status).toBe(404);
  });

  it("returns full preparation data for a session", async () => {
    db.dailyTracker.findMany.mockResolvedValue([]);
    db.session.findUnique.mockResolvedValue({
      id: "session-1",
      scheduledAt: new Date("2026-03-25T14:00:00Z"),
      status: "SCHEDULED",
      enrollmentId: "enroll-1",
      enrollment: {
        id: "enroll-1",
        programId: "prog-1",
        currentModuleId: "mod-1",
        participant: {
          id: "pp-1",
          user: { id: "user-1", firstName: "Jane", lastName: "Doe" },
          tasks: [
            { id: "task-1", title: "Review", status: "TODO", createdAt: new Date() },
          ],
          journalEntries: [
            { id: "j-1", entryDate: new Date(), content: "Feeling good", isSharedWithClinician: true },
          ],
        },
        program: {
          title: "Test Program",
          modules: [
            {
              id: "mod-1",
              title: "Module 1",
              sortOrder: 0,
              parts: [{ id: "hw-1", title: "Homework 1" }],
            },
            {
              id: "mod-2",
              title: "Module 2",
              sortOrder: 1,
              parts: [],
            },
          ],
        },
        moduleProgress: [
          {
            moduleId: "mod-1",
            status: "UNLOCKED",
            module: { id: "mod-1", title: "Module 1", sortOrder: 0 },
          },
        ],
        partProgress: [
          {
            partId: "hw-1",
            status: "COMPLETED",
            part: { id: "hw-1", title: "Homework 1", type: "HOMEWORK", moduleId: "mod-1" },
          },
        ],
      },
    } as any);

    // Last completed session
    db.session.findFirst.mockResolvedValue({
      clinicianNotes: "Previous session went well",
      scheduledAt: new Date("2026-03-18T14:00:00Z"),
      moduleCompletedId: null,
    } as any);

    // Quick stats
    db.task.count
      .mockResolvedValueOnce(5) // total tasks
      .mockResolvedValueOnce(3); // completed tasks
    db.journalEntry.count.mockResolvedValue(4);

    const res = await request(app)
      .get("/api/sessions/session-1/prepare")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.session).toMatchObject({
      id: "session-1",
      status: "SCHEDULED",
    });
    expect(res.body.data.participant).toMatchObject({
      id: "user-1",
      name: "Jane Doe",
    });
    expect(res.body.data.program.title).toBe("Test Program");
    expect(res.body.data.currentModuleId).toBe("mod-1");
    expect(res.body.data.moduleProgress).toHaveLength(1);
    expect(res.body.data.homeworkByModule).toHaveLength(2);
    expect(res.body.data.homeworkByModule[0].homework[0]).toMatchObject({
      partId: "hw-1",
      title: "Homework 1",
      completed: true,
    });
    expect(res.body.data.recentTasks).toHaveLength(1);
    expect(res.body.data.recentJournal).toHaveLength(1);
    expect(res.body.data.lastSession).toMatchObject({
      notes: "Previous session went well",
    });
    expect(res.body.data.quickStats).toMatchObject({
      tasksCompleted: 3,
      tasksTotal: 5,
      journalEntries: 4,
      taskCompletionRate: 60,
    });
  });

  it("returns null lastSession when no previous completed sessions", async () => {
    db.dailyTracker.findMany.mockResolvedValue([]);
    db.session.findUnique.mockResolvedValue({
      id: "session-1",
      scheduledAt: new Date("2026-03-25T14:00:00Z"),
      status: "SCHEDULED",
      enrollmentId: "enroll-1",
      enrollment: {
        id: "enroll-1",
        programId: "prog-1",
        currentModuleId: null,
        participant: {
          id: "pp-1",
          user: { id: "user-1", firstName: "Jane", lastName: "Doe" },
          tasks: [],
          journalEntries: [],
        },
        program: {
          title: "Test Program",
          modules: [],
        },
        moduleProgress: [],
        partProgress: [],
      },
    } as any);

    db.session.findFirst
      .mockResolvedValueOnce({ id: "session-1" } as any) // ownership check
      .mockResolvedValueOnce(null); // no previous completed session
    db.task.count.mockResolvedValue(0);
    db.journalEntry.count.mockResolvedValue(0);

    const res = await request(app)
      .get("/api/sessions/session-1/prepare")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.lastSession).toBeNull();
    expect(res.body.data.quickStats.taskCompletionRate).toBe(0);
  });
});

// ── POST /api/sessions (additional) ─────────────────

describe("POST /api/sessions (additional)", () => {
  it("returns 404 when enrollment not found", async () => {
    db.enrollment.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/sessions")
      .set(...authHeader())
      .send({ enrollmentId: "bad-id", scheduledAt: new Date().toISOString() });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Enrollment not found");
  });

  it("creates session with video call URL and custom duration", async () => {
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
      id: "session-2",
      enrollmentId: "enroll-1",
      scheduledAt: new Date(scheduledAt),
      status: "SCHEDULED",
      videoCallUrl: "https://zoom.us/j/456",
    };

    db.$transaction.mockResolvedValue([mockSession, {}] as any);

    const res = await request(app)
      .post("/api/sessions")
      .set(...authHeader())
      .send({
        enrollmentId: "enroll-1",
        scheduledAt,
        videoCallUrl: "https://zoom.us/j/456",
        durationMinutes: 90,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.videoCallUrl).toBe("https://zoom.us/j/456");
  });
});
