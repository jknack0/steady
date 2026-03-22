import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { authHeader, participantAuthHeader, mockProgram } from "./helpers";

const db = vi.mocked(prisma);

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    compare: vi.fn(),
  },
}));

vi.mock("../services/homework-instances", () => ({
  getStreakData: vi.fn().mockResolvedValue({
    currentStreak: 3,
    longestStreak: 5,
    totalCompleted: 10,
    totalExpected: 15,
    complianceRate: 0.67,
  }),
  cancelFutureInstances: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../services/notifications", () => ({
  scheduleSessionReminders: vi.fn().mockResolvedValue(undefined),
  cancelSessionReminders: vi.fn().mockResolvedValue(undefined),
  cancelHomeworkReminders: vi.fn().mockResolvedValue(undefined),
  scheduleTaskReminder: vi.fn().mockResolvedValue(undefined),
  recordDismissal: vi.fn().mockResolvedValue(undefined),
  registerNotificationWorkers: vi.fn().mockResolvedValue(undefined),
  queueNotification: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const BASE_URL = "/api/programs/program-1/enrollments";

const mockEnrollment = (overrides: any = {}) => ({
  id: "enroll-1",
  participantId: "pp-1",
  programId: "program-1",
  status: "INVITED",
  enrolledAt: new Date(),
  completedAt: null,
  currentModuleId: null,
  participant: {
    id: "pp-1",
    user: {
      id: "user-2",
      email: "participant@test.com",
      firstName: "Jane",
      lastName: "Doe",
    },
  },
  ...overrides,
});

describe("GET /api/programs/:programId/enrollments", () => {
  it("lists enrollments for a program", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.enrollment.findMany.mockResolvedValue([mockEnrollment()] as any);

    const res = await request(app)
      .get(BASE_URL)
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].participant.email).toBe("participant@test.com");
  });

  it("returns 404 if program not owned", async () => {
    db.program.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get(BASE_URL)
      .set(...authHeader());

    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get(BASE_URL);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/programs/:programId/enrollments", () => {
  it("creates an enrollment for existing participant", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram({ status: "PUBLISHED" }) as any);
    db.user.findUnique.mockResolvedValue({
      id: "user-2",
      email: "participant@test.com",
      role: "PARTICIPANT",
      participantProfile: { id: "pp-1" },
    } as any);
    db.enrollment.findFirst.mockResolvedValue(null);
    db.enrollment.create.mockResolvedValue({
      id: "enroll-1",
      status: "INVITED",
      enrolledAt: new Date(),
    } as any);

    const res = await request(app)
      .post(BASE_URL)
      .set(...authHeader())
      .send({ participantEmail: "participant@test.com" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it("creates participant user if not exists", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram({ status: "PUBLISHED" }) as any);
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue({
      id: "user-new",
      email: "new@test.com",
      role: "PARTICIPANT",
      participantProfile: { id: "pp-new" },
    } as any);
    db.enrollment.findFirst.mockResolvedValue(null);
    db.enrollment.create.mockResolvedValue({
      id: "enroll-2",
      status: "INVITED",
      enrolledAt: new Date(),
    } as any);

    const res = await request(app)
      .post(BASE_URL)
      .set(...authHeader())
      .send({
        participantEmail: "new@test.com",
        firstName: "New",
        lastName: "Person",
      });

    expect(res.status).toBe(201);
    expect(db.user.create).toHaveBeenCalled();
  });

  it("returns 400 if program is not published", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram({ status: "DRAFT" }) as any);

    const res = await request(app)
      .post(BASE_URL)
      .set(...authHeader())
      .send({ participantEmail: "test@test.com" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("published");
  });

  it("returns 400 if email belongs to clinician", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram({ status: "PUBLISHED" }) as any);
    db.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: "CLINICIAN",
    } as any);

    const res = await request(app)
      .post(BASE_URL)
      .set(...authHeader())
      .send({ participantEmail: "clinician@test.com" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("clinician");
  });

  it("returns 409 if already enrolled", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram({ status: "PUBLISHED" }) as any);
    db.user.findUnique.mockResolvedValue({
      id: "user-2",
      role: "PARTICIPANT",
      participantProfile: { id: "pp-1" },
    } as any);
    db.enrollment.findFirst.mockResolvedValue({ id: "existing" } as any);

    const res = await request(app)
      .post(BASE_URL)
      .set(...authHeader())
      .send({ participantEmail: "participant@test.com" });

    expect(res.status).toBe(409);
  });

  it("returns 400 for invalid email", async () => {
    const res = await request(app)
      .post(BASE_URL)
      .set(...authHeader())
      .send({ participantEmail: "not-an-email" });

    expect(res.status).toBe(400);
  });
});

