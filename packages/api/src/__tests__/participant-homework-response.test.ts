import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { participantAuthHeader } from "./helpers";

const db = vi.mocked(prisma);

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    compare: vi.fn(),
  },
}));

vi.mock("../services/notifications", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    cancelHomeworkReminders: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("../services/homework-instances", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    generateInstancesForEnrollment: vi.fn().mockResolvedValue(undefined),
    getStreakData: vi.fn().mockResolvedValue({
      currentStreak: 0,
      longestStreak: 0,
      totalCompleted: 0,
      totalInstances: 0,
      completionRate: 0,
    }),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

const PARTICIPANT_ID = "test-participant-profile-id";

const mockInstance = (overrides: any = {}) => ({
  id: "instance-1",
  partId: "part-1",
  enrollmentId: "enroll-1",
  dueDate: new Date(),
  status: "PENDING",
  completedAt: null,
  response: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  enrollment: {
    participantId: PARTICIPANT_ID,
  },
  ...overrides,
});

describe("PATCH /api/participant/homework-instances/:id/response", () => {
  it("saves valid responses and returns updated instance", async () => {
    const instance = mockInstance();
    db.homeworkInstance.findUnique.mockResolvedValue(instance as any);
    db.homeworkInstance.update.mockResolvedValue({
      ...instance,
      response: { "0": { type: "ACTION", completed: true, subStepsDone: [] } },
    } as any);

    const res = await request(app)
      .patch("/api/participant/homework-instances/instance-1/response")
      .set(...participantAuthHeader())
      .send({
        responses: {
          "0": { type: "ACTION", completed: true, subStepsDone: [] },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(db.homeworkInstance.update).toHaveBeenCalledWith({
      where: { id: "instance-1" },
      data: { response: { "0": { type: "ACTION", completed: true, subStepsDone: [] } } },
    });
  });

  it("deep-merges with existing responses at key level", async () => {
    const instance = mockInstance({
      response: { "0": { type: "ACTION", completed: false, subStepsDone: [] } },
    });
    db.homeworkInstance.findUnique.mockResolvedValue(instance as any);
    db.homeworkInstance.update.mockResolvedValue({
      ...instance,
      response: {
        "0": { type: "ACTION", completed: false, subStepsDone: [] },
        "1": { type: "RATING_SCALE", value: 7 },
      },
    } as any);

    const res = await request(app)
      .patch("/api/participant/homework-instances/instance-1/response")
      .set(...participantAuthHeader())
      .send({
        responses: {
          "1": { type: "RATING_SCALE", value: 7 },
        },
      });

    expect(res.status).toBe(200);
    expect(db.homeworkInstance.update).toHaveBeenCalledWith({
      where: { id: "instance-1" },
      data: {
        response: {
          "0": { type: "ACTION", completed: false, subStepsDone: [] },
          "1": { type: "RATING_SCALE", value: 7 },
        },
      },
    });
  });

  it("returns 404 for non-existent instance", async () => {
    db.homeworkInstance.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/participant/homework-instances/nonexistent/response")
      .set(...participantAuthHeader())
      .send({
        responses: { "0": { type: "ACTION", completed: true, subStepsDone: [] } },
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 404 for instance owned by different participant", async () => {
    const instance = mockInstance({
      enrollment: { participantId: "other-participant" },
    });
    db.homeworkInstance.findUnique.mockResolvedValue(instance as any);

    const res = await request(app)
      .patch("/api/participant/homework-instances/instance-1/response")
      .set(...participantAuthHeader())
      .send({
        responses: { "0": { type: "ACTION", completed: true, subStepsDone: [] } },
      });

    expect(res.status).toBe(404);
  });

  it("returns 409 for completed instance", async () => {
    const instance = mockInstance({ status: "COMPLETED" });
    db.homeworkInstance.findUnique.mockResolvedValue(instance as any);

    const res = await request(app)
      .patch("/api/participant/homework-instances/instance-1/response")
      .set(...participantAuthHeader())
      .send({
        responses: { "0": { type: "ACTION", completed: true, subStepsDone: [] } },
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 for invalid response data", async () => {
    const instance = mockInstance();
    db.homeworkInstance.findUnique.mockResolvedValue(instance as any);

    const res = await request(app)
      .patch("/api/participant/homework-instances/instance-1/response")
      .set(...participantAuthHeader())
      .send({
        responses: { "0": { notAValidField: true } },
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .patch("/api/participant/homework-instances/instance-1/response")
      .send({
        responses: { "0": { type: "ACTION", completed: true, subStepsDone: [] } },
      });

    expect(res.status).toBe(401);
  });

  it("saves all new response types", async () => {
    const instance = mockInstance();
    db.homeworkInstance.findUnique.mockResolvedValue(instance as any);
    db.homeworkInstance.update.mockResolvedValue(instance as any);

    const responses = {
      "0": { type: "RATING_SCALE", value: 8 },
      "1": { type: "TIMER", elapsedSeconds: 300, completed: true },
      "2": { type: "MOOD_CHECK", mood: "Great", note: "Feeling good" },
      "3": { type: "HABIT_TRACKER", done: true },
    };

    const res = await request(app)
      .patch("/api/participant/homework-instances/instance-1/response")
      .set(...participantAuthHeader())
      .send({ responses });

    expect(res.status).toBe(200);
    expect(db.homeworkInstance.update).toHaveBeenCalled();
  });
});
