import request from "supertest";
import app from "../../app";
import { testPrisma, TEST_IDS, clinicianAuthHeader, participantAuthHeader } from "./setup";

describe("Sessions Routes (integration)", () => {
  let enrollmentId: string;
  const createdSessionIds: string[] = [];

  beforeAll(async () => {
    const enrollment = await testPrisma.enrollment.create({
      data: {
        participantId: TEST_IDS.participantProfileId,
        programId: TEST_IDS.programId,
        status: "ACTIVE",
      },
    });
    enrollmentId = enrollment.id;
  });

  afterAll(async () => {
    for (const id of createdSessionIds) {
      await testPrisma.session.delete({ where: { id } }).catch(() => {});
    }
    await testPrisma.moduleProgress.deleteMany({ where: { enrollmentId } });
    await testPrisma.enrollment.delete({ where: { id: enrollmentId } }).catch(() => {});
  });

  // ── Create ────────────────────────────────────────────

  it("POST /api/sessions — creates a session", async () => {
    const scheduledAt = new Date(Date.now() + 86400000).toISOString();

    const res = await request(app)
      .post("/api/sessions")
      .set(...clinicianAuthHeader())
      .send({
        enrollmentId,
        scheduledAt,
        videoCallUrl: "https://zoom.us/test",
        durationMinutes: 50,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.enrollmentId).toBe(enrollmentId);
    expect(res.body.data.status).toBe("SCHEDULED");
    createdSessionIds.push(res.body.data.id);
  });

  it("POST /api/sessions — 400 on missing fields", async () => {
    const res = await request(app)
      .post("/api/sessions")
      .set(...clinicianAuthHeader())
      .send({});

    expect(res.status).toBe(400);
  });

  it("POST /api/sessions — 404 for nonexistent enrollment", async () => {
    const res = await request(app)
      .post("/api/sessions")
      .set(...clinicianAuthHeader())
      .send({
        enrollmentId: "nonexistent-enrollment",
        scheduledAt: new Date().toISOString(),
      });

    expect(res.status).toBe(404);
  });

  it("POST /api/sessions — 401 without auth", async () => {
    const res = await request(app)
      .post("/api/sessions")
      .send({ enrollmentId, scheduledAt: new Date().toISOString() });

    expect(res.status).toBe(401);
  });

  it("POST /api/sessions — 403 as participant", async () => {
    const res = await request(app)
      .post("/api/sessions")
      .set(...participantAuthHeader())
      .send({ enrollmentId, scheduledAt: new Date().toISOString() });

    expect(res.status).toBe(403);
  });

  // ── List (Clinician) ──────────────────────────────────

  it("GET /api/sessions — lists clinician sessions", async () => {
    const res = await request(app)
      .get("/api/sessions")
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("GET /api/sessions — filters by enrollmentId", async () => {
    const res = await request(app)
      .get(`/api/sessions?enrollmentId=${enrollmentId}`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    for (const session of res.body.data) {
      expect(session.enrollmentId).toBe(enrollmentId);
    }
  });

  // ── Update ────────────────────────────────────────────

  it("PUT /api/sessions/:id — reschedules a session", async () => {
    const sessionId = createdSessionIds[0];
    const newDate = new Date(Date.now() + 172800000).toISOString();

    const res = await request(app)
      .put(`/api/sessions/${sessionId}`)
      .set(...clinicianAuthHeader())
      .send({ scheduledAt: newDate });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(sessionId);
  });

  it("PUT /api/sessions/:id — 404 for nonexistent session", async () => {
    const res = await request(app)
      .put("/api/sessions/nonexistent-session")
      .set(...clinicianAuthHeader())
      .send({ scheduledAt: new Date().toISOString() });

    expect(res.status).toBe(404);
  });

  // ── Participant Endpoints ─────────────────────────────

  it("GET /api/sessions/upcoming — returns upcoming session for participant", async () => {
    const res = await request(app)
      .get("/api/sessions/upcoming")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/sessions/history — returns session history for participant", async () => {
    const res = await request(app)
      .get("/api/sessions/history")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── Complete Session ──────────────────────────────────

  it("PUT /api/sessions/:id/complete — completes a session", async () => {
    // Create a fresh session to complete
    const scheduledAt = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
    const createRes = await request(app)
      .post("/api/sessions")
      .set(...clinicianAuthHeader())
      .send({ enrollmentId, scheduledAt });
    const sessionId = createRes.body.data.id;
    createdSessionIds.push(sessionId);

    const res = await request(app)
      .put(`/api/sessions/${sessionId}/complete`)
      .set(...clinicianAuthHeader())
      .send({
        clinicianNotes: "Good session progress",
        participantSummary: "Keep up the great work",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("COMPLETED");
  });
});
