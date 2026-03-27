import request from "supertest";
import app from "../../app";
import { testPrisma, TEST_IDS, clinicianAuthHeader } from "./setup";

const CONFIG_URL = "/api/config";

// We need a clinician config to exist before we can PATCH homework labels
async function ensureClinicianConfig() {
  await testPrisma.clinicianConfig.upsert({
    where: { clinicianId: TEST_IDS.clinicianProfileId },
    create: {
      clinicianId: TEST_IDS.clinicianProfileId,
      providerType: "THERAPIST",
      enabledModules: ["homework", "journal"],
      dashboardLayout: [
        { widgetId: "overview", visible: true, column: "main", order: 0, settings: {} },
      ],
      setupCompleted: true,
    },
    update: {},
  });
}

afterEach(async () => {
  await testPrisma.clinicianConfig
    .delete({ where: { clinicianId: TEST_IDS.clinicianProfileId } })
    .catch(() => {});
});

describe("Config Homework Labels (integration)", () => {
  it("saves homework label defaults and reads them back", async () => {
    await ensureClinicianConfig();

    const labels = {
      ACTION: "To-Do",
      JOURNAL_PROMPT: "Reflection",
      BRING_TO_SESSION: "Bring Item",
    };

    const patchRes = await request(app)
      .patch(`${CONFIG_URL}/homework-labels`)
      .set(...clinicianAuthHeader())
      .send({ homeworkLabels: labels });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.success).toBe(true);
    expect(patchRes.body.data.homeworkLabels).toMatchObject(labels);

    // Read back via GET
    const getRes = await request(app)
      .get(CONFIG_URL)
      .set(...clinicianAuthHeader());

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.homeworkLabels).toMatchObject(labels);
  });

  it("rejects labels with invalid homework item type keys", async () => {
    await ensureClinicianConfig();

    const res = await request(app)
      .patch(`${CONFIG_URL}/homework-labels`)
      .set(...clinicianAuthHeader())
      .send({
        homeworkLabels: {
          INVALID_TYPE: "Bad Label",
        },
      });

    expect(res.status).toBe(400);
  });

  it("rejects labels over 50 characters", async () => {
    await ensureClinicianConfig();

    const res = await request(app)
      .patch(`${CONFIG_URL}/homework-labels`)
      .set(...clinicianAuthHeader())
      .send({
        homeworkLabels: {
          ACTION: "A".repeat(51),
        },
      });

    expect(res.status).toBe(400);
  });

  it("rejects empty string labels", async () => {
    await ensureClinicianConfig();

    const res = await request(app)
      .patch(`${CONFIG_URL}/homework-labels`)
      .set(...clinicianAuthHeader())
      .send({
        homeworkLabels: {
          ACTION: "",
        },
      });

    expect(res.status).toBe(400);
  });

  it("rejects unauthenticated requests with 401", async () => {
    const res = await request(app)
      .patch(`${CONFIG_URL}/homework-labels`)
      .send({ homeworkLabels: { ACTION: "Test" } });

    expect(res.status).toBe(401);
  });

  it("can save all 11 homework item types as labels", async () => {
    await ensureClinicianConfig();

    const allLabels = {
      ACTION: "Action Item",
      RESOURCE_REVIEW: "Resource",
      JOURNAL_PROMPT: "Journal",
      BRING_TO_SESSION: "Bring",
      FREE_TEXT_NOTE: "Note",
      CHOICE: "Choose",
      WORKSHEET: "Sheet",
      RATING_SCALE: "Rate",
      TIMER: "Timer",
      MOOD_CHECK: "Mood",
      HABIT_TRACKER: "Habit",
    };

    const res = await request(app)
      .patch(`${CONFIG_URL}/homework-labels`)
      .set(...clinicianAuthHeader())
      .send({ homeworkLabels: allLabels });

    expect(res.status).toBe(200);
    expect(res.body.data.homeworkLabels).toMatchObject(allLabels);
  });
});
