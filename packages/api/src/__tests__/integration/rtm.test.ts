import request from "supertest";
import app from "../../app";
import { testPrisma, TEST_IDS, clinicianAuthHeader, participantAuthHeader } from "./setup";

const RTM_URL = "/api/rtm";

describe("RTM Routes (integration)", () => {
  let rtmEnrollmentId: string;
  let billingPeriodId: string;

  afterAll(async () => {
    if (billingPeriodId) {
      await testPrisma.rtmClinicianTimeLog.deleteMany({ where: { billingPeriodId } });
      await testPrisma.rtmBillingPeriod.delete({ where: { id: billingPeriodId } }).catch(() => {});
    }
    if (rtmEnrollmentId) {
      await testPrisma.rtmBillingPeriod.deleteMany({ where: { rtmEnrollmentId } });
      await testPrisma.rtmEnrollment.delete({ where: { id: rtmEnrollmentId } }).catch(() => {});
    }
  });

  // ── Create RTM Enrollment ─────────────────────────────

  it("POST /api/rtm — creates an RTM enrollment", async () => {
    const res = await request(app)
      .post(RTM_URL)
      .set(...clinicianAuthHeader())
      .send({
        clientId: TEST_IDS.participantUserId,
        monitoringType: "CBT",
        diagnosisCodes: ["F90.0"],
        payerName: "Test Insurance",
        subscriberId: "SUB123",
        startDate: "2026-03-01",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.monitoringType).toBe("CBT");
    expect(res.body.data.status).toBe("PENDING_CONSENT");
    rtmEnrollmentId = res.body.data.id;
  });

  it("POST /api/rtm — 409 on duplicate enrollment", async () => {
    const res = await request(app)
      .post(RTM_URL)
      .set(...clinicianAuthHeader())
      .send({
        clientId: TEST_IDS.participantUserId,
        monitoringType: "CBT",
        diagnosisCodes: ["F90.0"],
        payerName: "Test Insurance",
        subscriberId: "SUB123",
        startDate: "2026-03-01",
      });

    expect(res.status).toBe(409);
  });

  it("POST /api/rtm — 401 without auth", async () => {
    const res = await request(app)
      .post(RTM_URL)
      .send({ clientId: "test" });

    expect(res.status).toBe(401);
  });

  it("POST /api/rtm — 403 as participant", async () => {
    const res = await request(app)
      .post(RTM_URL)
      .set(...participantAuthHeader())
      .send({ clientId: "test" });

    expect(res.status).toBe(403);
  });

  // ── List RTM Enrollments ──────────────────────────────

  it("GET /api/rtm/enrollments — lists enrollments", async () => {
    const res = await request(app)
      .get(`${RTM_URL}/enrollments`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  // ── Dashboard ─────────────────────────────────────────

  it("GET /api/rtm/dashboard — returns dashboard data", async () => {
    const res = await request(app)
      .get(`${RTM_URL}/dashboard`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  // ── Billing Profile ───────────────────────────────────

  it("PUT /api/rtm/billing-profile — saves billing profile", async () => {
    const res = await request(app)
      .put(`${RTM_URL}/billing-profile`)
      .set(...clinicianAuthHeader())
      .send({
        providerName: "Dr. Test Clinician",
        credentials: "PhD",
        npiNumber: "1234567890",
        taxId: "123456789",
        practiceName: "Test Clinic",
        practiceAddress: "123 Main St",
        practiceCity: "Testville",
        practiceState: "NY",
        practiceZip: "10001",
        practicePhone: "555-123-4567",
        licenseNumber: "LIC12345",
        licenseState: "NY",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.providerName).toBe("Dr. Test Clinician");
    expect(res.body.data.npiNumber).toBe("1234567890");
  });

  it("PUT /api/rtm/billing-profile — 400 on invalid NPI", async () => {
    const res = await request(app)
      .put(`${RTM_URL}/billing-profile`)
      .set(...clinicianAuthHeader())
      .send({
        providerName: "Dr. Test",
        credentials: "PhD",
        npiNumber: "12345", // must be 10 digits
        taxId: "123456789",
        practiceName: "Test",
        practiceAddress: "123 Main",
        practiceCity: "Test",
        practiceState: "NY",
        practiceZip: "10001",
        practicePhone: "555-1234",
        licenseNumber: "LIC",
        licenseState: "NY",
      });

    expect(res.status).toBe(400);
  });

  it("GET /api/rtm/billing-profile — gets billing profile", async () => {
    const res = await request(app)
      .get(`${RTM_URL}/billing-profile`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.providerName).toBe("Dr. Test Clinician");
  });

  // ── End Enrollment ────────────────────────────────────

  it("POST /api/rtm/enrollments/:id/end — ends an enrollment", async () => {
    const res = await request(app)
      .post(`${RTM_URL}/enrollments/${rtmEnrollmentId}/end`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("POST /api/rtm/enrollments/:id/end — 404 for nonexistent enrollment", async () => {
    const res = await request(app)
      .post(`${RTM_URL}/enrollments/nonexistent/end`)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(404);
  });

  // ── Participant RTM ───────────────────────────────────

  it("GET /api/participant/rtm/pending — checks pending consent", async () => {
    const res = await request(app)
      .get("/api/participant/rtm/pending")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/participant/rtm/pending — 401 without auth", async () => {
    const res = await request(app).get("/api/participant/rtm/pending");
    expect(res.status).toBe(401);
  });

  it("GET /api/participant/rtm/pending — 403 as clinician", async () => {
    const res = await request(app)
      .get("/api/participant/rtm/pending")
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(403);
  });
});
