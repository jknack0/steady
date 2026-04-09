import request from "supertest";
import app from "../../app";
import { testPrisma, TEST_IDS, clinicianAuthHeader, participantAuthHeader } from "./setup";

const CALENDAR_URL = "/api/participant/calendar";

describe("Calendar Routes (integration)", () => {
  const createdEventIds: string[] = [];

  afterAll(async () => {
    for (const id of createdEventIds) {
      await testPrisma.calendarEvent.delete({ where: { id } }).catch(() => {});
    }
  });

  // ── Create ────────────────────────────────────────────

  it("POST — creates a calendar event", async () => {
    const start = new Date(Date.now() + 3600000);
    const end = new Date(Date.now() + 7200000);

    const res = await request(app)
      .post(CALENDAR_URL)
      .set(...participantAuthHeader())
      .send({
        title: "Study Block",
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        eventType: "TIME_BLOCK",
        color: "#3B82F6",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe("Study Block");
    expect(res.body.data.eventType).toBe("TIME_BLOCK");
    createdEventIds.push(res.body.data.id);
  });

  it("POST — 400 on missing title", async () => {
    const res = await request(app)
      .post(CALENDAR_URL)
      .set(...participantAuthHeader())
      .send({
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      });

    expect(res.status).toBe(400);
  });

  it("POST — 400 on missing times", async () => {
    const res = await request(app)
      .post(CALENDAR_URL)
      .set(...participantAuthHeader())
      .send({ title: "No Times" });

    expect(res.status).toBe(400);
  });

  it("POST — 400 when endTime before startTime", async () => {
    const now = new Date();
    const res = await request(app)
      .post(CALENDAR_URL)
      .set(...participantAuthHeader())
      .send({
        title: "Bad Times",
        startTime: new Date(now.getTime() + 7200000).toISOString(),
        endTime: new Date(now.getTime() + 3600000).toISOString(),
      });

    expect(res.status).toBe(400);
  });

  it("POST — 401 without auth", async () => {
    const res = await request(app).post(CALENDAR_URL).send({ title: "No Auth" });
    expect(res.status).toBe(401);
  });

  it("POST — 403 as clinician", async () => {
    const res = await request(app)
      .post(CALENDAR_URL)
      .set(...clinicianAuthHeader())
      .send({
        title: "Clinician Attempt",
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      });

    expect(res.status).toBe(403);
  });

  // ── List ──────────────────────────────────────────────

  it("GET — lists events in date range", async () => {
    const start = new Date(Date.now() - 86400000).toISOString();
    const end = new Date(Date.now() + 86400000 * 7).toISOString();

    const res = await request(app)
      .get(`${CALENDAR_URL}?start=${start}&end=${end}`)
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("GET — 400 without start/end params", async () => {
    const res = await request(app)
      .get(CALENDAR_URL)
      .set(...participantAuthHeader());

    expect(res.status).toBe(400);
  });

  // ── Update ────────────────────────────────────────────

  it("PATCH /:id — updates event title", async () => {
    const eventId = createdEventIds[0];

    const res = await request(app)
      .patch(`${CALENDAR_URL}/${eventId}`)
      .set(...participantAuthHeader())
      .send({ title: "Updated Study Block" });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Updated Study Block");
  });

  it("PATCH /:id — 404 for nonexistent event", async () => {
    const res = await request(app)
      .patch(`${CALENDAR_URL}/nonexistent-event`)
      .set(...participantAuthHeader())
      .send({ title: "Nope" });

    expect(res.status).toBe(404);
  });

  // ── Delete ────────────────────────────────────────────

  it("DELETE /:id — deletes a calendar event", async () => {
    // Create one to delete
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);
    const createRes = await request(app)
      .post(CALENDAR_URL)
      .set(...participantAuthHeader())
      .send({
        title: "To Delete",
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
    const eventId = createRes.body.data.id;

    const res = await request(app)
      .delete(`${CALENDAR_URL}/${eventId}`)
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("DELETE /:id — 404 for nonexistent event", async () => {
    const res = await request(app)
      .delete(`${CALENDAR_URL}/nonexistent-event`)
      .set(...participantAuthHeader());

    expect(res.status).toBe(404);
  });
});
