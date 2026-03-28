import request from "supertest";
import app from "../../app";
import { testPrisma, TEST_IDS, clinicianAuthHeader, participantAuthHeader } from "./setup";

const JOURNAL_URL = "/api/participant/journal";

describe("Journal Routes (integration)", () => {
  const createdEntryIds: string[] = [];

  afterAll(async () => {
    for (const id of createdEntryIds) {
      await testPrisma.journalEntry.delete({ where: { id } }).catch(() => {});
    }
  });

  // ── Create / Upsert ──────────────────────────────────

  it("POST — creates a journal entry", async () => {
    const res = await request(app)
      .post(JOURNAL_URL)
      .set(...participantAuthHeader())
      .send({
        entryDate: "2026-03-15",
        freeformContent: "Today was a good day.",
        regulationScore: 7,
        isSharedWithClinician: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.freeformContent).toBe("Today was a good day.");
    expect(res.body.data.regulationScore).toBe(7);
    createdEntryIds.push(res.body.data.id);
  });

  it("POST — upserts on same date", async () => {
    const res = await request(app)
      .post(JOURNAL_URL)
      .set(...participantAuthHeader())
      .send({
        entryDate: "2026-03-15",
        freeformContent: "Updated entry for the day.",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.freeformContent).toBe("Updated entry for the day.");
  });

  it("POST — 400 on missing entryDate", async () => {
    const res = await request(app)
      .post(JOURNAL_URL)
      .set(...participantAuthHeader())
      .send({ freeformContent: "No date" });

    expect(res.status).toBe(400);
  });

  it("POST — 400 on invalid regulationScore", async () => {
    const res = await request(app)
      .post(JOURNAL_URL)
      .set(...participantAuthHeader())
      .send({
        entryDate: "2026-03-16",
        regulationScore: 15,
      });

    expect(res.status).toBe(400);
  });

  it("POST — 401 without auth", async () => {
    const res = await request(app)
      .post(JOURNAL_URL)
      .send({ entryDate: "2026-03-17" });

    expect(res.status).toBe(401);
  });

  it("POST — 403 as clinician", async () => {
    const res = await request(app)
      .post(JOURNAL_URL)
      .set(...clinicianAuthHeader())
      .send({ entryDate: "2026-03-17" });

    expect(res.status).toBe(403);
  });

  // ── List ──────────────────────────────────────────────

  it("GET — lists journal entries", async () => {
    const res = await request(app)
      .get(JOURNAL_URL)
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("GET — filters by date range", async () => {
    const res = await request(app)
      .get(`${JOURNAL_URL}?start=2026-03-01&end=2026-03-31`)
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ── Get by Date ───────────────────────────────────────

  it("GET /:date — returns entry for specific date", async () => {
    const res = await request(app)
      .get(`${JOURNAL_URL}/2026-03-15`)
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).not.toBeNull();
    expect(res.body.data.freeformContent).toBe("Updated entry for the day.");
  });

  it("GET /:date — returns null for date with no entry", async () => {
    const res = await request(app)
      .get(`${JOURNAL_URL}/2020-01-01`)
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it("GET /:date — 400 on invalid date format", async () => {
    const res = await request(app)
      .get(`${JOURNAL_URL}/not-a-date`)
      .set(...participantAuthHeader());

    expect(res.status).toBe(400);
  });
});
