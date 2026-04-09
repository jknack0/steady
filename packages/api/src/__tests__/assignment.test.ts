import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { authHeader, mockProgram, mockModule, mockPart } from "./helpers";

// Cast prisma directly — setup.ts already mocks @steady/db
const db = prisma as any;

beforeEach(() => {
  // Don't clear mocks - just reset call history
});

// Helper: create a template with modules and parts
function mockTemplate(overrides: Record<string, any> = {}) {
  return mockProgram({
    id: "template-1",
    isTemplate: true,
    status: "PUBLISHED",
    title: "CBT Fundamentals",
    modules: [
      {
        ...mockModule({ id: "mod-1", programId: "template-1", sortOrder: 0, title: "Module 1" }),
        parts: [
          mockPart({ id: "part-1", moduleId: "mod-1", sortOrder: 0, title: "Part 1" }),
          mockPart({ id: "part-2", moduleId: "mod-1", sortOrder: 1, title: "Part 2" }),
        ],
      },
      {
        ...mockModule({ id: "mod-2", programId: "template-1", sortOrder: 1, title: "Module 2" }),
        parts: [
          mockPart({ id: "part-3", moduleId: "mod-2", sortOrder: 0, title: "Part 3" }),
        ],
      },
    ],
    dailyTrackers: [
      {
        id: "tracker-1",
        programId: "template-1",
        createdById: "test-clinician-profile-id",
        name: "Mood Tracker",
        description: "Track daily mood",
        fields: [
          { id: "field-1", trackerId: "tracker-1", label: "Mood", fieldType: "SCALE", sortOrder: 0, isRequired: true, options: { min: 1, max: 10 } },
        ],
      },
    ],
    ...overrides,
  });
}

