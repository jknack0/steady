import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { authHeader, participantAuthHeader } from "./helpers";

const db = vi.mocked(prisma);

// Mock the notifications service (recordDismissal)
vi.mock("../services/notifications", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    recordDismissal: vi.fn().mockResolvedValue(undefined),
  };
});

import { recordDismissal } from "../services/notifications";
const mockRecordDismissal = vi.mocked(recordDismissal);

beforeEach(() => {
  vi.clearAllMocks();
});

const USER_ID = "test-user-id";

// ── POST /api/notifications/push-token ──────────────

describe("POST /api/notifications/push-token", () => {
  it("registers a push token", async () => {
    db.user.update.mockResolvedValue({} as any);

    const res = await request(app)
      .post("/api/notifications/push-token")
      .set(...authHeader())
      .send({ pushToken: "ExponentPushToken[abc123]" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: USER_ID },
        data: expect.objectContaining({
          pushToken: "ExponentPushToken[abc123]",
          pushTokenUpdatedAt: expect.any(Date),
        }),
      })
    );
  });

  it("works for participant role too", async () => {
    db.user.update.mockResolvedValue({} as any);

    const res = await request(app)
      .post("/api/notifications/push-token")
      .set(...participantAuthHeader())
      .send({ pushToken: "ExponentPushToken[xyz789]" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 400 if pushToken is missing", async () => {
    const res = await request(app)
      .post("/api/notifications/push-token")
      .set(...authHeader())
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/pushToken/i);
  });

  it("returns 400 if pushToken is not a string", async () => {
    const res = await request(app)
      .post("/api/notifications/push-token")
      .set(...authHeader())
      .send({ pushToken: 12345 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/notifications/push-token")
      .send({ pushToken: "ExponentPushToken[abc123]" });

    expect(res.status).toBe(401);
  });

  it("returns 500 on database error", async () => {
    db.user.update.mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .post("/api/notifications/push-token")
      .set(...authHeader())
      .send({ pushToken: "ExponentPushToken[abc123]" });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ── DELETE /api/notifications/push-token ─────────────

describe("DELETE /api/notifications/push-token", () => {
  it("removes the push token", async () => {
    db.user.update.mockResolvedValue({} as any);

    const res = await request(app)
      .delete("/api/notifications/push-token")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: USER_ID },
        data: expect.objectContaining({
          pushToken: null,
          pushTokenUpdatedAt: null,
        }),
      })
    );
  });

  it("works for participant role", async () => {
    db.user.update.mockResolvedValue({} as any);

    const res = await request(app)
      .delete("/api/notifications/push-token")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).delete("/api/notifications/push-token");
    expect(res.status).toBe(401);
  });

  it("returns 500 on database error", async () => {
    db.user.update.mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .delete("/api/notifications/push-token")
      .set(...authHeader());

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ── GET /api/notifications/preferences ───────────────

describe("GET /api/notifications/preferences", () => {
  it("returns all categories with defaults when no preferences are set", async () => {
    db.notificationPreference.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/notifications/preferences")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(5);

    // All should default to enabled: true
    for (const pref of res.body.data) {
      expect(pref.enabled).toBe(true);
      expect(pref.preferredTime).toBeNull();
    }

    const categories = res.body.data.map((p: any) => p.category);
    expect(categories).toContain("MORNING_CHECKIN");
    expect(categories).toContain("HOMEWORK");
    expect(categories).toContain("SESSION");
    expect(categories).toContain("TASK");
    expect(categories).toContain("WEEKLY_REVIEW");
  });

  it("returns saved preferences merged with defaults", async () => {
    db.notificationPreference.findMany.mockResolvedValue([
      {
        id: "pref-1",
        userId: USER_ID,
        category: "HOMEWORK",
        enabled: false,
        preferredTime: "09:00",
        customSettings: null,
      },
      {
        id: "pref-2",
        userId: USER_ID,
        category: "SESSION",
        enabled: true,
        preferredTime: "14:30",
        customSettings: null,
      },
    ] as any);

    const res = await request(app)
      .get("/api/notifications/preferences")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);

    const homeworkPref = res.body.data.find((p: any) => p.category === "HOMEWORK");
    expect(homeworkPref.enabled).toBe(false);
    expect(homeworkPref.preferredTime).toBe("09:00");

    const sessionPref = res.body.data.find((p: any) => p.category === "SESSION");
    expect(sessionPref.enabled).toBe(true);
    expect(sessionPref.preferredTime).toBe("14:30");

    // Unsaved categories should have defaults
    const morningPref = res.body.data.find((p: any) => p.category === "MORNING_CHECKIN");
    expect(morningPref.enabled).toBe(true);
    expect(morningPref.preferredTime).toBeNull();
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/notifications/preferences");
    expect(res.status).toBe(401);
  });

  it("returns 500 on database error", async () => {
    db.notificationPreference.findMany.mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .get("/api/notifications/preferences")
      .set(...authHeader());

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ── PUT /api/notifications/preferences ───────────────

describe("PUT /api/notifications/preferences", () => {
  it("updates multiple preferences", async () => {
    db.notificationPreference.upsert.mockResolvedValue({} as any);
    db.notificationPreference.findMany.mockResolvedValue([
      {
        id: "pref-1",
        userId: USER_ID,
        category: "HOMEWORK",
        enabled: false,
        preferredTime: "09:00",
        customSettings: null,
      },
      {
        id: "pref-2",
        userId: USER_ID,
        category: "MORNING_CHECKIN",
        enabled: true,
        preferredTime: "07:00",
        customSettings: null,
      },
    ] as any);

    const res = await request(app)
      .put("/api/notifications/preferences")
      .set(...authHeader())
      .send({
        preferences: [
          { category: "HOMEWORK", enabled: false, preferredTime: "09:00" },
          { category: "MORNING_CHECKIN", enabled: true, preferredTime: "07:00" },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(db.notificationPreference.upsert).toHaveBeenCalledTimes(2);
  });

  it("skips invalid categories", async () => {
    db.notificationPreference.upsert.mockResolvedValue({} as any);
    db.notificationPreference.findMany.mockResolvedValue([] as any);

    const res = await request(app)
      .put("/api/notifications/preferences")
      .set(...authHeader())
      .send({
        preferences: [
          { category: "INVALID_CATEGORY", enabled: false },
          { category: "HOMEWORK", enabled: true },
        ],
      });

    expect(res.status).toBe(200);
    // Only the valid category should have been upserted
    expect(db.notificationPreference.upsert).toHaveBeenCalledTimes(1);
    expect(db.notificationPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_category: {
            userId: USER_ID,
            category: "HOMEWORK",
          },
        },
      })
    );
  });

  it("returns 400 if preferences is not an array", async () => {
    const res = await request(app)
      .put("/api/notifications/preferences")
      .set(...authHeader())
      .send({ preferences: "not-an-array" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/preferences array/i);
  });

  it("returns 400 if preferences key is missing", async () => {
    const res = await request(app)
      .put("/api/notifications/preferences")
      .set(...authHeader())
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("defaults enabled to true when not provided", async () => {
    db.notificationPreference.upsert.mockResolvedValue({} as any);
    db.notificationPreference.findMany.mockResolvedValue([] as any);

    const res = await request(app)
      .put("/api/notifications/preferences")
      .set(...authHeader())
      .send({
        preferences: [{ category: "TASK" }],
      });

    expect(res.status).toBe(200);
    expect(db.notificationPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          enabled: true,
        }),
      })
    );
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .put("/api/notifications/preferences")
      .send({ preferences: [] });

    expect(res.status).toBe(401);
  });

  it("returns 500 on database error", async () => {
    db.notificationPreference.upsert.mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .put("/api/notifications/preferences")
      .set(...authHeader())
      .send({
        preferences: [{ category: "HOMEWORK", enabled: true }],
      });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ── POST /api/notifications/dismiss ──────────────────

describe("POST /api/notifications/dismiss", () => {
  it("records a dismissal for a valid category", async () => {
    const res = await request(app)
      .post("/api/notifications/dismiss")
      .set(...participantAuthHeader())
      .send({ category: "HOMEWORK" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockRecordDismissal).toHaveBeenCalledWith(USER_ID, "HOMEWORK");
  });

  it("accepts all valid categories", async () => {
    const validCategories = ["MORNING_CHECKIN", "HOMEWORK", "SESSION", "TASK", "WEEKLY_REVIEW"];

    for (const category of validCategories) {
      mockRecordDismissal.mockClear();

      const res = await request(app)
        .post("/api/notifications/dismiss")
        .set(...participantAuthHeader())
        .send({ category });

      expect(res.status).toBe(200);
      expect(mockRecordDismissal).toHaveBeenCalledWith(USER_ID, category);
    }
  });

  it("returns 400 for invalid category", async () => {
    const res = await request(app)
      .post("/api/notifications/dismiss")
      .set(...participantAuthHeader())
      .send({ category: "INVALID" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/category/i);
    expect(mockRecordDismissal).not.toHaveBeenCalled();
  });

  it("returns 400 if category is missing", async () => {
    const res = await request(app)
      .post("/api/notifications/dismiss")
      .set(...participantAuthHeader())
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/notifications/dismiss")
      .send({ category: "HOMEWORK" });

    expect(res.status).toBe(401);
  });

  it("returns 403 for clinician role", async () => {
    const res = await request(app)
      .post("/api/notifications/dismiss")
      .set(...authHeader())
      .send({ category: "HOMEWORK" });

    expect(res.status).toBe(403);
  });

  it("returns 500 if recordDismissal throws", async () => {
    mockRecordDismissal.mockRejectedValue(new Error("Service error"));

    const res = await request(app)
      .post("/api/notifications/dismiss")
      .set(...participantAuthHeader())
      .send({ category: "HOMEWORK" });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