describe("PUT /api/programs/:programId/enrollments/:id", () => {
  it("updates enrollment status", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.enrollment.findFirst.mockResolvedValue(mockEnrollment() as any);
    db.enrollment.update.mockResolvedValue(
      mockEnrollment({ status: "ACTIVE" }) as any
    );

    const res = await request(app)
      .put(`${BASE_URL}/enroll-1`)
      .set(...authHeader())
      .send({ status: "ACTIVE" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 404 if enrollment not found", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.enrollment.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .put(`${BASE_URL}/nonexistent`)
      .set(...authHeader())
      .send({ status: "ACTIVE" });

    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid status", async () => {
    const res = await request(app)
      .put(`${BASE_URL}/enroll-1`)
      .set(...authHeader())
      .send({ status: "INVALID" });

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/programs/:programId/enrollments/:id", () => {
  it("deletes an enrollment", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.enrollment.findFirst.mockResolvedValue(mockEnrollment() as any);
    db.enrollment.delete.mockResolvedValue({} as any);

    const res = await request(app)
      .delete(`${BASE_URL}/enroll-1`)
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 404 if enrollment not found", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.enrollment.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .delete(`${BASE_URL}/nonexistent`)
      .set(...authHeader());

    expect(res.status).toBe(404);
  });

  it("returns 404 if program not owned", async () => {
    db.program.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .delete(`${BASE_URL}/enroll-1`)
      .set(...authHeader());

    expect(res.status).toBe(404);
  });
});

// ── PUT status transitions ──────────────────────────

describe("PUT /api/programs/:programId/enrollments/:id (additional transitions)", () => {
  it("sets completedAt when status is COMPLETED", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.enrollment.findFirst.mockResolvedValue(mockEnrollment() as any);
    db.enrollment.update.mockResolvedValue(
      mockEnrollment({ status: "COMPLETED", completedAt: new Date() }) as any
    );

    const res = await request(app)
      .put(`${BASE_URL}/enroll-1`)
      .set(...authHeader())
      .send({ status: "COMPLETED" });

    expect(res.status).toBe(200);
    expect(db.enrollment.update).toHaveBeenCalledWith({
      where: { id: "enroll-1" },
      data: expect.objectContaining({
        status: "COMPLETED",
        completedAt: expect.any(Date),
      }),
    });
  });

  it("does not set completedAt for non-COMPLETED status", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.enrollment.findFirst.mockResolvedValue(mockEnrollment() as any);
    db.enrollment.update.mockResolvedValue(
      mockEnrollment({ status: "PAUSED" }) as any
    );

    const res = await request(app)
      .put(`${BASE_URL}/enroll-1`)
      .set(...authHeader())
      .send({ status: "PAUSED" });

    expect(res.status).toBe(200);
    expect(db.enrollment.update).toHaveBeenCalledWith({
      where: { id: "enroll-1" },
      data: { status: "PAUSED" },
    });
  });

  it("returns 404 when program not owned on update", async () => {
    db.program.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .put(`${BASE_URL}/enroll-1`)
      .set(...authHeader())
      .send({ status: "ACTIVE" });

    expect(res.status).toBe(404);
  });

  it("can transition to DROPPED status", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.enrollment.findFirst.mockResolvedValue(mockEnrollment({ status: "ACTIVE" }) as any);
    db.enrollment.update.mockResolvedValue(
      mockEnrollment({ status: "DROPPED" }) as any
    );

    const res = await request(app)
      .put(`${BASE_URL}/enroll-1`)
      .set(...authHeader())
      .send({ status: "DROPPED" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("DROPPED");
  });
});

// ── POST create enrollment (additional paths) ───────

describe("POST /api/programs/:programId/enrollments (additional paths)", () => {
  it("returns 404 if program not owned", async () => {
    db.program.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post(BASE_URL)
      .set(...authHeader())
      .send({ participantEmail: "test@test.com" });

    expect(res.status).toBe(404);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .post(BASE_URL)
      .set(...participantAuthHeader())
      .send({ participantEmail: "test@test.com" });

    expect(res.status).toBe(403);
  });

  it("returns 400 for missing email field", async () => {
    const res = await request(app)
      .post(BASE_URL)
      .set(...authHeader())
      .send({});

    expect(res.status).toBe(400);
  });
});

// ── GET /api/programs/:programId/enrollments/:id/homework-compliance ──

describe("GET /api/programs/:programId/enrollments/:id/homework-compliance", () => {
  it("returns 404 if program not owned", async () => {
    db.program.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get(`${BASE_URL}/enroll-1/homework-compliance`)
      .set(...authHeader());

    expect(res.status).toBe(404);
  });

  it("returns 404 if enrollment not found", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.enrollment.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get(`${BASE_URL}/enroll-1/homework-compliance`)
      .set(...authHeader());

    expect(res.status).toBe(404);
  });

  it("returns compliance data for recurring homework", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.enrollment.findFirst.mockResolvedValue(mockEnrollment() as any);
    db.part.findMany.mockResolvedValue([
      {
        id: "part-hw-1",
        title: "Daily Journaling",
        content: { type: "HOMEWORK", recurrence: "DAILY", recurrenceDays: null },
      },
      {
        id: "part-hw-2",
        title: "Weekly Check-in",
        content: { type: "HOMEWORK", recurrence: "WEEKLY", recurrenceDays: ["MON", "FRI"] },
      },
      {
        id: "part-hw-3",
        title: "One-time Homework",
        content: { type: "HOMEWORK", recurrence: "NONE" },
      },
    ] as any);

    const res = await request(app)
      .get(`${BASE_URL}/enroll-1/homework-compliance`)
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2); // only recurring parts (DAILY and WEEKLY)
    expect(res.body.data[0].partTitle).toBe("Daily Journaling");
    expect(res.body.data[0].currentStreak).toBe(3);
    expect(res.body.data[1].partTitle).toBe("Weekly Check-in");
    expect(res.body.data[1].recurrence).toBe("WEEKLY");
  });

  it("returns empty array when no recurring homework exists", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.enrollment.findFirst.mockResolvedValue(mockEnrollment() as any);
    db.part.findMany.mockResolvedValue([
      {
        id: "part-hw-1",
        title: "One-time Task",
        content: { type: "HOMEWORK", recurrence: "NONE" },
      },
    ] as any);

    const res = await request(app)
      .get(`${BASE_URL}/enroll-1/homework-compliance`)
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("returns empty array when no homework parts at all", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.enrollment.findFirst.mockResolvedValue(mockEnrollment() as any);
    db.part.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get(`${BASE_URL}/enroll-1/homework-compliance`)
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .get(`${BASE_URL}/enroll-1/homework-compliance`);

    expect(res.status).toBe(401);
  });
});

