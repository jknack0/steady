import { describe, it, expect } from "vitest";
import {
  PartContentSchema,
  CreatePartSchema,
  UpdatePartSchema,
  ReorderPartsSchema,
  HomeworkItemSchema,
  HomeworkItemResponseSchema,
  HomeworkResponseSchema,
  SaveHomeworkResponseSchema,
} from "../schemas/part";

describe("PartContentSchema — TEXT", () => {
  it("accepts valid text content", () => {
    const result = PartContentSchema.safeParse({
      type: "TEXT",
      body: "<p>Hello world</p>",
    });
    expect(result.success).toBe(true);
  });

  it("accepts text with sections", () => {
    const result = PartContentSchema.safeParse({
      type: "TEXT",
      body: "<p>Body</p>",
      sections: ["Section 1", "Section 2"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty body", () => {
    const result = PartContentSchema.safeParse({ type: "TEXT", body: "" });
    expect(result.success).toBe(true);
  });
});

describe("PartContentSchema — VIDEO", () => {
  it("accepts valid youtube video", () => {
    const result = PartContentSchema.safeParse({
      type: "VIDEO",
      url: "https://youtube.com/watch?v=abc123",
      provider: "youtube",
    });
    expect(result.success).toBe(true);
  });

  it("accepts video with transcript", () => {
    const result = PartContentSchema.safeParse({
      type: "VIDEO",
      url: "https://vimeo.com/12345",
      provider: "vimeo",
      transcriptUrl: "https://example.com/transcript.vtt",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid provider", () => {
    const result = PartContentSchema.safeParse({
      type: "VIDEO",
      url: "https://example.com/video",
      provider: "tiktok",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid provider", () => {
    const result = PartContentSchema.safeParse({
      type: "VIDEO",
      url: "https://youtube.com/watch?v=abc",
      provider: "tiktok",
    });
    expect(result.success).toBe(false);
  });
});

describe("PartContentSchema — STRATEGY_CARDS", () => {
  it("accepts valid strategy cards", () => {
    const result = PartContentSchema.safeParse({
      type: "STRATEGY_CARDS",
      deckName: "Memory Strategies",
      cards: [
        { title: "Card 1", body: "Body 1", emoji: "🔔" },
        { title: "Card 2", body: "Body 2" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty cards array", () => {
    const result = PartContentSchema.safeParse({
      type: "STRATEGY_CARDS",
      deckName: "Empty Deck",
      cards: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid card shape", () => {
    const result = PartContentSchema.safeParse({
      type: "STRATEGY_CARDS",
      deckName: "Deck",
      cards: [{ body: "no title" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("PartContentSchema — JOURNAL_PROMPT", () => {
  it("accepts valid journal prompt", () => {
    const result = PartContentSchema.safeParse({
      type: "JOURNAL_PROMPT",
      prompts: ["How are you feeling?", "What did you learn?"],
      spaceSizeHint: "large",
    });
    expect(result.success).toBe(true);
  });

  it("applies default spaceSizeHint", () => {
    const result = PartContentSchema.safeParse({
      type: "JOURNAL_PROMPT",
      prompts: ["Question 1"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type === "JOURNAL_PROMPT" && result.data.spaceSizeHint).toBe("medium");
    }
  });

  it("rejects invalid spaceSizeHint", () => {
    const result = PartContentSchema.safeParse({
      type: "JOURNAL_PROMPT",
      prompts: ["Question"],
      spaceSizeHint: "huge",
    });
    expect(result.success).toBe(false);
  });
});

describe("PartContentSchema — CHECKLIST", () => {
  it("accepts valid checklist", () => {
    const result = PartContentSchema.safeParse({
      type: "CHECKLIST",
      items: [
        { text: "Item 1", sortOrder: 0 },
        { text: "Item 2", sortOrder: 1 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("defaults sortOrder to 0 when missing", () => {
    const result = PartContentSchema.safeParse({
      type: "CHECKLIST",
      items: [{ text: "Do this" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).items[0].sortOrder).toBe(0);
    }
  });
});

describe("PartContentSchema — RESOURCE_LINK", () => {
  it("accepts valid resource link", () => {
    const result = PartContentSchema.safeParse({
      type: "RESOURCE_LINK",
      url: "https://example.com/resource",
      description: "A helpful resource",
    });
    expect(result.success).toBe(true);
  });

  it("accepts without description", () => {
    const result = PartContentSchema.safeParse({
      type: "RESOURCE_LINK",
      url: "https://example.com/resource",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing url", () => {
    const result = PartContentSchema.safeParse({
      type: "RESOURCE_LINK",
    });
    expect(result.success).toBe(false);
  });
});

describe("PartContentSchema — DIVIDER", () => {
  it("accepts valid divider", () => {
    const result = PartContentSchema.safeParse({
      type: "DIVIDER",
      label: "Section Break",
    });
    expect(result.success).toBe(true);
  });
});

describe("PartContentSchema — HOMEWORK", () => {
  it("accepts valid homework with items", () => {
    const result = PartContentSchema.safeParse({
      type: "HOMEWORK",
      dueTimingType: "BEFORE_NEXT_SESSION",
      dueTimingValue: null,
      completionRule: "ALL",
      completionMinimum: null,
      reminderCadence: "DAILY",
      items: [
        {
          type: "ACTION",
          description: "Do this thing",
          subSteps: ["Step 1"],
          addToSteadySystem: true,
          dueDateOffsetDays: null,
          sortOrder: 0,
        },
        {
          type: "BRING_TO_SESSION",
          reminderText: "Bring your notebook",
          sortOrder: 1,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts homework with X_OF_Y completion", () => {
    const result = PartContentSchema.safeParse({
      type: "HOMEWORK",
      dueTimingType: "DAYS_AFTER_UNLOCK",
      dueTimingValue: 7,
      completionRule: "X_OF_Y",
      completionMinimum: 3,
      reminderCadence: "EVERY_OTHER_DAY",
      items: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid dueTimingType", () => {
    const result = PartContentSchema.safeParse({
      type: "HOMEWORK",
      dueTimingType: "NEVER",
      completionRule: "ALL",
      reminderCadence: "DAILY",
      items: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("HomeworkItemSchema", () => {
  it("validates ACTION item", () => {
    const result = HomeworkItemSchema.safeParse({
      type: "ACTION",
      description: "Complete worksheet",
      subSteps: [],
      addToSteadySystem: false,
      dueDateOffsetDays: null,
      sortOrder: 0,
    });
    expect(result.success).toBe(true);
  });

  it("validates RESOURCE_REVIEW item", () => {
    const result = HomeworkItemSchema.safeParse({
      type: "RESOURCE_REVIEW",
      resourceTitle: "ADHD Handbook",
      resourceType: "handout",
      resourceUrl: "https://example.com/handbook.pdf",
      sortOrder: 0,
    });
    expect(result.success).toBe(true);
  });

  it("validates JOURNAL_PROMPT item", () => {
    const result = HomeworkItemSchema.safeParse({
      type: "JOURNAL_PROMPT",
      prompts: ["Reflect on your week"],
      spaceSizeHint: "large",
      sortOrder: 0,
    });
    expect(result.success).toBe(true);
  });

  it("validates FREE_TEXT_NOTE item", () => {
    const result = HomeworkItemSchema.safeParse({
      type: "FREE_TEXT_NOTE",
      content: "<p>Some notes</p>",
      sortOrder: 0,
    });
    expect(result.success).toBe(true);
  });

  it("validates CHOICE item", () => {
    const result = HomeworkItemSchema.safeParse({
      type: "CHOICE",
      description: "Pick your strategy",
      options: [
        { label: "Option A", detail: "Detail A" },
        { label: "Option B" },
      ],
      sortOrder: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects CHOICE with less than 2 options", () => {
    const result = HomeworkItemSchema.safeParse({
      type: "CHOICE",
      description: "Pick",
      options: [{ label: "Only one" }],
      sortOrder: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects ACTION with empty description", () => {
    const result = HomeworkItemSchema.safeParse({
      type: "ACTION",
      description: "",
      sortOrder: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects RESOURCE_REVIEW with invalid resourceType", () => {
    const result = HomeworkItemSchema.safeParse({
      type: "RESOURCE_REVIEW",
      resourceTitle: "Resource",
      resourceType: "podcast",
      resourceUrl: "https://example.com",
      sortOrder: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("PartContentSchema — Phase 2 stubs", () => {
  it("accepts ASSESSMENT placeholder", () => {
    const result = PartContentSchema.safeParse({
      type: "ASSESSMENT",
      placeholder: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts INTAKE_FORM placeholder", () => {
    const result = PartContentSchema.safeParse({
      type: "INTAKE_FORM",
      placeholder: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts SMART_GOALS placeholder", () => {
    const result = PartContentSchema.safeParse({
      type: "SMART_GOALS",
      placeholder: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("CreatePartSchema", () => {
  it("accepts valid part creation", () => {
    const result = CreatePartSchema.safeParse({
      type: "TEXT",
      title: "Intro Text",
      isRequired: true,
      content: { type: "TEXT", body: "<p>Welcome</p>" },
    });
    expect(result.success).toBe(true);
  });

  it("defaults isRequired to true", () => {
    const result = CreatePartSchema.safeParse({
      type: "DIVIDER",
      title: "Break",
      content: { type: "DIVIDER", label: "Section" },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isRequired).toBe(true);
    }
  });

  it("rejects missing title", () => {
    const result = CreatePartSchema.safeParse({
      type: "TEXT",
      content: { type: "TEXT", body: "" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing content", () => {
    const result = CreatePartSchema.safeParse({
      type: "TEXT",
      title: "Title",
    });
    expect(result.success).toBe(false);
  });
});

describe("UpdatePartSchema", () => {
  it("accepts empty object", () => {
    const result = UpdatePartSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts title update only", () => {
    const result = UpdatePartSchema.safeParse({ title: "New Title" });
    expect(result.success).toBe(true);
  });

  it("accepts isRequired toggle", () => {
    const result = UpdatePartSchema.safeParse({ isRequired: false });
    expect(result.success).toBe(true);
  });

  it("accepts content update", () => {
    const result = UpdatePartSchema.safeParse({
      content: { type: "TEXT", body: "<p>Updated</p>" },
    });
    expect(result.success).toBe(true);
  });
});

describe("ReorderPartsSchema", () => {
  it("accepts valid part IDs", () => {
    const result = ReorderPartsSchema.safeParse({
      partIds: ["p1", "p2", "p3"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty array", () => {
    const result = ReorderPartsSchema.safeParse({ partIds: [] });
    expect(result.success).toBe(false);
  });
});

// ── New Homework Item Types ──────────────────────────

describe("HomeworkItemSchema — RATING_SCALE", () => {
  it("accepts valid rating scale", () => {
    const result = HomeworkItemSchema.safeParse({
      type: "RATING_SCALE",
      description: "Rate your anxiety",
      min: 1,
      max: 10,
      minLabel: "None",
      maxLabel: "Severe",
      sortOrder: 0,
    });
    expect(result.success).toBe(true);
  });

  it("applies defaults for min/max", () => {
    const result = HomeworkItemSchema.safeParse({
      type: "RATING_SCALE",
      description: "Rate it",
      sortOrder: 0,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type === "RATING_SCALE" && result.data.min).toBe(1);
      expect(result.data.type === "RATING_SCALE" && result.data.max).toBe(10);
    }
  });

  it("rejects min > 10", () => {
    const result = HomeworkItemSchema.safeParse({
      type: "RATING_SCALE",
      description: "Rate it",
      min: 11,
      max: 10,
      sortOrder: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("HomeworkItemSchema — TIMER", () => {
  it("accepts valid timer", () => {
    const result = HomeworkItemSchema.safeParse({
      type: "TIMER",
      description: "Breathing exercise",
      durationSeconds: 300,
      sortOrder: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects duration below 10", () => {
    const result = HomeworkItemSchema.safeParse({
      type: "TIMER",
      description: "Too short",
      durationSeconds: 5,
      sortOrder: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects duration above 7200", () => {
    const result = HomeworkItemSchema.safeParse({
      type: "TIMER",
      description: "Too long",
      durationSeconds: 8000,
      sortOrder: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("HomeworkItemSchema — MOOD_CHECK", () => {
  it("accepts valid mood check with defaults", () => {
    const result = HomeworkItemSchema.safeParse({
      type: "MOOD_CHECK",
      sortOrder: 0,
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === "MOOD_CHECK") {
      expect(result.data.moods.length).toBe(5);
      expect(result.data.includeNote).toBe(false);
    }
  });

  it("accepts custom moods", () => {
    const result = HomeworkItemSchema.safeParse({
      type: "MOOD_CHECK",
      description: "How do you feel?",
      moods: [
        { emoji: "\ud83d\ude0a", label: "Happy" },
        { emoji: "\ud83d\ude22", label: "Sad" },
      ],
      includeNote: true,
      sortOrder: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects fewer than 2 moods", () => {
    const result = HomeworkItemSchema.safeParse({
      type: "MOOD_CHECK",
      moods: [{ emoji: "\ud83d\ude0a", label: "Happy" }],
      sortOrder: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("HomeworkItemSchema — HABIT_TRACKER", () => {
  it("accepts valid habit tracker", () => {
    const result = HomeworkItemSchema.safeParse({
      type: "HABIT_TRACKER",
      description: "Track your medication",
      habitLabel: "Did you take your medication?",
      sortOrder: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing habitLabel", () => {
    const result = HomeworkItemSchema.safeParse({
      type: "HABIT_TRACKER",
      description: "Track it",
      sortOrder: 0,
    });
    expect(result.success).toBe(false);
  });
});

// ── Response Schemas ─────────────────────────────────

describe("HomeworkItemResponseSchema", () => {
  it("accepts ACTION response", () => {
    const result = HomeworkItemResponseSchema.safeParse({
      type: "ACTION",
      completed: true,
      subStepsDone: [true, false],
    });
    expect(result.success).toBe(true);
  });

  it("accepts JOURNAL_PROMPT response", () => {
    const result = HomeworkItemResponseSchema.safeParse({
      type: "JOURNAL_PROMPT",
      entries: ["My thoughts...", "More thoughts"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts WORKSHEET response", () => {
    const result = HomeworkItemResponseSchema.safeParse({
      type: "WORKSHEET",
      rows: [{ "Column A": "value1" }, { "Column A": "value2" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts CHOICE response", () => {
    const result = HomeworkItemResponseSchema.safeParse({
      type: "CHOICE",
      selectedIndex: 2,
    });
    expect(result.success).toBe(true);
  });

  it("accepts RESOURCE_REVIEW response", () => {
    const result = HomeworkItemResponseSchema.safeParse({
      type: "RESOURCE_REVIEW",
      reviewed: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts RATING_SCALE response", () => {
    const result = HomeworkItemResponseSchema.safeParse({
      type: "RATING_SCALE",
      value: 7,
    });
    expect(result.success).toBe(true);
  });

  it("accepts TIMER response", () => {
    const result = HomeworkItemResponseSchema.safeParse({
      type: "TIMER",
      elapsedSeconds: 300,
      completed: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts MOOD_CHECK response", () => {
    const result = HomeworkItemResponseSchema.safeParse({
      type: "MOOD_CHECK",
      mood: "Great",
      note: "Feeling fantastic",
    });
    expect(result.success).toBe(true);
  });

  it("accepts HABIT_TRACKER response", () => {
    const result = HomeworkItemResponseSchema.safeParse({
      type: "HABIT_TRACKER",
      done: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown type", () => {
    const result = HomeworkItemResponseSchema.safeParse({
      type: "UNKNOWN",
      data: "whatever",
    });
    expect(result.success).toBe(false);
  });
});

describe("HomeworkResponseSchema", () => {
  it("accepts a record of mixed responses", () => {
    const result = HomeworkResponseSchema.safeParse({
      "0": { type: "ACTION", completed: true, subStepsDone: [] },
      "1": { type: "RATING_SCALE", value: 5 },
      "2": { type: "MOOD_CHECK", mood: "Good" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid item in record", () => {
    const result = HomeworkResponseSchema.safeParse({
      "0": { type: "ACTION", completed: "not-a-bool" },
    });
    expect(result.success).toBe(false);
  });
});

describe("SaveHomeworkResponseSchema", () => {
  it("accepts valid save payload", () => {
    const result = SaveHomeworkResponseSchema.safeParse({
      responses: {
        "0": { type: "HABIT_TRACKER", done: false },
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing responses field", () => {
    const result = SaveHomeworkResponseSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
