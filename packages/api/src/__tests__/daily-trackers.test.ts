import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { authHeader, mockProgram } from "./helpers";

const db = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Helpers ──────────────────────────────────────────

function mockTracker(overrides: Record<string, any> = {}) {
  return {
    id: "tracker-1",
    name: "Test Tracker",
    description: "A test tracker",
    programId: "program-1",
    enrollmentId: null,
    reminderTime: "20:00",
    isActive: true,
    createdById: "test-user-id",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function mockTrackerField(overrides: Record<string, any> = {}) {
  return {
    id: "field-1",
    trackerId: "tracker-1",
    label: "Mood",
    fieldType: "SCALE",
    options: { min: 0, max: 10 },
    sortOrder: 0,
    isRequired: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function mockTrackerEntry(overrides: Record<string, any> = {}) {
  return {
    id: "entry-1",
    trackerId: "tracker-1",
    userId: "test-user-id",
    date: new Date("2026-01-15"),
    responses: { "field-1": 7 },
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
    ...overrides,
  };
}

// ── GET /api/daily-trackers/templates ────────────────

describe("GET /api/daily-trackers/templates", () => {
  it("returns the list of preset templates", async () => {
    const res = await request(app)
      .get("/api/daily-trackers/templates")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    // Each template should have key, name, description, fields
    const template = res.body.data[0];
    expect(template).toHaveProperty("key");
    expect(template).toHaveProperty("name");
    expect(template).toHaveProperty("description");
    expect(template).toHaveProperty("fields");
  });

  it("includes the feelings-check-in template", async () => {
    const res = await request(app)
      .get("/api/daily-trackers/templates")
      .set(...authHeader());

    expect(res.status).toBe(200);
    const feelings = res.body.data.find((t: any) => t.key === "feelings-check-in");
    expect(feelings).toBeDefined();
    expect(feelings.name).toBe("Feelings Check-in");
    // Should have a FEELINGS_WHEEL field
    const wheelField = feelings.fields.find((f: any) => f.fieldType === "FEELINGS_WHEEL");
    expect(wheelField).toBeDefined();
    expect(wheelField.isRequired).toBe(true);
    expect(wheelField.options).toEqual({ maxSelections: 3 });
    // Should also have a free text field
    const textField = feelings.fields.find((f: any) => f.fieldType === "FREE_TEXT");
    expect(textField).toBeDefined();
    expect(textField.isRequired).toBe(false);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/daily-trackers/templates");
    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .get("/api/daily-trackers/templates")
      .set(...authHeader({ role: "PARTICIPANT" }));

    expect(res.status).toBe(403);
  });
});

// ── POST /api/daily-trackers ─────────────────────────

describe("POST /api/daily-trackers", () => {
  const validPayload = {
    name: "My Tracker",
    description: "Daily mood tracking",
    programId: "program-1",
    participantId: "participant-1",
    fields: [
      { label: "Mood", fieldType: "SCALE", options: { min: 0, max: 10 }, sortOrder: 0, isRequired: true },
      { label: "Notes", fieldType: "FREE_TEXT", sortOrder: 1, isRequired: false },
    ],
  };

  it("creates a tracker with valid input", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);

    const created = mockTracker({
      name: "My Tracker",
      fields: [
        mockTrackerField({ id: "f1", label: "Mood" }),
        mockTrackerField({ id: "f2", label: "Notes", fieldType: "FREE_TEXT", sortOrder: 1 }),
      ],
    });
    db.dailyTracker.create.mockResolvedValue(created as any);

    const res = await request(app)
      .post("/api/daily-trackers")
      .set(...authHeader())
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("My Tracker");
    expect(db.dailyTracker.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "My Tracker",
          createdById: "test-user-id",
        }),
      })
    );
  });

  it("creates a tracker without programId", async () => {
    const payload = {
      name: "Standalone Tracker",
      participantId: "participant-2",
      fields: [
        { label: "Rating", fieldType: "NUMBER", sortOrder: 0, isRequired: true },
      ],
    };

    const created = mockTracker({ name: "Standalone Tracker", programId: null });
    db.dailyTracker.create.mockResolvedValue(created as any);

    const res = await request(app)
      .post("/api/daily-trackers")
      .set(...authHeader())
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    // Should NOT call program ownership check
    expect(db.program.findFirst).not.toHaveBeenCalled();
  });

  it("returns 400 for missing name", async () => {
    const res = await request(app)
      .post("/api/daily-trackers")
      .set(...authHeader())
      .send({ fields: [{ label: "Mood", fieldType: "SCALE", sortOrder: 0 }] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 for empty fields array", async () => {
    const res = await request(app)
      .post("/api/daily-trackers")
      .set(...authHeader())
      .send({ name: "Test", fields: [] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 for missing fields", async () => {
    const res = await request(app)
      .post("/api/daily-trackers")
      .set(...authHeader())
      .send({ name: "Test" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 for invalid fieldType", async () => {
    const res = await request(app)
      .post("/api/daily-trackers")
      .set(...authHeader())
      .send({
        name: "Test",
        fields: [{ label: "Bad", fieldType: "INVALID_TYPE", sortOrder: 0 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 404 if programId does not belong to clinician", async () => {
    db.program.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/daily-trackers")
      .set(...authHeader())
      .send(validPayload);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Program not found");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/daily-trackers")
      .send(validPayload);

    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .post("/api/daily-trackers")
      .set(...authHeader({ role: "PARTICIPANT" }))
      .send(validPayload);

    expect(res.status).toBe(403);
  });
});

// ── POST /api/daily-trackers/from-template ───────────

describe("POST /api/daily-trackers/from-template", () => {
  it("creates a tracker from a valid template", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.dailyTracker.create.mockResolvedValue(
      mockTracker({ id: "template-tracker-1", name: "Mood Log" }) as any
    );
    db.dailyTracker.findUnique.mockResolvedValue(
      mockTracker({
        id: "template-tracker-1",
        name: "Mood Log",
        fields: [mockTrackerField()],
      }) as any
    );

    const res = await request(app)
      .post("/api/daily-trackers/from-template")
      .set(...authHeader())
      .send({ templateKey: "mood-log", programId: "program-1", participantId: "participant-1" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Mood Log");
  });

  it("creates a tracker from template without programId", async () => {
    db.dailyTracker.create.mockResolvedValue(
      mockTracker({ id: "template-tracker-2", name: "Sleep Diary", programId: null }) as any
    );
    db.dailyTracker.findUnique.mockResolvedValue(
      mockTracker({
        id: "template-tracker-2",
        name: "Sleep Diary",
        programId: null,
        fields: [mockTrackerField({ label: "Bedtime", fieldType: "TIME" })],
      }) as any
    );

    const res = await request(app)
      .post("/api/daily-trackers/from-template")
      .set(...authHeader())
      .send({ templateKey: "sleep-diary", participantId: "participant-2" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(db.program.findFirst).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid template key", async () => {
    db.dailyTracker.create.mockRejectedValue(new Error("Template not found: nonexistent"));

    const res = await request(app)
      .post("/api/daily-trackers/from-template")
      .set(...authHeader())
      .send({ templateKey: "nonexistent", programId: "program-1", participantId: "participant-1" });

    // The route checks for template not found error from the service
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 for missing templateKey", async () => {
    const res = await request(app)
      .post("/api/daily-trackers/from-template")
      .set(...authHeader())
      .send({ programId: "program-1" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 404 if programId does not belong to clinician", async () => {
    db.program.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/daily-trackers/from-template")
      .set(...authHeader())
      .send({ templateKey: "mood-log", programId: "other-program", participantId: "participant-1" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Program not found");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/daily-trackers/from-template")
      .send({ templateKey: "mood-log" });

    expect(res.status).toBe(401);
  });
});

// ── GET /api/daily-trackers?programId=X ──────────────

describe("GET /api/daily-trackers", () => {
  it("lists trackers for a program", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);

    const trackers = [
      mockTracker({
        id: "t1",
        name: "Mood Log",
        fields: [mockTrackerField()],
        _count: { entries: 10 },
      }),
      mockTracker({
        id: "t2",
        name: "Sleep Diary",
        fields: [mockTrackerField({ id: "f2", label: "Sleep Quality" })],
        _count: { entries: 5 },
      }),
    ];
    db.dailyTracker.findMany.mockResolvedValue(trackers as any);

    const res = await request(app)
      .get("/api/daily-trackers?programId=program-1")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(db.dailyTracker.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { programId: "program-1" },
      })
    );
  });

  it("returns 400 if programId is missing", async () => {
    const res = await request(app)
      .get("/api/daily-trackers")
      .set(...authHeader());

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("programId or participantId is required");
  });

  it("returns 404 if program not owned by clinician", async () => {
    db.program.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/daily-trackers?programId=other-program")
      .set(...authHeader());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Program not found");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .get("/api/daily-trackers?programId=program-1");

    expect(res.status).toBe(401);
  });
});

// ── Single check-in constraint ───────────────────────

describe("Single check-in constraint", () => {
  it("returns 409 when creating second tracker for same participant", async () => {
    (prisma as any).dailyTracker.findFirst.mockResolvedValue({ id: "existing-tracker" });

    const res = await request(app)
      .post("/api/daily-trackers")
      .set(...authHeader())
      .send({
        name: "Second Check-in",
        participantId: "participant-1",
        fields: [
          { label: "Mood", fieldType: "SCALE", options: { min: 0, max: 10 }, sortOrder: 0, isRequired: true },
        ],
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain("already exists");
  });

  it("returns 409 when creating from template for participant with existing tracker", async () => {
    (prisma as any).dailyTracker.findFirst.mockResolvedValue({ id: "existing-tracker" });

    const res = await request(app)
      .post("/api/daily-trackers/from-template")
      .set(...authHeader())
      .send({
        templateKey: "mood-log",
        participantId: "participant-1",
      });

    expect(res.status).toBe(409);
  });
});

// ── GET /api/daily-trackers/participant/:participantId ──

describe("GET /api/daily-trackers/participant/:participantId", () => {
  it("returns the single check-in for a participant", async () => {
    (prisma as any).enrollment.findFirst.mockResolvedValue({ id: "enrollment-1" });
    (prisma as any).dailyTracker.findFirst.mockResolvedValue({
      id: "tracker-1",
      name: "Daily Check-in",
      fields: [{ id: "f1", label: "Mood", fieldType: "SCALE" }],
      _count: { entries: 5 },
    });

    const res = await request(app)
      .get("/api/daily-trackers/participant/participant-1")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe("tracker-1");
  });

  it("returns 404 when no check-in exists", async () => {
    (prisma as any).enrollment.findFirst.mockResolvedValue({ id: "enrollment-1" });
    (prisma as any).dailyTracker.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/daily-trackers/participant/participant-1")
      .set(...authHeader());

    expect(res.status).toBe(404);
  });

  it("returns 403 for unrelated clinician", async () => {
    (prisma as any).enrollment.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/daily-trackers/participant/participant-1")
      .set(...authHeader());

    expect(res.status).toBe(403);
  });
});

// ── GET /api/daily-trackers/:id ──────────────────────

describe("GET /api/daily-trackers/:id", () => {
  it("returns a tracker with its fields", async () => {
    const tracker = mockTracker({
      fields: [
        mockTrackerField({ id: "f1", label: "Mood", sortOrder: 0 }),
        mockTrackerField({ id: "f2", label: "Energy", sortOrder: 1 }),
      ],
    });
    db.dailyTracker.findUnique.mockResolvedValue(tracker as any);

    const res = await request(app)
      .get("/api/daily-trackers/tracker-1")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe("tracker-1");
    expect(res.body.data.fields).toHaveLength(2);
  });

  it("returns 404 for non-existent tracker", async () => {
    db.dailyTracker.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/daily-trackers/nonexistent")
      .set(...authHeader());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Tracker not found");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/daily-trackers/tracker-1");
    expect(res.status).toBe(401);
  });
});

// ── PUT /api/daily-trackers/:id ──────────────────────

describe("PUT /api/daily-trackers/:id", () => {
  it("updates tracker metadata (name, reminderTime)", async () => {
    db.dailyTracker.findUnique
      .mockResolvedValueOnce(mockTracker() as any) // existence check
      .mockResolvedValueOnce(
        mockTracker({ name: "Updated Tracker", reminderTime: "09:00", fields: [mockTrackerField()] }) as any
      ); // re-fetch after update
    db.dailyTracker.update.mockResolvedValue(
      mockTracker({ name: "Updated Tracker", reminderTime: "09:00" }) as any
    );

    const res = await request(app)
      .put("/api/daily-trackers/tracker-1")
      .set(...authHeader())
      .send({ name: "Updated Tracker", reminderTime: "09:00" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Updated Tracker");
    expect(db.dailyTracker.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tracker-1" },
        data: expect.objectContaining({ name: "Updated Tracker", reminderTime: "09:00" }),
      })
    );
  });

  it("replaces fields when fields array is provided", async () => {
    db.dailyTracker.findUnique
      .mockResolvedValueOnce(mockTracker() as any) // existence check
      .mockResolvedValueOnce(
        mockTracker({
          fields: [mockTrackerField({ id: "new-f1", label: "New Field" })],
        }) as any
      ); // re-fetch

    // Transaction mock — the setup.ts already handles $transaction calling the fn with db
    db.dailyTrackerField.deleteMany.mockResolvedValue({ count: 1 } as any);
    db.dailyTrackerField.createMany.mockResolvedValue({ count: 1 } as any);

    const res = await request(app)
      .put("/api/daily-trackers/tracker-1")
      .set(...authHeader())
      .send({
        fields: [
          { label: "New Field", fieldType: "NUMBER", sortOrder: 0, isRequired: true },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 404 if tracker not found", async () => {
    db.dailyTracker.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .put("/api/daily-trackers/nonexistent")
      .set(...authHeader())
      .send({ name: "Updated" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Tracker not found");
  });

  it("returns 400 for invalid reminderTime format", async () => {
    const res = await request(app)
      .put("/api/daily-trackers/tracker-1")
      .set(...authHeader())
      .send({ reminderTime: "9am" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 for empty name", async () => {
    const res = await request(app)
      .put("/api/daily-trackers/tracker-1")
      .set(...authHeader())
      .send({ name: "" });

    expect(res.status).toBe(400);
  });

  it("allows empty fields array (replaces all fields with none)", async () => {
    db.dailyTracker.findUnique
      .mockResolvedValueOnce(mockTracker() as any) // existence check
      .mockResolvedValueOnce(mockTracker({ fields: [] }) as any); // re-fetch

    db.dailyTrackerField.deleteMany.mockResolvedValue({ count: 1 } as any);
    db.dailyTrackerField.createMany.mockResolvedValue({ count: 0 } as any);

    const res = await request(app)
      .put("/api/daily-trackers/tracker-1")
      .set(...authHeader())
      .send({ fields: [] });

    expect(res.status).toBe(200);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .put("/api/daily-trackers/tracker-1")
      .send({ name: "Updated" });

    expect(res.status).toBe(401);
  });
});

// ── DELETE /api/daily-trackers/:id ───────────────────

describe("DELETE /api/daily-trackers/:id", () => {
  it("deletes an existing tracker", async () => {
    db.dailyTracker.findUnique.mockResolvedValue(mockTracker() as any);
    db.dailyTracker.delete.mockResolvedValue(mockTracker() as any);

    const res = await request(app)
      .delete("/api/daily-trackers/tracker-1")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(db.dailyTracker.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "tracker-1" } })
    );
  });

  it("returns 404 if tracker not found", async () => {
    db.dailyTracker.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete("/api/daily-trackers/nonexistent")
      .set(...authHeader());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Tracker not found");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).delete("/api/daily-trackers/tracker-1");
    expect(res.status).toBe(401);
  });
});

// ── GET /api/daily-trackers/:id/entries ──────────────

describe("GET /api/daily-trackers/:id/entries", () => {
  it("returns entries with pagination", async () => {
    const entries = [
      mockTrackerEntry({ id: "e1", date: new Date("2026-01-15") }),
      mockTrackerEntry({ id: "e2", date: new Date("2026-01-14") }),
    ];
    db.dailyTrackerEntry.findMany.mockResolvedValue(entries as any);

    const res = await request(app)
      .get("/api/daily-trackers/tracker-1/entries?userId=test-user-id")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.cursor).toBeNull();
  });

  it("returns hasMore cursor when more entries exist", async () => {
    // Default limit is 30, so return 31 entries to trigger hasMore
    const entries = Array.from({ length: 31 }, (_, i) =>
      mockTrackerEntry({ id: `e${i}`, date: new Date(`2026-01-${String(15 - (i % 15)).padStart(2, "0")}`) })
    );
    db.dailyTrackerEntry.findMany.mockResolvedValue(entries as any);

    const res = await request(app)
      .get("/api/daily-trackers/tracker-1/entries?userId=test-user-id")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(30);
    expect(res.body.cursor).toBeTruthy();
  });

  it("supports custom limit", async () => {
    db.dailyTrackerEntry.findMany.mockResolvedValue([] as any);

    const res = await request(app)
      .get("/api/daily-trackers/tracker-1/entries?userId=test-user-id&limit=10")
      .set(...authHeader());

    expect(res.status).toBe(200);
    // The route requests take + 1, so limit=10 means take=11
    expect(db.dailyTrackerEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 11,
      })
    );
  });

  it("supports date range filtering", async () => {
    db.dailyTrackerEntry.findMany.mockResolvedValue([] as any);

    const res = await request(app)
      .get(
        "/api/daily-trackers/tracker-1/entries?userId=test-user-id&startDate=2026-01-01&endDate=2026-01-31"
      )
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(db.dailyTrackerEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          trackerId: "tracker-1",
          userId: "test-user-id",
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

    const res = await request(app)
      .get("/api/daily-trackers/tracker-1/entries?userId=test-user-id&cursor=e5")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(db.dailyTrackerEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: "e5" },
        skip: 1,
      })
    );
  });

  it("returns 400 if userId is missing", async () => {
    const res = await request(app)
      .get("/api/daily-trackers/tracker-1/entries")
      .set(...authHeader());

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("userId is required");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .get("/api/daily-trackers/tracker-1/entries?userId=test-user-id");

    expect(res.status).toBe(401);
  });
});

// ── GET /api/daily-trackers/:id/trends ───────────────

describe("GET /api/daily-trackers/:id/trends", () => {
  const trackerWithFields = mockTracker({
    fields: [
      mockTrackerField({ id: "f-mood", label: "Mood", fieldType: "SCALE" }),
      mockTrackerField({ id: "f-energy", label: "Energy", fieldType: "NUMBER", sortOrder: 1 }),
      mockTrackerField({ id: "f-notes", label: "Notes", fieldType: "FREE_TEXT", sortOrder: 2 }),
    ],
  });

  it("returns trend data with field trends, completion rate, and streak", async () => {
    // Use fixed dates in the past so streak = 0 (predictable), focus on structure
    const date1 = new Date("2026-01-10T00:00:00Z");
    const date2 = new Date("2026-01-09T00:00:00Z");

    db.dailyTracker.findUnique.mockResolvedValue(trackerWithFields as any);
    db.dailyTrackerEntry.findMany.mockResolvedValue([
      mockTrackerEntry({
        id: "e1",
        date: date1,
        responses: { "f-mood": 8, "f-energy": 7, "f-notes": "good day" },
      }),
      mockTrackerEntry({
        id: "e2",
        date: date2,
        responses: { "f-mood": 6, "f-energy": 5 },
      }),
    ] as any);

    const res = await request(app)
      .get("/api/daily-trackers/tracker-1/trends?userId=test-user-id")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { data } = res.body;
    expect(data).toHaveProperty("fields");
    expect(data).toHaveProperty("fieldTrends");
    expect(data).toHaveProperty("completionRate");
    expect(data).toHaveProperty("totalDays");
    expect(data).toHaveProperty("completedDays");
    expect(data).toHaveProperty("streak");
    expect(data.completedDays).toBe(2);
    expect(typeof data.streak).toBe("number");
    // Only SCALE and NUMBER fields should have trends
    expect(data.fieldTrends).toHaveProperty("f-mood");
    expect(data.fieldTrends).toHaveProperty("f-energy");
    expect(data.fieldTrends).not.toHaveProperty("f-notes");
    // Verify field trends contain data points
    expect(data.fieldTrends["f-mood"]).toHaveLength(2);
    expect(data.fieldTrends["f-energy"]).toHaveLength(2);
  });

  it("supports custom date range", async () => {
    db.dailyTracker.findUnique.mockResolvedValue(trackerWithFields as any);
    db.dailyTrackerEntry.findMany.mockResolvedValue([] as any);

    const res = await request(app)
      .get(
        "/api/daily-trackers/tracker-1/trends?userId=test-user-id&startDate=2026-01-01&endDate=2026-01-31"
      )
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.totalDays).toBe(31);
    expect(res.body.data.completedDays).toBe(0);
    expect(res.body.data.completionRate).toBe(0);
  });

  it("returns 0 streak when no entries match today", async () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2);
    twoDaysAgo.setUTCHours(0, 0, 0, 0);

    db.dailyTracker.findUnique.mockResolvedValue(trackerWithFields as any);
    db.dailyTrackerEntry.findMany.mockResolvedValue([
      mockTrackerEntry({ id: "e1", date: twoDaysAgo, responses: { "f-mood": 5 } }),
    ] as any);

    const res = await request(app)
      .get("/api/daily-trackers/tracker-1/trends?userId=test-user-id")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.streak).toBe(0);
  });

  it("returns 404 if tracker not found", async () => {
    db.dailyTracker.findUnique.mockResolvedValue(null);
    db.dailyTrackerEntry.findMany.mockResolvedValue([] as any);

    const res = await request(app)
      .get("/api/daily-trackers/tracker-1/trends?userId=test-user-id")
      .set(...authHeader());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Tracker not found");
  });

  it("returns 400 if userId is missing", async () => {
    const res = await request(app)
      .get("/api/daily-trackers/tracker-1/trends")
      .set(...authHeader());

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("userId is required");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .get("/api/daily-trackers/tracker-1/trends?userId=test-user-id");

    expect(res.status).toBe(401);
  });

  it("returns emotionTrends for FEELINGS_WHEEL fields", async () => {
    const trackerWithFeelings = mockTracker({
      fields: [
        mockTrackerField({ id: "f-mood", label: "Mood", fieldType: "SCALE" }),
        mockTrackerField({
          id: "f-feelings",
          label: "How are you feeling?",
          fieldType: "FEELINGS_WHEEL",
          options: { maxSelections: 3 },
          sortOrder: 1,
        }),
      ],
    });

    const date1 = new Date("2026-01-10T00:00:00Z");
    const date2 = new Date("2026-01-09T00:00:00Z");

    db.dailyTracker.findUnique.mockResolvedValue(trackerWithFeelings as any);
    db.dailyTrackerEntry.findMany.mockResolvedValue([
      mockTrackerEntry({
        id: "e1",
        date: date1,
        responses: {
          "f-mood": 8,
          "f-feelings": ["happy.optimistic.hopeful", "sad.lonely"],
        },
      }),
      mockTrackerEntry({
        id: "e2",
        date: date2,
        responses: {
          "f-mood": 6,
          "f-feelings": ["happy.optimistic.hopeful", "angry"],
        },
      }),
    ] as any);

    const res = await request(app)
      .get("/api/daily-trackers/tracker-1/trends?userId=test-user-id")
      .set(...authHeader());

    expect(res.status).toBe(200);
    const { data } = res.body;
    expect(data).toHaveProperty("emotionTrends");
    expect(data.emotionTrends).toHaveProperty("f-feelings");

    const emotionData = data.emotionTrends["f-feelings"];
    expect(emotionData).toHaveProperty("byEmotion");
    expect(emotionData).toHaveProperty("byPrimary");
    expect(emotionData).toHaveProperty("timeline");

    // hopeful appears twice
    const hopeful = emotionData.byEmotion.find(
      (e: any) => e.emotionId === "happy.optimistic.hopeful"
    );
    expect(hopeful).toBeDefined();
    expect(hopeful.count).toBe(2);
    expect(hopeful.color).toBe("#8FAE8B");

    // happy primary should have count of 2 (both from hopeful)
    const happyPrimary = emotionData.byPrimary.find(
      (e: any) => e.emotionId === "happy"
    );
    expect(happyPrimary).toBeDefined();
    expect(happyPrimary.count).toBe(2);

    // Timeline should have 2 entries
    expect(emotionData.timeline).toHaveLength(2);
  });
});
