import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../app";
import { testPrisma, TEST_IDS, clinicianAuthHeader, participantAuthHeader } from "./setup";

const PRACTICES_URL = "/api/practices";

// Second clinician for invite tests
const CLINICIAN2 = {
  userId: "integ-practice-clin2-user",
  profileId: "integ-practice-clin2-profile",
};

function clinician2AuthHeader(): [string, string] {
  const token = jwt.sign(
    {
      userId: CLINICIAN2.userId,
      role: "CLINICIAN",
      clinicianProfileId: CLINICIAN2.profileId,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );
  return ["Authorization", `Bearer ${token}`];
}

describe("Practice Routes (integration)", () => {
  const createdPracticeIds: string[] = [];

  beforeAll(async () => {
    await testPrisma.user.create({
      data: {
        id: CLINICIAN2.userId,
        email: "integ-practice-clin2@test.local",
        passwordHash: "$2b$10$fakehashfakehashfakehashfakehashfakehashfakehashfa",
        role: "CLINICIAN",
        firstName: "Practice",
        lastName: "Clinician2",
      },
    });
    await testPrisma.clinicianProfile.create({
      data: {
        id: CLINICIAN2.profileId,
        userId: CLINICIAN2.userId,
      },
    });
  });

  afterAll(async () => {
    for (const id of createdPracticeIds) {
      await testPrisma.practiceMembership.deleteMany({ where: { practiceId: id } });
      await testPrisma.practice.delete({ where: { id } }).catch(() => {});
    }
    await testPrisma.clinicianProfile.delete({ where: { id: CLINICIAN2.profileId } }).catch(() => {});
    await testPrisma.user.delete({ where: { id: CLINICIAN2.userId } }).catch(() => {});
  });

  // ── Create ────────────────────────────────────────────

  it("POST — creates a practice", async () => {
    const res = await request(app)
      .post(PRACTICES_URL)
      .set(...clinicianAuthHeader())
      .send({ name: "Test Practice" });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Test Practice");
    expect(res.body.data.memberships).toBeDefined();
    expect(res.body.data.memberships[0].role).toBe("OWNER");
    createdPracticeIds.push(res.body.data.id);
  });

  it("POST — 400 on missing name", async () => {
    const res = await request(app)
      .post(PRACTICES_URL)
      .set(...clinicianAuthHeader())
      .send({});

    expect(res.status).toBe(400);
  });

  it("POST — 401 without auth", async () => {
    const res = await request(app).post(PRACTICES_URL).send({ name: "No Auth" });
    expect(res.status).toBe(401);
  });

  it("POST — 403 as participant", async () => {
    const res = await request(app)
      .post(PRACTICES_URL)
      .set(...participantAuthHeader())
      .send({ name: "Participant Attempt" });

    expect(res.status).toBe(403);
  });

  // ── List ──────────────────────────────────────────────

  it("GET — lists practices for clinician", async () => {
    const res = await request(app)
      .get(PRACTICES_URL)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  // ── Update ────────────────────────────────────────────

  it("PUT /:id — owner updates practice name", async () => {
    const practiceId = createdPracticeIds[0];

    const res = await request(app)
      .put(`${PRACTICES_URL}/${practiceId}`)
      .set(...clinicianAuthHeader())
      .send({ name: "Updated Practice Name" });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Updated Practice Name");
  });

  it("PUT /:id — 403 for non-owner", async () => {
    const practiceId = createdPracticeIds[0];

    const res = await request(app)
      .put(`${PRACTICES_URL}/${practiceId}`)
      .set(...clinician2AuthHeader())
      .send({ name: "Hacked Name" });

    expect(res.status).toBe(403);
  });

  // ── Invite ────────────────────────────────────────────

  it("POST /:id/invite — invites a clinician", async () => {
    const practiceId = createdPracticeIds[0];

    const res = await request(app)
      .post(`${PRACTICES_URL}/${practiceId}/invite`)
      .set(...clinicianAuthHeader())
      .send({ email: "integ-practice-clin2@test.local" });

    expect(res.status).toBe(201);
    expect(res.body.data.clinicianId).toBe(CLINICIAN2.profileId);
  });

  it("POST /:id/invite — 409 on duplicate invite", async () => {
    const practiceId = createdPracticeIds[0];

    const res = await request(app)
      .post(`${PRACTICES_URL}/${practiceId}/invite`)
      .set(...clinicianAuthHeader())
      .send({ email: "integ-practice-clin2@test.local" });

    expect(res.status).toBe(409);
  });

  it("POST /:id/invite — 404 for nonexistent clinician", async () => {
    const practiceId = createdPracticeIds[0];

    const res = await request(app)
      .post(`${PRACTICES_URL}/${practiceId}/invite`)
      .set(...clinicianAuthHeader())
      .send({ email: "nonexistent@test.local" });

    expect(res.status).toBe(404);
  });

  it("POST /:id/invite — 403 for non-owner", async () => {
    const practiceId = createdPracticeIds[0];

    const res = await request(app)
      .post(`${PRACTICES_URL}/${practiceId}/invite`)
      .set(...clinician2AuthHeader())
      .send({ email: "integ-clinician@test.local" });

    expect(res.status).toBe(403);
  });

  // ── Remove Member ─────────────────────────────────────

  it("DELETE /:id/members/:memberId — removes a member", async () => {
    const practiceId = createdPracticeIds[0];

    // Find the membership for clinician2
    const membership = await testPrisma.practiceMembership.findUnique({
      where: {
        practiceId_clinicianId: {
          practiceId,
          clinicianId: CLINICIAN2.profileId,
        },
      },
    });

    const res = await request(app)
      .delete(`${PRACTICES_URL}/${practiceId}/members/${membership!.id}`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── Templates ─────────────────────────────────────────

  it("GET /:id/templates — lists practice templates", async () => {
    const practiceId = createdPracticeIds[0];

    const res = await request(app)
      .get(`${PRACTICES_URL}/${practiceId}/templates`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ── Dashboard ─────────────────────────────────────────

  it("GET /:id/dashboard — owner sees dashboard", async () => {
    const practiceId = createdPracticeIds[0];

    const res = await request(app)
      .get(`${PRACTICES_URL}/${practiceId}/dashboard`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.totals).toBeDefined();
    expect(res.body.data.clinicianStats).toBeDefined();
  });

  it("GET /:id/dashboard — 403 for non-owner", async () => {
    const practiceId = createdPracticeIds[0];

    const res = await request(app)
      .get(`${PRACTICES_URL}/${practiceId}/dashboard`)
      .set(...clinician2AuthHeader());

    expect(res.status).toBe(403);
  });
});
