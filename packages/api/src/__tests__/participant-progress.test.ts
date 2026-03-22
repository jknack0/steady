import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { participantAuthHeader, authHeader } from "./helpers";

const db = vi.mocked(prisma) as any;

// Mock services used by participant routes
vi.mock("../services/notifications", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    cancelHomeworkReminders: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("../services/homework-instances", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    generateInstancesForEnrollment: vi.fn().mockResolvedValue(undefined),
    getStreakData: vi.fn().mockResolvedValue({
      currentStreak: 3,
      longestStreak: 7,
      totalCompleted: 10,
      totalInstances: 14,
      completionRate: 0.71,
    }),
  };
});

import { getStreakData } from "../services/homework-instances";
const mockGetStreakData = vi.mocked(getStreakData);

// Add homeworkInstance mock (not in setup.ts)
if (!db.homeworkInstance) {
  db.homeworkInstance = {
    create: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  };
}

// Add dailyTrackerEntry.upsert if missing
if (!db.dailyTrackerEntry.upsert) {
  db.dailyTrackerEntry.upsert = vi.fn();
}

beforeEach(() => {
  vi.clearAllMocks();
});

const PARTICIPANT_ID = "test-participant-profile-id";
const USER_ID = "test-user-id";

const mockEnrollment = (overrides: any = {}) => ({
  id: "enroll-1",
  participantId: PARTICIPANT_ID,
  programId: "program-1",
  status: "ACTIVE",
  enrolledAt: new Date(),
  completedAt: null,
  currentModuleId: "mod-1",
  ...overrides,
});

const mockHomeworkInstance = (overrides: any = {}) => ({
  id: "hw-inst-1",
  partId: "part-hw-1",
  enrollmentId: "enroll-1",
  dueDate: new Date(),
  status: "PENDING",
  completedAt: null,
  response: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  enrollment: {
    participantId: PARTICIPANT_ID,
  },
  ...overrides,
});

// ══════════════════════════════════════════════════════
//  Homework Instance Endpoints
// ══════════════════════════════════════════════════════

describe("GET /api/participant/homework-instances", () => {
  it("lists homework instances for today", async () => {
    db.enrollment.findMany.mockResolvedValue([
      { id: "enroll-1" },
      { id: "enroll-2" },
    ] as any);

    const instances = [
      mockHomeworkInstance({
        part: { id: "part-1", title: "Practice mindfulness", content: {}, type: "HOMEWORK" },
        enrollment: { id: "enroll-1", programId: "program-1" },
      }),
    ];
    db.homeworkInstance.findMany.mockResolvedValue(instances as any);

    const res = await request(app)
      .get("/api/participant/homework-instances")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(db.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          participantId: PARTICIPANT_ID,
          status: "ACTIVE",
        }),
      })
    );
  });

  it("filters by date query param", async () => {
    db.enrollment.findMany.mockResolvedValue([{ id: "enroll-1" }] as any);
    db.homeworkInstance.findMany.mockResolvedValue([] as any);

    const res = await request(app)
      .get("/api/participant/homework-instances?date=2026-03-25")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(db.homeworkInstance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dueDate: expect.any(Date),
        }),
      })
    );
  });

  it("filters by enrollmentId query param", async () => {
    db.enrollment.findMany.mockResolvedValue([{ id: "enroll-1" }] as any);
    db.homeworkInstance.findMany.mockResolvedValue([] as any);

    const res = await request(app)
      .get("/api/participant/homework-instances?enrollmentId=enroll-1")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(db.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "enroll-1",
        }),
      })
    );
  });

  it("returns empty array when no active enrollments", async () => {
    db.enrollment.findMany.mockResolvedValue([] as any);
    db.homeworkInstance.findMany.mockResolvedValue([] as any);

    const res = await request(app)
      .get("/api/participant/homework-instances")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/participant/homework-instances");
    expect(res.status).toBe(401);
  });

  it("returns 403 for clinician role", async () => {
    const res = await request(app)
      .get("/api/participant/homework-instances")
      .set(...authHeader());
    expect(res.status).toBe(403);
  });
});

// ── POST /api/participant/homework-instances/:id/complete ──