describe("POST /api/programs/:id/assign", () => {
  it("assigns a template to a client, creating program + enrollment", async () => {
    const template = mockTemplate();
    db.program.findFirst
      .mockResolvedValueOnce(template as any) // template lookup
      .mockResolvedValueOnce(null as any);     // existing program check

    db.clinicianClient.findFirst.mockResolvedValue({ id: "cc-1" } as any);

    const newProgram = mockProgram({
      id: "client-prog-1",
      templateSourceId: "template-1",
      isTemplate: false,
      status: "PUBLISHED",
    });
    const newEnrollment = {
      id: "enrollment-1",
      participantId: "participant-1",
      programId: "client-prog-1",
      status: "ACTIVE",
    };

    db.$transaction.mockImplementation(async (fn: any) => {
      if (typeof fn === "function") {
        const tx = {
          program: { create: vi.fn().mockResolvedValue(newProgram) },
          module: { create: vi.fn().mockResolvedValue(mockModule()) },
          part: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
          dailyTracker: { create: vi.fn().mockResolvedValue({ id: "new-tracker-1" }) },
          dailyTrackerField: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
          enrollment: { create: vi.fn().mockResolvedValue(newEnrollment) },
        };
        return fn(tx);
      }
      return Promise.all(fn);
    });

    const res = await request(app)
      .post("/api/programs/template-1/assign")
      .set(...authHeader())
      .send({
        participantId: "participant-1",
        excludedModuleIds: [],
        excludedPartIds: [],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.program.templateSourceId).toBe("template-1");
    expect(res.body.data.enrollment.status).toBe("ACTIVE");
  });

  it("returns 404 for non-existent or non-published template", async () => {
    db.program.findFirst.mockResolvedValue(null as any);

    const res = await request(app)
      .post("/api/programs/nonexistent/assign")
      .set(...authHeader())
      .send({ participantId: "participant-1" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Template not found or not published");
  });

  it("returns 403 when participant is not clinician's client (COND-1)", async () => {
    const template = mockTemplate();
    db.program.findFirst.mockResolvedValue(template as any);
    db.clinicianClient.findFirst.mockResolvedValue(null as any);

    const res = await request(app)
      .post("/api/programs/template-1/assign")
      .set(...authHeader())
      .send({ participantId: "not-my-participant" });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Participant is not your client");
  });

  it("returns 409 when client already has program from this template", async () => {
    const template = mockTemplate();
    db.program.findFirst
      .mockResolvedValueOnce(template as any) // template lookup
      .mockResolvedValueOnce(mockProgram({ id: "existing-prog" }) as any); // existing program check

    db.clinicianClient.findFirst.mockResolvedValue({ id: "cc-1" } as any);

    const res = await request(app)
      .post("/api/programs/template-1/assign")
      .set(...authHeader())
      .send({ participantId: "participant-1" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Client already has this program assigned");
    expect(res.body.clientProgramId).toBe("existing-prog");
  });

  it("excludes modules and parts based on selections", async () => {
    const template = mockTemplate();
    db.program.findFirst
      .mockResolvedValueOnce(template as any)
      .mockResolvedValueOnce(null as any);
    db.clinicianClient.findFirst.mockResolvedValue({ id: "cc-1" } as any);

    let createdModuleCount = 0;
    let createdPartCount = 0;

    db.$transaction.mockImplementation(async (fn: any) => {
      if (typeof fn === "function") {
        const tx = {
          program: { create: vi.fn().mockResolvedValue(mockProgram({ id: "new-prog", templateSourceId: "template-1", status: "PUBLISHED" })) },
          module: { create: vi.fn().mockImplementation(async () => {
            createdModuleCount++;
            return mockModule({ id: `new-mod-${createdModuleCount}` });
          }) },
          part: { createMany: vi.fn().mockImplementation(async (args: any) => {
            createdPartCount += args.data.length;
            return { count: args.data.length };
          }) },
          dailyTracker: { create: vi.fn().mockResolvedValue({ id: "new-tracker-1" }) },
          dailyTrackerField: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
          enrollment: { create: vi.fn().mockResolvedValue({ id: "e-1", status: "ACTIVE", participantId: "participant-1", programId: "new-prog" }) },
        };
        return fn(tx);
      }
      return Promise.all(fn);
    });

    const res = await request(app)
      .post("/api/programs/template-1/assign")
      .set(...authHeader())
      .send({
        participantId: "participant-1",
        excludedModuleIds: ["mod-2"],    // Exclude Module 2
        excludedPartIds: ["part-2"],     // Exclude Part 2 from Module 1
      });

    expect(res.status).toBe(201);
    // Only 1 module created (mod-2 excluded)
    expect(createdModuleCount).toBe(1);
    // Only 1 part created (part-1 kept, part-2 excluded)
    expect(createdPartCount).toBe(1);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/programs/template-1/assign")
      .send({ participantId: "participant-1" });

    expect(res.status).toBe(401);
  });

  it("returns 400 for missing participantId", async () => {
    const res = await request(app)
      .post("/api/programs/template-1/assign")
      .set(...authHeader())
      .send({});

    expect(res.status).toBe(400);
  });
});

describe("POST /api/programs/:id/assign/append", () => {
  it("appends modules to an existing client program", async () => {
    const template = mockTemplate();
    db.program.findFirst
      .mockResolvedValueOnce(template as any)    // template lookup
      .mockResolvedValueOnce({                    // client program lookup
        ...mockProgram({ id: "client-prog-1", title: "CBT Fundamentals" }),
        modules: [{ sortOrder: 0 }, { sortOrder: 1 }, { sortOrder: 2 }],
        dailyTrackers: [{ name: "Mood Tracker" }],
      } as any);

    let createdModuleSortOrders: number[] = [];

    db.$transaction.mockImplementation(async (fn: any) => {
      if (typeof fn === "function") {
        const tx = {
          module: { create: vi.fn().mockImplementation(async (args: any) => {
            createdModuleSortOrders.push(args.data.sortOrder);
            return mockModule({ id: `new-mod`, sortOrder: args.data.sortOrder });
          }) },
          part: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
          dailyTracker: { create: vi.fn().mockResolvedValue({ id: "new-tracker" }) },
          dailyTrackerField: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
        };
        return fn(tx);
      }
      return Promise.all(fn);
    });

    db.program.findUnique.mockResolvedValue({
      ...mockProgram({ id: "client-prog-1" }),
      _count: { modules: 5 },
    } as any);

    const res = await request(app)
      .post("/api/programs/template-1/assign/append")
      .set(...authHeader())
      .send({
        clientProgramId: "client-prog-1",
        excludedModuleIds: [],
        excludedPartIds: [],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.appendedModules).toBe(2);
    // COND-4: sort orders start after existing max (2) → 3, 4
    expect(createdModuleSortOrders).toEqual([3, 4]);
  });

  it("deduplicates daily trackers by name", async () => {
    const template = mockTemplate();
    db.program.findFirst
      .mockResolvedValueOnce(template as any)
      .mockResolvedValueOnce({
        ...mockProgram({ id: "client-prog-1" }),
        modules: [{ sortOrder: 0 }],
        dailyTrackers: [{ name: "Mood Tracker" }], // Same name as template tracker
      } as any);

    let trackerCreated = false;

    db.$transaction.mockImplementation(async (fn: any) => {
      if (typeof fn === "function") {
        const tx = {
          module: { create: vi.fn().mockResolvedValue(mockModule()) },
          part: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
          dailyTracker: { create: vi.fn().mockImplementation(async () => {
            trackerCreated = true;
            return { id: "new-tracker" };
          }) },
          dailyTrackerField: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
        };
        return fn(tx);
      }
      return Promise.all(fn);
    });

    db.program.findUnique.mockResolvedValue({
      _count: { modules: 3 },
    } as any);

    await request(app)
      .post("/api/programs/template-1/assign/append")
      .set(...authHeader())
      .send({
        clientProgramId: "client-prog-1",
        excludedModuleIds: [],
        excludedPartIds: [],
      });

    // Tracker should NOT have been created (same name exists)
    expect(trackerCreated).toBe(false);
  });

  it("returns 404 for non-existent template", async () => {
    db.program.findFirst.mockResolvedValue(null as any);

    const res = await request(app)
      .post("/api/programs/nonexistent/assign/append")
      .set(...authHeader())
      .send({ clientProgramId: "client-prog-1" });

    expect(res.status).toBe(404);
  });

  it("returns 404 when clinician doesn't own client program", async () => {
    const template = mockTemplate();
    db.program.findFirst
      .mockResolvedValueOnce(template as any)
      .mockResolvedValueOnce(null as any); // client program not found (ownership check)

    const res = await request(app)
      .post("/api/programs/template-1/assign/append")
      .set(...authHeader())
      .send({ clientProgramId: "not-my-program" });

    expect(res.status).toBe(404);
  });
});

describe("Smart Delete — Modules", () => {
  it("hard-deletes a module with no progress", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.module.findFirst.mockResolvedValue(mockModule() as any);
    db.moduleProgress.count.mockResolvedValue(0);

    db.$transaction.mockImplementation(async (fn: any) => {
      if (typeof fn === "function") {
        const tx = {
          module: {
            delete: vi.fn().mockResolvedValue(mockModule()),
            findMany: vi.fn().mockResolvedValue([]),
            update: vi.fn(),
          },
        };
        return fn(tx);
      }
      return Promise.all(fn);
    });

    const res = await request(app)
      .delete("/api/programs/program-1/modules/module-1")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe("soft");
  });

  it("soft-deletes a module with progress (COND-2)", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.module.findFirst.mockResolvedValue(mockModule() as any);
    db.moduleProgress.count.mockResolvedValue(1); // Has progress

    db.$transaction.mockImplementation(async (fn: any) => {
      if (typeof fn === "function") {
        const tx = {
          module: {
            update: vi.fn().mockResolvedValue(mockModule()),
            findMany: vi.fn().mockResolvedValue([]),
          },
        };
        return fn(tx);
      }
      return Promise.all(fn);
    });

    const res = await request(app)
      .delete("/api/programs/program-1/modules/module-1")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe("soft");
  });
});

describe("Smart Delete — Parts", () => {
  it("hard-deletes a part with no progress", async () => {
    // verifyOwnership calls program.findFirst then module.findFirst
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.module.findFirst.mockResolvedValue(mockModule() as any);
    db.part.findFirst.mockResolvedValue(mockPart() as any);
    db.partProgress.count.mockResolvedValue(0);

    db.$transaction.mockImplementation(async (fn: any) => {
      if (typeof fn === "function") {
        const tx = {
          part: {
            delete: vi.fn().mockResolvedValue(mockPart()),
            findMany: vi.fn().mockResolvedValue([]),
            update: vi.fn(),
          },
        };
        return fn(tx);
      }
      return Promise.all(fn);
    });

    const res = await request(app)
      .delete("/api/programs/program-1/modules/module-1/parts/part-1")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe("soft");
  });

  it("soft-deletes a part with progress (COND-2)", async () => {
    db.program.findFirst.mockResolvedValue(mockProgram() as any);
    db.module.findFirst.mockResolvedValue(mockModule() as any);
    db.part.findFirst.mockResolvedValue(mockPart() as any);
    db.partProgress.count.mockResolvedValue(1); // Has progress

    db.$transaction.mockImplementation(async (fn: any) => {
      if (typeof fn === "function") {
        const tx = {
          part: {
            update: vi.fn().mockResolvedValue(mockPart()),
            findMany: vi.fn().mockResolvedValue([]),
          },
        };
        return fn(tx);
      }
      return Promise.all(fn);
    });

    const res = await request(app)
      .delete("/api/programs/program-1/modules/module-1/parts/part-1")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe("soft");
  });
});
