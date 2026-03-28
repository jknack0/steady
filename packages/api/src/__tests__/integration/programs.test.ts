import request from "supertest";
import app from "../../app";
import { testPrisma, TEST_IDS, clinicianAuthHeader, participantAuthHeader } from "./setup";
import jwt from "jsonwebtoken";

const PROGRAMS_URL = "/api/programs";

// Second clinician for ownership tests
const CLINICIAN2 = {
  userId: "integ-clinician2-user",
  profileId: "integ-clinician2-profile",
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

describe("Programs Routes (integration)", () => {
  const createdProgramIds: string[] = [];

  beforeAll(async () => {
    // Create second clinician for ownership tests
    await testPrisma.user.create({
      data: {
        id: CLINICIAN2.userId,
        email: "integ-clinician2@test.local",
        passwordHash: "$2b$10$fakehashfakehashfakehashfakehashfakehashfakehashfa",
        role: "CLINICIAN",
        firstName: "Other",
        lastName: "Clinician",
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
    for (const id of createdProgramIds) {
      await testPrisma.module.deleteMany({ where: { programId: id } });
      await testPrisma.program.delete({ where: { id } }).catch(() => {});
    }
    await testPrisma.clinicianProfile.delete({ where: { id: CLINICIAN2.profileId } }).catch(() => {});
    await testPrisma.user.delete({ where: { id: CLINICIAN2.userId } }).catch(() => {});
  });

  // ── Create ────────────────────────────────────────────

  it("POST /api/programs — creates a program", async () => {
    const res = await request(app)
      .post(PROGRAMS_URL)
      .set(...clinicianAuthHeader())
      .send({
        title: "Integration Test Program Create",
        description: "Test description",
        cadence: "WEEKLY",
        enrollmentMethod: "INVITE",
        sessionType: "ONE_ON_ONE",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("Integration Test Program Create");
    expect(res.body.data.clinicianId).toBe(TEST_IDS.clinicianProfileId);
    createdProgramIds.push(res.body.data.id);
  });

  it("POST /api/programs — 400 on invalid data", async () => {
    const res = await request(app)
      .post(PROGRAMS_URL)
      .set(...clinicianAuthHeader())
      .send({ title: "" }); // missing required fields

    expect(res.status).toBe(400);
  });

  it("POST /api/programs — 401 without auth", async () => {
    const res = await request(app).post(PROGRAMS_URL).send({ title: "No Auth" });
    expect(res.status).toBe(401);
  });

  it("POST /api/programs — 403 as participant", async () => {
    const res = await request(app)
      .post(PROGRAMS_URL)
      .set(...participantAuthHeader())
      .send({ title: "Participant Attempt" });

    expect(res.status).toBe(403);
  });

  // ── List ──────────────────────────────────────────────

  it("GET /api/programs — lists clinician's programs", async () => {
    const res = await request(app)
      .get(PROGRAMS_URL)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    // Should include the seeded program
    const seeded = res.body.data.find((p: any) => p.id === TEST_IDS.programId);
    expect(seeded).toBeDefined();
  });

  it("GET /api/programs — clinician2 does not see clinician1's programs", async () => {
    const res = await request(app)
      .get(PROGRAMS_URL)
      .set(...clinician2AuthHeader());

    expect(res.status).toBe(200);
    const ids = res.body.data.map((p: any) => p.id);
    expect(ids).not.toContain(TEST_IDS.programId);
  });

  // ── Get Single ────────────────────────────────────────

  it("GET /api/programs/:id — gets own program", async () => {
    const res = await request(app)
      .get(`${PROGRAMS_URL}/${TEST_IDS.programId}`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(TEST_IDS.programId);
    expect(res.body.data.modules).toBeDefined();
  });

  it("GET /api/programs/:id — 404 for other clinician's program", async () => {
    const res = await request(app)
      .get(`${PROGRAMS_URL}/${TEST_IDS.programId}`)
      .set(...clinician2AuthHeader());

    expect(res.status).toBe(404);
  });

  it("GET /api/programs/:id — 404 for nonexistent program", async () => {
    const res = await request(app)
      .get(`${PROGRAMS_URL}/nonexistent-id`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(404);
  });

  // ── Update ────────────────────────────────────────────

  it("PUT /api/programs/:id — updates own program", async () => {
    const res = await request(app)
      .put(`${PROGRAMS_URL}/${TEST_IDS.programId}`)
      .set(...clinicianAuthHeader())
      .send({ description: "Updated description" });

    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe("Updated description");
  });

  it("PUT /api/programs/:id — 404 for other clinician", async () => {
    const res = await request(app)
      .put(`${PROGRAMS_URL}/${TEST_IDS.programId}`)
      .set(...clinician2AuthHeader())
      .send({ description: "Hacked" });

    expect(res.status).toBe(404);
  });

  // ── Delete (Archive) ──────────────────────────────────

  it("DELETE /api/programs/:id — archives program without active enrollments", async () => {
    // Create a program to archive
    const createRes = await request(app)
      .post(PROGRAMS_URL)
      .set(...clinicianAuthHeader())
      .send({
        title: "To Archive",
        cadence: "WEEKLY",
        enrollmentMethod: "INVITE",
        sessionType: "ONE_ON_ONE",
      });
    const archiveId = createRes.body.data.id;

    const res = await request(app)
      .delete(`${PROGRAMS_URL}/${archiveId}`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify it's archived in DB
    const program = await testPrisma.program.findUnique({ where: { id: archiveId } });
    expect(program?.status).toBe("ARCHIVED");
  });

  // ── Clone ─────────────────────────────────────────────

  it("POST /api/programs/:id/clone — clones own program", async () => {
    const res = await request(app)
      .post(`${PROGRAMS_URL}/${TEST_IDS.programId}/clone`)
      .set(...clinicianAuthHeader())
      .send({ title: "My Clone" });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe("My Clone");
    expect(res.body.data.status).toBe("DRAFT");
    expect(res.body.data.modules).toBeDefined();
    createdProgramIds.push(res.body.data.id);
  });

  it("POST /api/programs/:id/clone — 404 for other clinician's non-template program", async () => {
    const res = await request(app)
      .post(`${PROGRAMS_URL}/${TEST_IDS.programId}/clone`)
      .set(...clinician2AuthHeader());

    expect(res.status).toBe(404);
  });

  // ── Preview ───────────────────────────────────────────

  it("GET /api/programs/:id/preview — returns full program with parts", async () => {
    const res = await request(app)
      .get(`${PROGRAMS_URL}/${TEST_IDS.programId}/preview`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.modules).toBeDefined();
    expect(Array.isArray(res.body.data.modules)).toBe(true);
  });
});
