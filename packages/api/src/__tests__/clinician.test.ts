import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { authHeader, participantAuthHeader, mockProgram } from "./helpers";

const db = vi.mocked(prisma);

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    compare: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  // RTM enrichment in getClinicianParticipants needs this mock
  db.rtmEnrollment.findMany.mockResolvedValue([] as any);
  // ClinicianClient fallback in getClinicianParticipants needs this mock
  db.clinicianClient.findMany.mockResolvedValue([] as any);
});

// ── GET /api/clinician/participants ──────────────────────

describe("GET /api/clinician/participants", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/clinician/participants");
    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .get("/api/clinician/participants")
      .set(...participantAuthHeader());
    expect(res.status).toBe(403);
  });

  it("returns empty list when clinician has no programs", async () => {
    db.program.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/clinician/participants")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.participants).toEqual([]);
  });

  it("returns participants with status indicators", async () => {
    db.program.findMany.mockResolvedValue([
      { id: "prog-1", title: "Test Program" },
    ] as any);

    db.enrollment.findMany.mockResolvedValue([
      {
        id: "enroll-1",
        programId: "prog-1",
        status: "ACTIVE",
        currentModuleId: "mod-1",
        enrolledAt: new Date(),
        participant: {
          id: "pp-1",
          user: {
            id: "user-1",
            email: "jane@test.com",
            firstName: "Jane",
            lastName: "Doe",
          },
          tasks: [{ updatedAt: new Date() }],
          journalEntries: [{ updatedAt: new Date() }],
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
            partId: "part-1",
            status: "COMPLETED",
            completedAt: new Date(),
            part: { id: "part-1", type: "HOMEWORK", moduleId: "mod-1" },
          },
        ],
        program: {
          modules: [
            { id: "mod-1", parts: [{ id: "part-1" }] },
          ],
        },
      },
    ] as any);

    const res = await request(app)
      .get("/api/clinician/participants")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.participants).toHaveLength(1);
    expect(res.body.data.participants[0]).toMatchObject({
      name: "Jane Doe",
      email: "jane@test.com",
      programTitle: "Test Program",
      homeworkStatus: "COMPLETE",
      statusIndicator: "green",
    });
    expect(res.body.data.participants[0].currentModule).toMatchObject({
      id: "mod-1",
      title: "Module 1",
    });
  });

  it("filters by search query", async () => {
    db.program.findMany.mockResolvedValue([
      { id: "prog-1", title: "Test Program" },
    ] as any);

    db.enrollment.findMany.mockResolvedValue([
      {
        id: "enroll-1",
        programId: "prog-1",
        status: "ACTIVE",
        currentModuleId: null,
        enrolledAt: new Date(),
        participant: {
          id: "pp-1",
          user: { id: "user-1", email: "jane@test.com", firstName: "Jane", lastName: "Doe" },
          tasks: [],
          journalEntries: [],
        },
        moduleProgress: [],
        partProgress: [],
        program: { modules: [] },
      },
      {
        id: "enroll-2",
        programId: "prog-1",
        status: "ACTIVE",
        currentModuleId: null,
        enrolledAt: new Date(),
        participant: {
          id: "pp-2",
          user: { id: "user-2", email: "bob@test.com", firstName: "Bob", lastName: "Smith" },
          tasks: [],
          journalEntries: [],
        },
        moduleProgress: [],
        partProgress: [],
        program: { modules: [] },
      },
    ] as any);

    const res = await request(app)
      .get("/api/clinician/participants?search=jane")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.participants).toHaveLength(1);
    expect(res.body.data.participants[0].name).toBe("Jane Doe");
  });

  it("marks inactive participants as red", async () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 8);

    db.program.findMany.mockResolvedValue([
      { id: "prog-1", title: "Test" },
    ] as any);

    db.enrollment.findMany.mockResolvedValue([
      {
        id: "enroll-1",
        programId: "prog-1",
        status: "ACTIVE",
        currentModuleId: null,
        enrolledAt: new Date(),
        participant: {
          id: "pp-1",
          user: { id: "user-1", email: "inactive@test.com", firstName: "Old", lastName: "User" },
          tasks: [{ updatedAt: weekAgo }],
          journalEntries: [],
        },
        moduleProgress: [],
        partProgress: [],
        program: { modules: [] },
      },
    ] as any);

    const res = await request(app)
      .get("/api/clinician/participants")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.participants[0].statusIndicator).toBe("red");
  });
});