describe("POST /api/participant/homework-instances/:id/complete", () => {
  it("completes a pending instance", async () => {
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);

    db.homeworkInstance.findUnique.mockResolvedValue(
      mockHomeworkInstance({ dueDate: now }) as any
    );
    db.homeworkInstance.update.mockResolvedValue(
      mockHomeworkInstance({ status: "COMPLETED", completedAt: new Date() }) as any
    );

    const res = await request(app)
      .post("/api/participant/homework-instances/hw-inst-1/complete")
      .set(...participantAuthHeader())
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(db.homeworkInstance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "hw-inst-1" },
        data: expect.objectContaining({
          status: "COMPLETED",
          completedAt: expect.any(Date),
        }),
      })
    );
  });

  it("accepts a response payload", async () => {
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);

    db.homeworkInstance.findUnique.mockResolvedValue(
      mockHomeworkInstance({ dueDate: now }) as any
    );
    db.homeworkInstance.update.mockResolvedValue(
      mockHomeworkInstance({ status: "COMPLETED", response: { notes: "done!" } }) as any
    );

    const res = await request(app)
      .post("/api/participant/homework-instances/hw-inst-1/complete")
      .set(...participantAuthHeader())
      .send({ response: { notes: "done!" } });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 404 if instance not found", async () => {
    db.homeworkInstance.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/participant/homework-instances/nonexistent/complete")
      .set(...participantAuthHeader())
      .send({});

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 404 if instance belongs to a different participant", async () => {
    db.homeworkInstance.findUnique.mockResolvedValue(
      mockHomeworkInstance({
        enrollment: { participantId: "other-participant-id" },
      }) as any
    );

    const res = await request(app)
      .post("/api/participant/homework-instances/hw-inst-1/complete")
      .set(...participantAuthHeader())
      .send({});

    expect(res.status).toBe(404);
  });

  it("returns 409 if instance is already completed", async () => {
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);

    db.homeworkInstance.findUnique.mockResolvedValue(
      mockHomeworkInstance({ status: "COMPLETED", dueDate: now }) as any
    );

    const res = await request(app)
      .post("/api/participant/homework-instances/hw-inst-1/complete")
      .set(...participantAuthHeader())
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already completed/i);
  });

  it("returns 400 if instance is older than 48 hours", async () => {
    const oldDate = new Date();
    oldDate.setUTCDate(oldDate.getUTCDate() - 5);
    oldDate.setUTCHours(0, 0, 0, 0);

    db.homeworkInstance.findUnique.mockResolvedValue(
      mockHomeworkInstance({ dueDate: oldDate }) as any
    );

    const res = await request(app)
      .post("/api/participant/homework-instances/hw-inst-1/complete")
      .set(...participantAuthHeader())
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/48 hours/i);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/participant/homework-instances/hw-inst-1/complete")
      .send({});
    expect(res.status).toBe(401);
  });

  it("returns 403 for clinician role", async () => {
    const res = await request(app)
      .post("/api/participant/homework-instances/hw-inst-1/complete")
      .set(...authHeader())
      .send({});
    expect(res.status).toBe(403);
  });
});

// ── POST /api/participant/homework-instances/:id/skip ──

describe("POST /api/participant/homework-instances/:id/skip", () => {
  it("skips a pending instance", async () => {
    db.homeworkInstance.findUnique.mockResolvedValue(
      mockHomeworkInstance({ status: "PENDING" }) as any
    );
    db.homeworkInstance.update.mockResolvedValue(
      mockHomeworkInstance({ status: "SKIPPED" }) as any
    );

    const res = await request(app)
      .post("/api/participant/homework-instances/hw-inst-1/skip")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(db.homeworkInstance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "hw-inst-1" },
        data: { status: "SKIPPED" },
      })
    );
  });

  it("returns 404 if instance not found", async () => {
    db.homeworkInstance.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/participant/homework-instances/nonexistent/skip")
      .set(...participantAuthHeader());

    expect(res.status).toBe(404);
  });

  it("returns 404 if instance belongs to different participant", async () => {
    db.homeworkInstance.findUnique.mockResolvedValue(
      mockHomeworkInstance({
        enrollment: { participantId: "other-participant-id" },
      }) as any
    );

    const res = await request(app)
      .post("/api/participant/homework-instances/hw-inst-1/skip")
      .set(...participantAuthHeader());

    expect(res.status).toBe(404);
  });

  it("returns 409 if instance is not pending", async () => {
    db.homeworkInstance.findUnique.mockResolvedValue(
      mockHomeworkInstance({ status: "COMPLETED" }) as any
    );

    const res = await request(app)
      .post("/api/participant/homework-instances/hw-inst-1/skip")
      .set(...participantAuthHeader());

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/pending/i);
  });

  it("returns 409 if instance is already skipped", async () => {
    db.homeworkInstance.findUnique.mockResolvedValue(
      mockHomeworkInstance({ status: "SKIPPED" }) as any
    );

    const res = await request(app)
      .post("/api/participant/homework-instances/hw-inst-1/skip")
      .set(...participantAuthHeader());

    expect(res.status).toBe(409);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/participant/homework-instances/hw-inst-1/skip");
    expect(res.status).toBe(401);
  });
});

