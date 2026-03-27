import request from "supertest";
import app from "../../app";
import { testPrisma, TEST_IDS, clinicianAuthHeader, participantAuthHeader } from "./setup";

const ENROLLMENTS_URL = `/api/programs/${TEST_IDS.programId}/enrollments`;

describe("Enrollments Routes (integration)", () => {
  const createdEnrollmentIds: string[] = [];
  const createdUserIds: string[] = [];

  afterAll(async () => {
    for (const id of createdEnrollmentIds) {
      await testPrisma.enrollment.delete({ where: { id } }).catch(() => {});
    }
    for (const id of createdUserIds) {
      await testPrisma.participantProfile.deleteMany({ where: { userId: id } });
      await testPrisma.user.delete({ where: { id } }).catch(() => {});
    }
  });

  // ── Create ────────────────────────────────────────────

  it("POST — enrolls an existing participant", async () => {
    const res = await request(app)
      .post(ENROLLMENTS_URL)
      .set(...clinicianAuthHeader())
      .send({
        participantEmail: "integ-participant@test.local",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("INVITED");
    expect(res.body.data.participant.email).toBe("integ-participant@test.local");
    createdEnrollmentIds.push(res.body.data.id);
  });

  it("POST — creates new participant user if email not found", async () => {
    const res = await request(app)
      .post(ENROLLMENTS_URL)
      .set(...clinicianAuthHeader())
      .send({
        participantEmail: "integ-enroll-new@test.local",
        firstName: "Brand",
        lastName: "New",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.participant.email).toBe("integ-enroll-new@test.local");
    createdEnrollmentIds.push(res.body.data.id);

    // Track created user for cleanup
    const user = await testPrisma.user.findUnique({ where: { email: "integ-enroll-new@test.local" } });
    if (user) createdUserIds.push(user.id);
  });

  it("POST — 409 on duplicate enrollment", async () => {
    const res = await request(app)
      .post(ENROLLMENTS_URL)
      .set(...clinicianAuthHeader())
      .send({
        participantEmail: "integ-participant@test.local",
      });

    expect(res.status).toBe(409);
  });

  it("POST — 401 without auth", async () => {
    const res = await request(app)
      .post(ENROLLMENTS_URL)
      .send({ participantEmail: "anyone@test.local" });

    expect(res.status).toBe(401);
  });

  it("POST — 403 as participant", async () => {
    const res = await request(app)
      .post(ENROLLMENTS_URL)
      .set(...participantAuthHeader())
      .send({ participantEmail: "anyone@test.local" });

    expect(res.status).toBe(403);
  });

  // ── List ──────────────────────────────────────────────

  it("GET — lists enrollments for program", async () => {
    const res = await request(app)
      .get(ENROLLMENTS_URL)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  // ── Update ────────────────────────────────────────────

  it("PUT /:id — updates enrollment status to ACTIVE", async () => {
    const enrollmentId = createdEnrollmentIds[0];

    const res = await request(app)
      .put(`${ENROLLMENTS_URL}/${enrollmentId}`)
      .set(...clinicianAuthHeader())
      .send({ status: "ACTIVE" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ACTIVE");
  });

  it("PUT /:id — 404 for nonexistent enrollment", async () => {
    const res = await request(app)
      .put(`${ENROLLMENTS_URL}/nonexistent-enrollment`)
      .set(...clinicianAuthHeader())
      .send({ status: "ACTIVE" });

    expect(res.status).toBe(404);
  });

  // ── Delete ────────────────────────────────────────────

  it("DELETE /:id — removes an enrollment", async () => {
    // Use the second created enrollment
    const enrollmentId = createdEnrollmentIds[1];

    const res = await request(app)
      .delete(`${ENROLLMENTS_URL}/${enrollmentId}`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Remove from tracking since it's already deleted
    const idx = createdEnrollmentIds.indexOf(enrollmentId);
    if (idx !== -1) createdEnrollmentIds.splice(idx, 1);
  });
});
