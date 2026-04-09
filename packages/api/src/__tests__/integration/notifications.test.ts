import request from "supertest";
import app from "../../app";
import { testPrisma, TEST_IDS, clinicianAuthHeader, participantAuthHeader } from "./setup";

const NOTIFICATIONS_URL = "/api/notifications";

describe("Notifications Routes (integration)", () => {
  afterAll(async () => {
    await testPrisma.notificationPreference.deleteMany({
      where: { userId: { in: [TEST_IDS.clinicianUserId, TEST_IDS.participantUserId] } },
    });
    // Reset push token
    await testPrisma.user.update({
      where: { id: TEST_IDS.participantUserId },
      data: { pushToken: null, pushTokenUpdatedAt: null },
    });
  });

  // ── Push Token ────────────────────────────────────────

  it("POST /push-token — registers a push token", async () => {
    const res = await request(app)
      .post(`${NOTIFICATIONS_URL}/push-token`)
      .set(...participantAuthHeader())
      .send({ pushToken: "ExponentPushToken[xxxx]" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const user = await testPrisma.user.findUnique({ where: { id: TEST_IDS.participantUserId } });
    expect(user?.pushToken).toBe("ExponentPushToken[xxxx]");
  });

  it("POST /push-token — 400 on missing pushToken", async () => {
    const res = await request(app)
      .post(`${NOTIFICATIONS_URL}/push-token`)
      .set(...participantAuthHeader())
      .send({});

    expect(res.status).toBe(400);
  });

  it("DELETE /push-token — removes push token", async () => {
    const res = await request(app)
      .delete(`${NOTIFICATIONS_URL}/push-token`)
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);

    const user = await testPrisma.user.findUnique({ where: { id: TEST_IDS.participantUserId } });
    expect(user?.pushToken).toBeNull();
  });

  it("POST /push-token — 401 without auth", async () => {
    const res = await request(app)
      .post(`${NOTIFICATIONS_URL}/push-token`)
      .send({ pushToken: "test" });

    expect(res.status).toBe(401);
  });

  // ── Preferences ───────────────────────────────────────

  it("GET /preferences — returns defaults for all categories", async () => {
    const res = await request(app)
      .get(`${NOTIFICATIONS_URL}/preferences`)
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
    const categories = res.body.data.map((p: any) => p.category);
    expect(categories).toContain("MORNING_CHECKIN");
    expect(categories).toContain("HOMEWORK");
    expect(categories).toContain("SESSION");
    expect(categories).toContain("TASK");
    expect(categories).toContain("WEEKLY_REVIEW");
  });

  it("PUT /preferences — updates preferences", async () => {
    const res = await request(app)
      .put(`${NOTIFICATIONS_URL}/preferences`)
      .set(...participantAuthHeader())
      .send({
        preferences: [
          { category: "MORNING_CHECKIN", enabled: false },
          { category: "HOMEWORK", enabled: true, preferredTime: "09:00" },
        ],
      });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("PUT /preferences — 400 on invalid body", async () => {
    const res = await request(app)
      .put(`${NOTIFICATIONS_URL}/preferences`)
      .set(...participantAuthHeader())
      .send({ preferences: "not-an-array" });

    expect(res.status).toBe(400);
  });

  // ── Dismiss ───────────────────────────────────────────

  it("POST /dismiss — records a dismissal", async () => {
    const res = await request(app)
      .post(`${NOTIFICATIONS_URL}/dismiss`)
      .set(...participantAuthHeader())
      .send({ category: "HOMEWORK" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("POST /dismiss — 400 on invalid category", async () => {
    const res = await request(app)
      .post(`${NOTIFICATIONS_URL}/dismiss`)
      .set(...participantAuthHeader())
      .send({ category: "INVALID_CATEGORY" });

    expect(res.status).toBe(400);
  });
});
