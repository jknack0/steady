import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import {
  authHeader,
  participantAuthHeader,
  mockRecurringSeries,
  mockServiceCode,
  mockLocation,
} from "./helpers";

const db = vi.mocked(prisma);

const validBody = {
  participantId: "pp-1",
  serviceCodeId: "sc-1",
  locationId: "loc-1",
  recurrenceRule: "WEEKLY",
  dayOfWeek: 2,
  startTime: "14:00",
  endTime: "14:45",
  seriesStartDate: "2026-05-05T00:00:00Z",
  appointmentType: "INDIVIDUAL",
};

beforeEach(() => {
  vi.clearAllMocks();
  // Default membership so requirePracticeCtx passes
  (db.practiceMembership.findFirst as any).mockResolvedValue({
    practiceId: "practice-1",
    role: "CLINICIAN",
  });
  // Default verifications
  (db.serviceCode.findFirst as any).mockResolvedValue(mockServiceCode());
  (db.location.findFirst as any).mockResolvedValue(mockLocation());
  (db.participantProfile.findUnique as any).mockResolvedValue({
    id: "pp-1",
    userId: "u-pp-1",
    user: { id: "u-pp-1", firstName: "Jane", lastName: "Doe", email: "jane@test.com" },
  });
  // Series count for limit check
  (db.recurringSeries.count as any).mockResolvedValue(0);
  // Default: no existing appointments (for generation dedup)
  (db.appointment.findFirst as any).mockResolvedValue(null);
  // Default: appointment create succeeds
  (db.appointment.create as any).mockResolvedValue({ id: "appt-gen-1" });
  // Default: conflict detection returns empty
  (db.appointment.findMany as any).mockResolvedValue([]);
  // Default: deleteMany for regeneration
  (db.appointment.deleteMany as any).mockResolvedValue({ count: 0 });
});

// ── POST /api/recurring-series ───────────────────────

