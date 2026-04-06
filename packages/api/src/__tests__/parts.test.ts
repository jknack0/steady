import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { authHeader, mockProgram, mockModule, mockPart } from "./helpers";

const db = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
});

const BASE_URL = "/api/programs/program-1/modules/module-1/parts";

// Helper to set up ownership mocks
function mockOwnership() {
  db.program.findFirst.mockResolvedValue(mockProgram() as any);
  db.module.findFirst.mockResolvedValue(mockModule() as any);
}

describe("POST /api/programs/:programId/modules/:moduleId/parts", () => {
  it("creates a TEXT part", async () => {
    mockOwnership();
    db.part.aggregate.mockResolvedValue({ _max: { sortOrder: null } } as any);
    db.part.create.mockResolvedValue(
      mockPart({ title: "Intro", type: "TEXT" }) as any
    );

    const res = await request(app)
      .post(BASE_URL)
      .set(...authHeader())
      .send({
        type: "TEXT",
        title: "Intro",
        content: { type: "TEXT", body: "<p>Welcome</p>" },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(db.part.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          moduleId: "module-1",
          sortOrder: 0,
          type: "TEXT",
        }),
      })
    );
  });

  it("creates a VIDEO part", async () => {
    mockOwnership();
    db.part.aggregate.mockResolvedValue({ _max: { sortOrder: 0 } } as any);
    db.part.create.mockResolvedValue(mockPart({ type: "VIDEO", sortOrder: 1 }) as any);

    const res = await request(app)
      .post(BASE_URL)
      .set(...authHeader())
      .send({
        type: "VIDEO",
        title: "Tutorial Video",
        content: {
          type: "VIDEO",
          url: "https://youtube.com/watch?v=abc",
          provider: "youtube",
        },
      });

    expect(res.status).toBe(201);
  });

  it("creates a CHECKLIST part", async () => {
    mockOwnership();
    db.part.aggregate.mockResolvedValue({ _max: { sortOrder: null } } as any);
    db.part.create.mockResolvedValue(mockPart({ type: "CHECKLIST" }) as any);

    const res = await request(app)
      .post(BASE_URL)
      .set(...authHeader())
      .send({
        type: "CHECKLIST",
        title: "Session Checklist",
        content: {
          type: "CHECKLIST",
          items: [
            { text: "Bring notebook", sortOrder: 0 },
            { text: "Review materials", sortOrder: 1 },
          ],
        },
      });

    expect(res.status).toBe(201);
  });

  it("returns 400 when content.type mismatches part type", async () => {
    mockOwnership();

    const res = await request(app)
      .post(BASE_URL)
      .set(...authHeader())
      .send({
        type: "TEXT",
        title: "Mismatch",
        content: { type: "VIDEO", url: "https://youtube.com/watch?v=x", provider: "youtube" },
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Content type must match part type");
  });

  it("returns 400 for invalid content shape", async () => {
    const res = await request(app)
      .post(BASE_URL)
      .set(...authHeader())
      .send({
        type: "VIDEO",
        title: "Bad Video",
        content: { type: "VIDEO", url: "https://youtube.com/watch?v=abc", provider: "tiktok" },
      });

    expect(res.status).toBe(400);
  });

  it("returns 400 for missing title", async () => {
    const res = await request(app)
      .post(BASE_URL)
      .set(...authHeader())
      .send({
        type: "TEXT",
        content: { type: "TEXT", body: "" },
      });

    expect(res.status).toBe(400);
  });

  it("returns 404 if program/module not found", async () => {
    db.program.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post(BASE_URL)
      .set(...authHeader())
      .send({
        type: "DIVIDER",
        title: "Break",
        content: { type: "DIVIDER", label: "Section" },
      });

    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .post(BASE_URL)
      .send({ type: "TEXT", title: "Test", content: { type: "TEXT", body: "" } });

    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .post(BASE_URL)
      .set(...authHeader({ role: "PARTICIPANT" }))
      .send({ type: "TEXT", title: "Test", content: { type: "TEXT", body: "" } });

    expect(res.status).toBe(403);
  });
});

describe("GET /api/programs/:programId/modules/:moduleId/parts", () => {
  it("lists parts ordered by sortOrder", async () => {
    mockOwnership();
    db.part.findMany.mockResolvedValue([
      mockPart({ id: "p1", sortOrder: 0 }),
      mockPart({ id: "p2", sortOrder: 1, type: "VIDEO" }),
    ] as any);

    const res = await request(app)
      .get(BASE_URL)
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(db.part.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ moduleId: "module-1" }),
        orderBy: { sortOrder: "asc" },
      })
    );
  });

  it("returns 404 if module not found", async () => {
    db.program.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get(BASE_URL)
      .set(...authHeader());

    expect(res.status).toBe(404);
  });
});

