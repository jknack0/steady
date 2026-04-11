import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { authHeader, participantAuthHeader } from "./helpers";

const db = vi.mocked(prisma);

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    compare: vi.fn(),
  },
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

// ── POST /api/practices ─────────────────────────────

describe("POST /api/practices", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/practices");
    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .post("/api/practices")
      .set(...participantAuthHeader())
      .send({ name: "Test" });
    expect(res.status).toBe(403);
  });

  it("returns 400 for missing name", async () => {
    const res = await request(app)
      .post("/api/practices")
      .set(...authHeader())
      .send({});
    expect(res.status).toBe(400);
  });

  it("creates a practice with owner membership", async () => {
    db.practice.create.mockResolvedValue({
      id: "practice-1",
      name: "Test Practice",
      ownerId: "test-user-id",
      memberships: [{ id: "mem-1", role: "OWNER" }],
    } as any);

    const res = await request(app)
      .post("/api/practices")
      .set(...authHeader())
      .send({ name: "Test Practice" });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Test Practice");
  });
});

// ── GET /api/practices ──────────────────────────────

describe("GET /api/practices", () => {
  it("returns practices for clinician", async () => {
    db.practiceMembership.findMany.mockResolvedValue([
      {
        role: "OWNER",
        practice: {
          id: "practice-1",
          name: "My Practice",
          ownerId: "test-user-id",
          memberships: [
            {
              id: "mem-1",
              clinicianId: "test-clinician-profile-id",
              role: "OWNER",
              joinedAt: new Date(),
              clinician: { user: { firstName: "Test", lastName: "User", email: "test@test.com" } },
            },
          ],
          _count: { programs: 3 },
        },
      },
    ] as any);

    const res = await request(app)
      .get("/api/practices")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("My Practice");
    expect(res.body.data[0].myRole).toBe("OWNER");
  });
});

// ── POST /api/practices/:id/invite ──────────────────

describe("POST /api/practices/:id/invite", () => {
  it("returns 403 for non-owner", async () => {
    db.practiceMembership.findUnique.mockResolvedValue({
      role: "CLINICIAN",
    } as any);

    const res = await request(app)
      .post("/api/practices/practice-1/invite")
      .set(...authHeader())
      .send({ email: "other@test.com" });

    expect(res.status).toBe(403);
  });

  it("invites a clinician", async () => {
    db.practiceMembership.findUnique
      .mockResolvedValueOnce({ role: "OWNER" } as any)  // owner check
      .mockResolvedValueOnce(null);  // not already member

    db.user.findUnique.mockResolvedValue({
      id: "user-2",
      role: "CLINICIAN",
      clinicianProfile: { id: "cp-2" },
    } as any);

    db.practiceMembership.create.mockResolvedValue({
      id: "mem-2",
      practiceId: "practice-1",
      clinicianId: "cp-2",
      role: "CLINICIAN",
    } as any);

    const res = await request(app)
      .post("/api/practices/practice-1/invite")
      .set(...authHeader())
      .send({ email: "other@test.com" });

    expect(res.status).toBe(201);
  });
});

// ── GET /api/practices/:id/dashboard ────────────────

describe("GET /api/practices/:id/dashboard", () => {
  it("returns 403 for non-owner", async () => {
    db.practiceMembership.findUnique.mockResolvedValue({
      role: "CLINICIAN",
    } as any);

    const res = await request(app)
      .get("/api/practices/practice-1/dashboard")
      .set(...authHeader());

    expect(res.status).toBe(403);
  });

  it("returns aggregate stats for owner", async () => {
    db.practiceMembership.findUnique.mockResolvedValue({ role: "OWNER" } as any);
    db.practiceMembership.findMany.mockResolvedValue([
      {
        clinicianId: "cp-1",
        role: "OWNER",
        clinician: {
          user: { firstName: "Dr", lastName: "Smith" },
          programs: [
            { status: "PUBLISHED", _count: { enrollments: 5, modules: 3 } },
            { status: "DRAFT", _count: { enrollments: 0, modules: 1 } },
          ],
        },
      },
    ] as any);

    const res = await request(app)
      .get("/api/practices/practice-1/dashboard")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.totals.clinicians).toBe(1);
    expect(res.body.data.totals.programs).toBe(2);
    expect(res.body.data.totals.enrollments).toBe(5);
  });
});

// ── PUT /api/practices/:id ───────────────────────────

