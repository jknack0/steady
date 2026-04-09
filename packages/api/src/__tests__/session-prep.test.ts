import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import {
  authHeader,
  participantAuthHeader,
  mockAppointment,
  mockEnrollment,
  mockSessionReview,
} from "./helpers";

const db = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
  (db.practiceMembership.findFirst as any).mockResolvedValue({
    practiceId: "practice-1",
    role: "CLINICIAN",
  });
});

describe("GET /api/appointments/:id/prep", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/appointments/appt-1/prep");
    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .get("/api/appointments/appt-1/prep")
      .set(...participantAuthHeader());
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-existent appointment", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(null);
    const res = await request(app)
      .get("/api/appointments/appt-1/prep")
      .set(...authHeader());
    expect(res.status).toBe(404);
  });

  it("returns 404 for cross-practice access (COND-2)", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(null);
    const res = await request(app)
      .get("/api/appointments/appt-1/prep")
      .set(...authHeader());
    expect(res.status).toBe(404);
  });

  it("returns 404 for non-owner clinician", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(
      mockAppointment({ clinicianId: "other-clinician" }),
    );
    const res = await request(app)
      .get("/api/appointments/appt-1/prep")
      .set(...authHeader());
    expect(res.status).toBe(404);
  });

  it("returns review + homework + stats + notes", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(mockAppointment());
    (db.enrollment.findFirst as any).mockResolvedValue(
      mockEnrollment({ program: { id: "program-1", title: "Test Program" } }),
    );
    (db.sessionReview.findFirst as any).mockResolvedValue(mockSessionReview());
    (db.moduleProgress.findMany as any).mockResolvedValue([]);
    (db.task.count as any).mockResolvedValue(5);
    (db.journalEntry.count as any).mockResolvedValue(3);
    (db.participantProfile.findUnique as any).mockResolvedValue({
      id: "pp-1",
      userId: "u-pp-1",
    });
    (db.session.findFirst as any).mockResolvedValue({
      clinicianNotes: "Last session notes here",
      scheduledAt: new Date(),
      moduleCompletedId: null,
    });

    const res = await request(app)
      .get("/api/appointments/appt-1/prep")
      .set(...authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data.appointment).toBeTruthy();
    expect(res.body.data.review).toBeTruthy();
    expect(res.body.data.quickStats).toBeTruthy();
    expect(res.body.data.lastSessionNotes).toBeTruthy();
  });

  it("returns prep data with review=null when not submitted", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(mockAppointment());
    (db.enrollment.findFirst as any).mockResolvedValue(
      mockEnrollment({ program: { id: "program-1", title: "Test Program" } }),
    );
    (db.sessionReview.findFirst as any).mockResolvedValue(null);
    (db.moduleProgress.findMany as any).mockResolvedValue([]);
    (db.task.count as any).mockResolvedValue(0);
    (db.journalEntry.count as any).mockResolvedValue(0);
    (db.participantProfile.findUnique as any).mockResolvedValue({
      id: "pp-1",
      userId: "u-pp-1",
    });
    (db.session.findFirst as any).mockResolvedValue(null);

    const res = await request(app)
      .get("/api/appointments/appt-1/prep")
      .set(...authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data.review).toBeNull();
    expect(res.body.data.quickStats).toBeTruthy();
  });

  it("returns prep data with empty homework when no enrollment", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(mockAppointment());
    (db.enrollment.findFirst as any).mockResolvedValue(null);
    (db.sessionReview.findFirst as any).mockResolvedValue(null);
    (db.task.count as any).mockResolvedValue(0);
    (db.journalEntry.count as any).mockResolvedValue(0);
    (db.participantProfile.findUnique as any).mockResolvedValue({
      id: "pp-1",
      userId: "u-pp-1",
    });
    (db.session.findFirst as any).mockResolvedValue(null);

    const res = await request(app)
      .get("/api/appointments/appt-1/prep")
      .set(...authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data.enrollment).toBeNull();
    expect(res.body.data.homeworkStatus).toEqual([]);
  });
});
