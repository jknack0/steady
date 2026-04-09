import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { authHeader, participantAuthHeader, mockAppointment } from "./helpers";

const db = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
  // Default membership so requirePracticeCtx passes
  (db.practiceMembership.findFirst as any).mockResolvedValue({
    practiceId: "practice-1",
    role: "CLINICIAN",
  });
});

// ── GET /api/appointments/:id/reminders ──────────────────

describe("GET /api/appointments/:id/reminders", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/appointments/appt-1/reminders");
    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .get("/api/appointments/appt-1/reminders")
      .set(...participantAuthHeader());
    expect(res.status).toBe(403);
  });

  it("returns 404 if appointment not found", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(null);
    const res = await request(app)
      .get("/api/appointments/appt-1/reminders")
      .set(...authHeader());
    expect(res.status).toBe(404);
  });

  it("returns reminders for a valid appointment", async () => {
    const appt = mockAppointment();
    (db.appointment.findFirst as any).mockResolvedValue(appt);

    const reminders = [
      {
        id: "rem-1",
        type: "PUSH",
        scheduledFor: new Date("2026-05-01T13:00:00Z"),
        sentAt: null,
        status: "PENDING",
        createdAt: new Date(),
      },
      {
        id: "rem-2",
        type: "PUSH",
        scheduledFor: new Date("2026-04-30T14:00:00Z"),
        sentAt: new Date("2026-04-30T14:01:00Z"),
        status: "SENT",
        createdAt: new Date(),
      },
    ];
    (db.appointmentReminder.findMany as any).mockResolvedValue(reminders);

    const res = await request(app)
      .get("/api/appointments/appt-1/reminders")
      .set(...authHeader());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].id).toBe("rem-1");
    expect(res.body.data[1].status).toBe("SENT");
  });

  it("returns 404 if clinician does not own the appointment", async () => {
    const appt = mockAppointment({ clinicianId: "other-clinician" });
    (db.appointment.findFirst as any).mockResolvedValue(null); // practice ctx filter returns null
    const res = await request(app)
      .get("/api/appointments/appt-1/reminders")
      .set(...authHeader());
    expect(res.status).toBe(404);
  });
});

// ── GET /api/config/reminders ──────────────────────────

describe("GET /api/config/reminders", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/config/reminders");
    expect(res.status).toBe(401);
  });

  it("returns default settings when none configured", async () => {
    (db.clinicianConfig.findUnique as any).mockResolvedValue(null);
    const res = await request(app)
      .get("/api/config/reminders")
      .set(...authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      enableReminders: true,
      reminderTimes: [1440, 60],
    });
  });

  it("returns saved settings", async () => {
    (db.clinicianConfig.findUnique as any).mockResolvedValue({
      reminderSettings: { enableReminders: false, reminderTimes: [2880, 120, 30] },
    });
    const res = await request(app)
      .get("/api/config/reminders")
      .set(...authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data.enableReminders).toBe(false);
    expect(res.body.data.reminderTimes).toEqual([2880, 120, 30]);
  });
});

// ── PUT /api/config/reminders ──────────────────────────

describe("PUT /api/config/reminders", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app)
      .put("/api/config/reminders")
      .send({ enableReminders: true, reminderTimes: [60] });
    expect(res.status).toBe(401);
  });

  it("saves valid settings", async () => {
    (db.clinicianConfig.update as any).mockResolvedValue({});
    const res = await request(app)
      .put("/api/config/reminders")
      .set(...authHeader())
      .send({ enableReminders: true, reminderTimes: [1440, 60] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(db.clinicianConfig.update).toHaveBeenCalledWith({
      where: { clinicianId: "test-clinician-profile-id" },
      data: { reminderSettings: { enableReminders: true, reminderTimes: [1440, 60] } },
    });
  });

  it("rejects reminder times below 5 minutes", async () => {
    const res = await request(app)
      .put("/api/config/reminders")
      .set(...authHeader())
      .send({ enableReminders: true, reminderTimes: [3] });
    expect(res.status).toBe(400);
  });

  it("rejects reminder times above 10080 minutes", async () => {
    const res = await request(app)
      .put("/api/config/reminders")
      .set(...authHeader())
      .send({ enableReminders: true, reminderTimes: [20000] });
    expect(res.status).toBe(400);
  });

  it("rejects more than 5 reminder times", async () => {
    const res = await request(app)
      .put("/api/config/reminders")
      .set(...authHeader())
      .send({ enableReminders: true, reminderTimes: [60, 120, 240, 480, 960, 1440] });
    expect(res.status).toBe(400);
  });

  it("rejects empty reminderTimes array", async () => {
    const res = await request(app)
      .put("/api/config/reminders")
      .set(...authHeader())
      .send({ enableReminders: true, reminderTimes: [] });
    expect(res.status).toBe(400);
  });
});

