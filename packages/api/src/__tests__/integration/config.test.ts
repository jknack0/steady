import request from "supertest";
import app from "../../app";
import { testPrisma, TEST_IDS, clinicianAuthHeader, participantAuthHeader } from "./setup";

const CONFIG_URL = "/api/config";

describe("Config Routes (integration)", () => {
  afterAll(async () => {
    await testPrisma.clinicianConfig
      .delete({ where: { clinicianId: TEST_IDS.clinicianProfileId } })
      .catch(() => {});
  });

  // ── Save Config ───────────────────────────────────────

  it("PUT /api/config — saves clinician config", async () => {
    const res = await request(app)
      .put(CONFIG_URL)
      .set(...clinicianAuthHeader())
      .send({
        providerType: "THERAPIST",
        enabledModules: ["homework", "journal", "trackers"],
        dashboardLayout: [
          { widgetId: "overview", visible: true, column: "main", order: 0, settings: {} },
        ],
        setupCompleted: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.providerType).toBe("THERAPIST");
    expect(res.body.data.setupCompleted).toBe(true);
  });

  // ── Get Config ────────────────────────────────────────

  it("GET /api/config — gets clinician config", async () => {
    const res = await request(app)
      .get(CONFIG_URL)
      .set(...clinicianAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.providerType).toBe("THERAPIST");
  });

  it("GET /api/config — 401 without auth", async () => {
    const res = await request(app).get(CONFIG_URL);
    expect(res.status).toBe(401);
  });

  it("GET /api/config — 403 as participant", async () => {
    const res = await request(app)
      .get(CONFIG_URL)
      .set(...participantAuthHeader());

    expect(res.status).toBe(403);
  });

  // ── Dashboard Layout ──────────────────────────────────

  it("PATCH /api/config/dashboard-layout — saves dashboard layout", async () => {
    const res = await request(app)
      .patch(`${CONFIG_URL}/dashboard-layout`)
      .set(...clinicianAuthHeader())
      .send({
        dashboardLayout: [
          { widgetId: "overview", visible: true, column: "main", order: 0, settings: {} },
          { widgetId: "sessions", visible: true, column: "sidebar", order: 1, settings: {} },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.dashboardLayout).toHaveLength(2);
  });

  // ── From Preset ───────────────────────────────────────

  it("POST /api/config/from-preset — creates config from preset", async () => {
    // Delete existing config first to allow preset creation
    await testPrisma.clinicianConfig
      .delete({ where: { clinicianId: TEST_IDS.clinicianProfileId } })
      .catch(() => {});

    const res = await request(app)
      .post(`${CONFIG_URL}/from-preset`)
      .set(...clinicianAuthHeader())
      .send({ presetId: "THERAPIST_CBT" });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it("POST /api/config/from-preset — 404 for unknown preset", async () => {
    const res = await request(app)
      .post(`${CONFIG_URL}/from-preset`)
      .set(...clinicianAuthHeader())
      .send({ presetId: "nonexistent-preset" });

    expect(res.status).toBe(404);
  });
});
