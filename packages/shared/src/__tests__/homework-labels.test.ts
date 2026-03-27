import { describe, it, expect } from "vitest";
import {
  HOMEWORK_TYPE_SYSTEM_LABELS,
  resolveHomeworkItemLabel,
} from "../constants/homework-labels";

describe("HOMEWORK_TYPE_SYSTEM_LABELS", () => {
  it("contains all 11 homework item types", () => {
    const expectedTypes = [
      "ACTION",
      "RESOURCE_REVIEW",
      "JOURNAL_PROMPT",
      "BRING_TO_SESSION",
      "FREE_TEXT_NOTE",
      "CHOICE",
      "WORKSHEET",
      "RATING_SCALE",
      "TIMER",
      "MOOD_CHECK",
      "HABIT_TRACKER",
    ];

    for (const type of expectedTypes) {
      expect(HOMEWORK_TYPE_SYSTEM_LABELS).toHaveProperty(type);
      expect(typeof HOMEWORK_TYPE_SYSTEM_LABELS[type as keyof typeof HOMEWORK_TYPE_SYSTEM_LABELS]).toBe("string");
    }
  });

  it("has non-empty labels for all types", () => {
    for (const [, label] of Object.entries(HOMEWORK_TYPE_SYSTEM_LABELS)) {
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

describe("resolveHomeworkItemLabel", () => {
  it("returns system default when no overrides provided", () => {
    const label = resolveHomeworkItemLabel("ACTION");
    expect(label).toBe(HOMEWORK_TYPE_SYSTEM_LABELS.ACTION);
  });

  it("returns system default when both overrides are undefined", () => {
    const label = resolveHomeworkItemLabel("JOURNAL_PROMPT", undefined, undefined);
    expect(label).toBe(HOMEWORK_TYPE_SYSTEM_LABELS.JOURNAL_PROMPT);
  });

  it("returns clinician default when provided and no item custom label", () => {
    const clinicianDefaults = { ACTION: "To-Do" };
    const label = resolveHomeworkItemLabel("ACTION", undefined, clinicianDefaults);
    expect(label).toBe("To-Do");
  });

  it("returns item custom label over clinician default", () => {
    const clinicianDefaults = { ACTION: "To-Do" };
    const label = resolveHomeworkItemLabel("ACTION", "My Custom Action", clinicianDefaults);
    expect(label).toBe("My Custom Action");
  });

  it("returns item custom label over system default (no clinician defaults)", () => {
    const label = resolveHomeworkItemLabel("TIMER", "Meditation Timer");
    expect(label).toBe("Meditation Timer");
  });

  it("falls through clinician defaults to system default when type not in clinician map", () => {
    const clinicianDefaults = { ACTION: "To-Do" };
    const label = resolveHomeworkItemLabel("TIMER", undefined, clinicianDefaults);
    expect(label).toBe(HOMEWORK_TYPE_SYSTEM_LABELS.TIMER);
  });

  it("returns item custom label even when clinician has no default for that type", () => {
    const clinicianDefaults = { ACTION: "To-Do" };
    const label = resolveHomeworkItemLabel("TIMER", "Focus Timer", clinicianDefaults);
    expect(label).toBe("Focus Timer");
  });

  it("handles empty clinician defaults object", () => {
    const label = resolveHomeworkItemLabel("MOOD_CHECK", undefined, {});
    expect(label).toBe(HOMEWORK_TYPE_SYSTEM_LABELS.MOOD_CHECK);
  });
});
