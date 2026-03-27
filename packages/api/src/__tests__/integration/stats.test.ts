import request from "supertest";
import app from "../../app";
import { TEST_IDS, clinicianAuthHeader, participantAuthHeader } from "./setup";

describe("Stats Routes (integration)", () => {
  // ── Participant Stats ─────────────────────────────────

  it("GET /api/stats/participant — returns own stats", async () => {
    const res = await request(app)
      .get("/api/stats/participant")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it("GET /api/stats/participant — 401 without auth", async () => {
    const res = await request(app).get("/api/stats/participant");
    expect(res.status).toBe(401);
  });

  it("GET /api/stats/participant — 403 as clinician", async () => {
    const res = await request(app)
      .get("/api/stats/participant")
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(403);
  });

  // ── Clinician views participant stats ─────────────────

  it("GET /api/stats/participant/:id — clinician views participant stats", async () => {
    const res = await request(app)
      .get(`/api/stats/participant/${TEST_IDS.participantProfileId}`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/stats/participant/:id — clinician can look up by userId", async () => {
    const res = await request(app)
      .get(`/api/stats/participant/${TEST_IDS.participantUserId}`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/stats/participant/:id — 404 for nonexistent participant", async () => {
    const res = await request(app)
      .get("/api/stats/participant/nonexistent-id")
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(404);
  });

  it("GET /api/stats/participant/:id — 403 as participant", async () => {
    const res = await request(app)
      .get(`/api/stats/participant/${TEST_IDS.participantProfileId}`)
      .set(...participantAuthHeader());

    expect(res.status).toBe(403);
  });
});
