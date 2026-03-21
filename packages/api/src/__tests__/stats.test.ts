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

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Helpers ──────────────────────────────────────────────

const participantId = "test-participant-profile-id";

function mockTasks(overrides: any[] = []) {
  return overrides.map((o, i) => ({
    id: `task-${i}`,
    participantId,
    title: `Task ${i}`,
    status: "TODO",
    dueDate: null,
    completedAt: null,
    estimatedMinutes: null,
    createdAt: new Date("2026-03-01"),
    ...o,
  }));
}

function mockJournalEntries(overrides: any[] = []) {
  return overrides.map((o, i) => ({
    id: `journal-${i}`,
    participantId,
    entryDate: new Date(`2026-03-0${i + 1}`),
    regulationScore: null,
    freeformContent: "test",
    createdAt: new Date(`2026-03-0${i + 1}`),
    ...o,
  }));
}

// ── GET /api/stats/participant (own stats) ───────────────

describe("GET /api/stats/participant", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/stats/participant");
    expect(res.status).toBe(401);
  });

  it("returns stats for authenticated participant", async () => {
    // Mock tasks
    db.task.findMany.mockResolvedValue(
      mockTasks([
        { status: "DONE", completedAt: new Date("2026-03-10"), dueDate: new Date("2026-03-10"), estimatedMinutes: 30 },
        { status: "DONE", completedAt: new Date("2026-03-11"), dueDate: new Date("2026-03-11"), estimatedMinutes: 60 },
        { status: "TODO", dueDate: new Date("2026-03-15") },
      ]) as any
    );

    // Mock journal entries
    db.journalEntry.findMany.mockResolvedValue(
      mockJournalEntries([
        { regulationScore: 7 },
        { regulationScore: 8 },
        { regulationScore: 6 },
      ]) as any
    );

    // Mock enrollments with progress
    db.enrollment.findMany.mockResolvedValue([
      {
        id: "enroll-1",
        participantId,
        programId: "prog-1",
        status: "ACTIVE",
        moduleProgress: [
          {
            moduleId: "mod-1",
            module: { id: "mod-1", title: "Module 1" },
            status: "COMPLETED",
          },
        ],
        partProgress: [
          { partId: "part-1", status: "COMPLETED", part: { type: "HOMEWORK", moduleId: "mod-1" } },
          { partId: "part-2", status: "NOT_STARTED", part: { type: "HOMEWORK", moduleId: "mod-1" } },
          { partId: "part-3", status: "COMPLETED", part: { type: "TEXT", moduleId: "mod-1" } },
        ],
        program: {
          modules: [
            {
              id: "mod-1",
              title: "Module 1",
              parts: [
                { id: "part-1", type: "HOMEWORK" },
                { id: "part-2", type: "HOMEWORK" },
                { id: "part-3", type: "TEXT" },
              ],
            },
          ],
        },
      },
    ] as any);

    // Mock calendar events for system checkin
    db.calendarEvent.findMany.mockResolvedValue([
      { id: "ev-1", eventType: "TIME_BLOCK", startTime: new Date("2026-03-10T09:00:00Z") },
      { id: "ev-2", eventType: "TIME_BLOCK", startTime: new Date("2026-03-11T10:00:00Z") },
    ] as any);

    const res = await request(app)
      .get("/api/stats/participant")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("taskCompletion");
    expect(res.body.data).toHaveProperty("journaling");
    expect(res.body.data).toHaveProperty("regulationTrend");
    expect(res.body.data).toHaveProperty("homeworkCompletion");
    expect(res.body.data).toHaveProperty("timeEstimation");
    expect(res.body.data).toHaveProperty("systemCheckin");

    // Task completion: 2 done out of 3
    expect(res.body.data.taskCompletion.total).toBe(3);
    expect(res.body.data.taskCompletion.completed).toBe(2);

    // Journaling: 3 entries
    expect(res.body.data.journaling.journaledDays).toBe(3);

    // Regulation trend: 3 points
    expect(res.body.data.regulationTrend.points).toHaveLength(3);
  });

  it("supports date range query params", async () => {
    db.task.findMany.mockResolvedValue([] as any);
    db.journalEntry.findMany.mockResolvedValue([] as any);
    db.enrollment.findMany.mockResolvedValue([] as any);
    db.calendarEvent.findMany.mockResolvedValue([] as any);

    const res = await request(app)
      .get("/api/stats/participant?start=2026-03-01T00:00:00Z&end=2026-03-21T00:00:00Z")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── GET /api/stats/participant/:participantId (clinician) ─

describe("GET /api/stats/participant/:participantId", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/stats/participant/some-id");
    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .get("/api/stats/participant/some-id")
      .set(...participantAuthHeader());

    expect(res.status).toBe(403);
  });

  it("returns 404 if participant not found", async () => {
    db.participantProfile.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/stats/participant/non-existent")
      .set(...authHeader());

    expect(res.status).toBe(404);
  });

  it("returns stats for a valid participant (clinician access)", async () => {
    db.participantProfile.findUnique.mockResolvedValue({
      id: "pp-1",
      userId: "user-1",
    } as any);

    db.task.findMany.mockResolvedValue(
      mockTasks([
        { status: "DONE", completedAt: new Date("2026-03-10") },
        { status: "TODO" },
      ]) as any
    );
    db.journalEntry.findMany.mockResolvedValue(
      mockJournalEntries([{ regulationScore: 5 }]) as any
    );
    db.enrollment.findMany.mockResolvedValue([] as any);
    db.calendarEvent.findMany.mockResolvedValue([] as any);

    const res = await request(app)
      .get("/api/stats/participant/pp-1")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.taskCompletion.total).toBe(2);
    expect(res.body.data.taskCompletion.completed).toBe(1);
  });
});
