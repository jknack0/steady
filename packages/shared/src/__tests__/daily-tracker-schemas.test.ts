import { describe, it, expect } from "vitest";
import {
  TrackerFieldTypeEnum,
  CreateTrackerFieldSchema,
  CreateDailyTrackerSchema,
  CreateTrackerFromTemplateSchema,
  UpdateDailyTrackerSchema,
  SubmitTrackerEntrySchema,
  ScaleOptionsSchema,
  MultiCheckOptionsSchema,
} from "../schemas/daily-tracker";

describe("TrackerFieldTypeEnum", () => {
  it.each(["SCALE", "NUMBER", "YES_NO", "MULTI_CHECK", "FREE_TEXT", "TIME"])(
    "accepts valid field type: %s",
    (value) => {
      const result = TrackerFieldTypeEnum.safeParse(value);
      expect(result.success).toBe(true);
    }
  );

  it("rejects invalid field type", () => {
    const result = TrackerFieldTypeEnum.safeParse("DROPDOWN");
    expect(result.success).toBe(false);
  });

  it("rejects empty string", () => {
    const result = TrackerFieldTypeEnum.safeParse("");
    expect(result.success).toBe(false);
  });
});

describe("ScaleOptionsSchema", () => {
  it("accepts valid scale options", () => {
    const result = ScaleOptionsSchema.safeParse({
      min: 1,
      max: 10,
      minLabel: "Low",
      maxLabel: "High",
    });
    expect(result.success).toBe(true);
  });

  it("accepts without labels", () => {
    const result = ScaleOptionsSchema.safeParse({ min: 0, max: 5 });
    expect(result.success).toBe(true);
  });

  it("rejects non-integer min", () => {
    const result = ScaleOptionsSchema.safeParse({ min: 1.5, max: 10 });
    expect(result.success).toBe(false);
  });

  it("rejects missing max", () => {
    const result = ScaleOptionsSchema.safeParse({ min: 1 });
    expect(result.success).toBe(false);
  });
});

