import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import {
  authHeader,
  participantAuthHeader,
  mockAppointment,
  mockProgram,
  mockEnrollment,
  mockReviewTemplate,
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

const validReviewBody = {
  responses: [
    { questionId: "q1", question: "What did you do?", answer: "I worked on strategies." },
  ],
  barriers: ["Forgot to do it"],
};

// ── Review Template ──────────────────────────────

describe("GET /api/programs/:id/review-template", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/programs/program-1/review-template");
    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .get("/api/programs/program-1/review-template")
      .set(...participantAuthHeader());
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-owner clinician", async () => {
    (db.program.findFirst as any).mockResolvedValue(null);
    const res = await request(app)
      .get("/api/programs/program-1/review-template")
      .set(...authHeader());
    expect(res.status).toBe(404);
  });

  it("returns default template when none exists", async () => {
    (db.program.findFirst as any).mockResolvedValue(mockProgram());
    (db.reviewTemplate.findUnique as any).mockResolvedValue(null);
    const res = await request(app)
      .get("/api/programs/program-1/review-template")
      .set(...authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBeNull();
    expect(res.body.data.questions.length).toBeGreaterThan(0);
    expect(res.body.data.barriers.length).toBeGreaterThan(0);
  });

  it("returns custom template for program", async () => {
    (db.program.findFirst as any).mockResolvedValue(mockProgram());
    (db.reviewTemplate.findUnique as any).mockResolvedValue(mockReviewTemplate());
    const res = await request(app)
      .get("/api/programs/program-1/review-template")
      .set(...authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe("template-1");
  });
});

describe("PUT /api/programs/:id/review-template", () => {
  it("returns 404 for non-owner clinician", async () => {
    (db.program.findFirst as any).mockResolvedValue(null);
    const res = await request(app)
      .put("/api/programs/program-1/review-template")
      .set(...authHeader())
      .send({
        questions: [{ id: "q1", text: "Test?", enabled: true }],
        barriers: [{ id: "b1", label: "Barrier", enabled: true }],
      });
    expect(res.status).toBe(404);
  });

  it("creates/updates template for owned program", async () => {
    (db.program.findFirst as any).mockResolvedValue(mockProgram());
    (db.reviewTemplate.upsert as any).mockResolvedValue(mockReviewTemplate());
    const res = await request(app)
      .put("/api/programs/program-1/review-template")
      .set(...authHeader())
      .send({
        questions: [{ id: "q1", text: "Test question?", enabled: true }],
        barriers: [{ id: "b1", label: "Barrier", enabled: true }],
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("rejects template with more than 10 questions", async () => {
    const questions = Array.from({ length: 11 }, (_, i) => ({
      id: `q${i}`,
      text: "Question?",
      enabled: true,
    }));
    const res = await request(app)
      .put("/api/programs/program-1/review-template")
      .set(...authHeader())
      .send({
        questions,
        barriers: [{ id: "b1", label: "Barrier", enabled: true }],
      });
    expect(res.status).toBe(400);
  });

  it("rejects template with more than 20 barriers", async () => {
    const barriers = Array.from({ length: 21 }, (_, i) => ({
      id: `b${i}`,
      label: "Barrier",
      enabled: true,
    }));
    const res = await request(app)
      .put("/api/programs/program-1/review-template")
      .set(...authHeader())
      .send({
        questions: [{ id: "q1", text: "Q?", enabled: true }],
        barriers,
      });
    expect(res.status).toBe(400);
  });
});

// ── Review Submission ─────────────────────���──────

describe("POST /api/appointments/:id/review", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/appointments/appt-1/review")
      .send(validReviewBody);
    expect(res.status).toBe(401);
  });

  it("returns 403 for clinician role", async () => {
    const res = await request(app)
      .post("/api/appointments/appt-1/review")
      .set(...authHeader())
      .send(validReviewBody);
    expect(res.status).toBe(403);
  });

  it("returns 404 when participant has no appointment", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(null);
    const res = await request(app)
      .post("/api/appointments/appt-1/review")
      .set(...participantAuthHeader())
      .send(validReviewBody);
    expect(res.status).toBe(404);
  });

  it("returns 404 when participant has no enrollment", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(
      mockAppointment({ participantId: "test-participant-profile-id" }),
    );
    (db.enrollment.findFirst as any).mockResolvedValue(null);
    const res = await request(app)
      .post("/api/appointments/appt-1/review")
      .set(...participantAuthHeader())
      .send(validReviewBody);
    expect(res.status).toBe(404);
  });

  it("creates session review on submit", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(
      mockAppointment({ participantId: "test-participant-profile-id" }),
    );
    (db.enrollment.findFirst as any).mockResolvedValue(mockEnrollment());
    (db.sessionReview.upsert as any).mockResolvedValue(mockSessionReview());

    const res = await request(app)
      .post("/api/appointments/appt-1/review")
      .set(...participantAuthHeader())
      .send(validReviewBody);
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe("review-1");
  });

  it("upserts on re-submit (COND-10)", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(
      mockAppointment({ participantId: "test-participant-profile-id" }),
    );
    (db.enrollment.findFirst as any).mockResolvedValue(mockEnrollment());
    (db.sessionReview.upsert as any).mockResolvedValue(mockSessionReview());

    await request(app)
      .post("/api/appointments/appt-1/review")
      .set(...participantAuthHeader())
      .send(validReviewBody);

    expect(db.sessionReview.upsert).toHaveBeenCalledTimes(1);
    const upsertCall = (db.sessionReview.upsert as any).mock.calls[0][0];
    expect(upsertCall.where).toHaveProperty("appointmentId_enrollmentId");
  });

  it("rejects answer exceeding 2000 chars", async () => {
    const res = await request(app)
      .post("/api/appointments/appt-1/review")
      .set(...participantAuthHeader())
      .send({
        responses: [
          { questionId: "q1", question: "Q?", answer: "x".repeat(2001) },
        ],
        barriers: [],
      });
    expect(res.status).toBe(400);
  });
});