// ── POST stop-recurrence ────────────────────────────

describe("POST /api/programs/:programId/enrollments/:enrollmentId/parts/:partId/stop-recurrence", () => {
  const stopUrl = `${BASE_URL}/enroll-1/parts/part-hw-1/stop-recurrence`;

  it("returns 404 if program not owned", async () => {
    db.program.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post(stopUrl)
      .set(...authHeader());

    expect(res.status).toBe(404);
  });

  it("returns 404 if homework part not found", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.part.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post(stopUrl)
      .set(...authHeader());

    expect(res.status).toBe(404);
    expect(res.body.error).toContain("Homework part not found");
  });

  it("stops recurrence successfully", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.part.findFirst.mockResolvedValue({
      id: "part-hw-1",
      type: "HOMEWORK",
      content: { type: "HOMEWORK", recurrence: "DAILY" },
    } as any);
    db.part.update.mockResolvedValue({} as any);

    const res = await request(app)
      .post(stopUrl)
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(db.part.update).toHaveBeenCalledWith({
      where: { id: "part-hw-1" },
      data: {
        content: expect.objectContaining({
          recurrenceEndDate: expect.any(String),
        }),
      },
    });
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).post(stopUrl);
    expect(res.status).toBe(401);
  });
});

// ── GET list enrollments (additional paths) ─────────

describe("GET /api/programs/:programId/enrollments (additional paths)", () => {
  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .get(BASE_URL)
      .set(...participantAuthHeader());

    expect(res.status).toBe(403);
  });
});