// ── Reminder lifecycle tests (unit) ─────────────────────

describe("createRemindersForAppointment", () => {
  it("creates reminders when settings enabled", async () => {
    // Import the service to test
    const { createRemindersForAppointment } = await import("../services/appointment-reminders");

    (db.clinicianConfig.findUnique as any).mockResolvedValue({
      reminderSettings: { enableReminders: true, reminderTimes: [1440, 60] },
    });
    (db.appointmentReminder.createMany as any).mockResolvedValue({ count: 2 });

    const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h from now
    await createRemindersForAppointment("appt-1", "clin-1", futureDate);

    expect(db.appointmentReminder.createMany).toHaveBeenCalledTimes(1);
    const call = (db.appointmentReminder.createMany as any).mock.calls[0][0];
    expect(call.data).toHaveLength(2);
    expect(call.data[0].appointmentId).toBe("appt-1");
    expect(call.data[0].type).toBe("PUSH");
    expect(call.data[0].status).toBe("PENDING");
  });

  it("skips reminders when disabled", async () => {
    const { createRemindersForAppointment } = await import("../services/appointment-reminders");

    (db.clinicianConfig.findUnique as any).mockResolvedValue({
      reminderSettings: { enableReminders: false, reminderTimes: [60] },
    });

    const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await createRemindersForAppointment("appt-1", "clin-1", futureDate);

    expect(db.appointmentReminder.createMany).not.toHaveBeenCalled();
  });

  it("skips past reminders", async () => {
    const { createRemindersForAppointment } = await import("../services/appointment-reminders");

    (db.clinicianConfig.findUnique as any).mockResolvedValue({
      reminderSettings: { enableReminders: true, reminderTimes: [1440, 60] },
    });
    (db.appointmentReminder.createMany as any).mockResolvedValue({ count: 1 });

    // 30 min from now: 1440 min reminder is past, 60 min reminder is past
    const nearFuture = new Date(Date.now() + 30 * 60 * 1000);
    await createRemindersForAppointment("appt-1", "clin-1", nearFuture);

    // Neither should be created since both are in the past
    expect(db.appointmentReminder.createMany).not.toHaveBeenCalled();
  });
});

describe("cancelRemindersForAppointment", () => {
  it("sets PENDING reminders to CANCELED", async () => {
    const { cancelRemindersForAppointment } = await import("../services/appointment-reminders");
    (db.appointmentReminder.updateMany as any).mockResolvedValue({ count: 2 });

    await cancelRemindersForAppointment("appt-1");

    expect(db.appointmentReminder.updateMany).toHaveBeenCalledWith({
      where: { appointmentId: "appt-1", status: "PENDING" },
      data: { status: "CANCELED" },
    });
  });
});

describe("rescheduleReminders", () => {
  it("deletes pending and recreates", async () => {
    const { rescheduleReminders } = await import("../services/appointment-reminders");

    (db.appointmentReminder.deleteMany as any).mockResolvedValue({ count: 2 });
    (db.clinicianConfig.findUnique as any).mockResolvedValue({
      reminderSettings: { enableReminders: true, reminderTimes: [60] },
    });
    (db.appointmentReminder.createMany as any).mockResolvedValue({ count: 1 });

    const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await rescheduleReminders("appt-1", "clin-1", futureDate);

    expect(db.appointmentReminder.deleteMany).toHaveBeenCalledWith({
      where: { appointmentId: "appt-1", status: "PENDING" },
    });
    expect(db.appointmentReminder.createMany).toHaveBeenCalled();
  });
});
