import request from "supertest";
import app from "../../app";
import { testPrisma, TEST_IDS, clinicianAuthHeader, participantAuthHeader } from "./setup";

const MODULES_URL = `/api/programs/${TEST_IDS.programId}/modules`;

describe("Modules Routes (integration)", () => {
  const createdModuleIds: string[] = [];

  afterAll(async () => {
    for (const id of createdModuleIds) {
      await testPrisma.module.delete({ where: { id } }).catch(() => {});
    }
  });

  // ── Create ────────────────────────────────────────────

  it("POST — creates a module", async () => {
    const res = await request(app)
      .post(MODULES_URL)
      .set(...clinicianAuthHeader())
      .send({
        title: "New Module",
        unlockRule: "SEQUENTIAL",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("New Module");
    expect(res.body.data.programId).toBe(TEST_IDS.programId);
    createdModuleIds.push(res.body.data.id);
  });

  it("POST — 400 on missing title", async () => {
    const res = await request(app)
      .post(MODULES_URL)
      .set(...clinicianAuthHeader())
      .send({});

    expect(res.status).toBe(400);
  });

  it("POST — 401 without auth", async () => {
    const res = await request(app)
      .post(MODULES_URL)
      .send({ title: "No Auth" });

    expect(res.status).toBe(401);
  });

  it("POST — 403 as participant", async () => {
    const res = await request(app)
      .post(MODULES_URL)
      .set(...participantAuthHeader())
      .send({ title: "Participant Attempt" });

    expect(res.status).toBe(403);
  });

  it("POST — 404 for nonexistent program", async () => {
    const res = await request(app)
      .post(`/api/programs/nonexistent-program/modules`)
      .set(...clinicianAuthHeader())
      .send({ title: "Bad Program" });

    expect(res.status).toBe(404);
  });

  // ── List ──────────────────────────────────────────────

  it("GET — lists modules for program", async () => {
    const res = await request(app)
      .get(MODULES_URL)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    // Should include seeded module
    const seeded = res.body.data.find((m: any) => m.id === TEST_IDS.moduleId);
    expect(seeded).toBeDefined();
  });

  // ── Update ────────────────────────────────────────────

  it("PUT /:id — updates a module", async () => {
    // Create a module to update
    const createRes = await request(app)
      .post(MODULES_URL)
      .set(...clinicianAuthHeader())
      .send({ title: "To Update" });
    const moduleId = createRes.body.data.id;
    createdModuleIds.push(moduleId);

    const res = await request(app)
      .put(`${MODULES_URL}/${moduleId}`)
      .set(...clinicianAuthHeader())
      .send({ title: "Updated Title" });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Updated Title");
  });

  it("PUT /:id — 404 for nonexistent module", async () => {
    const res = await request(app)
      .put(`${MODULES_URL}/nonexistent-module`)
      .set(...clinicianAuthHeader())
      .send({ title: "Nope" });

    expect(res.status).toBe(404);
  });

  // ── Reorder ───────────────────────────────────────────

  it("PUT /reorder — reorders modules", async () => {
    // Create two additional modules
    const m1 = await request(app)
      .post(MODULES_URL)
      .set(...clinicianAuthHeader())
      .send({ title: "Reorder A" });
    const m2 = await request(app)
      .post(MODULES_URL)
      .set(...clinicianAuthHeader())
      .send({ title: "Reorder B" });
    createdModuleIds.push(m1.body.data.id, m2.body.data.id);

    // Get all module IDs and reverse them
    const listRes = await request(app).get(MODULES_URL).set(...clinicianAuthHeader());
    const moduleIds = listRes.body.data.map((m: any) => m.id).reverse();

    const res = await request(app)
      .put(`${MODULES_URL}/reorder`)
      .set(...clinicianAuthHeader())
      .send({ moduleIds });

    expect(res.status).toBe(200);
    expect(res.body.data[0].id).toBe(moduleIds[0]);
  });

  // ── Delete ────────────────────────────────────────────

  it("DELETE /:id — deletes a module", async () => {
    const createRes = await request(app)
      .post(MODULES_URL)
      .set(...clinicianAuthHeader())
      .send({ title: "To Delete" });
    const moduleId = createRes.body.data.id;

    const res = await request(app)
      .delete(`${MODULES_URL}/${moduleId}`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify deleted
    const module = await testPrisma.module.findUnique({ where: { id: moduleId } });
    expect(module).toBeNull();
  });
});
