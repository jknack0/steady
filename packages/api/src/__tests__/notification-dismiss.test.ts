import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { participantAuthHeader, authHeader } from "./helpers";

describe("POST /api/notifications/dismiss", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records a dismissal for valid category", async () => {
    (prisma.notificationPreference.findUnique as any).mockResolvedValue({
      id: "pref-1",
      userId: "test-user-id",
      category: "HOMEWORK",
      customSettings: { dismissals: [] },
    });
    (prisma.notificationPreference.upsert as any).mockResolvedValue({});

    const res = await request(app)
      .post("/api/notifications/dismiss")
      .set(...participantAuthHeader())
      .send({ category: "HOMEWORK" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("creates NotificationPreference if not exists", async () => {
    (prisma.notificationPreference.findUnique as any).mockResolvedValue(null);
    (prisma.notificationPreference.upsert as any).mockResolvedValue({});

    const res = await request(app)
      .post("/api/notifications/dismiss")
      .set(...participantAuthHeader())
      .send({ category: "TASK" });

    expect(res.status).toBe(200);
    expect(prisma.notificationPreference.upsert).toHaveBeenCalled();
  });

  it("returns 400 for invalid category (COND-3)", async () => {
    const res = await request(app)
      .post("/api/notifications/dismiss")
      .set(...participantAuthHeader())
      .send({ category: "INVALID_CATEGORY" });

    expect(res.status).toBe(400);
  });

  it("returns 400 for missing category", async () => {
    const res = await request(app)
      .post("/api/notifications/dismiss")
      .set(...participantAuthHeader())
      .send({});

    expect(res.status).toBe(400);
  });

  it("returns 400 for SQL injection attempt (COND-3)", async () => {
    const res = await request(app)
      .post("/api/notifications/dismiss")
      .set(...participantAuthHeader())
      .send({ category: "'; DROP TABLE notification_preferences; --" });

    expect(res.status).toBe(400);
  });

  it("returns 401 for unauthenticated request", async () => {
    const res = await request(app)
      .post("/api/notifications/dismiss")
      .send({ category: "HOMEWORK" });

    expect(res.status).toBe(401);
  });

  it("returns 403 for clinician role", async () => {
    const res = await request(app)
      .post("/api/notifications/dismiss")
      .set(...authHeader({ role: "CLINICIAN" }))
      .send({ category: "HOMEWORK" });

    expect(res.status).toBe(403);
  });
});

describe("POST /api/notifications/engage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears dismissals for specified category", async () => {
    (prisma.notificationPreference.findUnique as any).mockResolvedValue({
      id: "pref-1",
      userId: "test-user-id",
      category: "HOMEWORK",
      customSettings: { dismissals: [{ date: "2026-04-01T10:00:00.000Z" }, { date: "2026-04-02T10:00:00.000Z" }] },
    });
    (prisma.notificationPreference.update as any).mockResolvedValue({});

    const res = await request(app)
      .post("/api/notifications/engage")
      .set(...participantAuthHeader())
      .send({ category: "HOMEWORK" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(prisma.notificationPreference.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customSettings: expect.objectContaining({ dismissals: [] }),
        }),
      })
    );
  });

  it("succeeds even when no prior dismissals exist (no-op)", async () => {
    (prisma.notificationPreference.findUnique as any).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/notifications/engage")
      .set(...participantAuthHeader())
      .send({ category: "TASK" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 400 for invalid category (COND-3)", async () => {
    const res = await request(app)
      .post("/api/notifications/engage")
      .set(...participantAuthHeader())
      .send({ category: "FAKE" });

    expect(res.status).toBe(400);
  });

  it("returns 401 for unauthenticated request", async () => {
    const res = await request(app)
      .post("/api/notifications/engage")
      .send({ category: "HOMEWORK" });

    expect(res.status).toBe(401);
  });

  it("returns 403 for clinician role", async () => {
    const res = await request(app)
      .post("/api/notifications/engage")
      .set(...authHeader({ role: "CLINICIAN" }))
      .send({ category: "HOMEWORK" });

    expect(res.status).toBe(403);
  });
});
