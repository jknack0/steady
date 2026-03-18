import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { authHeader, mockProgram } from "./helpers";

const db = vi.mocked(prisma);

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    compare: vi.fn(),
  },
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
});