describe("PUT /api/programs/:programId/modules/:moduleId/parts/:id", () => {
  it("updates part title", async () => {
    mockOwnership();
    db.part.findFirst.mockResolvedValue(mockPart() as any);
    db.part.update.mockResolvedValue(mockPart({ title: "Updated Title" }) as any);

    const res = await request(app)
      .put(`${BASE_URL}/part-1`)
      .set(...authHeader())
      .send({ title: "Updated Title" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("updates part content", async () => {
    mockOwnership();
    db.part.findFirst.mockResolvedValue(mockPart({ type: "TEXT" }) as any);
    db.part.update.mockResolvedValue(mockPart() as any);

    const res = await request(app)
      .put(`${BASE_URL}/part-1`)
      .set(...authHeader())
      .send({ content: { type: "TEXT", body: "<p>Updated body</p>" } });

    expect(res.status).toBe(200);
  });

  it("toggles isRequired", async () => {
    mockOwnership();
    db.part.findFirst.mockResolvedValue(mockPart({ isRequired: true }) as any);
    db.part.update.mockResolvedValue(mockPart({ isRequired: false }) as any);

    const res = await request(app)
      .put(`${BASE_URL}/part-1`)
      .set(...authHeader())
      .send({ isRequired: false });

    expect(res.status).toBe(200);
  });

  it("returns 400 when trying to change content type", async () => {
    mockOwnership();
    db.part.findFirst.mockResolvedValue(mockPart({ type: "TEXT" }) as any);

    const res = await request(app)
      .put(`${BASE_URL}/part-1`)
      .set(...authHeader())
      .send({ content: { type: "VIDEO", url: "https://youtube.com/watch?v=x", provider: "youtube" } });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Cannot change content type");
  });

  it("returns 404 if part not found", async () => {
    mockOwnership();
    db.part.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .put(`${BASE_URL}/nonexistent`)
      .set(...authHeader())
      .send({ title: "Updated" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/programs/:programId/modules/:moduleId/parts/:id", () => {
  it("deletes a part and renumbers", async () => {
    mockOwnership();
    db.part.findFirst.mockResolvedValue(mockPart() as any);
    db.partProgress.count.mockResolvedValue(0); // No progress → hard delete

    db.$transaction.mockImplementation(async (fn: any) => {
      if (typeof fn === "function") return fn(db);
      return Promise.all(fn);
    });
    db.part.delete.mockResolvedValue({} as any);
    db.part.findMany.mockResolvedValue([
      mockPart({ id: "p2", sortOrder: 0 }),
    ] as any);

    const res = await request(app)
      .delete(`${BASE_URL}/part-1`)
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deleted).toBe("hard");
  });

  it("returns 404 if part not found", async () => {
    mockOwnership();
    db.part.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .delete(`${BASE_URL}/nonexistent`)
      .set(...authHeader());

    expect(res.status).toBe(404);
  });
});

describe("PUT /api/programs/:programId/modules/:moduleId/parts/reorder", () => {
  it("reorders parts", async () => {
    mockOwnership();
    db.part.findMany.mockResolvedValueOnce([
      { id: "p1" },
      { id: "p2" },
    ] as any);

    db.$transaction.mockImplementation(async (fnOrArr: any) => {
      if (Array.isArray(fnOrArr)) return fnOrArr;
      return fnOrArr(db);
    });
    db.part.update.mockResolvedValue({} as any);

    db.part.findMany.mockResolvedValueOnce([
      mockPart({ id: "p2", sortOrder: 0 }),
      mockPart({ id: "p1", sortOrder: 1 }),
    ] as any);

    const res = await request(app)
      .put(`${BASE_URL}/reorder`)
      .set(...authHeader())
      .send({ partIds: ["p2", "p1"] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 400 for part ID not in module", async () => {
    mockOwnership();
    db.part.findMany.mockResolvedValue([{ id: "p1" }] as any);

    const res = await request(app)
      .put(`${BASE_URL}/reorder`)
      .set(...authHeader())
      .send({ partIds: ["p1", "p-unknown"] });

    expect(res.status).toBe(400);
  });

  it("returns 400 for empty array", async () => {
    const res = await request(app)
      .put(`${BASE_URL}/reorder`)
      .set(...authHeader())
      .send({ partIds: [] });

    expect(res.status).toBe(400);
  });
});
