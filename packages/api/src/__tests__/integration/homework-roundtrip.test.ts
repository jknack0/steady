import request from "supertest";
import app from "../../app";
import { testPrisma, TEST_IDS, clinicianAuthHeader } from "./setup";

const PARTS_URL = `/api/programs/${TEST_IDS.programId}/modules/${TEST_IDS.moduleId}/parts`;

// ── Real production data shapes ────────────────────

/** Exact shape seen in production DB audit — minimal fields, no sortOrder, no customLabel */
const PROD_HOMEWORK_CONTENT = {
  type: "HOMEWORK",
  items: [
    { type: "ACTION", description: "Do something" },
    { type: "BRING_TO_SESSION", description: "Bring stuff" },
    {
      type: "JOURNAL_PROMPT",
      prompts: ["Reflect on..."],
      spaceSizeHint: "medium",
    },
  ],
  dueTimingType: "BEFORE_NEXT_SESSION",
  completionRule: "MAJORITY",
  reminderCadence: "NONE",
};

/** Content with all optional fields present */
const FULL_HOMEWORK_CONTENT = {
  type: "HOMEWORK",
  items: [
    {
      type: "ACTION",
      description: "Complete daily check-in",
      subSteps: ["Step 1", "Step 2"],
      addToSteadySystem: true,
      dueDateOffsetDays: 3,
      sortOrder: 0,
      customLabel: "Daily Check-In",
    },
    {
      type: "BRING_TO_SESSION",
      description: "Bring your journal",
      reminderText: "Don't forget!",
      sortOrder: 1,
    },
    {
      type: "JOURNAL_PROMPT",
      prompts: ["What went well?", "What was hard?"],
      spaceSizeHint: "large",
      sortOrder: 2,
      customLabel: "Reflection",
    },
    {
      type: "FREE_TEXT_NOTE",
      content: "Remember to breathe.",
      sortOrder: 3,
    },
    {
      type: "CHOICE",
      description: "How are you feeling?",
      options: [
        { label: "Great" },
        { label: "Okay" },
        { label: "Struggling" },
      ],
      sortOrder: 4,
    },
  ],
  dueTimingType: "BEFORE_NEXT_SESSION",
  dueTimingValue: null,
  completionRule: "ALL",
  completionMinimum: null,
  reminderCadence: "DAILY",
  recurrence: "NONE",
  recurrenceDays: [],
  recurrenceEndDate: null,
};

// ── Helpers ─────────────────────────────────────────

let createdPartIds: string[] = [];

afterEach(async () => {
  // Clean up parts created during tests
  if (createdPartIds.length > 0) {
    await testPrisma.part.deleteMany({
      where: { id: { in: createdPartIds } },
    });
    createdPartIds = [];
  }
});

// ── Tests ───────────────────────────────────────────

