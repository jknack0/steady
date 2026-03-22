import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { authHeader, mockProgram } from "./helpers";

const db = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/programs", () => {
  it("creates a program with valid input", async () => {
    const created = mockProgram({ title: "New Program" });
    db.program.create.mockResolvedValue(created as any);

    const res = await request(app)
      .post("/api/programs")
      .set(...authHeader())
      .send({ title: "New Program" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("New Program");
    expect(db.program.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "New Program",
          clinicianId: "test-clinician-profile-id",
        }),
      })
    );
  });

  it("returns 400 for missing title", async () => {
    const res = await request(app)
      .post("/api/programs")
      .set(...authHeader())
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 for empty title", async () => {
    const res = await request(app)
      .post("/api/programs")
      .set(...authHeader())
      .send({ title: "" });

    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid cadence", async () => {
    const res = await request(app)
      .post("/api/programs")
      .set(...authHeader())
      .send({ title: "Test", cadence: "DAILY" });

    expect(res.status).toBe(400);
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app)
      .post("/api/programs")
      .send({ title: "Test" });

    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .post("/api/programs")
      .set(...authHeader({ role: "PARTICIPANT" }))
      .send({ title: "Test" });

    expect(res.status).toBe(403);
  });
});

describe("GET /api/programs", () => {
  it("lists programs for the clinician", async () => {
    const programs = [
      mockProgram({ id: "p1", title: "Program 1", _count: { modules: 3, enrollments: 2 } }),
      mockProgram({ id: "p2", title: "Program 2", _count: { modules: 1, enrollments: 0 } }),
    ];
    db.program.findMany.mockResolvedValue(programs as any);

    const res = await request(app)
      .get("/api/programs")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(db.program.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clinicianId: "test-clinician-profile-id",
        }),
      })
    );
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/programs");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/programs/:id", () => {
  it("returns a program with modules and stats", async () => {
    const program = mockProgram({
      modules: [
        { id: "m1", title: "Module 1", sortOrder: 0, _count: { parts: 3 } },
      ],
      _count: { enrollments: 5 },
    });
    db.program.findFirst.mockResolvedValue(program as any);
    db.enrollment.count.mockResolvedValue(2);

    const res = await request(app)
      .get("/api/programs/program-1")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.activeEnrollmentCount).toBe(5);
    expect(res.body.data.completedEnrollmentCount).toBe(2);
  });

  it("returns 404 for non-existent program", async () => {
    db.program.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/programs/nonexistent")
      .set(...authHeader());

    expect(res.status).toBe(404);
  });
});

describe("PUT /api/programs/:id", () => {
  it("updates program settings", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.program.update.mockResolvedValue(
      mockProgram({ title: "Updated", status: "PUBLISHED" }) as any
    );

    const res = await request(app)
      .put("/api/programs/program-1")
      .set(...authHeader())
      .send({ title: "Updated", status: "PUBLISHED" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 404 if not owned by clinician", async () => {
    db.program.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .put("/api/programs/program-1")
      .set(...authHeader())
      .send({ title: "Updated" });

    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid status", async () => {
    const res = await request(app)
      .put("/api/programs/program-1")
      .set(...authHeader())
      .send({ status: "DELETED" });

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/programs/:id", () => {
  it("archives a program with no active enrollments", async () => {
    db.program.findFirst.mockResolvedValue(
      mockProgram({ _count: { enrollments: 0 } }) as any
    );
    db.program.update.mockResolvedValue(mockProgram({ status: "ARCHIVED" }) as any);

    const res = await request(app)
      .delete("/api/programs/program-1")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(db.program.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "ARCHIVED" },
      })
    );
  });

  it("returns 409 if program has active enrollments", async () => {
    db.program.findFirst.mockResolvedValue(
      mockProgram({ _count: { enrollments: 3 } }) as any
    );

    const res = await request(app)
      .delete("/api/programs/program-1")
      .set(...authHeader());

    expect(res.status).toBe(409);
  });

  it("returns 404 if not found", async () => {
    db.program.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .delete("/api/programs/nonexistent")
      .set(...authHeader());

    expect(res.status).toBe(404);
  });
});

describe("POST /api/programs/:id/clone", () => {
  it("clones a program with modules and parts", async () => {
    const source = mockProgram({
      modules: [
        {
          id: "m1",
          title: "Module 1",
          subtitle: null,
          summary: null,
          estimatedMinutes: 30,
          sortOrder: 0,
          unlockRule: "SEQUENTIAL",
          unlockDelayDays: null,
          coverImageUrl: null,
          parts: [
            { id: "p1", type: "TEXT", title: "Part 1", sortOrder: 0, isRequired: true, content: { type: "TEXT", body: "Hi" } },
          ],
        },
      ],
      dailyTrackers: [],
    });

    db.program.findFirst.mockResolvedValue(source as any);

    // Mock transaction — it receives a function, we call it with db
    db.$transaction.mockImplementation(async (fn: any) => {
      if (typeof fn === "function") {
        return fn(db);
      }
      return Promise.all(fn);
    });

    const clonedProgram = mockProgram({ id: "cloned-1", title: "Test Program (Copy)" });
    db.program.create.mockResolvedValue(clonedProgram as any);
    db.module.create.mockResolvedValue({ id: "new-m1" } as any);
    db.part.createMany.mockResolvedValue({ count: 1 } as any);
    db.program.findUnique.mockResolvedValue(
      mockProgram({ id: "cloned-1", title: "Test Program (Copy)", modules: [] }) as any
    );

    const res = await request(app)
      .post("/api/programs/program-1/clone")
      .set(...authHeader());

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it("returns 404 for non-existent source", async () => {
    db.program.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/programs/nonexistent/clone")
      .set(...authHeader());

    expect(res.status).toBe(404);
  });
});
