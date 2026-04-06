import request from "supertest";
import app from "../../app";
import { testPrisma, TEST_IDS, clinicianAuthHeader, participantAuthHeader } from "./setup";

const TASKS_URL = "/api/participant/tasks";

describe("Tasks Routes (integration)", () => {
  const createdTaskIds: string[] = [];

  afterAll(async () => {
    for (const id of createdTaskIds) {
      await testPrisma.task.delete({ where: { id } }).catch(() => {});
    }
  });

  // ── Create ────────────────────────────────────────────

  it("POST — creates a task", async () => {
    const res = await request(app)
      .post(TASKS_URL)
      .set(...participantAuthHeader())
      .send({
        title: "Study for exam",
        description: "Chapter 5",
        estimatedMinutes: 45,
        energyLevel: "MEDIUM",
        category: "study",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe("Study for exam");
    expect(res.body.data.participantId).toBe(TEST_IDS.participantProfileId);
    expect(res.body.data.sourceType).toBe("MANUAL");
    createdTaskIds.push(res.body.data.id);
  });

  it("POST — creates a task with due date", async () => {
    const dueDate = new Date(Date.now() + 86400000).toISOString();
    const res = await request(app)
      .post(TASKS_URL)
      .set(...participantAuthHeader())
      .send({ title: "Due Tomorrow", dueDate });

    expect(res.status).toBe(201);
    expect(res.body.data.dueDate).toBeDefined();
    createdTaskIds.push(res.body.data.id);
  });

  it("POST — 400 on missing title", async () => {
    const res = await request(app)
      .post(TASKS_URL)
      .set(...participantAuthHeader())
      .send({ description: "No title" });

    expect(res.status).toBe(400);
  });

  it("POST — 401 without auth", async () => {
    const res = await request(app).post(TASKS_URL).send({ title: "No Auth" });
    expect(res.status).toBe(401);
  });

  it("POST — 403 as clinician", async () => {
    const res = await request(app)
      .post(TASKS_URL)
      .set(...clinicianAuthHeader())
      .send({ title: "Clinician Attempt" });

    expect(res.status).toBe(403);
  });

  // ── List ───────��──────────────────────────────────────

  it("GET — lists tasks", async () => {
    const res = await request(app)
      .get(TASKS_URL)
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("GET — filters by status", async () => {
    const res = await request(app)
      .get(`${TASKS_URL}?status=TODO`)
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    for (const task of res.body.data) {
      expect(task.status).toBe("TODO");
    }
  });

  // ── Update ───────���──────────────────────��─────────────

  it("PATCH /:id — marks task as done", async () => {
    const taskId = createdTaskIds[0];

    const res = await request(app)
      .patch(`${TASKS_URL}/${taskId}`)
      .set(...participantAuthHeader())
      .send({ status: "DONE" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("DONE");
    expect(res.body.data.completedAt).not.toBeNull();
  });

  it("PATCH /:id — updates task title", async () => {
    const taskId = createdTaskIds[0];

    const res = await request(app)
      .patch(`${TASKS_URL}/${taskId}`)
      .set(...participantAuthHeader())
      .send({ title: "Updated Study" });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Updated Study");
  });

  it("PATCH /:id — 404 for nonexistent task", async () => {
    const res = await request(app)
      .patch(`${TASKS_URL}/nonexistent-task`)
      .set(...participantAuthHeader())
      .send({ title: "Nope" });

    expect(res.status).toBe(404);
  });

  // ── Delete (Archive) ─────���────────────────────────────

  it("DELETE /:id — archives a task", async () => {
    const taskId = createdTaskIds[1];

    const res = await request(app)
      .delete(`${TASKS_URL}/${taskId}`)
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const task = await testPrisma.task.findUnique({ where: { id: taskId } });
    expect(task?.status).toBe("ARCHIVED");
  });

  it("DELETE /:id ��� 404 for nonexistent task", async () => {
    const res = await request(app)
      .delete(`${TASKS_URL}/nonexistent-task`)
      .set(...participantAuthHeader());

    expect(res.status).toBe(404);
  });
});
