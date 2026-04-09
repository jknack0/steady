import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { participantAuthHeader, authHeader, mockStreakRecord } from "./helpers";

describe("GET /api/stats/streaks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns own streak records for participant", async () => {
    const mockStreaks = [
      mockStreakRecord({ category: "JOURNAL", currentStreak: 5, longestStreak: 10, lastActiveDate: new Date("2026-04-04") }),
      mockStreakRecord({ id: "streak-2", category: "CHECKIN", currentStreak: 3, longestStreak: 7, lastActiveDate: new Date("2026-04-05") }),
    ];
    (prisma.streakRecord.findMany as any).mockResolvedValue(mockStreaks);

    const res = await request(app)
      .get("/api/stats/streaks")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].category).toBe("JOURNAL");
    expect(res.body.data[0].currentStreak).toBe(5);
    expect(res.body.data[0].lastActiveDate).toBe("2026-04-04");
  });

  it("returns empty array when no streak records exist", async () => {
    (prisma.streakRecord.findMany as any).mockResolvedValue([]);

    const res = await request(app)
      .get("/api/stats/streaks")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("returns 401 for unauthenticated request", async () => {
    const res = await request(app).get("/api/stats/streaks");
    expect(res.status).toBe(401);
  });

  it("returns 403 for clinician role", async () => {
    const res = await request(app)
      .get("/api/stats/streaks")
      .set(...authHeader({ role: "CLINICIAN" }));

    expect(res.status).toBe(403);
  });

  it("filters by userId from JWT (COND-2)", async () => {
    (prisma.streakRecord.findMany as any).mockResolvedValue([]);

    await request(app)
      .get("/api/stats/streaks")
      .set(...participantAuthHeader({ userId: "my-user-id" }));

    expect(prisma.streakRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "my-user-id" },
      })
    );
  });

  it("handles null lastActiveDate correctly", async () => {
    const mockStreaks = [
      mockStreakRecord({ category: "HOMEWORK", currentStreak: 0, lastActiveDate: null }),
    ];
    (prisma.streakRecord.findMany as any).mockResolvedValue(mockStreaks);

    const res = await request(app)
      .get("/api/stats/streaks")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data[0].lastActiveDate).toBeNull();
  });
});