// ── GET /api/clinician/participants/:id ──────────────────

describe("GET /api/clinician/participants/:id", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/clinician/participants/user-1");
    expect(res.status).toBe(401);
  });

  it("returns 404 if participant not found", async () => {
    db.participantProfile.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/clinician/participants/nonexistent")
      .set(...authHeader());

    expect(res.status).toBe(404);
  });

  it("returns detailed participant view", async () => {
    db.participantProfile.findUnique.mockResolvedValue({
      id: "pp-1",
      userId: "user-1",
      user: {
        id: "user-1",
        email: "jane@test.com",
        firstName: "Jane",
        lastName: "Doe",
      },
    } as any);

    db.program.findMany.mockResolvedValue([{ id: "prog-1" }] as any);

    db.enrollment.findMany.mockResolvedValue([
      {
        id: "enroll-1",
        status: "ACTIVE",
        enrolledAt: new Date(),
        completedAt: null,
        currentModuleId: "mod-1",
        programId: "prog-1",
        program: {
          id: "prog-1",
          title: "Test Program",
          description: null,
          cadence: "WEEKLY",
        },
        moduleProgress: [
          {
            moduleId: "mod-1",
            status: "UNLOCKED",
            unlockedAt: new Date(),
            completedAt: null,
            module: { id: "mod-1", title: "Module 1", sortOrder: 0, estimatedMinutes: 30 },
          },
        ],
        partProgress: [],
        sessions: [],
      },
    ] as any);

    db.journalEntry.findMany.mockResolvedValue([]);
    db.task.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/clinician/participants/user-1")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.participant).toMatchObject({
      email: "jane@test.com",
      firstName: "Jane",
    });
    expect(res.body.data.enrollments).toHaveLength(1);
    expect(res.body.data.enrollments[0].moduleProgress).toHaveLength(1);
  });
});

// ── POST /api/clinician/participants/:id/push-task ───────

describe("POST /api/clinician/participants/:id/push-task", () => {
  it("returns 400 for missing title", async () => {
    const res = await request(app)
      .post("/api/clinician/participants/user-1/push-task")
      .set(...authHeader())
      .send({});

    expect(res.status).toBe(400);
  });

  it("creates a clinician-pushed task", async () => {
    db.participantProfile.findUnique.mockResolvedValue({
      id: "pp-1",
      userId: "user-1",
    } as any);

    db.task.create.mockResolvedValue({
      id: "task-1",
      participantId: "pp-1",
      title: "Review strategies",
      sourceType: "CLINICIAN_PUSH",
    } as any);

    const res = await request(app)
      .post("/api/clinician/participants/user-1/push-task")
      .set(...authHeader())
      .send({ title: "Review strategies" });

    expect(res.status).toBe(201);
    expect(res.body.data.sourceType).toBe("CLINICIAN_PUSH");
  });
});

// ── PUT /api/clinician/participants/:id/enrollment/:enrollmentId ─

