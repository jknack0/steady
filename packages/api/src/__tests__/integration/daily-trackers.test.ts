import request from "supertest";
import app from "../../app";
import { testPrisma, TEST_IDS, clinicianAuthHeader, participantAuthHeader } from "./setup";

const TRACKERS_URL = "/api/daily-trackers";

describe("Daily Trackers Routes (integration)", () => {
  const createdTrackerIds: string[] = [];

  afterAll(async () => {
    for (const id of createdTrackerIds) {
      await testPrisma.dailyTrackerEntry.deleteMany({ where: { trackerId: id } });
      await testPrisma.dailyTrackerField.deleteMany({ where: { trackerId: id } });
      await testPrisma.dailyTracker.delete({ where: { id } }).catch(() => {});
    }
  });

  // ── Templates ─────────────────────────────────────────

  it("GET /templates — returns preset templates", async () => {
    const res = await request(app)
      .get(`${TRACKERS_URL}/templates`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ── Create ────────────────────────────────────────────

  it("POST — creates a tracker with fields", async () => {
    const res = await request(app)
      .post(TRACKERS_URL)
      .set(...clinicianAuthHeader())
      .send({
        name: "Daily Check-In",
        description: "Track daily mood and energy",
        programId: TEST_IDS.programId,
        participantId: TEST_IDS.participantProfileId,
        fields: [
          { label: "Mood", fieldType: "SCALE", options: { min: 1, max: 10 }, sortOrder: 0 },
          { label: "Energy", fieldType: "SCALE", options: { min: 1, max: 10 }, sortOrder: 1 },
          { label: "Sleep Quality", fieldType: "YES_NO", sortOrder: 2 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Daily Check-In");
    expect(res.body.data.fields).toHaveLength(3);
    createdTrackerIds.push(res.body.data.id);
  });

  it("POST — 400 on missing fields", async () => {
    const res = await request(app)
      .post(TRACKERS_URL)
      .set(...clinicianAuthHeader())
      .send({ name: "No Fields" });

    expect(res.status).toBe(400);
  });

  it("POST — 401 without auth", async () => {
    const res = await request(app).post(TRACKERS_URL).send({ name: "No Auth" });
    expect(res.status).toBe(401);
  });

  it("POST — 403 as participant", async () => {
    const res = await request(app)
      .post(TRACKERS_URL)
      .set(...participantAuthHeader())
      .send({ name: "Participant Attempt" });

    expect(res.status).toBe(403);
  });

  it("POST — 404 for nonexistent program", async () => {
    const res = await request(app)
      .post(TRACKERS_URL)
      .set(...clinicianAuthHeader())
      .send({
        name: "Bad Program",
        programId: "nonexistent-program",
        participantId: "some-participant",
        fields: [{ label: "Test", fieldType: "YES_NO", sortOrder: 0 }],
      });

    expect(res.status).toBe(404);
  });

  // ── List ──────────────────────────────────────────────

  it("GET — lists trackers by programId", async () => {
    const res = await request(app)
      .get(`${TRACKERS_URL}?programId=${TEST_IDS.programId}`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("GET — 400 without programId or participantId", async () => {
    const res = await request(app)
      .get(TRACKERS_URL)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(400);
  });

  // ── Get Single ────────────────────────────────────────

  it("GET /:id — returns tracker with fields", async () => {
    const trackerId = createdTrackerIds[0];

    const res = await request(app)
      .get(`${TRACKERS_URL}/${trackerId}`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(trackerId);
    expect(res.body.data.fields).toHaveLength(3);
  });

  it("GET /:id — 404 for nonexistent tracker", async () => {
    const res = await request(app)
      .get(`${TRACKERS_URL}/nonexistent-tracker`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(404);
  });

  // ── Update ────────────────────────────────────────────

  it("PUT /:id — updates tracker name", async () => {
    const trackerId = createdTrackerIds[0];

    const res = await request(app)
      .put(`${TRACKERS_URL}/${trackerId}`)
      .set(...clinicianAuthHeader())
      .send({ name: "Updated Check-In" });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Updated Check-In");
  });

  it("PUT /:id — replaces fields", async () => {
    const trackerId = createdTrackerIds[0];

    const res = await request(app)
      .put(`${TRACKERS_URL}/${trackerId}`)
      .set(...clinicianAuthHeader())
      .send({
        fields: [
          { label: "New Field 1", fieldType: "SCALE", options: { min: 1, max: 5 }, sortOrder: 0 },
          { label: "New Field 2", fieldType: "FREE_TEXT", sortOrder: 1 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.fields).toHaveLength(2);
    expect(res.body.data.fields[0].label).toBe("New Field 1");
  });

  it("PUT /:id — 404 for nonexistent tracker", async () => {
    const res = await request(app)
      .put(`${TRACKERS_URL}/nonexistent-tracker`)
      .set(...clinicianAuthHeader())
      .send({ name: "Nope" });

    expect(res.status).toBe(404);
  });

  // ── Entries (clinician view) ──────────────────────────

  it("GET /:id/entries — returns entries (requires userId)", async () => {
    const trackerId = createdTrackerIds[0];

    const res = await request(app)
      .get(`${TRACKERS_URL}/${trackerId}/entries?userId=${TEST_IDS.participantUserId}`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("GET /:id/entries — 400 without userId", async () => {
    const trackerId = createdTrackerIds[0];

    const res = await request(app)
      .get(`${TRACKERS_URL}/${trackerId}/entries`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(400);
  });

  // ── Trends ────────────────────────────────────────────

  it("GET /:id/trends — returns trend data", async () => {
    const trackerId = createdTrackerIds[0];

    const res = await request(app)
      .get(`${TRACKERS_URL}/${trackerId}/trends?userId=${TEST_IDS.participantUserId}`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.fields).toBeDefined();
    expect(res.body.data.fieldTrends).toBeDefined();
    expect(typeof res.body.data.completionRate).toBe("number");
  });

  it("GET /:id/trends — 400 without userId", async () => {
    const trackerId = createdTrackerIds[0];

    const res = await request(app)
      .get(`${TRACKERS_URL}/${trackerId}/trends`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(400);
  });

  // ── Delete ────────────────────────────────────────────

  it("DELETE /:id — deletes a tracker", async () => {
    // Create one to delete — use a different participant to avoid constraint
    const deleteParticipant = await testPrisma.user.create({
      data: {
        id: "integ-delete-tracker-user",
        email: "integ-delete-tracker@test.local",
        passwordHash: "$2b$10$fakehashfakehashfakehashfakehashfakehashfakehashfa",
        role: "PARTICIPANT",
        firstName: "Delete",
        lastName: "Tracker",
      },
    });
    const deleteProfile = await testPrisma.participantProfile.create({
      data: { id: "integ-delete-tracker-profile", userId: deleteParticipant.id },
    });

    const createRes = await request(app)
      .post(TRACKERS_URL)
      .set(...clinicianAuthHeader())
      .send({
        name: "To Delete",
        programId: TEST_IDS.programId,
        participantId: deleteProfile.id,
        fields: [{ label: "Test", fieldType: "YES_NO", sortOrder: 0 }],
      });
    const trackerId = createRes.body.data.id;

    const res = await request(app)
      .delete(`${TRACKERS_URL}/${trackerId}`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Cleanup helper user
    await testPrisma.participantProfile.delete({ where: { id: "integ-delete-tracker-profile" } }).catch(() => {});
    await testPrisma.user.delete({ where: { id: "integ-delete-tracker-user" } }).catch(() => {});
  });

  it("DELETE /:id — 404 for nonexistent tracker", async () => {
    const res = await request(app)
      .delete(`${TRACKERS_URL}/nonexistent-tracker`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(404);
  });
});
