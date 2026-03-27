import request from "supertest";
import app from "../../app";
import { testPrisma, TEST_IDS, clinicianAuthHeader, participantAuthHeader } from "./setup";

const PARTS_URL = `/api/programs/${TEST_IDS.programId}/modules/${TEST_IDS.moduleId}/parts`;

describe("Parts Routes (integration)", () => {
  const createdPartIds: string[] = [];

  afterAll(async () => {
    for (const id of createdPartIds) {
      await testPrisma.part.delete({ where: { id } }).catch(() => {});
    }
  });

  // ── Create ────────────────────────────────────────────

  it("POST — creates a TEXT part", async () => {
    const res = await request(app)
      .post(PARTS_URL)
      .set(...clinicianAuthHeader())
      .send({
        type: "TEXT",
        title: "Intro Text",
        content: { type: "TEXT", body: "<p>Hello world</p>" },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe("TEXT");
    expect(res.body.data.title).toBe("Intro Text");
    createdPartIds.push(res.body.data.id);
  });

  it("POST — creates a DIVIDER part", async () => {
    const res = await request(app)
      .post(PARTS_URL)
      .set(...clinicianAuthHeader())
      .send({
        type: "DIVIDER",
        title: "Section Break",
        content: { type: "DIVIDER", label: "Section 1" },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe("DIVIDER");
    createdPartIds.push(res.body.data.id);
  });

  it("POST — creates a CHECKLIST part", async () => {
    const res = await request(app)
      .post(PARTS_URL)
      .set(...clinicianAuthHeader())
      .send({
        type: "CHECKLIST",
        title: "Session Checklist",
        content: {
          type: "CHECKLIST",
          items: [
            { text: "Item 1", sortOrder: 0 },
            { text: "Item 2", sortOrder: 1 },
          ],
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.content.items).toHaveLength(2);
    createdPartIds.push(res.body.data.id);
  });

  it("POST — 400 when content type mismatches part type", async () => {
    const res = await request(app)
      .post(PARTS_URL)
      .set(...clinicianAuthHeader())
      .send({
        type: "TEXT",
        title: "Mismatch",
        content: { type: "DIVIDER" },
      });

    expect(res.status).toBe(400);
  });

  it("POST — 401 without auth", async () => {
    const res = await request(app).post(PARTS_URL).send({
      type: "TEXT",
      title: "No Auth",
      content: { type: "TEXT", body: "<p>test</p>" },
    });

    expect(res.status).toBe(401);
  });

  it("POST — 403 as participant", async () => {
    const res = await request(app)
      .post(PARTS_URL)
      .set(...participantAuthHeader())
      .send({
        type: "TEXT",
        title: "Participant Attempt",
        content: { type: "TEXT", body: "<p>test</p>" },
      });

    expect(res.status).toBe(403);
  });

  // ── List ──────────────────────────────────────────────

  it("GET — lists parts for module", async () => {
    const res = await request(app).get(PARTS_URL).set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ── Update ────────────────────────────────────────────

  it("PUT /:id — updates part title", async () => {
    const createRes = await request(app)
      .post(PARTS_URL)
      .set(...clinicianAuthHeader())
      .send({
        type: "TEXT",
        title: "Original Title",
        content: { type: "TEXT", body: "<p>body</p>" },
      });
    const partId = createRes.body.data.id;
    createdPartIds.push(partId);

    const res = await request(app)
      .put(`${PARTS_URL}/${partId}`)
      .set(...clinicianAuthHeader())
      .send({ title: "Updated Title" });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Updated Title");
  });

  it("PUT /:id — 400 when changing content type", async () => {
    const createRes = await request(app)
      .post(PARTS_URL)
      .set(...clinicianAuthHeader())
      .send({
        type: "TEXT",
        title: "Type Change Test",
        content: { type: "TEXT", body: "<p>test</p>" },
      });
    const partId = createRes.body.data.id;
    createdPartIds.push(partId);

    const res = await request(app)
      .put(`${PARTS_URL}/${partId}`)
      .set(...clinicianAuthHeader())
      .send({ content: { type: "DIVIDER" } });

    expect(res.status).toBe(400);
  });

  it("PUT /:id — 404 for nonexistent part", async () => {
    const res = await request(app)
      .put(`${PARTS_URL}/nonexistent-part`)
      .set(...clinicianAuthHeader())
      .send({ title: "Nope" });

    expect(res.status).toBe(404);
  });

  // ── Reorder ───────────────────────────────────────────

  it("PUT /reorder — reorders parts", async () => {
    const p1 = await request(app)
      .post(PARTS_URL)
      .set(...clinicianAuthHeader())
      .send({ type: "TEXT", title: "R1", content: { type: "TEXT", body: "<p>1</p>" } });
    const p2 = await request(app)
      .post(PARTS_URL)
      .set(...clinicianAuthHeader())
      .send({ type: "TEXT", title: "R2", content: { type: "TEXT", body: "<p>2</p>" } });
    createdPartIds.push(p1.body.data.id, p2.body.data.id);

    const res = await request(app)
      .put(`${PARTS_URL}/reorder`)
      .set(...clinicianAuthHeader())
      .send({ partIds: [p2.body.data.id, p1.body.data.id] });

    expect(res.status).toBe(200);
  });

  // ── Delete (soft) ─────────────────────────────────────

  it("DELETE /:id — soft-deletes a part", async () => {
    const createRes = await request(app)
      .post(PARTS_URL)
      .set(...clinicianAuthHeader())
      .send({ type: "TEXT", title: "To Delete", content: { type: "TEXT", body: "<p>bye</p>" } });
    const partId = createRes.body.data.id;

    const res = await request(app)
      .delete(`${PARTS_URL}/${partId}`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify soft-deleted
    const part = await testPrisma.part.findUnique({ where: { id: partId } });
    expect(part?.deletedAt).not.toBeNull();
  });
});