// ── GET /api/participant/homework-instances/:id/streak ──

describe("GET /api/participant/homework-instances/:id/streak", () => {
  it("returns streak data for a valid instance", async () => {
    db.homeworkInstance.findUnique.mockResolvedValue(
      mockHomeworkInstance() as any
    );

    const res = await request(app)
      .get("/api/participant/homework-instances/hw-inst-1/streak")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({
      currentStreak: 3,
      longestStreak: 7,
      totalCompleted: 10,
      totalInstances: 14,
      completionRate: 0.71,
    });
    expect(mockGetStreakData).toHaveBeenCalledWith("part-hw-1", "enroll-1");
  });

  it("returns 404 if instance not found", async () => {
    db.homeworkInstance.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/participant/homework-instances/nonexistent/streak")
      .set(...participantAuthHeader());

    expect(res.status).toBe(404);
  });

  it("returns 404 if instance belongs to different participant", async () => {
    db.homeworkInstance.findUnique.mockResolvedValue(
      mockHomeworkInstance({
        enrollment: { participantId: "other-participant-id" },
      }) as any
    );

    const res = await request(app)
      .get("/api/participant/homework-instances/hw-inst-1/streak")
      .set(...participantAuthHeader());

    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .get("/api/participant/homework-instances/hw-inst-1/streak");
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════
//  Daily Tracker Endpoints
// ══════════════════════════════════════════════════════

const mockTracker = (overrides: any = {}) => ({
  id: "tracker-1",
  name: "Mood Tracker",
  programId: "program-1",
  enrollmentId: null,
  isActive: true,
  reminderTime: "17:00",
  createdAt: new Date(),
  updatedAt: new Date(),
  fields: [
    {
      id: "field-1",
      trackerId: "tracker-1",
      label: "Mood",
      type: "SCALE",
      sortOrder: 0,
      options: { min: 1, max: 10 },
    },
  ],
  ...overrides,
});

describe("GET /api/participant/daily-trackers", () => {
  it("lists assigned trackers with today's completion status", async () => {
    db.enrollment.findMany.mockResolvedValue([
      { id: "enroll-1", programId: "program-1" },
    ] as any);
    db.dailyTracker.findMany.mockResolvedValue([mockTracker()] as any);
    db.dailyTrackerEntry.findMany.mockResolvedValue([
      { trackerId: "tracker-1" },
    ] as any);

    const res = await request(app)
      .get("/api/participant/daily-trackers")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].completedToday).toBe(true);
    expect(res.body.data[0].name).toBe("Mood Tracker");
  });

  it("marks trackers as not completed when no entry for today", async () => {
    db.enrollment.findMany.mockResolvedValue([
      { id: "enroll-1", programId: "program-1" },
    ] as any);
    db.dailyTracker.findMany.mockResolvedValue([mockTracker()] as any);
    db.dailyTrackerEntry.findMany.mockResolvedValue([] as any);

    const res = await request(app)
      .get("/api/participant/daily-trackers")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data[0].completedToday).toBe(false);
  });

  it("returns empty list when no active enrollments", async () => {
    db.enrollment.findMany.mockResolvedValue([] as any);
    db.dailyTracker.findMany.mockResolvedValue([] as any);
    db.dailyTrackerEntry.findMany.mockResolvedValue([] as any);

    const res = await request(app)
      .get("/api/participant/daily-trackers")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/participant/daily-trackers");
    expect(res.status).toBe(401);
  });

  it("returns 403 for clinician role", async () => {
    const res = await request(app)
      .get("/api/participant/daily-trackers")
      .set(...authHeader());
    expect(res.status).toBe(403);
  });
});

// ── GET /api/participant/daily-trackers/:id/today ──

describe("GET /api/participant/daily-trackers/:id/today", () => {
  it("returns tracker and today's entry when it exists", async () => {
    const entry = {
      id: "entry-1",
      trackerId: "tracker-1",
      userId: USER_ID,
      date: new Date(),
      responses: { mood: 8 },
      completedAt: new Date(),
    };
    db.dailyTrackerEntry.findUnique.mockResolvedValue(entry as any);
    db.dailyTracker.findUnique.mockResolvedValue(mockTracker() as any);

    const res = await request(app)
      .get("/api/participant/daily-trackers/tracker-1/today")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tracker.name).toBe("Mood Tracker");
    expect(res.body.data.entry).toBeTruthy();
  });

  it("returns tracker with null entry when no entry for today", async () => {
    db.dailyTrackerEntry.findUnique.mockResolvedValue(null);
    db.dailyTracker.findUnique.mockResolvedValue(mockTracker() as any);

    const res = await request(app)
      .get("/api/participant/daily-trackers/tracker-1/today")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.tracker.name).toBe("Mood Tracker");
    expect(res.body.data.entry).toBeNull();
  });

  it("returns 404 if tracker does not exist", async () => {
    db.dailyTrackerEntry.findUnique.mockResolvedValue(null);
    db.dailyTracker.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/participant/daily-trackers/nonexistent/today")
      .set(...participantAuthHeader());

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .get("/api/participant/daily-trackers/tracker-1/today");
    expect(res.status).toBe(401);
  });
});

