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

// ── Bulk Action Validation ───────────────��─────────────

describe("POST /api/clinician/participants/bulk — validation", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .send({ action: "push-task", participantIds: ["p-1"] });
    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...participantAuthHeader())
      .send({ action: "push-task", participantIds: ["p-1"] });
    expect(res.status).toBe(403);
  });

  it("returns 400 for empty participantIds", async () => {
    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({ action: "push-task", participantIds: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 for missing action", async () => {
    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({ participantIds: ["p-1"] });
    expect(res.status).toBe(400);
  });

  it("returns 400 for more than 50 participants", async () => {
    const ids = Array.from({ length: 51 }, (_, i) => `p-${i}`);
    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({ action: "push-task", participantIds: ids, data: { title: "Test" } });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });
});

// ── Bulk Push Task ──────────────────────────────��───────

describe("POST /api/clinician/participants/bulk — push-task", () => {
  it("creates tasks for all valid participants", async () => {
    db.participantProfile.findUnique.mockResolvedValue(null);
    db.task.create.mockResolvedValue({ id: "task-1" } as any);
    db.auditLog.create.mockResolvedValue({} as any);

    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({
        action: "push-task",
        participantIds: ["p-1", "p-2"],
        data: { title: "Do homework" },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.succeeded).toBe(2);
    expect(res.body.data.failed).toBe(0);
    expect(db.task.create).toHaveBeenCalledTimes(2);
  });

  it("skips participants without title", async () => {
    db.participantProfile.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({
        action: "push-task",
        participantIds: ["p-1"],
        data: { title: "" },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.succeeded).toBe(0);
    expect(res.body.data.failed).toBe(1);
    expect(res.body.data.results[0].error).toContain("Title required");
  });

  it("creates audit log entry per participant", async () => {
    db.participantProfile.findUnique.mockResolvedValue(null);
    db.task.create.mockResolvedValue({ id: "task-1" } as any);
    db.auditLog.create.mockResolvedValue({} as any);

    await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({
        action: "push-task",
        participantIds: ["p-1", "p-2", "p-3"],
        data: { title: "Test task" },
      });

    // One audit log entry per successful participant
    expect(db.auditLog.create).toHaveBeenCalledTimes(3);
    const firstCall = db.auditLog.create.mock.calls[0][0] as any;
    expect(firstCall.data.action).toBe("CREATE");
    expect(firstCall.data.resourceType).toBe("Task");
    // Must NOT contain task title/content
    expect(JSON.stringify(firstCall.data.metadata)).not.toContain("Test task");
  });
});

// ── Bulk Unlock Next Module ────────────────────────────

describe("POST /api/clinician/participants/bulk — unlock-next-module", () => {
  it("unlocks next module for active enrollments", async () => {
    db.participantProfile.findUnique.mockResolvedValue(null);
    db.enrollment.findFirst.mockResolvedValue({
      id: "enroll-1",
      programId: "prog-1",
      moduleProgress: [],
      program: {
        modules: [
          { id: "mod-1", sortOrder: 0 },
          { id: "mod-2", sortOrder: 1 },
        ],
      },
    } as any);
    db.moduleProgress.upsert.mockResolvedValue({} as any);
    db.enrollment.update.mockResolvedValue({} as any);
    db.auditLog.create.mockResolvedValue({} as any);

    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({ action: "unlock-next-module", participantIds: ["p-1"] });

    expect(res.status).toBe(200);
    expect(res.body.data.succeeded).toBe(1);
    expect(db.moduleProgress.upsert).toHaveBeenCalled();
  });

  it("skips participants with no active enrollment", async () => {
    db.participantProfile.findUnique.mockResolvedValue(null);
    db.enrollment.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({ action: "unlock-next-module", participantIds: ["p-1"] });

    expect(res.status).toBe(200);
    expect(res.body.data.failed).toBe(1);
    expect(res.body.data.results[0].error).toContain("No active enrollment");
  });

  it("skips participants with no locked modules", async () => {
    db.participantProfile.findUnique.mockResolvedValue(null);
    db.enrollment.findFirst.mockResolvedValue({
      id: "enroll-1",
      programId: "prog-1",
      moduleProgress: [
        { module: { id: "mod-1", sortOrder: 0 }, status: "COMPLETED" },
      ],
      program: {
        modules: [{ id: "mod-1", sortOrder: 0 }],
      },
    } as any);

    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({ action: "unlock-next-module", participantIds: ["p-1"] });

    expect(res.status).toBe(200);
    expect(res.body.data.failed).toBe(1);
    expect(res.body.data.results[0].error).toContain("No locked modules");
  });

  it("creates audit log entry per participant", async () => {
    db.participantProfile.findUnique.mockResolvedValue(null);
    db.enrollment.findFirst.mockResolvedValue({
      id: "enroll-1",
      programId: "prog-1",
      moduleProgress: [],
      program: {
        modules: [{ id: "mod-1", sortOrder: 0 }],
      },
    } as any);
    db.moduleProgress.upsert.mockResolvedValue({} as any);
    db.enrollment.update.mockResolvedValue({} as any);
    db.auditLog.create.mockResolvedValue({} as any);

    await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({ action: "unlock-next-module", participantIds: ["p-1"] });

    expect(db.auditLog.create).toHaveBeenCalledTimes(1);
    const callData = (db.auditLog.create.mock.calls[0][0] as any).data;
    expect(callData.action).toBe("UPDATE");
    expect(callData.resourceType).toBe("ModuleProgress");
  });
});

// ── Bulk Send Nudge ─────────────────────────────────────

describe("POST /api/clinician/participants/bulk — send-nudge", () => {
  it("creates nudge tasks for all participants", async () => {
    db.participantProfile.findUnique.mockResolvedValue(null);
    db.task.create.mockResolvedValue({ id: "task-1" } as any);
    db.auditLog.create.mockResolvedValue({} as any);

    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({
        action: "send-nudge",
        participantIds: ["p-1", "p-2"],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.succeeded).toBe(2);
    expect(db.task.create).toHaveBeenCalledTimes(2);
  });

  it("uses custom message when provided", async () => {
    db.participantProfile.findUnique.mockResolvedValue(null);
    db.task.create.mockResolvedValue({ id: "task-1" } as any);
    db.auditLog.create.mockResolvedValue({} as any);

    await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({
        action: "send-nudge",
        participantIds: ["p-1"],
        data: { message: "Check in please!" },
      });

    const createCall = db.task.create.mock.calls[0][0] as any;
    expect(createCall.data.title).toBe("Check in please!");
  });

  it("truncates message at 500 characters", async () => {
    db.participantProfile.findUnique.mockResolvedValue(null);
    db.task.create.mockResolvedValue({ id: "task-1" } as any);
    db.auditLog.create.mockResolvedValue({} as any);

    const longMessage = "A".repeat(600);
    await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({
        action: "send-nudge",
        participantIds: ["p-1"],
        data: { message: longMessage },
      });

    const createCall = db.task.create.mock.calls[0][0] as any;
    expect(createCall.data.title.length).toBe(500);
  });

  it("creates audit log entry per participant without message content", async () => {
    db.participantProfile.findUnique.mockResolvedValue(null);
    db.task.create.mockResolvedValue({ id: "task-1" } as any);
    db.auditLog.create.mockResolvedValue({} as any);

    await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({
        action: "send-nudge",
        participantIds: ["p-1"],
        data: { message: "Secret clinical info" },
      });

    expect(db.auditLog.create).toHaveBeenCalledTimes(1);
    const auditData = (db.auditLog.create.mock.calls[0][0] as any).data;
    expect(auditData.resourceType).toBe("Task");
    // Audit metadata must NOT contain message content (COND-2)
    expect(JSON.stringify(auditData.metadata)).not.toContain("Secret clinical info");
  });
});

// ── Unknown Action ──────────���────────────────────────────

describe("POST /api/clinician/participants/bulk — unknown action", () => {
  it("returns unknown action error per participant", async () => {
    db.participantProfile.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/clinician/participants/bulk")
      .set(...authHeader())
      .send({ action: "invalid-action", participantIds: ["p-1"] });

    expect(res.status).toBe(200);
    expect(res.body.data.failed).toBe(1);
    expect(res.body.data.results[0].error).toContain("Unknown action");
  });
});