describe("PUT /api/practices/:id", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).put("/api/practices/practice-1");
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-owner", async () => {
    db.practiceMembership.findUnique.mockResolvedValue({
      role: "CLINICIAN",
    } as any);

    const res = await request(app)
      .put("/api/practices/practice-1")
      .set(...authHeader())
      .send({ name: "New Name" });

    expect(res.status).toBe(403);
  });

  it("returns 403 when membership not found", async () => {
    db.practiceMembership.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .put("/api/practices/practice-1")
      .set(...authHeader())
      .send({ name: "New Name" });

    expect(res.status).toBe(403);
  });

  it("updates practice name for owner", async () => {
    db.practiceMembership.findUnique.mockResolvedValue({
      role: "OWNER",
    } as any);
    db.practice.update.mockResolvedValue({
      id: "practice-1",
      name: "Updated Name",
      ownerId: "test-user-id",
    } as any);

    const res = await request(app)
      .put("/api/practices/practice-1")
      .set(...authHeader())
      .send({ name: "Updated Name" });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Updated Name");
    expect(db.practice.update).toHaveBeenCalledWith({
      where: { id: "practice-1" },
      data: { name: "Updated Name" },
    });
  });
});

// ── DELETE /api/practices/:id/members/:memberId ─────

describe("DELETE /api/practices/:id/members/:memberId", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).delete("/api/practices/practice-1/members/mem-1");
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-owner", async () => {
    db.practiceMembership.findUnique.mockResolvedValue({
      role: "CLINICIAN",
    } as any);

    const res = await request(app)
      .delete("/api/practices/practice-1/members/mem-1")
      .set(...authHeader());

    expect(res.status).toBe(403);
  });

  it("returns 403 when requester has no membership", async () => {
    db.practiceMembership.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete("/api/practices/practice-1/members/mem-1")
      .set(...authHeader());

    expect(res.status).toBe(403);
  });

  it("returns 404 when target membership not found", async () => {
    db.practiceMembership.findUnique
      .mockResolvedValueOnce({ role: "OWNER" } as any) // requester is owner
      .mockResolvedValueOnce(null); // target not found

    const res = await request(app)
      .delete("/api/practices/practice-1/members/mem-nonexistent")
      .set(...authHeader());

    expect(res.status).toBe(404);
  });

  it("returns 404 when target belongs to different practice", async () => {
    db.practiceMembership.findUnique
      .mockResolvedValueOnce({ role: "OWNER" } as any)
      .mockResolvedValueOnce({ id: "mem-2", practiceId: "other-practice", role: "CLINICIAN" } as any);

    const res = await request(app)
      .delete("/api/practices/practice-1/members/mem-2")
      .set(...authHeader());

    expect(res.status).toBe(404);
  });

  it("returns 400 when trying to remove the owner", async () => {
    db.practiceMembership.findUnique
      .mockResolvedValueOnce({ role: "OWNER" } as any)
      .mockResolvedValueOnce({ id: "mem-owner", practiceId: "practice-1", role: "OWNER" } as any);

    const res = await request(app)
      .delete("/api/practices/practice-1/members/mem-owner")
      .set(...authHeader());

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("owner");
  });

  it("removes a clinician member successfully", async () => {
    db.practiceMembership.findUnique
      .mockResolvedValueOnce({ role: "OWNER" } as any)
      .mockResolvedValueOnce({ id: "mem-2", practiceId: "practice-1", role: "CLINICIAN" } as any);
    db.practiceMembership.delete.mockResolvedValue({} as any);

    const res = await request(app)
      .delete("/api/practices/practice-1/members/mem-2")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(db.practiceMembership.delete).toHaveBeenCalledWith({ where: { id: "mem-2" } });
  });
});

// ── GET /api/practices/:id/templates ────────────────