describe("MultiCheckOptionsSchema", () => {
  it("accepts valid choices", () => {
    const result = MultiCheckOptionsSchema.safeParse({
      choices: ["Option A", "Option B"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty choices array", () => {
    const result = MultiCheckOptionsSchema.safeParse({ choices: [] });
    expect(result.success).toBe(false);
  });

  it("rejects missing choices", () => {
    const result = MultiCheckOptionsSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("CreateTrackerFieldSchema", () => {
  it("accepts valid field", () => {
    const result = CreateTrackerFieldSchema.safeParse({
      label: "Sleep quality",
      fieldType: "SCALE",
      sortOrder: 0,
    });
    expect(result.success).toBe(true);
  });

  it("defaults options to null", () => {
    const result = CreateTrackerFieldSchema.safeParse({
      label: "Hours slept",
      fieldType: "NUMBER",
      sortOrder: 1,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.options).toBeNull();
    }
  });

  it("defaults isRequired to true", () => {
    const result = CreateTrackerFieldSchema.safeParse({
      label: "Mood",
      fieldType: "SCALE",
      sortOrder: 0,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isRequired).toBe(true);
    }
  });

  it("accepts isRequired set to false", () => {
    const result = CreateTrackerFieldSchema.safeParse({
      label: "Notes",
      fieldType: "FREE_TEXT",
      sortOrder: 2,
      isRequired: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isRequired).toBe(false);
    }
  });

  it("rejects missing label", () => {
    const result = CreateTrackerFieldSchema.safeParse({
      fieldType: "NUMBER",
      sortOrder: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty label", () => {
    const result = CreateTrackerFieldSchema.safeParse({
      label: "",
      fieldType: "NUMBER",
      sortOrder: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects label over 200 characters", () => {
    const result = CreateTrackerFieldSchema.safeParse({
      label: "x".repeat(201),
      fieldType: "NUMBER",
      sortOrder: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid fieldType", () => {
    const result = CreateTrackerFieldSchema.safeParse({
      label: "Field",
      fieldType: "DROPDOWN",
      sortOrder: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing sortOrder", () => {
    const result = CreateTrackerFieldSchema.safeParse({
      label: "Field",
      fieldType: "SCALE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer sortOrder", () => {
    const result = CreateTrackerFieldSchema.safeParse({
      label: "Field",
      fieldType: "SCALE",
      sortOrder: 1.5,
    });
    expect(result.success).toBe(false);
  });
});

describe("CreateDailyTrackerSchema", () => {
  const validTracker = {
    name: "Daily Mood Tracker",
    fields: [
      { label: "Mood", fieldType: "SCALE", sortOrder: 0 },
    ],
  };

  it("accepts valid tracker with minimal fields", () => {
    const result = CreateDailyTrackerSchema.safeParse(validTracker);
    expect(result.success).toBe(true);
  });

  it("defaults reminderTime to 20:00", () => {
    const result = CreateDailyTrackerSchema.safeParse(validTracker);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reminderTime).toBe("20:00");
    }
  });

  it("accepts valid tracker with all optional fields", () => {
    const result = CreateDailyTrackerSchema.safeParse({
      name: "Full Tracker",
      description: "A comprehensive daily tracker",
      programId: "prog-123",
      enrollmentId: "enroll-456",
      reminderTime: "09:30",
      fields: [
        { label: "Sleep hours", fieldType: "NUMBER", sortOrder: 0 },
        { label: "Took medication?", fieldType: "YES_NO", sortOrder: 1 },
        { label: "Wake up time", fieldType: "TIME", sortOrder: 2 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = CreateDailyTrackerSchema.safeParse({
      fields: [{ label: "Mood", fieldType: "SCALE", sortOrder: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = CreateDailyTrackerSchema.safeParse({
      name: "",
      fields: [{ label: "Mood", fieldType: "SCALE", sortOrder: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects name over 200 characters", () => {
    const result = CreateDailyTrackerSchema.safeParse({
      name: "x".repeat(201),
      fields: [{ label: "Mood", fieldType: "SCALE", sortOrder: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty fields array", () => {
    const result = CreateDailyTrackerSchema.safeParse({
      name: "Empty Tracker",
      fields: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const result = CreateDailyTrackerSchema.safeParse({
      name: "No Fields Tracker",
    });
    expect(result.success).toBe(false);
  });

  it("rejects description over 1000 characters", () => {
    const result = CreateDailyTrackerSchema.safeParse({
      name: "Tracker",
      description: "x".repeat(1001),
      fields: [{ label: "Mood", fieldType: "SCALE", sortOrder: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid reminderTime format", () => {
    const result = CreateDailyTrackerSchema.safeParse({
      name: "Tracker",
      reminderTime: "9:30",
      fields: [{ label: "Mood", fieldType: "SCALE", sortOrder: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects reminderTime with letters", () => {
    const result = CreateDailyTrackerSchema.safeParse({
      name: "Tracker",
      reminderTime: "ab:cd",
      fields: [{ label: "Mood", fieldType: "SCALE", sortOrder: 0 }],
    });
    expect(result.success).toBe(false);
  });
});

describe("CreateTrackerFromTemplateSchema", () => {
  it("accepts valid template key", () => {
    const result = CreateTrackerFromTemplateSchema.safeParse({
      templateKey: "adhd-daily-core",
    });
    expect(result.success).toBe(true);
  });

  it("accepts with optional programId and enrollmentId", () => {
    const result = CreateTrackerFromTemplateSchema.safeParse({
      templateKey: "sleep-tracker",
      programId: "prog-123",
      enrollmentId: "enroll-456",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing templateKey", () => {
    const result = CreateTrackerFromTemplateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty templateKey", () => {
    const result = CreateTrackerFromTemplateSchema.safeParse({
      templateKey: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("UpdateDailyTrackerSchema", () => {
  it("accepts empty object (no updates)", () => {
    const result = UpdateDailyTrackerSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts name update only", () => {
    const result = UpdateDailyTrackerSchema.safeParse({
      name: "Updated Tracker Name",
    });
    expect(result.success).toBe(true);
  });

  it("accepts description update", () => {
    const result = UpdateDailyTrackerSchema.safeParse({
      description: "New description",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null description", () => {
    const result = UpdateDailyTrackerSchema.safeParse({
      description: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts reminderTime update", () => {
    const result = UpdateDailyTrackerSchema.safeParse({
      reminderTime: "07:00",
    });
    expect(result.success).toBe(true);
  });

  it("accepts isActive toggle", () => {
    const result = UpdateDailyTrackerSchema.safeParse({
      isActive: false,
    });
    expect(result.success).toBe(true);
  });

  it("accepts fields update", () => {
    const result = UpdateDailyTrackerSchema.safeParse({
      fields: [
        { label: "New Field", fieldType: "YES_NO", sortOrder: 0 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty fields array when provided", () => {
    const result = UpdateDailyTrackerSchema.safeParse({
      fields: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name when provided", () => {
    const result = UpdateDailyTrackerSchema.safeParse({
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid reminderTime format when provided", () => {
    const result = UpdateDailyTrackerSchema.safeParse({
      reminderTime: "7pm",
    });
    expect(result.success).toBe(false);
  });
});

describe("SubmitTrackerEntrySchema", () => {
  it("accepts valid entry", () => {
    const result = SubmitTrackerEntrySchema.safeParse({
      date: "2026-03-22",
      responses: {
        "field-1": 7,
        "field-2": true,
        "field-3": "Felt great today",
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts entry with empty responses object", () => {
    const result = SubmitTrackerEntrySchema.safeParse({
      date: "2026-01-01",
      responses: {},
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing date", () => {
    const result = SubmitTrackerEntrySchema.safeParse({
      responses: { "field-1": 5 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date format — wrong separator", () => {
    const result = SubmitTrackerEntrySchema.safeParse({
      date: "2026/03/22",
      responses: {},
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date format — incomplete", () => {
    const result = SubmitTrackerEntrySchema.safeParse({
      date: "2026-3-2",
      responses: {},
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date format — datetime string", () => {
    const result = SubmitTrackerEntrySchema.safeParse({
      date: "2026-03-22T10:00:00Z",
      responses: {},
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing responses", () => {
    const result = SubmitTrackerEntrySchema.safeParse({
      date: "2026-03-22",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-string date", () => {
    const result = SubmitTrackerEntrySchema.safeParse({
      date: 20260322,
      responses: {},
    });
    expect(result.success).toBe(false);
  });
});
