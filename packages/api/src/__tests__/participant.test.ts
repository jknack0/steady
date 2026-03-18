import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { participantAuthHeader, authHeader } from "./helpers";

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

const PARTICIPANT_ID = "test-participant-profile-id";

const mockEnrollment = (overrides: any = {}) => ({
  id: "enroll-1",
  participantId: PARTICIPANT_ID,
  programId: "program-1",
  status: "ACTIVE",
  enrolledAt: new Date(),
  completedAt: null,
  currentModuleId: "mod-1",
  program: {
    id: "program-1",
    title: "Test Program",
    description: "A test program",
    coverImageUrl: null,
    cadence: "WEEKLY",
    status: "PUBLISHED",
  },
  ...overrides,
});

describe("GET /api/participant/enrollments", () => {
  it("lists participant enrollments", async () => {
    db.enrollment.findMany.mockResolvedValue([mockEnrollment()] as any);

    const res = await request(app)
      .get("/api/participant/enrollments")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].program.title).toBe("Test Program");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/participant/enrollments");
    expect(res.status).toBe(401);
  });

  it("returns 403 for clinician role", async () => {
    const res = await request(app)
      .get("/api/participant/enrollments")
      .set(...authHeader());

    expect(res.status).toBe(403);
  });
});

describe("POST /api/participant/enrollments/:id/accept", () => {
  it("accepts an invitation and initializes progress", async () => {
    db.enrollment.findFirst.mockResolvedValue(
      mockEnrollment({
        status: "INVITED",
        program: {
          id: "program-1",
          modules: [
            { id: "mod-1" },
            { id: "mod-2" },
          ],
        },
      }) as any
    );
    db.enrollment.update.mockResolvedValue(
      mockEnrollment({ status: "ACTIVE", currentModuleId: "mod-1" }) as any
    );
    db.moduleProgress.createMany.mockResolvedValue({ count: 2 } as any);

    const res = await request(app)
      .post("/api/participant/enrollments/enroll-1/accept")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(db.enrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ACTIVE" }),
      })
    );
    expect(db.moduleProgress.createMany).toHaveBeenCalled();
  });

  it("returns 404 if invitation not found", async () => {
    db.enrollment.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/participant/enrollments/nonexistent/accept")
      .set(...participantAuthHeader());

    expect(res.status).toBe(404);
  });

  it("returns 403 for clinician role", async () => {
    const res = await request(app)
      .post("/api/participant/enrollments/enroll-1/accept")
      .set(...authHeader());

    expect(res.status).toBe(403);
  });
});

describe("GET /api/participant/programs/:enrollmentId", () => {
  it("returns program content with progress", async () => {
    db.enrollment.findFirst.mockResolvedValue(
      mockEnrollment({
        program: {
          id: "program-1",
          title: "Test Program",
          description: "A test program",
          cadence: "WEEKLY",
          modules: [
            {
              id: "mod-1",
              title: "Module 1",
              sortOrder: 0,
              parts: [
                {
                  id: "part-1",
                  type: "TEXT",
                  title: "Part 1",
                  isRequired: true,
                  content: { type: "TEXT", body: "<p>Hello</p>" },
                  sortOrder: 0,
                },
              ],
            },
          ],
        },
        moduleProgress: [
          {
            moduleId: "mod-1",
            status: "UNLOCKED",
            unlockedAt: new Date(),
            completedAt: null,
          },
        ],
        partProgress: [
          {
            partId: "part-1",
            status: "COMPLETED",
            completedAt: new Date(),
            responseData: null,
          },
        ],
      }) as any
    );

    const res = await request(app)
      .get("/api/participant/programs/enroll-1")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.program.title).toBe("Test Program");
    expect(res.body.data.modules).toHaveLength(1);
    expect(res.body.data.modules[0].status).toBe("UNLOCKED");
    expect(res.body.data.modules[0].parts[0].progressStatus).toBe("COMPLETED");
  });

  it("returns 404 if enrollment not found", async () => {
    db.enrollment.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/participant/programs/nonexistent")
      .set(...participantAuthHeader());

    expect(res.status).toBe(404);
  });
});

describe("POST /api/participant/progress/part/:partId", () => {
  it("marks a part as completed", async () => {
    db.enrollment.findFirst.mockResolvedValue(mockEnrollment() as any);
    db.part.findUnique.mockResolvedValue({
      id: "part-1",
      moduleId: "mod-1",
      module: { programId: "program-1", sortOrder: 0 },
    } as any);
    db.partProgress.upsert.mockResolvedValue({
      id: "pp-1",
      enrollmentId: "enroll-1",
      partId: "part-1",
      status: "COMPLETED",
      completedAt: new Date(),
    } as any);
    // Not all required parts completed yet
    db.part.findMany.mockResolvedValue([{ id: "part-1" }, { id: "part-2" }] as any);
    db.partProgress.findMany.mockResolvedValue([{ partId: "part-1", status: "COMPLETED" }] as any);

    const res = await request(app)
      .post("/api/participant/progress/part/part-1")
      .set(...participantAuthHeader())
      .send({ enrollmentId: "enroll-1" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.moduleCompleted).toBe(false);
  });

  it("completes module and unlocks next when all required parts done", async () => {
    db.enrollment.findFirst.mockResolvedValue(mockEnrollment() as any);
    db.part.findUnique.mockResolvedValue({
      id: "part-1",
      moduleId: "mod-1",
      module: { programId: "program-1", sortOrder: 0 },
    } as any);
    db.partProgress.upsert.mockResolvedValue({
      id: "pp-1",
      status: "COMPLETED",
      completedAt: new Date(),
    } as any);
    // All required parts completed
    db.part.findMany.mockResolvedValue([{ id: "part-1" }] as any);
    db.partProgress.findMany.mockResolvedValue([{ partId: "part-1", status: "COMPLETED" }] as any);
    db.moduleProgress.update.mockResolvedValue({} as any);
    // Next module exists
    db.module.findFirst.mockResolvedValue({ id: "mod-2" } as any);
    db.moduleProgress.upsert.mockResolvedValue({} as any);
    db.enrollment.update.mockResolvedValue({} as any);

    const res = await request(app)
      .post("/api/participant/progress/part/part-1")
      .set(...participantAuthHeader())
      .send({ enrollmentId: "enroll-1" });

    expect(res.status).toBe(200);
    expect(res.body.data.moduleCompleted).toBe(true);
    expect(db.moduleProgress.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "COMPLETED" }),
      })
    );
    expect(db.moduleProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ moduleId: "mod-2", status: "UNLOCKED" }),
      })
    );
  });

  it("returns 404 if enrollment not found", async () => {
    db.enrollment.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/participant/progress/part/part-1")
      .set(...participantAuthHeader())
      .send({ enrollmentId: "nonexistent" });

    expect(res.status).toBe(404);
  });

  it("returns 404 if part not found", async () => {
    db.enrollment.findFirst.mockResolvedValue(mockEnrollment() as any);
    db.part.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/participant/progress/part/nonexistent")
      .set(...participantAuthHeader())
      .send({ enrollmentId: "enroll-1" });

    expect(res.status).toBe(404);
  });
});