// ── POST /api/participant/daily-trackers/:id/entries ──

describe("POST /api/participant/daily-trackers/:id/entries", () => {
  it("submits a new tracker entry", async () => {
    const entryData = {
      date: "2026-03-22",
      responses: { mood: 7, energy: 5 },
    };
    const createdEntry = {
      id: "entry-1",
      trackerId: "tracker-1",
      userId: USER_ID,
      date: new Date("2026-03-22"),
      responses: entryData.responses,
      completedAt: new Date(),
    };
    db.dailyTrackerEntry.upsert.mockResolvedValue(createdEntry as any);

    const res = await request(app)
      .post("/api/participant/daily-trackers/tracker-1/entries")
      .set(...participantAuthHeader())
      .send(entryData);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(db.dailyTrackerEntry.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          trackerId_userId_date: {
            trackerId: "tracker-1",
            userId: USER_ID,
            date: expect.any(Date),
          },
        },
        create: expect.objectContaining({
          trackerId: "tracker-1",
          userId: USER_ID,
          responses: entryData.responses,
        }),
      })
    );
  });

  it("updates existing entry for the same date (upsert)", async () => {
    const entryData = {
      date: "2026-03-22",
      responses: { mood: 9 },
    };
    db.dailyTrackerEntry.upsert.mockResolvedValue({
      id: "entry-1",
      responses: { mood: 9 },
    } as any);

    const res = await request(app)
      .post("/api/participant/daily-trackers/tracker-1/entries")
      .set(...participantAuthHeader())
      .send(entryData);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(db.dailyTrackerEntry.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          responses: { mood: 9 },
        }),
      })
    );
  });

  it("returns 400 if date format is invalid", async () => {
    const res = await request(app)
      .post("/api/participant/daily-trackers/tracker-1/entries")
      .set(...participantAuthHeader())
      .send({ date: "not-a-date", responses: { mood: 5 } });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/validation/i);
  });

  it("returns 400 if date is missing", async () => {
    const res = await request(app)
      .post("/api/participant/daily-trackers/tracker-1/entries")
      .set(...participantAuthHeader())
      .send({ responses: { mood: 5 } });

    expect(res.status).toBe(400);
  });

  it("returns 400 if responses is missing", async () => {
    const res = await request(app)
      .post("/api/participant/daily-trackers/tracker-1/entries")
      .set(...participantAuthHeader())
      .send({ date: "2026-03-22" });

    expect(res.status).toBe(400);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/participant/daily-trackers/tracker-1/entries")
      .send({ date: "2026-03-22", responses: {} });
    expect(res.status).toBe(401);
  });

  it("returns 403 for clinician role", async () => {
    const res = await request(app)
      .post("/api/participant/daily-trackers/tracker-1/entries")
      .set(...authHeader())
      .send({ date: "2026-03-22", responses: {} });
    expect(res.status).toBe(403);
  });
});

// ── GET /api/participant/daily-trackers/:id/history ──