// ── Review Retrieval (Clinician) ─────────────────

describe("GET /api/appointments/:id/review (clinician)", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/appointments/appt-1/review");
    expect(res.status).toBe(401);
  });

  it("returns 404 for non-owner clinician", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(null);
    const res = await request(app)
      .get("/api/appointments/appt-1/review")
      .set(...authHeader());
    expect(res.status).toBe(404);
  });

  it("returns review for appointment owner", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(mockAppointment());
    (db.sessionReview.findFirst as any).mockResolvedValue(mockSessionReview());
    const res = await request(app)
      .get("/api/appointments/appt-1/review")
      .set(...authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe("review-1");
  });

  it("returns null when review not submitted", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(mockAppointment());
    (db.sessionReview.findFirst as any).mockResolvedValue(null);
    const res = await request(app)
      .get("/api/appointments/appt-1/review")
      .set(...authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it("returns 404 for cross-practice access (COND-2)", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(null); // practice filter excludes it
    const res = await request(app)
      .get("/api/appointments/appt-1/review")
      .set(...authHeader());
    expect(res.status).toBe(404);
  });
});

// ── Participant Review View ──────────────────────

describe("GET /api/participant/appointments/:id/review", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/participant/appointments/appt-1/review");
    expect(res.status).toBe(401);
  });

  it("returns 403 for clinician role", async () => {
    const res = await request(app)
      .get("/api/participant/appointments/appt-1/review")
      .set(...authHeader());
    expect(res.status).toBe(403);
  });

  it("returns 404 when participant cannot access appointment", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(null);
    const res = await request(app)
      .get("/api/participant/appointments/appt-1/review")
      .set(...participantAuthHeader());
    expect(res.status).toBe(404);
  });

  it("returns template and review data for participant", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(
      mockAppointment({
        participantId: "test-participant-profile-id",
        clinician: { id: "test-clinician-profile-id" },
      }),
    );
    (db.enrollment.findFirst as any).mockResolvedValue(
      mockEnrollment({ program: { id: "program-1" } }),
    );
    (db.reviewTemplate.findUnique as any).mockResolvedValue(mockReviewTemplate());
    (db.sessionReview.findFirst as any).mockResolvedValue(mockSessionReview());

    const res = await request(app)
      .get("/api/participant/appointments/appt-1/review")
      .set(...participantAuthHeader());
    expect(res.status).toBe(200);
    expect(res.body.data.template).toBeTruthy();
    expect(res.body.data.review).toBeTruthy();
  });
});
