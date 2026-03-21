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