describe("GET /api/participant/daily-trackers/:id/history", () => {
  it("returns paginated history entries", async () => {
    const entries = Array.from({ length: 5 }, (_, i) => ({
      id: `entry-${i}`,
      trackerId: "tracker-1",
      userId: USER_ID,
      date: new Date(`2026-03-${22 - i}`),
      responses: { mood: 7 },
      completedAt: new Date(),
    }));
    db.dailyTrackerEntry.findMany.mockResolvedValue(entries as any);

    const res = await request(app)
      .get("/api/participant/daily-trackers/tracker-1/history")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.cursor).toBeNull(); // no more pages
  });

  it("returns cursor when there are more entries", async () => {
    // Default limit is 30, return 31 to trigger hasMore
    const entries = Array.from({ length: 31 }, (_, i) => ({
      id: `entry-${i}`,
      trackerId: "tracker-1",
      userId: USER_ID,
      date: new Date(),
      responses: {},
      completedAt: new Date(),
    }));
    db.dailyTrackerEntry.findMany.mockResolvedValue(entries as any);

    const res = await request(app)
      .get("/api/participant/daily-trackers/tracker-1/history")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(30);
    expect(res.body.cursor).toBe("entry-29");
  });

  it("supports custom limit", async () => {
    db.dailyTrackerEntry.findMany.mockResolvedValue([] as any);

    const res = await request(app)
      .get("/api/participant/daily-trackers/tracker-1/history?limit=10")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    // Check that findMany was called with take: 11 (limit + 1 for hasMore check)
    expect(db.dailyTrackerEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 11,
      })
    );
  });

  it("caps limit at 100", async () => {
    db.dailyTrackerEntry.findMany.mockResolvedValue([] as any);

    await request(app)
      .get("/api/participant/daily-trackers/tracker-1/history?limit=500")
      .set(...participantAuthHeader());

    expect(db.dailyTrackerEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 101, // 100 + 1
      })
    );
  });

  it("filters by date range", async () => {
    db.dailyTrackerEntry.findMany.mockResolvedValue([] as any);

    const res = await request(app)
      .get("/api/participant/daily-trackers/tracker-1/history?startDate=2026-03-01&endDate=2026-03-22")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(db.dailyTrackerEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        }),
      })
    );
  });

  it("supports cursor-based pagination", async () => {
    db.dailyTrackerEntry.findMany.mockResolvedValue([] as any);

    await request(app)
      .get("/api/participant/daily-trackers/tracker-1/history?cursor=entry-10")
      .set(...participantAuthHeader());

    expect(db.dailyTrackerEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: "entry-10" },
        skip: 1,
      })
    );
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .get("/api/participant/daily-trackers/tracker-1/history");
    expect(res.status).toBe(401);
  });
});

// ── GET /api/participant/daily-trackers/:id/streak ──

describe("GET /api/participant/daily-trackers/:id/streak", () => {
  it("returns current streak when entries are consecutive from today", async () => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const entries = [
      { date: new Date(today) },
      { date: new Date(new Date(today).setUTCDate(today.getUTCDate() - 1)) },
      { date: new Date(new Date(today).setUTCDate(today.getUTCDate() - 2)) },
    ].map((e) => {
      const d = new Date(e.date);
      d.setUTCHours(0, 0, 0, 0);
      return { date: d };
    });

    db.dailyTrackerEntry.findMany.mockResolvedValue(entries as any);

    const res = await request(app)
      .get("/api/participant/daily-trackers/tracker-1/streak")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.streak).toBe(3);
    expect(res.body.data.totalEntries).toBe(3);
  });

  it("returns streak of 0 when no entries", async () => {
    db.dailyTrackerEntry.findMany.mockResolvedValue([] as any);

    const res = await request(app)
      .get("/api/participant/daily-trackers/tracker-1/streak")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.streak).toBe(0);
    expect(res.body.data.totalEntries).toBe(0);
  });

  it("breaks streak when there is a gap", async () => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Today and 3 days ago (gap at yesterday and 2 days ago)
    const entries = [
      { date: new Date(today) },
      { date: new Date(new Date(today).setUTCDate(today.getUTCDate() - 3)) },
    ].map((e) => {
      const d = new Date(e.date);
      d.setUTCHours(0, 0, 0, 0);
      return { date: d };
    });

    db.dailyTrackerEntry.findMany.mockResolvedValue(entries as any);

    const res = await request(app)
      .get("/api/participant/daily-trackers/tracker-1/streak")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    // Only today matches, yesterday doesn't, so streak = 1
    expect(res.body.data.streak).toBe(1);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .get("/api/participant/daily-trackers/tracker-1/streak");
    expect(res.status).toBe(401);
  });

  it("returns 403 for clinician role", async () => {
    const res = await request(app)
      .get("/api/participant/daily-trackers/tracker-1/streak")
      .set(...authHeader());
    expect(res.status).toBe(403);
  });
});
