import { describe, it, expect } from "vitest";
import { HomeworkItemSchema } from "../schemas/part";
import { SaveHomeworkLabelsSchema, HomeworkItemTypeEnum } from "../schemas/config";

describe("HomeworkItemSchema customLabel field", () => {
  const baseAction = {
    type: "ACTION",
    description: "Do something",
    subSteps: [],
    addToSteadySystem: false,
    dueDateOffsetDays: null,
    sortOrder: 0,
  };

  it("accepts item without customLabel", () => {
    const result = HomeworkItemSchema.safeParse(baseAction);
    expect(result.success).toBe(true);
  });

  it("accepts item with valid customLabel", () => {
    const result = HomeworkItemSchema.safeParse({ ...baseAction, customLabel: "My Action" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customLabel).toBe("My Action");
    }
  });

  it("trims whitespace from customLabel", () => {
    const result = HomeworkItemSchema.safeParse({ ...baseAction, customLabel: "  Trimmed  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customLabel).toBe("Trimmed");
    }
  });

  it("rejects empty-after-trim customLabel", () => {
    const result = HomeworkItemSchema.safeParse({ ...baseAction, customLabel: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects customLabel exceeding 50 characters", () => {
    const result = HomeworkItemSchema.safeParse({ ...baseAction, customLabel: "A".repeat(51) });
    expect(result.success).toBe(false);
  });

  it("accepts customLabel at exactly 50 characters", () => {
    const result = HomeworkItemSchema.safeParse({ ...baseAction, customLabel: "A".repeat(50) });
    expect(result.success).toBe(true);
  });

  // Test customLabel on other item types
  it("accepts customLabel on JOURNAL_PROMPT item", () => {
    const result = HomeworkItemSchema.safeParse({
      type: "JOURNAL_PROMPT",
      prompts: ["How was your day?"],
      spaceSizeHint: "medium",
      sortOrder: 0,
      customLabel: "Daily Reflection",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customLabel).toBe("Daily Reflection");
    }
  });

  it("accepts customLabel on TIMER item", () => {
    const result = HomeworkItemSchema.safeParse({
      type: "TIMER",
      description: "Breathe",
      durationSeconds: 300,
      sortOrder: 0,
      customLabel: "Breathing Exercise",
    });
    expect(result.success).toBe(true);
  });
});

describe("HomeworkItemTypeEnum", () => {
  it("accepts all 11 homework item types", () => {
    const types = [
      "ACTION", "RESOURCE_REVIEW", "JOURNAL_PROMPT", "BRING_TO_SESSION",
      "FREE_TEXT_NOTE", "CHOICE", "WORKSHEET", "RATING_SCALE",
      "TIMER", "MOOD_CHECK", "HABIT_TRACKER",
    ];
    for (const type of types) {
      expect(HomeworkItemTypeEnum.safeParse(type).success).toBe(true);
    }
  });

  it("rejects invalid type", () => {
    expect(HomeworkItemTypeEnum.safeParse("INVALID").success).toBe(false);
  });
});

describe("SaveHomeworkLabelsSchema", () => {
  it("accepts valid homework labels map", () => {
    const result = SaveHomeworkLabelsSchema.safeParse({
      homeworkLabels: { ACTION: "To-Do", TIMER: "Focus Timer" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty homework labels map", () => {
    const result = SaveHomeworkLabelsSchema.safeParse({
      homeworkLabels: {},
    });
    expect(result.success).toBe(true);
  });

  it("rejects label exceeding 50 characters", () => {
    const result = SaveHomeworkLabelsSchema.safeParse({
      homeworkLabels: { ACTION: "A".repeat(51) },
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty label (after trim)", () => {
    const result = SaveHomeworkLabelsSchema.safeParse({
      homeworkLabels: { ACTION: "   " },
    });
    expect(result.success).toBe(false);
  });

  it("trims label values", () => {
    const result = SaveHomeworkLabelsSchema.safeParse({
      homeworkLabels: { ACTION: "  My Label  " },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.homeworkLabels.ACTION).toBe("My Label");
    }
  });

  it("rejects invalid homework item type keys", () => {
    const result = SaveHomeworkLabelsSchema.safeParse({
      homeworkLabels: { INVALID_TYPE: "Label" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing homeworkLabels field", () => {
    const result = SaveHomeworkLabelsSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
