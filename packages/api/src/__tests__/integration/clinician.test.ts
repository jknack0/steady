import request from "supertest";
import app from "../../app";
import { testPrisma, TEST_IDS, clinicianAuthHeader, participantAuthHeader } from "./setup";

describe("Clinician Routes (integration)", () => {
  let enrollmentId: string;
  const createdClientUserIds: string[] = [];

  beforeAll(async () => {
    // Create ClinicianClient relationship (required by ownership checks)
    const existing = await testPrisma.clinicianClient.findFirst({
      where: { clinicianId: TEST_IDS.clinicianProfileId, clientId: TEST_IDS.participantUserId },
    });
    if (!existing) {
      await testPrisma.clinicianClient.create({
        data: {
          clinicianId: TEST_IDS.clinicianProfileId,
          clientId: TEST_IDS.participantUserId,
          status: "ACTIVE",
        },
      });
    }

    // Create an active enrollment so participant shows up
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
    await testPrisma.task.deleteMany({
      where: { participantId: TEST_IDS.participantProfileId, sourceType: "CLINICIAN_PUSH" },
    });
    await testPrisma.homeworkInstance.deleteMany({
      where: { participantId: TEST_IDS.participantProfileId },
    });
    await testPrisma.moduleProgress.deleteMany({ where: { enrollmentId } });
    await testPrisma.enrollment.deleteMany({ where: { id: enrollmentId } }).catch(() => {});
    await testPrisma.clinicianClient.deleteMany({
      where: { clinicianId: TEST_IDS.clinicianProfileId, clientId: TEST_IDS.participantUserId },
    }).catch(() => {});
    for (const id of createdClientUserIds) {
      await testPrisma.clinicianClient.deleteMany({ where: { clientId: id } });
      await testPrisma.participantProfile.deleteMany({ where: { userId: id } });
      await testPrisma.user.delete({ where: { id } }).catch(() => {});
    }
  });

  // ── Dashboard ─────────────────────────────────────────

  it("GET /api/clinician/dashboard — returns dashboard data", async () => {
    const res = await request(app)
      .get("/api/clinician/dashboard")
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.stats).toBeDefined();
    expect(res.body.data.stats.totalClients).toBeGreaterThanOrEqual(1);
    expect(typeof res.body.data.stats.publishedPrograms).toBe("number");
  });

  it("GET /api/clinician/dashboard — 401 without auth", async () => {
    const res = await request(app).get("/api/clinician/dashboard");
    expect(res.status).toBe(401);
  });

  it("GET /api/clinician/dashboard — 403 as participant", async () => {
    const res = await request(app)
      .get("/api/clinician/dashboard")
      .set(...participantAuthHeader());

    expect(res.status).toBe(403);
  });

  // ── Participants ──────────────────────────────────────

  it("GET /api/clinician/participants — lists participants", async () => {
    const res = await request(app)
      .get("/api/clinician/participants")
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/clinician/participants/:id — gets participant detail", async () => {
    const res = await request(app)
      .get(`/api/clinician/participants/${TEST_IDS.participantUserId}`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it("GET /api/clinician/participants/:id — 404 for unknown participant", async () => {
    const res = await request(app)
      .get("/api/clinician/participants/nonexistent-user")
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(404);
  });

  // ── Clients ───────────────────────────────────────────

  it("POST /api/clinician/clients — adds a new client", async () => {
    const res = await request(app)
      .post("/api/clinician/clients")
      .set(...clinicianAuthHeader())
      .send({
        email: "integ-new-client@test.local",
        firstName: "New",
        lastName: "Client",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.clinicianClient).toBeDefined();

    // Track for cleanup
    const user = await testPrisma.user.findUnique({ where: { email: "integ-new-client@test.local" } });
    if (user) createdClientUserIds.push(user.id);
  });

  it("POST /api/clinician/clients — 400 on missing fields", async () => {
    const res = await request(app)
      .post("/api/clinician/clients")
      .set(...clinicianAuthHeader())
      .send({ email: "bad@test.local" });

    expect(res.status).toBe(400);
  });

  it("GET /api/clinician/clients — lists clients", async () => {
    const res = await request(app)
      .get("/api/clinician/clients")
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ── Push Task ─────────────────────────────────────────

  it("POST /api/clinician/participants/:id/push-task — pushes a task", async () => {
    const res = await request(app)
      .post(`/api/clinician/participants/${TEST_IDS.participantUserId}/push-task`)
      .set(...clinicianAuthHeader())
      .send({
        title: "Review homework sheet",
        description: "Before next session",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe("Review homework sheet");
  });

  it("POST /api/clinician/participants/:id/push-task — 400 on missing title", async () => {
    const res = await request(app)
      .post(`/api/clinician/participants/${TEST_IDS.participantUserId}/push-task`)
      .set(...clinicianAuthHeader())
      .send({ description: "No title" });

    expect(res.status).toBe(400);
  });

  // ── Manage Enrollment ─────────────────────────────────

  it("PUT /api/clinician/participants/:id/enrollment/:enrollmentId — pauses enrollment", async () => {
    const res = await request(app)
      .put(`/api/clinician/participants/${TEST_IDS.participantUserId}/enrollment/${enrollmentId}`)
      .set(...clinicianAuthHeader())
      .send({ action: "pause" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("PAUSED");
  });

  it("PUT — 400 on invalid action", async () => {
    const res = await request(app)
      .put(`/api/clinician/participants/${TEST_IDS.participantUserId}/enrollment/${enrollmentId}`)
      .set(...clinicianAuthHeader())
      .send({ action: "invalid-action" });

    expect(res.status).toBe(400);
  });
});