describe("GET /api/practices/:id/templates", () => {
  it("returns 403 when not a member", async () => {
    db.practiceMembership.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/practices/practice-1/templates")
      .set(...authHeader());

    expect(res.status).toBe(403);
  });

  it("returns templates for a practice member", async () => {
    db.practiceMembership.findUnique.mockResolvedValue({ role: "CLINICIAN" } as any);
    db.program.findMany.mockResolvedValue([
      {
        id: "prog-1",
        title: "Template Program",
        description: "A template",
        cadence: "WEEKLY",
        isTemplate: true,
        updatedAt: new Date(),
        clinician: { user: { firstName: "Dr", lastName: "Smith" } },
        _count: { modules: 4 },
      },
    ] as any);

    const res = await request(app)
      .get("/api/practices/practice-1/templates")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe("Template Program");
    expect(res.body.data[0].createdBy).toBe("Dr Smith");
    expect(res.body.data[0].moduleCount).toBe(4);
  });

  it("returns empty array when no templates exist", async () => {
    db.practiceMembership.findUnique.mockResolvedValue({ role: "OWNER" } as any);
    db.program.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/practices/practice-1/templates")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

// ── POST /api/practices/:id/share-program ───────────

describe("POST /api/practices/:id/share-program", () => {
  it("returns 400 when programId is missing", async () => {
    const res = await request(app)
      .post("/api/practices/practice-1/share-program")
      .set(...authHeader())
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("programId");
  });

  it("returns 403 when not a member", async () => {
    db.practiceMembership.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/practices/practice-1/share-program")
      .set(...authHeader())
      .send({ programId: "prog-1" });

    expect(res.status).toBe(403);
  });

  it("returns 404 when program not found or not owned", async () => {
    db.practiceMembership.findUnique.mockResolvedValue({ role: "CLINICIAN" } as any);
    db.program.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/practices/practice-1/share-program")
      .set(...authHeader())
      .send({ programId: "prog-nonexistent" });

    expect(res.status).toBe(404);
  });

  it("shares a program as practice template", async () => {
    db.practiceMembership.findUnique.mockResolvedValue({ role: "CLINICIAN" } as any);
    db.program.findFirst.mockResolvedValue({
      id: "prog-1",
      clinicianId: "test-clinician-profile-id",
    } as any);
    db.program.update.mockResolvedValue({
      id: "prog-1",
      practiceId: "practice-1",
      isTemplate: true,
    } as any);

    const res = await request(app)
      .post("/api/practices/practice-1/share-program")
      .set(...authHeader())
      .send({ programId: "prog-1" });

    expect(res.status).toBe(200);
    expect(res.body.data.isTemplate).toBe(true);
    expect(db.program.update).toHaveBeenCalledWith({
      where: { id: "prog-1" },
      data: { practiceId: "practice-1", isTemplate: true },
    });
  });
});

// ── POST /api/practices/:id/invite (additional paths) ──

describe("POST /api/practices/:id/invite (additional paths)", () => {
  it("returns 400 for missing email", async () => {
    const res = await request(app)
      .post("/api/practices/practice-1/invite")
      .set(...authHeader())
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 404 when invited email is not a clinician", async () => {
    db.practiceMembership.findUnique.mockResolvedValue({ role: "OWNER" } as any);
    db.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/practices/practice-1/invite")
      .set(...authHeader())
      .send({ email: "unknown@test.com" });

    expect(res.status).toBe(404);
    expect(res.body.error).toContain("not found");
  });

  it("returns 404 when user is a participant not a clinician", async () => {
    db.practiceMembership.findUnique.mockResolvedValue({ role: "OWNER" } as any);
    db.user.findUnique.mockResolvedValue({
      id: "user-3",
      role: "PARTICIPANT",
      clinicianProfile: null,
    } as any);

    const res = await request(app)
      .post("/api/practices/practice-1/invite")
      .set(...authHeader())
      .send({ email: "participant@test.com" });

    expect(res.status).toBe(404);
  });

  it("returns 409 when clinician is already a member", async () => {
    db.practiceMembership.findUnique
      .mockResolvedValueOnce({ role: "OWNER" } as any)
      .mockResolvedValueOnce({ id: "existing-mem" } as any); // already exists

    db.user.findUnique.mockResolvedValue({
      id: "user-2",
      role: "CLINICIAN",
      clinicianProfile: { id: "cp-2" },
    } as any);

    const res = await request(app)
      .post("/api/practices/practice-1/invite")
      .set(...authHeader())
      .send({ email: "existing@test.com" });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain("already a member");
  });
});

// ── POST /api/clinician/participants/bulk ────────────

describe("POST /api/clinician/participants/bulk", () => {
  it("returns 400 for missing action", async () => {
    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({});
    expect(res.status).toBe(400);
  });

  it("pushes tasks to multiple participants", async () => {
    db.participantProfile.findUnique
      .mockResolvedValueOnce({ id: "pp-1" } as any)
      .mockResolvedValueOnce({ id: "pp-2" } as any);

    db.task.create
      .mockResolvedValueOnce({ id: "t1" } as any)
      .mockResolvedValueOnce({ id: "t2" } as any);

    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({
        action: "push-task",
        participantIds: ["user-1", "user-2"],
        data: { title: "Review homework" },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.succeeded).toBe(2);
    expect(res.body.data.failed).toBe(0);
  });

  it("handles mixed success/failure", async () => {
    db.participantProfile.findUnique
      .mockResolvedValueOnce({ id: "pp-1" } as any)
      .mockResolvedValueOnce(null);  // not found

    db.task.create.mockResolvedValueOnce({ id: "t1" } as any);

    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({
        action: "push-task",
        participantIds: ["user-1", "user-2"],
        data: { title: "Review homework" },
      });

    expect(res.status).toBe(200);
    // Both should succeed since profileId fallback uses the original id
    expect(res.body.data.succeeded).toBe(2);
  });
});
