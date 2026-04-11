import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { authHeader, mockProgram, mockModule } from "./helpers";

const db = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/programs/:programId/modules", () => {
  it("creates a module with valid input", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.module.aggregate.mockResolvedValue({ _max: { sortOrder: 1 } } as any);
    const created = mockModule({ title: "New Module", sortOrder: 2 });
    db.module.create.mockResolvedValue(created as any);

    const res = await request(app)
      .post("/api/programs/program-1/modules")
      .set(...authHeader())
      .send({ title: "New Module" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("New Module");
    expect(db.module.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          programId: "program-1",
          sortOrder: 2,
        }),
      })
    );
  });

  it("sets sortOrder to 0 for first module", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.module.aggregate.mockResolvedValue({ _max: { sortOrder: null } } as any);
    db.module.create.mockResolvedValue(mockModule({ sortOrder: 0 }) as any);

    const res = await request(app)
      .post("/api/programs/program-1/modules")
      .set(...authHeader())
      .send({ title: "First Module" });

    expect(res.status).toBe(201);
    expect(db.module.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sortOrder: 0 }),
      })
    );
  });

  it("returns 404 if program not owned", async () => {
    db.program.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/programs/program-1/modules")
      .set(...authHeader())
      .send({ title: "Test" });

    expect(res.status).toBe(404);
  });

  it("returns 400 for empty title", async () => {
    const res = await request(app)
      .post("/api/programs/program-1/modules")
      .set(...authHeader())
      .send({ title: "" });

    expect(res.status).toBe(400);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/programs/program-1/modules")
      .send({ title: "Test" });

    expect(res.status).toBe(401);
  });
});

describe("GET /api/programs/:programId/modules", () => {
  it("lists modules ordered by sortOrder", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.module.findMany.mockResolvedValue([
      mockModule({ id: "m1", sortOrder: 0, _count: { parts: 2 } }),
      mockModule({ id: "m2", sortOrder: 1, _count: { parts: 5 } }),
    ] as any);

    const res = await request(app)
      .get("/api/programs/program-1/modules")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it("returns 404 if program not owned", async () => {
    db.program.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/programs/program-1/modules")
      .set(...authHeader());

    expect(res.status).toBe(404);
  });
});

describe("PUT /api/programs/:programId/modules/:id", () => {
  it("updates a module", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.module.findFirst.mockResolvedValue(mockModule() as any);
    db.module.update.mockResolvedValue(mockModule({ title: "Updated" }) as any);

    const res = await request(app)
      .put("/api/programs/program-1/modules/module-1")
      .set(...authHeader())
      .send({ title: "Updated" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 404 if module not found", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.module.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .put("/api/programs/program-1/modules/nonexistent")
      .set(...authHeader())
      .send({ title: "Updated" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/programs/:programId/modules/:id", () => {
  it("deletes a module and renumbers remaining", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.module.findFirst.mockResolvedValue(mockModule() as any);
    db.moduleProgress.count.mockResolvedValue(0); // No progress → hard delete

    // Mock transaction
    db.$transaction.mockImplementation(async (fn: any) => {
      if (typeof fn === "function") return fn(db);
      return Promise.all(fn);
    });
    db.module.delete.mockResolvedValue({} as any);
    db.module.findMany.mockResolvedValue([
      mockModule({ id: "m2", sortOrder: 0 }),
    ] as any);

    const res = await request(app)
      .delete("/api/programs/program-1/modules/module-1")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deleted).toBe("soft");
  });

  it("returns 404 if module not found", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.module.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .delete("/api/programs/program-1/modules/nonexistent")
      .set(...authHeader());

    expect(res.status).toBe(404);
  });
});

describe("PUT /api/programs/:programId/modules/reorder", () => {
  it("reorders modules successfully", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.module.findMany.mockResolvedValueOnce([
      { id: "m1" },
      { id: "m2" },
      { id: "m3" },
    ] as any);

    // Mock transaction for array of updates
    db.$transaction.mockImplementation(async (fnOrArr: any) => {
      if (Array.isArray(fnOrArr)) return fnOrArr;
      return fnOrArr(db);
    });
    db.module.update.mockResolvedValue({} as any);

    // Second findMany for response
    db.module.findMany.mockResolvedValueOnce([
      mockModule({ id: "m3", sortOrder: 0 }),
      mockModule({ id: "m1", sortOrder: 1 }),
      mockModule({ id: "m2", sortOrder: 2 }),
    ] as any);

    const res = await request(app)
      .put("/api/programs/program-1/modules/reorder")
      .set(...authHeader())
      .send({ moduleIds: ["m3", "m1", "m2"] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 400 for module ID not in program", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.module.findMany.mockResolvedValue([{ id: "m1" }, { id: "m2" }] as any);

    const res = await request(app)
      .put("/api/programs/program-1/modules/reorder")
      .set(...authHeader())
      .send({ moduleIds: ["m1", "m2", "m-unknown"] });

    expect(res.status).toBe(400);
  });

  it("returns 400 for empty array", async () => {
    const res = await request(app)
      .put("/api/programs/program-1/modules/reorder")
      .set(...authHeader())
      .send({ moduleIds: [] });

    expect(res.status).toBe(400);
  });
});