describe("PUT /api/clinician/participants/:id/enrollment/:enrollmentId", () => {
  it("pauses an enrollment", async () => {
    db.enrollment.findUnique.mockResolvedValue({
      id: "enroll-1",
      status: "ACTIVE",
      programId: "prog-1",
    } as any);

    db.enrollment.update.mockResolvedValue({
      id: "enroll-1",
      status: "PAUSED",
    } as any);

    const res = await request(app)
      .put("/api/clinician/participants/user-1/enrollment/enroll-1")
      .set(...authHeader())
      .send({ action: "pause" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("PAUSED");
  });

  it("resumes a paused enrollment", async () => {
    db.enrollment.findUnique.mockResolvedValue({
      id: "enroll-1",
      status: "PAUSED",
      programId: "prog-1",
    } as any);

    db.enrollment.update.mockResolvedValue({
      id: "enroll-1",
      status: "ACTIVE",
    } as any);

    const res = await request(app)
      .put("/api/clinician/participants/user-1/enrollment/enroll-1")
      .set(...authHeader())
      .send({ action: "resume" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ACTIVE");
  });

  it("drops an enrollment", async () => {
    db.enrollment.findUnique.mockResolvedValue({
      id: "enroll-1",
      status: "ACTIVE",
      programId: "prog-1",
    } as any);

    db.enrollment.update.mockResolvedValue({
      id: "enroll-1",
      status: "DROPPED",
    } as any);

    const res = await request(app)
      .put("/api/clinician/participants/user-1/enrollment/enroll-1")
      .set(...authHeader())
      .send({ action: "drop" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("DROPPED");
  });

  it("resets progress and re-initializes first module", async () => {
    db.enrollment.findUnique.mockResolvedValue({
      id: "enroll-1",
      status: "ACTIVE",
      programId: "prog-1",
    } as any);

    db.partProgress.deleteMany.mockResolvedValue({ count: 0 } as any);
    db.moduleProgress.deleteMany.mockResolvedValue({ count: 0 } as any);

    db.program.findUnique.mockResolvedValue({
      id: "prog-1",
      modules: [
        { id: "mod-1" },
        { id: "mod-2" },
      ],
    } as any);

    db.moduleProgress.create.mockResolvedValue({} as any);

    db.enrollment.update.mockResolvedValue({
      id: "enroll-1",
      status: "ACTIVE",
      currentModuleId: "mod-1",
      completedAt: null,
    } as any);

    const res = await request(app)
      .put("/api/clinician/participants/user-1/enrollment/enroll-1")
      .set(...authHeader())
      .send({ action: "reset-progress" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ACTIVE");
    expect(db.moduleProgress.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          enrollmentId: "enroll-1",
          moduleId: "mod-1",
          status: "UNLOCKED",
        }),
      })
    );
  });

  it("resets progress when program has no modules", async () => {
    db.enrollment.findUnique.mockResolvedValue({
      id: "enroll-1",
      status: "ACTIVE",
      programId: "prog-1",
    } as any);

    db.partProgress.deleteMany.mockResolvedValue({ count: 0 } as any);
    db.moduleProgress.deleteMany.mockResolvedValue({ count: 0 } as any);

    db.program.findUnique.mockResolvedValue({
      id: "prog-1",
      modules: [],
    } as any);

    db.enrollment.update.mockResolvedValue({
      id: "enroll-1",
      status: "ACTIVE",
      currentModuleId: null,
      completedAt: null,
    } as any);

    const res = await request(app)
      .put("/api/clinician/participants/user-1/enrollment/enroll-1")
      .set(...authHeader())
      .send({ action: "reset-progress" });

    expect(res.status).toBe(200);
    expect(db.moduleProgress.create).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid action", async () => {
    db.enrollment.findUnique.mockResolvedValue({
      id: "enroll-1",
      status: "ACTIVE",
    } as any);

    const res = await request(app)
      .put("/api/clinician/participants/user-1/enrollment/enroll-1")
      .set(...authHeader())
      .send({ action: "invalid" });

    expect(res.status).toBe(400);
  });

  it("returns 404 for nonexistent enrollment", async () => {
    db.enrollment.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .put("/api/clinician/participants/user-1/enrollment/bad-id")
      .set(...authHeader())
      .send({ action: "pause" });

    expect(res.status).toBe(404);
  });
});

// ── POST /api/clinician/participants/:id/unlock-module ───

describe("POST /api/clinician/participants/:id/unlock-module", () => {
  it("returns 400 when enrollmentId or moduleId is missing", async () => {
    const res = await request(app)
      .post("/api/clinician/participants/user-1/unlock-module")
      .set(...authHeader())
      .send({ enrollmentId: "enroll-1" }); // missing moduleId

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("required");
  });

  it("returns 400 when both fields are missing", async () => {
    const res = await request(app)
      .post("/api/clinician/participants/user-1/unlock-module")
      .set(...authHeader())
      .send({});

    expect(res.status).toBe(400);
  });

  it("unlocks a module and updates current module on enrollment", async () => {
    db.moduleProgress.upsert.mockResolvedValue({
      enrollmentId: "enroll-1",
      moduleId: "mod-2",
      status: "UNLOCKED",
      customUnlock: true,
    } as any);

    db.enrollment.update.mockResolvedValue({
      id: "enroll-1",
      currentModuleId: "mod-2",
    } as any);

    const res = await request(app)
      .post("/api/clinician/participants/user-1/unlock-module")
      .set(...authHeader())
      .send({ enrollmentId: "enroll-1", moduleId: "mod-2" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("UNLOCKED");
    expect(res.body.data.customUnlock).toBe(true);
    expect(db.enrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "enroll-1" },
        data: { currentModuleId: "mod-2" },
      })
    );
  });
});

// ── POST /api/clinician/participants/bulk ─────────────────

describe("POST /api/clinician/participants/bulk", () => {
  it("returns 400 when action or participantIds is missing", async () => {
    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("required");
  });

  it("returns 400 when participantIds is empty", async () => {
    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({ action: "push-task", participantIds: [] });

    expect(res.status).toBe(400);
  });

  it("performs bulk push-task action", async () => {
    db.participantProfile.findUnique.mockResolvedValue({
      id: "pp-1",
      userId: "user-1",
    } as any);
    db.task.create.mockResolvedValue({ id: "task-1" } as any);

    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({
        action: "push-task",
        participantIds: ["user-1"],
        data: { title: "Review materials" },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.succeeded).toBe(1);
    expect(res.body.data.failed).toBe(0);
  });

  it("fails bulk push-task when title is missing", async () => {
    db.participantProfile.findUnique.mockResolvedValue({
      id: "pp-1",
      userId: "user-1",
    } as any);

    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({
        action: "push-task",
        participantIds: ["user-1"],
        data: {},
      });

    expect(res.status).toBe(200);
    expect(res.body.data.failed).toBe(1);
    expect(res.body.data.results[0].error).toBe("Title required");
  });

  it("performs bulk send-nudge action", async () => {
    db.participantProfile.findUnique.mockResolvedValue({
      id: "pp-1",
      userId: "user-1",
    } as any);
    db.task.create.mockResolvedValue({ id: "task-1" } as any);

    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({
        action: "send-nudge",
        participantIds: ["user-1"],
        data: { message: "Hey, check in!" },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.succeeded).toBe(1);
    expect(db.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Hey, check in!",
          sourceType: "CLINICIAN_PUSH",
        }),
      })
    );
  });

  it("performs bulk unlock-next-module action", async () => {
    db.participantProfile.findUnique.mockResolvedValue({
      id: "pp-1",
      userId: "user-1",
    } as any);

    db.enrollment.findFirst.mockResolvedValue({
      id: "enroll-1",
      moduleProgress: [
        { module: { id: "mod-1", sortOrder: 0 }, status: "COMPLETED" },
      ],
      program: {
        modules: [
          { id: "mod-1", sortOrder: 0 },
          { id: "mod-2", sortOrder: 1 },
        ],
      },
    } as any);

    db.moduleProgress.upsert.mockResolvedValue({} as any);
    db.enrollment.update.mockResolvedValue({} as any);

    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({
        action: "unlock-next-module",
        participantIds: ["user-1"],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.succeeded).toBe(1);
    expect(db.moduleProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          moduleId: "mod-2",
          status: "UNLOCKED",
        }),
      })
    );
  });

  it("fails unlock-next-module when no active enrollment", async () => {
    db.participantProfile.findUnique.mockResolvedValue(null);
    db.enrollment.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({
        action: "unlock-next-module",
        participantIds: ["user-1"],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.failed).toBe(1);
    expect(res.body.data.results[0].error).toBe("No active enrollment");
  });

  it("fails unlock-next-module when no locked modules remain", async () => {
    db.participantProfile.findUnique.mockResolvedValue({
      id: "pp-1",
      userId: "user-1",
    } as any);

    db.enrollment.findFirst.mockResolvedValue({
      id: "enroll-1",
      moduleProgress: [
        { module: { id: "mod-1", sortOrder: 0 }, status: "COMPLETED" },
      ],
      program: {
        modules: [{ id: "mod-1", sortOrder: 0 }], // only one module, already completed
      },
    } as any);

    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({
        action: "unlock-next-module",
        participantIds: ["user-1"],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.failed).toBe(1);
    expect(res.body.data.results[0].error).toBe("No locked modules");
  });

  it("returns unknown action error for each participant", async () => {
    db.participantProfile.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({
        action: "unknown-action",
        participantIds: ["user-1"],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.failed).toBe(1);
    expect(res.body.data.results[0].error).toBe("Unknown action");
  });

  it("handles multiple participants with mixed results", async () => {
    // First participant - profile found
    db.participantProfile.findUnique
      .mockResolvedValueOnce({ id: "pp-1", userId: "user-1" } as any)
      .mockResolvedValueOnce(null); // Second participant - no profile

    db.task.create
      .mockResolvedValueOnce({ id: "task-1" } as any)
      .mockResolvedValueOnce({ id: "task-2" } as any);

    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({
        action: "push-task",
        participantIds: ["user-1", "user-2"],
        data: { title: "Review" },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.succeeded).toBe(2);
    expect(res.body.data.results).toHaveLength(2);
  });
});

// ── GET /api/clinician/participants/:id (additional) ─────

describe("GET /api/clinician/participants/:id (additional)", () => {
  it("falls back to profile ID lookup when userId lookup fails", async () => {
    // First call (by userId) returns null
    db.participantProfile.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "pp-1",
        userId: "user-1",
        user: {
          id: "user-1",
          email: "jane@test.com",
          firstName: "Jane",
          lastName: "Doe",
        },
      } as any);

    db.program.findMany.mockResolvedValue([{ id: "prog-1" }] as any);

    db.enrollment.findMany.mockResolvedValue([
      {
        id: "enroll-1",
        status: "ACTIVE",
        enrolledAt: new Date(),
        completedAt: null,
        currentModuleId: null,
        programId: "prog-1",
        program: { id: "prog-1", title: "Test", description: null, cadence: "WEEKLY" },
        moduleProgress: [],
        partProgress: [],
        sessions: [],
      },
    ] as any);

    db.journalEntry.findMany.mockResolvedValue([]);
    db.task.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/clinician/participants/pp-1")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.participant.email).toBe("jane@test.com");
  });

  it("returns 404 when participant has no enrollments in clinician programs", async () => {
    db.participantProfile.findUnique.mockResolvedValue({
      id: "pp-1",
      userId: "user-1",
      user: { id: "user-1", email: "jane@test.com", firstName: "Jane", lastName: "Doe" },
    } as any);

    db.program.findMany.mockResolvedValue([{ id: "prog-1" }] as any);
    db.enrollment.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/clinician/participants/user-1")
      .set(...authHeader());

    expect(res.status).toBe(404);
    expect(res.body.error).toContain("No enrollments found");
  });

  it("includes SMART goal responses and clinician tasks", async () => {
    db.participantProfile.findUnique.mockResolvedValue({
      id: "pp-1",
      userId: "user-1",
      user: { id: "user-1", email: "jane@test.com", firstName: "Jane", lastName: "Doe" },
    } as any);

    db.program.findMany.mockResolvedValue([{ id: "prog-1" }] as any);

    db.enrollment.findMany.mockResolvedValue([
      {
        id: "enroll-1",
        status: "ACTIVE",
        enrolledAt: new Date(),
        completedAt: null,
        currentModuleId: "mod-1",
        programId: "prog-1",
        program: { id: "prog-1", title: "Test", description: null, cadence: "WEEKLY" },
        moduleProgress: [],
        partProgress: [
          {
            partId: "part-sg-1",
            status: "COMPLETED",
            completedAt: new Date(),
            responseData: { goals: ["Exercise daily"] },
            part: { id: "part-sg-1", type: "SMART_GOALS", title: "My Goals", moduleId: "mod-1", content: {} },
          },
          {
            partId: "part-hw-1",
            status: "COMPLETED",
            completedAt: new Date(),
            responseData: null,
            part: { id: "part-hw-1", type: "HOMEWORK", title: "HW 1", moduleId: "mod-1", content: {} },
          },
        ],
        sessions: [
          {
            id: "session-1",
            scheduledAt: new Date(),
            status: "COMPLETED",
            clinicianNotes: "Good",
            participantSummary: "Felt fine",
          },
        ],
      },
    ] as any);

    db.journalEntry.findMany.mockResolvedValue([
      { id: "j-1", entryDate: new Date(), content: "Shared entry" },
    ] as any);

    db.task.findMany.mockResolvedValue([
      { id: "task-1", title: "Review", sourceType: "CLINICIAN_PUSH", status: "TODO" },
    ] as any);

    const res = await request(app)
      .get("/api/clinician/participants/user-1")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.smartGoals).toHaveLength(1);
    expect(res.body.data.smartGoals[0].partTitle).toBe("My Goals");
    expect(res.body.data.smartGoals[0].goals).toEqual({ goals: ["Exercise daily"] });
    expect(res.body.data.clinicianTasks).toHaveLength(1);
    expect(res.body.data.journalEntries).toHaveLength(1);
    expect(res.body.data.enrollments[0].homeworkProgress).toHaveLength(1);
    expect(res.body.data.enrollments[0].sessions).toHaveLength(1);
  });
});