describe("Homework Part Round-Trip (integration)", () => {
  it("creates homework with MAJORITY completionRule and NONE reminderCadence", async () => {
    const res = await request(app)
      .post(PARTS_URL)
      .set(...clinicianAuthHeader())
      .send({
        type: "HOMEWORK",
        title: "Test Homework MAJORITY",
        content: PROD_HOMEWORK_CONTENT,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.content.completionRule).toBe("MAJORITY");
    expect(res.body.data.content.reminderCadence).toBe("NONE");
    createdPartIds.push(res.body.data.id);
  });

  it("creates homework with BRING_TO_SESSION using description (not reminderText)", async () => {
    const res = await request(app)
      .post(PARTS_URL)
      .set(...clinicianAuthHeader())
      .send({
        type: "HOMEWORK",
        title: "Test BRING_TO_SESSION",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "BRING_TO_SESSION", description: "Bring your planner" },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "NONE",
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const item = res.body.data.content.items[0];
    expect(item.type).toBe("BRING_TO_SESSION");
    expect(item.description).toBe("Bring your planner");
    createdPartIds.push(res.body.data.id);
  });

  it("creates homework with items missing sortOrder — defaults applied", async () => {
    const res = await request(app)
      .post(PARTS_URL)
      .set(...clinicianAuthHeader())
      .send({
        type: "HOMEWORK",
        title: "No sortOrder Test",
        content: PROD_HOMEWORK_CONTENT,
      });

    expect(res.status).toBe(201);
    // Verify defaults were applied by Zod
    for (const item of res.body.data.content.items) {
      expect(typeof item.sortOrder).toBe("number");
    }
    createdPartIds.push(res.body.data.id);
  });

  it("updates homework part, adds customLabel, and reads it back", async () => {
    // Create
    const createRes = await request(app)
      .post(PARTS_URL)
      .set(...clinicianAuthHeader())
      .send({
        type: "HOMEWORK",
        title: "Custom Label Round-Trip",
        content: PROD_HOMEWORK_CONTENT,
      });
    expect(createRes.status).toBe(201);
    const partId = createRes.body.data.id;
    createdPartIds.push(partId);

    // Update: add customLabel to first item
    const updatedContent = {
      ...PROD_HOMEWORK_CONTENT,
      items: [
        { ...PROD_HOMEWORK_CONTENT.items[0], customLabel: "My Custom Action" },
        ...PROD_HOMEWORK_CONTENT.items.slice(1),
      ],
    };

    const updateRes = await request(app)
      .put(`${PARTS_URL}/${partId}`)
      .set(...clinicianAuthHeader())
      .send({ content: updatedContent });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.content.items[0].customLabel).toBe(
      "My Custom Action"
    );

    // Read back via GET
    const listRes = await request(app)
      .get(PARTS_URL)
      .set(...clinicianAuthHeader());

    expect(listRes.status).toBe(200);
    const readPart = listRes.body.data.find((p: any) => p.id === partId);
    expect(readPart).toBeDefined();
    expect(readPart.content.items[0].customLabel).toBe("My Custom Action");
  });

  it("updates homework part — all original fields survive the round-trip", async () => {
    // Create with full content
    const createRes = await request(app)
      .post(PARTS_URL)
      .set(...clinicianAuthHeader())
      .send({
        type: "HOMEWORK",
        title: "Full Round-Trip",
        content: FULL_HOMEWORK_CONTENT,
      });
    expect(createRes.status).toBe(201);
    const partId = createRes.body.data.id;
    createdPartIds.push(partId);

    // Update title only (content should persist unchanged)
    const updateRes = await request(app)
      .put(`${PARTS_URL}/${partId}`)
      .set(...clinicianAuthHeader())
      .send({ title: "Full Round-Trip Updated" });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.title).toBe("Full Round-Trip Updated");

    // Now update content with the same data to simulate a save
    const updateContentRes = await request(app)
      .put(`${PARTS_URL}/${partId}`)
      .set(...clinicianAuthHeader())
      .send({ content: FULL_HOMEWORK_CONTENT });

    expect(updateContentRes.status).toBe(200);
    const returnedContent = updateContentRes.body.data.content;

    // Verify all fields survived
    expect(returnedContent.completionRule).toBe("ALL");
    expect(returnedContent.reminderCadence).toBe("DAILY");
    expect(returnedContent.recurrence).toBe("NONE");
    expect(returnedContent.items).toHaveLength(5);

    // Check first item's fields
    const actionItem = returnedContent.items[0];
    expect(actionItem.description).toBe("Complete daily check-in");
    expect(actionItem.subSteps).toEqual(["Step 1", "Step 2"]);
    expect(actionItem.addToSteadySystem).toBe(true);
    expect(actionItem.dueDateOffsetDays).toBe(3);
    expect(actionItem.customLabel).toBe("Daily Check-In");

    // Check BRING_TO_SESSION has both description and reminderText
    const bringItem = returnedContent.items[1];
    expect(bringItem.type).toBe("BRING_TO_SESSION");
    expect(bringItem.description).toBe("Bring your journal");
    expect(bringItem.reminderText).toBe("Don't forget!");

    // Check CHOICE options
    const choiceItem = returnedContent.items[4];
    expect(choiceItem.type).toBe("CHOICE");
    expect(choiceItem.options).toHaveLength(3);
  });

  it("saves the exact production bug-report payload successfully", async () => {
    // This is the exact payload from the bug report — items with no sortOrder,
    // no customLabel, no subSteps, description on BRING_TO_SESSION, MAJORITY rule
    const bugReportPayload = {
      type: "HOMEWORK",
      title: "Bug Report Homework",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Do something" },
          { type: "BRING_TO_SESSION", description: "Bring stuff" },
          {
            type: "JOURNAL_PROMPT",
            prompts: ["Reflect on..."],
            spaceSizeHint: "medium",
          },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "MAJORITY",
        reminderCadence: "NONE",
      },
    };

    const res = await request(app)
      .post(PARTS_URL)
      .set(...clinicianAuthHeader())
      .send(bugReportPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    createdPartIds.push(res.body.data.id);

    // Verify the data was persisted correctly
    const readRes = await request(app)
      .get(PARTS_URL)
      .set(...clinicianAuthHeader());
    expect(readRes.status).toBe(200);

    const savedPart = readRes.body.data.find(
      (p: any) => p.id === res.body.data.id
    );
    expect(savedPart).toBeDefined();
    expect(savedPart.content.completionRule).toBe("MAJORITY");
    expect(savedPart.content.reminderCadence).toBe("NONE");
    expect(savedPart.content.items).toHaveLength(3);

    // Zod defaults should have been applied
    for (const item of savedPart.content.items) {
      expect(typeof item.sortOrder).toBe("number");
    }
  });

  it("rejects homework with mismatched content type", async () => {
    const res = await request(app)
      .post(PARTS_URL)
      .set(...clinicianAuthHeader())
      .send({
        type: "HOMEWORK",
        title: "Mismatch Test",
        content: { type: "TEXT", body: "<p>Not homework</p>" },
      });

    expect(res.status).toBe(400);
  });
});
