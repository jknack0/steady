import request from "supertest";
import app from "../../app";
import { testPrisma, TEST_IDS, clinicianAuthHeader, participantAuthHeader } from "./setup";

describe("Auth Routes (integration)", () => {
  const createdUserIds: string[] = [];

  afterAll(async () => {
    for (const id of createdUserIds) {
      await testPrisma.refreshToken.deleteMany({ where: { userId: id } });
      await testPrisma.clinicianProfile.deleteMany({ where: { userId: id } });
      await testPrisma.participantProfile.deleteMany({ where: { userId: id } });
      await testPrisma.user.delete({ where: { id } }).catch(() => {});
    }
  });

  // ── Register ──────────────────────────────────────────

  it("POST /api/auth/register — creates a clinician account", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "integ-new-clinician@test.local",
      password: "SecurePass123!",
      firstName: "New",
      lastName: "Clinician",
      role: "CLINICIAN",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe("integ-new-clinician@test.local");
    expect(res.body.data.user.role).toBe("CLINICIAN");
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    createdUserIds.push(res.body.data.user.id);
  });

  it("POST /api/auth/register — creates a participant account", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "integ-new-participant@test.local",
      password: "SecurePass123!",
      firstName: "New",
      lastName: "Participant",
      role: "PARTICIPANT",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("PARTICIPANT");
    createdUserIds.push(res.body.data.user.id);
  });

  it("POST /api/auth/register — 409 on duplicate email", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "integ-clinician@test.local",
      password: "SecurePass123!",
      firstName: "Dup",
      lastName: "User",
      role: "CLINICIAN",
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/auth/register — 400 on missing fields", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "missing-fields@test.local",
    });

    expect(res.status).toBe(400);
  });

  // ── Login ─────────────────────────────────────────────

  it("POST /api/auth/login — successful login with valid credentials", async () => {
    // First register a user with known password
    const regRes = await request(app).post("/api/auth/register").send({
      email: "integ-login-test@test.local",
      password: "TestPassword123!",
      firstName: "Login",
      lastName: "Test",
      role: "CLINICIAN",
    });
    createdUserIds.push(regRes.body.data.user.id);

    const res = await request(app).post("/api/auth/login").send({
      email: "integ-login-test@test.local",
      password: "TestPassword123!",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBe("integ-login-test@test.local");
  });

  it("POST /api/auth/login — 401 on wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "integ-login-test@test.local",
      password: "WrongPassword!",
    });

    expect(res.status).toBe(401);
  });

  it("POST /api/auth/login — 401 on unknown email", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "nonexistent@test.local",
      password: "Anything123!",
    });

    expect(res.status).toBe(401);
  });

  // ── Refresh ───────────────────────────────────────────

  it("POST /api/auth/refresh — rotates tokens", async () => {
    // Register and get tokens
    const regRes = await request(app).post("/api/auth/register").send({
      email: "integ-refresh-test@test.local",
      password: "TestPassword123!",
      firstName: "Refresh",
      lastName: "Test",
      role: "PARTICIPANT",
    });
    createdUserIds.push(regRes.body.data.user.id);
    const refreshToken = regRes.body.data.refreshToken;

    const res = await request(app).post("/api/auth/refresh").send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    // New refresh token should differ
    expect(res.body.data.refreshToken).not.toBe(refreshToken);
  });

  it("POST /api/auth/refresh — 401 on reused token", async () => {
    const regRes = await request(app).post("/api/auth/register").send({
      email: "integ-reuse-test@test.local",
      password: "TestPassword123!",
      firstName: "Reuse",
      lastName: "Test",
      role: "PARTICIPANT",
    });
    createdUserIds.push(regRes.body.data.user.id);
    const refreshToken = regRes.body.data.refreshToken;

    // First use — should succeed
    await request(app).post("/api/auth/refresh").send({ refreshToken });

    // Second use — should fail (reuse detection)
    const res = await request(app).post("/api/auth/refresh").send({ refreshToken });
    expect(res.status).toBe(401);
  });

  it("POST /api/auth/refresh — 400 when no token provided", async () => {
    const res = await request(app).post("/api/auth/refresh").send({});
    expect(res.status).toBe(400);
  });

  // ── Logout ────────────────────────────────────────────

  it("POST /api/auth/logout — success even without token", async () => {
    const res = await request(app).post("/api/auth/logout").send({});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("POST /api/auth/logout — revokes token family", async () => {
    const regRes = await request(app).post("/api/auth/register").send({
      email: "integ-logout-test@test.local",
      password: "TestPassword123!",
      firstName: "Logout",
      lastName: "Test",
      role: "PARTICIPANT",
    });
    createdUserIds.push(regRes.body.data.user.id);
    const refreshToken = regRes.body.data.refreshToken;

    await request(app).post("/api/auth/logout").send({ refreshToken });

    // Token should now be revoked
    const refreshRes = await request(app).post("/api/auth/refresh").send({ refreshToken });
    expect(refreshRes.status).toBe(401);
  });

  // ── Me ────────────────────────────────────────────────

  it("GET /api/auth/me — returns current clinician user", async () => {
    const res = await request(app).get("/api/auth/me").set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(TEST_IDS.clinicianUserId);
    expect(res.body.data.role).toBe("CLINICIAN");
  });

  it("GET /api/auth/me — returns current participant user", async () => {
    const res = await request(app).get("/api/auth/me").set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(TEST_IDS.participantUserId);
    expect(res.body.data.role).toBe("PARTICIPANT");
  });

  it("GET /api/auth/me — 401 without auth", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});