// ── GET /api/clinician/participants (additional) ─────────

describe("GET /api/clinician/participants (additional)", () => {
  it("filters by programId", async () => {
    db.program.findMany.mockResolvedValue([
      { id: "prog-1", title: "Program 1" },
    ] as any);

    db.enrollment.findMany.mockResolvedValue([
      {
        id: "enroll-1",
        programId: "prog-1",
        status: "ACTIVE",
        currentModuleId: null,
        enrolledAt: new Date(),
        participant: {
          id: "pp-1",
          user: { id: "user-1", email: "jane@test.com", firstName: "Jane", lastName: "Doe" },
          tasks: [],
          journalEntries: [],
        },
        moduleProgress: [],
        partProgress: [],
        program: { modules: [] },
      },
    ] as any);

    const res = await request(app)
      .get("/api/clinician/participants?programId=prog-1")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.participants).toHaveLength(1);
  });

  it("shows amber status for recent activity but low homework rate", async () => {
    const recentDate = new Date();

    db.program.findMany.mockResolvedValue([
      { id: "prog-1", title: "Test" },
    ] as any);

    db.enrollment.findMany.mockResolvedValue([
      {
        id: "enroll-1",
        programId: "prog-1",
        status: "ACTIVE",
        currentModuleId: null,
        enrolledAt: new Date(),
        participant: {
          id: "pp-1",
          user: { id: "user-1", email: "amber@test.com", firstName: "Amber", lastName: "User" },
          tasks: [{ updatedAt: recentDate }],
          journalEntries: [],
        },
        moduleProgress: [],
        partProgress: [],
        program: {
          modules: [
            { id: "mod-1", parts: [{ id: "hw-1" }, { id: "hw-2" }, { id: "hw-3" }] },
          ],
        },
      },
    ] as any);

    const res = await request(app)
      .get("/api/clinician/participants")
      .set(...authHeader());

    expect(res.status).toBe(200);
    // 0 of 3 homework completed = 0% rate < 80% → amber
    expect(res.body.data.participants[0].statusIndicator).toBe("amber");
    expect(res.body.data.participants[0].homeworkStatus).toBe("NOT_STARTED");
  });

  it("shows PARTIAL homework status", async () => {
    const recentDate = new Date();

    db.program.findMany.mockResolvedValue([
      { id: "prog-1", title: "Test" },
    ] as any);

    db.enrollment.findMany.mockResolvedValue([
      {
        id: "enroll-1",
        programId: "prog-1",
        status: "ACTIVE",
        currentModuleId: null,
        enrolledAt: new Date(),
        participant: {
          id: "pp-1",
          user: { id: "user-1", email: "partial@test.com", firstName: "Partial", lastName: "User" },
          tasks: [{ updatedAt: recentDate }],
          journalEntries: [],
        },
        moduleProgress: [],
        partProgress: [
          {
            partId: "hw-1",
            status: "COMPLETED",
            completedAt: recentDate,
            part: { id: "hw-1", type: "HOMEWORK", moduleId: "mod-1" },
          },
        ],
        program: {
          modules: [
            { id: "mod-1", parts: [{ id: "hw-1" }, { id: "hw-2" }] },
          ],
        },
      },
    ] as any);

    const res = await request(app)
      .get("/api/clinician/participants")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.participants[0].homeworkStatus).toBe("PARTIAL");
    expect(res.body.data.participants[0].completedHomework).toBe(1);
    expect(res.body.data.participants[0].totalHomework).toBe(2);
    expect(res.body.data.participants[0].homeworkRate).toBe(50);
  });

  it("filters by email in search query", async () => {
    db.program.findMany.mockResolvedValue([
      { id: "prog-1", title: "Test" },
    ] as any);

    db.enrollment.findMany.mockResolvedValue([
      {
        id: "enroll-1",
        programId: "prog-1",
        status: "ACTIVE",
        currentModuleId: null,
        enrolledAt: new Date(),
        participant: {
          id: "pp-1",
          user: { id: "user-1", email: "special@unique.com", firstName: "Some", lastName: "Person" },
          tasks: [],
          journalEntries: [],
        },
        moduleProgress: [],
        partProgress: [],
        program: { modules: [] },
      },
      {
        id: "enroll-2",
        programId: "prog-1",
        status: "ACTIVE",
        currentModuleId: null,
        enrolledAt: new Date(),
        participant: {
          id: "pp-2",
          user: { id: "user-2", email: "other@test.com", firstName: "Other", lastName: "User" },
          tasks: [],
          journalEntries: [],
        },
        moduleProgress: [],
        partProgress: [],
        program: { modules: [] },
      },
    ] as any);

    const res = await request(app)
      .get("/api/clinician/participants?search=unique")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.participants).toHaveLength(1);
    expect(res.body.data.participants[0].email).toBe("special@unique.com");
  });

  it("returns programs list alongside participants", async () => {
    db.program.findMany.mockResolvedValue([
      { id: "prog-1", title: "Program A" },
      { id: "prog-2", title: "Program B" },
    ] as any);

    db.enrollment.findMany.mockResolvedValue([] as any);

    const res = await request(app)
      .get("/api/clinician/participants")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.programs).toHaveLength(2);
    expect(res.body.data.programs[0]).toMatchObject({ id: "prog-1", title: "Program A" });
  });
});

