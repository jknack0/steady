import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { participantAuthHeader } from "./helpers";

// Access mock functions directly - the setup file creates vi.fn() for each method
const mockPrisma = prisma as unknown as {
  dailyTracker: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  dailyTrackerEntry: {
    upsert: ReturnType<typeof vi.fn>;
  };
  rtmEnrollment: {
    findFirst: ReturnType<typeof vi.fn>;
  };
};

function mockTrackerWithFeelings() {
  return {
    id: "tracker-fw",
    name: "Feelings Tracker",
    fields: [
      {
        id: "field-feelings",
        trackerId: "tracker-fw",
        label: "How are you feeling?",
        fieldType: "FEELINGS_WHEEL",
        options: { maxSelections: 3 },
        sortOrder: 0,
        isRequired: true,
      },
      {
        id: "field-notes",
        trackerId: "tracker-fw",
        label: "Notes",
        fieldType: "FREE_TEXT",
        options: null,
        sortOrder: 1,
        isRequired: false,
      },
    ],
  };
}

describe("POST /api/participant/daily-trackers/:id/entries — FEELINGS_WHEEL validation", () => {
  it("accepts valid emotion IDs within maxSelections", async () => {
    mockPrisma.dailyTracker.findUnique.mockResolvedValue(mockTrackerWithFeelings());
    mockPrisma.dailyTrackerEntry.upsert.mockResolvedValue({
      id: "entry-1",
      trackerId: "tracker-fw",
      userId: "test-user-id",
      date: new Date("2026-03-27"),
      responses: { "field-feelings": ["happy.optimistic.hopeful", "sad.lonely"] },
      completedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.rtmEnrollment.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/participant/daily-trackers/tracker-fw/entries")
      .set(...participantAuthHeader())
      .send({
        date: "2026-03-27",
        responses: {
          "field-feelings": ["happy.optimistic.hopeful", "sad.lonely"],
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("rejects invalid emotion IDs with 400", async () => {
    mockPrisma.dailyTracker.findUnique.mockResolvedValue(mockTrackerWithFeelings());

    const res = await request(app)
      .post("/api/participant/daily-trackers/tracker-fw/entries")
      .set(...participantAuthHeader())
      .send({
        date: "2026-03-27",
        responses: {
          "field-feelings": ["happy", "not_a_real_emotion"],
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("Invalid emotion");
  });

  it("rejects more selections than maxSelections", async () => {
    mockPrisma.dailyTracker.findUnique.mockResolvedValue(mockTrackerWithFeelings());

    const res = await request(app)
      .post("/api/participant/daily-trackers/tracker-fw/entries")
      .set(...participantAuthHeader())
      .send({
        date: "2026-03-27",
        responses: {
          "field-feelings": ["happy", "sad", "angry", "fearful"],
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("exceeds maximum");
  });

  it("rejects non-array value for FEELINGS_WHEEL field", async () => {
    mockPrisma.dailyTracker.findUnique.mockResolvedValue(mockTrackerWithFeelings());

    const res = await request(app)
      .post("/api/participant/daily-trackers/tracker-fw/entries")
      .set(...participantAuthHeader())
      .send({
        date: "2026-03-27",
        responses: {
          "field-feelings": "happy",
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("must be an array");
  });

  it("rejects empty array when field is required", async () => {
    mockPrisma.dailyTracker.findUnique.mockResolvedValue(mockTrackerWithFeelings());

    const res = await request(app)
      .post("/api/participant/daily-trackers/tracker-fw/entries")
      .set(...participantAuthHeader())
      .send({
        date: "2026-03-27",
        responses: {
          "field-feelings": [],
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("required");
  });

  it("accepts primary-level selections", async () => {
    mockPrisma.dailyTracker.findUnique.mockResolvedValue(mockTrackerWithFeelings());
    mockPrisma.dailyTrackerEntry.upsert.mockResolvedValue({
      id: "entry-2",
      trackerId: "tracker-fw",
      userId: "test-user-id",
      date: new Date("2026-03-27"),
      responses: { "field-feelings": ["happy"] },
      completedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.rtmEnrollment.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/participant/daily-trackers/tracker-fw/entries")
      .set(...participantAuthHeader())
      .send({
        date: "2026-03-27",
        responses: {
          "field-feelings": ["happy"],
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
