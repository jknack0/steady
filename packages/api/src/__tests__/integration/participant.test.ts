import request from "supertest";
import app from "../../app";
import { testPrisma, TEST_IDS, clinicianAuthHeader, participantAuthHeader } from "./setup";

describe("Participant Routes (integration)", () => {
  let enrollmentId: string;

  beforeAll(async () => {
    // Create an active enrollment for the participant
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
    await testPrisma.partProgress.deleteMany({ where: { enrollmentId } });
    await testPrisma.moduleProgress.deleteMany({ where: { enrollmentId } });
    await testPrisma.enrollment.delete({ where: { id: enrollmentId } }).catch(() => {});
  });

  // ── List Enrollments ──────────────────────────────────

  it("GET /api/participant/enrollments — lists participant enrollments", async () => {
    const res = await request(app)
      .get("/api/participant/enrollments")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const found = res.body.data.find((e: any) => e.id === enrollmentId);
    expect(found).toBeDefined();
    expect(found.program).toBeDefined();
  });

  it("GET /api/participant/enrollments — 401 without auth", async () => {
    const res = await request(app).get("/api/participant/enrollments");
    expect(res.status).toBe(401);
  });

  it("GET /api/participant/enrollments — 403 as clinician", async () => {
    const res = await request(app)
      .get("/api/participant/enrollments")
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(403);
  });

  // ── Get Program with Progress ─────────────────────────

  it("GET /api/participant/programs/:enrollmentId — gets program content", async () => {
    const res = await request(app)
      .get(`/api/participant/programs/${enrollmentId}`)
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it("GET /api/participant/programs/:enrollmentId — 404 for wrong enrollment", async () => {
    const res = await request(app)
      .get("/api/participant/programs/nonexistent-enrollment")
      .set(...participantAuthHeader());

    expect(res.status).toBe(404);
  });

  // ── Accept Enrollment ─────────────────────────────────

  it("POST /api/participant/enrollments/:id/accept — accepts an invitation", async () => {
    // Create an INVITED enrollment
    const invited = await testPrisma.enrollment.create({
      data: {
        participantId: TEST_IDS.participantProfileId,
        programId: TEST_IDS.programId,
        status: "INVITED",
      },
    });

    const res = await request(app)
      .post(`/api/participant/enrollments/${invited.id}/accept`)
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ACTIVE");

    // Cleanup
    await testPrisma.moduleProgress.deleteMany({ where: { enrollmentId: invited.id } });
    await testPrisma.enrollment.delete({ where: { id: invited.id } }).catch(() => {});
  });

  // ── Homework Instances ────────────────────────────────

  it("GET /api/participant/homework-instances — returns list", async () => {
    const res = await request(app)
      .get("/api/participant/homework-instances")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