// ── POST /api/clinician/participants/:id/push-task (additional) ──

describe("POST /api/clinician/participants/:id/push-task (additional)", () => {
  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .post("/api/clinician/participants/user-1/push-task")
      .set(...participantAuthHeader())
      .send({ title: "test" });

    expect(res.status).toBe(403);
  });

  it("creates task with description and dueDate", async () => {
    db.participantProfile.findUnique.mockResolvedValue({
      id: "pp-1",
      userId: "user-1",
    } as any);

    db.task.create.mockResolvedValue({
      id: "task-1",
      participantId: "pp-1",
      title: "Review",
      description: "Read chapter 3",
      dueDate: new Date("2026-04-01"),
      sourceType: "CLINICIAN_PUSH",
    } as any);

    const res = await request(app)
      .post("/api/clinician/participants/user-1/push-task")
      .set(...authHeader())
      .send({
        title: "Review",
        description: "Read chapter 3",
        dueDate: "2026-04-01",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.description).toBe("Read chapter 3");
  });

  it("uses profile ID directly when userId lookup returns null", async () => {
    db.participantProfile.findUnique.mockResolvedValue(null);

    db.task.create.mockResolvedValue({
      id: "task-1",
      participantId: "pp-direct",
      title: "Task",
      sourceType: "CLINICIAN_PUSH",
    } as any);

    const res = await request(app)
      .post("/api/clinician/participants/pp-direct/push-task")
      .set(...authHeader())
      .send({ title: "Task" });

    expect(res.status).toBe(201);
    expect(db.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          participantId: "pp-direct",
        }),
      })
    );
  });
});