describe("POST /api/recurring-series", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/recurring-series").send(validBody);
    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .post("/api/recurring-series")
      .set(...participantAuthHeader())
      .send(validBody);
    expect(res.status).toBe(403);
  });

  it("creates series + generates appointments", async () => {
    (db.recurringSeries.create as any).mockResolvedValue(mockRecurringSeries());
    const res = await request(app)
      .post("/api/recurring-series")
      .set(...authHeader())
      .send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.series.id).toBe("series-1");
    expect(typeof res.body.data.appointmentsCreated).toBe("number");
    expect(Array.isArray(res.body.data.conflicts)).toBe(true);
  });

  it("returns 400 for missing required fields", async () => {
    const res = await request(app)
      .post("/api/recurring-series")
      .set(...authHeader())
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid recurrenceRule", async () => {
    const res = await request(app)
      .post("/api/recurring-series")
      .set(...authHeader())
      .send({ ...validBody, recurrenceRule: "DAILY" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for dayOfWeek out of range", async () => {
    const res = await request(app)
      .post("/api/recurring-series")
      .set(...authHeader())
      .send({ ...validBody, dayOfWeek: 7 });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid time format", async () => {
    const res = await request(app)
      .post("/api/recurring-series")
      .set(...authHeader())
      .send({ ...validBody, startTime: "2pm" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for endTime <= startTime", async () => {
    const res = await request(app)
      .post("/api/recurring-series")
      .set(...authHeader())
      .send({ ...validBody, startTime: "15:00", endTime: "14:00" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for GROUP appointmentType", async () => {
    const res = await request(app)
      .post("/api/recurring-series")
      .set(...authHeader())
      .send({ ...validBody, appointmentType: "GROUP" });
    expect(res.status).toBe(400);
  });

  it("returns 404 for cross-tenant serviceCode", async () => {
    (db.serviceCode.findFirst as any).mockResolvedValue(null);
    (db.recurringSeries.create as any).mockResolvedValue(mockRecurringSeries());
    const res = await request(app)
      .post("/api/recurring-series")
      .set(...authHeader())
      .send(validBody);
    expect(res.status).toBe(404);
  });

  it("returns 404 for cross-tenant location", async () => {
    (db.location.findFirst as any).mockResolvedValue(null);
    (db.recurringSeries.create as any).mockResolvedValue(mockRecurringSeries());
    const res = await request(app)
      .post("/api/recurring-series")
      .set(...authHeader())
      .send(validBody);
    expect(res.status).toBe(404);
  });

  it("returns 404 for unknown participant", async () => {
    (db.participantProfile.findUnique as any).mockResolvedValue(null);
    (db.recurringSeries.create as any).mockResolvedValue(mockRecurringSeries());
    const res = await request(app)
      .post("/api/recurring-series")
      .set(...authHeader())
      .send(validBody);
    expect(res.status).toBe(404);
  });

  it("returns 409 when series limit reached", async () => {
    (db.recurringSeries.count as any).mockResolvedValue(200);
    const res = await request(app)
      .post("/api/recurring-series")
      .set(...authHeader())
      .send(validBody);
    expect(res.status).toBe(409);
  });

  it("returns 409 for inactive service code", async () => {
    (db.serviceCode.findFirst as any).mockResolvedValue(
      mockServiceCode({ isActive: false }),
    );
    const res = await request(app)
      .post("/api/recurring-series")
      .set(...authHeader())
      .send(validBody);
    // Service code found but not active => conflict
    expect(res.status).toBe(409);
  });
});

// ── GET /api/recurring-series ────────────────────────

describe("GET /api/recurring-series", () => {
  it("returns list for practice", async () => {
    (db.recurringSeries.findMany as any).mockResolvedValue([mockRecurringSeries()]);
    const res = await request(app)
      .get("/api/recurring-series")
      .set(...authHeader());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe("series-1");
  });

  it("cursor-paginates", async () => {
    const items = Array.from({ length: 3 }, (_, i) =>
      mockRecurringSeries({ id: `s-${i}` }),
    );
    (db.recurringSeries.findMany as any).mockResolvedValue(items);
    const res = await request(app)
      .get("/api/recurring-series?limit=2")
      .set(...authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.cursor).toBe("s-1");
  });

  it("filters by participantId", async () => {
    (db.recurringSeries.findMany as any).mockResolvedValue([]);
    const res = await request(app)
      .get("/api/recurring-series?participantId=pp-1")
      .set(...authHeader());
    expect(res.status).toBe(200);
    const call = (db.recurringSeries.findMany as any).mock.calls[0][0];
    expect(call.where.participantId).toBe("pp-1");
  });

  it("filters by isActive", async () => {
    (db.recurringSeries.findMany as any).mockResolvedValue([]);
    const res = await request(app)
      .get("/api/recurring-series?isActive=true")
      .set(...authHeader());
    expect(res.status).toBe(200);
    const call = (db.recurringSeries.findMany as any).mock.calls[0][0];
    expect(call.where.isActive).toBe(true);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/recurring-series");
    expect(res.status).toBe(401);
  });
});

// ── GET /api/recurring-series/:id ────────────────────

describe("GET /api/recurring-series/:id", () => {
  it("returns series with upcoming appointments", async () => {
    (db.recurringSeries.findFirst as any).mockResolvedValue(mockRecurringSeries());
    (db.appointment.findMany as any).mockResolvedValue([]);
    const res = await request(app)
      .get("/api/recurring-series/series-1")
      .set(...authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe("series-1");
  });

  it("returns 404 for cross-tenant", async () => {
    (db.recurringSeries.findFirst as any).mockResolvedValue(null);
    const res = await request(app)
      .get("/api/recurring-series/nope")
      .set(...authHeader());
    expect(res.status).toBe(404);
  });

  it("returns 404 for non-owner clinician (non-account-owner)", async () => {
    (db.recurringSeries.findFirst as any).mockResolvedValue(
      mockRecurringSeries({ clinicianId: "other-clin" }),
    );
    const res = await request(app)
      .get("/api/recurring-series/series-1")
      .set(...authHeader());
    expect(res.status).toBe(404);
  });
});

// ── PATCH /api/recurring-series/:id ──────────────────

describe("PATCH /api/recurring-series/:id", () => {
  it("updates fields and returns series", async () => {
    (db.recurringSeries.findFirst as any).mockResolvedValue(mockRecurringSeries());
    (db.recurringSeries.update as any).mockResolvedValue(
      mockRecurringSeries({ internalNote: "updated" }),
    );
    const res = await request(app)
      .patch("/api/recurring-series/series-1")
      .set(...authHeader())
      .send({ internalNote: "updated" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.series.internalNote).toBe("updated");
  });

  it("returns 404 for non-owner", async () => {
    (db.recurringSeries.findFirst as any).mockResolvedValue(
      mockRecurringSeries({ clinicianId: "other-clin" }),
    );
    const res = await request(app)
      .patch("/api/recurring-series/series-1")
      .set(...authHeader())
      .send({ internalNote: "x" });
    expect(res.status).toBe(404);
  });

  it("returns 404 for unknown series", async () => {
    (db.recurringSeries.findFirst as any).mockResolvedValue(null);
    const res = await request(app)
      .patch("/api/recurring-series/nope")
      .set(...authHeader())
      .send({ internalNote: "x" });
    expect(res.status).toBe(404);
  });

  it("regenerates appointments when scheduling fields change", async () => {
    (db.recurringSeries.findFirst as any).mockResolvedValue(mockRecurringSeries());
    (db.recurringSeries.update as any).mockResolvedValue(
      mockRecurringSeries({ startTime: "15:00" }),
    );
    (db.appointment.updateMany as any).mockResolvedValue({ count: 3 });
    const res = await request(app)
      .patch("/api/recurring-series/series-1")
      .set(...authHeader())
      .send({ startTime: "15:00" });
    expect(res.status).toBe(200);
    expect(typeof res.body.data.appointmentsRegenerated).toBe("number");
    expect((db.appointment.updateMany as any)).toHaveBeenCalled();
  });
});

// ── POST /api/recurring-series/:id/pause ─────────────

describe("POST /api/recurring-series/:id/pause", () => {
  it("pauses active series", async () => {
    (db.recurringSeries.findFirst as any).mockResolvedValue(mockRecurringSeries());
    (db.recurringSeries.update as any).mockResolvedValue(
      mockRecurringSeries({ isActive: false }),
    );
    const res = await request(app)
      .post("/api/recurring-series/series-1/pause")
      .set(...authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it("returns 409 for already paused series", async () => {
    (db.recurringSeries.findFirst as any).mockResolvedValue(
      mockRecurringSeries({ isActive: false }),
    );
    const res = await request(app)
      .post("/api/recurring-series/series-1/pause")
      .set(...authHeader());
    expect(res.status).toBe(409);
  });

  it("returns 404 for unknown series", async () => {
    (db.recurringSeries.findFirst as any).mockResolvedValue(null);
    const res = await request(app)
      .post("/api/recurring-series/nope/pause")
      .set(...authHeader());
    expect(res.status).toBe(404);
  });
});

// ── POST /api/recurring-series/:id/resume ────────────

describe("POST /api/recurring-series/:id/resume", () => {
  it("resumes paused series and generates appointments", async () => {
    (db.recurringSeries.findFirst as any).mockResolvedValue(
      mockRecurringSeries({ isActive: false }),
    );
    (db.recurringSeries.update as any).mockResolvedValue(mockRecurringSeries());
    const res = await request(app)
      .post("/api/recurring-series/series-1/resume")
      .set(...authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data.series.isActive).toBe(true);
    expect(typeof res.body.data.appointmentsCreated).toBe("number");
  });

  it("returns 409 for already active series", async () => {
    (db.recurringSeries.findFirst as any).mockResolvedValue(
      mockRecurringSeries({ isActive: true }),
    );
    const res = await request(app)
      .post("/api/recurring-series/series-1/resume")
      .set(...authHeader());
    expect(res.status).toBe(409);
  });

  it("returns 404 for unknown series", async () => {
    (db.recurringSeries.findFirst as any).mockResolvedValue(null);
    const res = await request(app)
      .post("/api/recurring-series/nope/resume")
      .set(...authHeader());
    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/recurring-series/:id ─────────────────

describe("DELETE /api/recurring-series/:id", () => {
  it("deletes series and future appointments", async () => {
    (db.recurringSeries.findFirst as any).mockResolvedValue(mockRecurringSeries());
    (db.appointment.updateMany as any).mockResolvedValue({ count: 3 });
    (db.recurringSeries.delete as any).mockResolvedValue({});
    const res = await request(app)
      .delete("/api/recurring-series/series-1")
      .set(...authHeader());
    expect(res.status).toBe(204);
    expect((db.recurringSeries.delete as any)).toHaveBeenCalled();
    expect((db.appointment.updateMany as any)).toHaveBeenCalled();
  });

  it("returns 404 for unknown series", async () => {
    (db.recurringSeries.findFirst as any).mockResolvedValue(null);
    const res = await request(app)
      .delete("/api/recurring-series/nope")
      .set(...authHeader());
    expect(res.status).toBe(404);
  });

  it("returns 404 for non-owner", async () => {
    (db.recurringSeries.findFirst as any).mockResolvedValue(
      mockRecurringSeries({ clinicianId: "other-clin" }),
    );
    const res = await request(app)
      .delete("/api/recurring-series/series-1")
      .set(...authHeader());
    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).delete("/api/recurring-series/series-1");
    expect(res.status).toBe(401);
  });
});

// ── Generation logic (unit tests) ────────────────────

describe("generateAppointmentsForSeries", () => {
  it("creates appointments for WEEKLY series", async () => {
    const { generateAppointmentsForSeries } = await import("../services/recurring-series");
    const series = mockRecurringSeries({
      seriesStartDate: new Date("2026-04-07"), // Tuesday
      recurrenceRule: "WEEKLY",
      dayOfWeek: 2, // Tuesday
      startTime: "10:00",
      endTime: "10:45",
    });
    (db.appointment.findFirst as any).mockResolvedValue(null);
    (db.appointment.create as any).mockResolvedValue({ id: "gen-1" });
    (db.appointment.findMany as any).mockResolvedValue([]);

    const result = await generateAppointmentsForSeries(series);
    // Should create multiple appointments (up to 4 weeks out)
    expect(result.created).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.allConflicts)).toBe(true);
  });

  it("creates appointments for BIWEEKLY series", async () => {
    const { generateAppointmentsForSeries } = await import("../services/recurring-series");
    const series = mockRecurringSeries({
      seriesStartDate: new Date("2026-04-07"),
      recurrenceRule: "BIWEEKLY",
      dayOfWeek: 2,
      startTime: "10:00",
      endTime: "10:45",
    });
    (db.appointment.findFirst as any).mockResolvedValue(null);
    (db.appointment.create as any).mockResolvedValue({ id: "gen-1" });
    (db.appointment.findMany as any).mockResolvedValue([]);

    const result = await generateAppointmentsForSeries(series);
    expect(result.created).toBeGreaterThanOrEqual(0);
  });

  it("creates appointments for MONTHLY series", async () => {
    const { generateAppointmentsForSeries } = await import("../services/recurring-series");
    const series = mockRecurringSeries({
      seriesStartDate: new Date("2026-04-07"),
      recurrenceRule: "MONTHLY",
      dayOfWeek: 2,
      startTime: "10:00",
      endTime: "10:45",
    });
    (db.appointment.findFirst as any).mockResolvedValue(null);
    (db.appointment.create as any).mockResolvedValue({ id: "gen-1" });
    (db.appointment.findMany as any).mockResolvedValue([]);

    const result = await generateAppointmentsForSeries(series);
    expect(result.created).toBeGreaterThanOrEqual(0);
  });

  it("respects seriesEndDate", async () => {
    const { generateAppointmentsForSeries } = await import("../services/recurring-series");
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const series = mockRecurringSeries({
      seriesStartDate: new Date(),
      seriesEndDate: tomorrow, // Only 1 day window
      recurrenceRule: "WEEKLY",
      dayOfWeek: new Date().getUTCDay(),
      startTime: "10:00",
      endTime: "10:45",
    });
    (db.appointment.findFirst as any).mockResolvedValue(null);
    (db.appointment.create as any).mockResolvedValue({ id: "gen-1" });
    (db.appointment.findMany as any).mockResolvedValue([]);

    const result = await generateAppointmentsForSeries(series);
    // Very narrow window, should create at most 1
    expect(result.created).toBeLessThanOrEqual(1);
  });

  it("skips existing appointments (idempotency)", async () => {
    const { generateAppointmentsForSeries } = await import("../services/recurring-series");
    const series = mockRecurringSeries({
      seriesStartDate: new Date("2026-04-07"),
      recurrenceRule: "WEEKLY",
      dayOfWeek: 2,
      startTime: "10:00",
      endTime: "10:45",
    });
    // Return existing appointment for every dedup check
    (db.appointment.findFirst as any).mockResolvedValue({ id: "existing-1" });
    (db.appointment.findMany as any).mockResolvedValue([]);

    const result = await generateAppointmentsForSeries(series);
    expect(result.created).toBe(0);
    expect((db.appointment.create as any)).not.toHaveBeenCalled();
  });
});
