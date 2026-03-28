import request from "supertest";
import app from "../../app";
import {
  testPrisma,
  TEST_IDS,
  clinicianAuthHeader,
  participantAuthHeader,
} from "./setup";

describe("Participant Display Labels (integration)", () => {
  let partId: string;
  let enrollmentId: string;
  let instanceId: string;

  beforeAll(async () => {
    // 1. Set clinician homework label defaults
    await testPrisma.clinicianConfig.upsert({
      where: { clinicianId: TEST_IDS.clinicianProfileId },
      create: {
        clinicianId: TEST_IDS.clinicianProfileId,
        providerType: "THERAPIST",
        enabledModules: ["homework", "journal"],
        dashboardLayout: [
          {
            widgetId: "overview",
            visible: true,
            column: "main",
            order: 0,
            settings: {},
          },
        ],
        homeworkLabels: {
          ACTION: "Clinician Action",
          JOURNAL_PROMPT: "Clinician Journal",
          BRING_TO_SESSION: "Clinician Bring",
        },
        setupCompleted: true,
      },
      update: {
        homeworkLabels: {
          ACTION: "Clinician Action",
          JOURNAL_PROMPT: "Clinician Journal",
          BRING_TO_SESSION: "Clinician Bring",
        },
      },
    });

    // 2. Create a homework part with a customLabel on one item
    const createRes = await request(app)
      .post(
        `/api/programs/${TEST_IDS.programId}/modules/${TEST_IDS.moduleId}/parts`
      )
      .set(...clinicianAuthHeader())
      .send({
        type: "HOMEWORK",
        title: "Display Label Test Homework",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description: "Do the thing",
              customLabel: "Part-Level Override",
              sortOrder: 0,
            },
            {
              type: "JOURNAL_PROMPT",
              prompts: ["Write about it"],
              sortOrder: 1,
            },
            {
              type: "BRING_TO_SESSION",
              description: "Bring your notes",
              sortOrder: 2,
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "NONE",
        },
      });

    expect(createRes.status).toBe(201);
    partId = createRes.body.data.id;

    // 3. Create an enrollment for the participant
    const enrollment = await testPrisma.enrollment.create({
      data: {
        participantId: TEST_IDS.participantProfileId,
        programId: TEST_IDS.programId,
        status: "ACTIVE",
      },
    });
    enrollmentId = enrollment.id;

    // 4. Create a homework instance for today
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const instance = await testPrisma.homeworkInstance.create({
      data: {
        partId,
        enrollmentId,
        dueDate: today,
        status: "PENDING",
      },
    });
    instanceId = instance.id;
  });

  afterAll(async () => {
    // Clean up in correct FK order
    await testPrisma.homeworkInstance
      .delete({ where: { id: instanceId } })
      .catch(() => {});
    await testPrisma.enrollment
      .delete({ where: { id: enrollmentId } })
      .catch(() => {});
    await testPrisma.part.delete({ where: { id: partId } }).catch(() => {});
    await testPrisma.clinicianConfig
      .delete({ where: { clinicianId: TEST_IDS.clinicianProfileId } })
      .catch(() => {});
  });

  it("returns displayLabels map with correct label resolution hierarchy", async () => {
    const res = await request(app)
      .get("/api/participant/homework-instances")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const instance = res.body.data.find((i: any) => i.id === instanceId);
    expect(instance).toBeDefined();
    expect(instance.displayLabels).toBeDefined();

    // Item 0 (ACTION, sortOrder=0): has customLabel "Part-Level Override" -> should use it
    expect(instance.displayLabels["0"]).toBe("Part-Level Override");

    // Item 1 (JOURNAL_PROMPT, sortOrder=1): no customLabel -> clinician default "Clinician Journal"
    expect(instance.displayLabels["1"]).toBe("Clinician Journal");

    // Item 2 (BRING_TO_SESSION, sortOrder=2): no customLabel -> clinician default "Clinician Bring"
    expect(instance.displayLabels["2"]).toBe("Clinician Bring");
  });

  it("includes part content in the homework instance response", async () => {
    const res = await request(app)
      .get("/api/participant/homework-instances")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    const instance = res.body.data.find((i: any) => i.id === instanceId);
    expect(instance).toBeDefined();
    expect(instance.part).toBeDefined();
    expect(instance.part.title).toBe("Display Label Test Homework");
    expect(instance.part.content.items).toHaveLength(3);
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get(
      "/api/participant/homework-instances"
    );

    expect(res.status).toBe(401);
  });
});
