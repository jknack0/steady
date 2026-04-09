import { describe, it, expect } from "vitest";
import {
  FEELINGS_WHEEL,
  EMOTION_MAP,
  VALID_EMOTION_IDS,
  validateEmotionIds,
  getPrimaryEmotion,
  getEmotionLabel,
  getEmotionColor,
} from "../constants/feelings-wheel";

describe("FEELINGS_WHEEL taxonomy", () => {
  it("exports 7 primary emotions", () => {
    expect(FEELINGS_WHEEL).toHaveLength(7);
    const ids = FEELINGS_WHEEL.map((e) => e.id);
    expect(ids).toEqual(["happy", "sad", "angry", "fearful", "disgusted", "surprised", "bad"]);
  });

  it("every primary has an id, label, color, and children", () => {
    for (const primary of FEELINGS_WHEEL) {
      expect(primary.id).toBeTruthy();
      expect(primary.label).toBeTruthy();
      expect(primary.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(Array.isArray(primary.children)).toBe(true);
      expect(primary.children.length).toBeGreaterThan(0);
    }
  });

  it("secondary IDs use dot-path format: primary.secondary", () => {
    for (const primary of FEELINGS_WHEEL) {
      for (const secondary of primary.children) {
        expect(secondary.id).toBe(`${primary.id}.${secondary.id.split(".")[1]}`);
        expect(secondary.label).toBeTruthy();
        expect(Array.isArray(secondary.children)).toBe(true);
        expect(secondary.children.length).toBeGreaterThan(0);
      }
    }
  });

  it("tertiary IDs use dot-path format: primary.secondary.tertiary", () => {
    for (const primary of FEELINGS_WHEEL) {
      for (const secondary of primary.children) {
        for (const tertiary of secondary.children) {
          const parts = tertiary.id.split(".");
          expect(parts).toHaveLength(3);
          expect(parts[0]).toBe(primary.id);
          expect(parts[1]).toBe(secondary.id.split(".")[1]);
          expect(tertiary.label).toBeTruthy();
        }
      }
    }
  });

  it("has correct colors for each primary", () => {
    const colorMap: Record<string, string> = {
      happy: "#8FAE8B",
      sad: "#6B8DB2",
      angry: "#C75C5C",
      fearful: "#9B7DB8",
      disgusted: "#7BAB7E",
      surprised: "#E8B960",
      bad: "#8B8B8B",
    };
    for (const primary of FEELINGS_WHEEL) {
      expect(primary.color).toBe(colorMap[primary.id]);
    }
  });
});

describe("EMOTION_MAP", () => {
  it("is a Map with all emotion IDs", () => {
    expect(EMOTION_MAP).toBeInstanceOf(Map);
    // Should include primary, secondary, and tertiary
    expect(EMOTION_MAP.has("happy")).toBe(true);
    expect(EMOTION_MAP.has("happy.optimistic")).toBe(true);
    expect(EMOTION_MAP.has("happy.optimistic.hopeful")).toBe(true);
  });

  it("stores label for each entry", () => {
    const hopeful = EMOTION_MAP.get("happy.optimistic.hopeful");
    expect(hopeful).toBeDefined();
    expect(hopeful!.label).toBe("Hopeful");
  });
});

describe("VALID_EMOTION_IDS", () => {
  it("is a Set containing all emotion IDs", () => {
    expect(VALID_EMOTION_IDS).toBeInstanceOf(Set);
    expect(VALID_EMOTION_IDS.has("happy")).toBe(true);
    expect(VALID_EMOTION_IDS.has("sad.lonely.isolated")).toBe(true);
    expect(VALID_EMOTION_IDS.has("nonexistent")).toBe(false);
  });

  it("has more than 100 entries (7 primary + ~53 secondary + ~106 tertiary)", () => {
    expect(VALID_EMOTION_IDS.size).toBeGreaterThan(100);
  });
});

describe("validateEmotionIds", () => {
  it("returns true for valid IDs", () => {
    expect(validateEmotionIds(["happy", "sad.lonely", "angry.frustrated.annoyed"])).toBe(true);
  });

  it("returns true for empty array", () => {
    expect(validateEmotionIds([])).toBe(true);
  });

  it("returns false if any ID is invalid", () => {
    expect(validateEmotionIds(["happy", "nonexistent"])).toBe(false);
  });

  it("returns false for all invalid IDs", () => {
    expect(validateEmotionIds(["foo", "bar"])).toBe(false);
  });
});

describe("getPrimaryEmotion", () => {
  it("returns the primary ID for a primary emotion", () => {
    expect(getPrimaryEmotion("happy")).toBe("happy");
  });

  it("returns the primary ID for a secondary emotion", () => {
    expect(getPrimaryEmotion("sad.lonely")).toBe("sad");
  });

  it("returns the primary ID for a tertiary emotion", () => {
    expect(getPrimaryEmotion("angry.frustrated.annoyed")).toBe("angry");
  });
});

describe("getEmotionLabel", () => {
  it("returns the label for a primary emotion", () => {
    expect(getEmotionLabel("happy")).toBe("Happy");
  });

  it("returns the label for a secondary emotion", () => {
    expect(getEmotionLabel("sad.lonely")).toBe("Lonely");
  });

  it("returns the label for a tertiary emotion", () => {
    expect(getEmotionLabel("happy.optimistic.hopeful")).toBe("Hopeful");
  });

  it("returns undefined for an unknown ID", () => {
    expect(getEmotionLabel("nonexistent")).toBeUndefined();
  });
});

describe("getEmotionColor", () => {
  it("returns the primary color for a primary emotion", () => {
    expect(getEmotionColor("happy")).toBe("#8FAE8B");
  });

  it("returns the primary color for a secondary emotion", () => {
    expect(getEmotionColor("sad.lonely")).toBe("#6B8DB2");
  });

  it("returns the primary color for a tertiary emotion", () => {
    expect(getEmotionColor("angry.frustrated.annoyed")).toBe("#C75C5C");
  });

  it("returns empty string for unknown emotion", () => {
    expect(getEmotionColor("nonexistent")).toBe("");
  });
});
