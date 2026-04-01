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

function mockEntry(overrides: Record<string, any> = {}) {
  return {
    id: "entry-1",
    participantId: "test-participant-profile-id",
    entryDate: new Date("2026-04-01"),
    freeformContent: "Today was productive.",
    responses: null,
    regulationScore: 7,
    isSharedWithClinician: false,
    promptPartId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── POST /api/participant/journal ──────────────────────────────────────────

describe("POST /api/participant/journal", () => {
  it("creates a new journal entry", async () => {
    const entry = mockEntry();
    db.journalEntry.upsert.mockResolvedValue(entry as any);

    const res = await request(app)
      .post("/api/participant/journal")
      .set(...participantAuthHeader())
      .send({
        entryDate: "2026-04-01",
        freeformContent: "Today was productive.",
        regulationScore: 7,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.freeformContent).toBe("Today was productive.");
    expect(db.journalEntry.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          participantId_entryDate: {
            participantId: "test-participant-profile-id",
            entryDate: expect.any(Date),
          },
        },
        create: expect.objectContaining({
          participantId: "test-participant-profile-id",
          freeformContent: "Today was productive.",
          regulationScore: 7,
        }),
        update: expect.objectContaining({
          freeformContent: "Today was productive.",
          regulationScore: 7,
        }),
      })
    );
  });

  it("upserts an existing entry for the same date", async () => {
    const updated = mockEntry({ freeformContent: "Updated content" });
    db.journalEntry.upsert.mockResolvedValue(updated as any);

    const res = await request(app)
      .post("/api/participant/journal")
      .set(...participantAuthHeader())
      .send({
        entryDate: "2026-04-01",
        freeformContent: "Updated content",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.freeformContent).toBe("Updated content");
  });

  it("creates an entry with all optional fields", async () => {
    const entry = mockEntry({
      responses: { q1: "answer1" },
      isSharedWithClinician: true,
      promptPartId: "prompt-1",
    });
    db.journalEntry.upsert.mockResolvedValue(entry as any);

    const res = await request(app)
      .post("/api/participant/journal")
      .set(...participantAuthHeader())
      .send({
        entryDate: "2026-04-01",
        freeformContent: "Today was productive.",
        responses: { q1: "answer1" },
        regulationScore: 7,
        isSharedWithClinician: true,
        promptPartId: "prompt-1",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 400 for missing entryDate", async () => {
    const res = await request(app)
      .post("/api/participant/journal")
      .set(...participantAuthHeader())
      .send({ freeformContent: "No date provided" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 for invalid date format", async () => {
    const res = await request(app)
      .post("/api/participant/journal")
      .set(...participantAuthHeader())
      .send({ entryDate: "not-a-date" });

    // Zod accepts the string, route handler catches invalid date
    expect(res.status).toBe(400);
  });

  it("returns 400 when regulationScore is below 1", async () => {
    const res = await request(app)
      .post("/api/participant/journal")
      .set(...participantAuthHeader())
      .send({ entryDate: "2026-04-01", regulationScore: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 when regulationScore is above 10", async () => {
    const res = await request(app)
      .post("/api/participant/journal")
      .set(...participantAuthHeader())
      .send({ entryDate: "2026-04-01", regulationScore: 11 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("accepts regulationScore at boundary values (1 and 10)", async () => {
    db.journalEntry.upsert.mockResolvedValue(mockEntry({ regulationScore: 1 }) as any);

    const res1 = await request(app)
      .post("/api/participant/journal")
      .set(...participantAuthHeader())
      .send({ entryDate: "2026-04-01", regulationScore: 1 });
    expect(res1.status).toBe(200);

    db.journalEntry.upsert.mockResolvedValue(mockEntry({ regulationScore: 10 }) as any);

    const res10 = await request(app)
      .post("/api/participant/journal")
      .set(...participantAuthHeader())
      .send({ entryDate: "2026-04-02", regulationScore: 10 });
    expect(res10.status).toBe(200);
  });

  it("allows null regulationScore", async () => {
    db.journalEntry.upsert.mockResolvedValue(mockEntry({ regulationScore: null }) as any);

    const res = await request(app)
      .post("/api/participant/journal")
      .set(...participantAuthHeader())
      .send({ entryDate: "2026-04-01", regulationScore: null });

    expect(res.status).toBe(200);
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app)
      .post("/api/participant/journal")
      .send({ entryDate: "2026-04-01" });

    expect(res.status).toBe(401);
  });

  it("returns 403 for clinician role", async () => {
    const res = await request(app)
      .post("/api/participant/journal")
      .set(...authHeader({ role: "CLINICIAN" }))
      .send({ entryDate: "2026-04-01" });

    expect(res.status).toBe(403);
  });
});

// ─── GET /api/participant/journal ───────────────────────────────────────────

describe("GET /api/participant/journal", () => {
  it("lists journal entries", async () => {
    const entries = [
      mockEntry({ id: "e1", entryDate: new Date("2026-04-01") }),
      mockEntry({ id: "e2", entryDate: new Date("2026-03-31") }),
    ];
    db.journalEntry.findMany.mockResolvedValue(entries as any);

    const res = await request(app)
      .get("/api/participant/journal")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.cursor).toBeNull();
  });

  it("filters by date range", async () => {
    db.journalEntry.findMany.mockResolvedValue([] as any);

    await request(app)
      .get("/api/participant/journal?start=2026-03-01&end=2026-03-31")
      .set(...participantAuthHeader());

    expect(db.journalEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          participantId: "test-participant-profile-id",
          entryDate: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        }),
      })
    );
  });

  it("filters with only start date", async () => {
    db.journalEntry.findMany.mockResolvedValue([] as any);

    await request(app)
      .get("/api/participant/journal?start=2026-03-01")
      .set(...participantAuthHeader());

    expect(db.journalEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          entryDate: {
            gte: expect.any(Date),
          },
        }),
      })
    );
  });

  it("supports cursor-based pagination", async () => {
    const entries = Array.from({ length: 31 }, (_, i) =>
      mockEntry({ id: `entry-${i}` })
    );
    db.journalEntry.findMany.mockResolvedValue(entries as any);

    const res = await request(app)
      .get("/api/participant/journal?limit=30")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(30);
    expect(res.body.cursor).toBe("entry-29");
  });

  it("passes cursor to prisma when provided", async () => {
    db.journalEntry.findMany.mockResolvedValue([] as any);

    await request(app)
      .get("/api/participant/journal?cursor=some-cursor-id")
      .set(...participantAuthHeader());

    expect(db.journalEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 1,
        cursor: { id: "some-cursor-id" },
      })
    );
  });

  it("caps limit at 100", async () => {
    db.journalEntry.findMany.mockResolvedValue([] as any);

    await request(app)
      .get("/api/participant/journal?limit=500")
      .set(...participantAuthHeader());

    expect(db.journalEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 101, // 100 + 1 for pagination check
      })
    );
  });

  it("orders entries by entryDate descending", async () => {
    db.journalEntry.findMany.mockResolvedValue([] as any);

    await request(app)
      .get("/api/participant/journal")
      .set(...participantAuthHeader());

    expect(db.journalEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { entryDate: "desc" },
      })
    );
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/participant/journal");
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/participant/journal/:date ─────────────────────────────────────

describe("GET /api/participant/journal/:date", () => {
  it("returns an entry for a specific date", async () => {
    const entry = mockEntry({ entryDate: new Date("2026-04-01") });
    db.journalEntry.findUnique.mockResolvedValue(entry as any);

    const res = await request(app)
      .get("/api/participant/journal/2026-04-01")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(db.journalEntry.findUnique).toHaveBeenCalledWith({
      where: {
        participantId_entryDate: {
          participantId: "test-participant-profile-id",
          entryDate: expect.any(Date),
        },
      },
    });
  });

  it("returns null data when no entry exists for the date", async () => {
    db.journalEntry.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/participant/journal/2026-04-15")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
  });

  it("returns 400 for invalid date format", async () => {
    const res = await request(app)
      .get("/api/participant/journal/not-a-date")
      .set(...participantAuthHeader());

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid date format. Use YYYY-MM-DD");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/participant/journal/2026-04-01");
    expect(res.status).toBe(401);
  });
});
