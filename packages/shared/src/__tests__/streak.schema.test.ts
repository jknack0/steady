import { describe, it, expect } from "vitest";
import { StreakResponseSchema, StreakCategoryEnum, StreakListResponseSchema } from "../schemas/streak";

describe("StreakCategoryEnum", () => {
  it("accepts JOURNAL", () => {
    expect(StreakCategoryEnum.parse("JOURNAL")).toBe("JOURNAL");
  });

  it("accepts CHECKIN", () => {
    expect(StreakCategoryEnum.parse("CHECKIN")).toBe("CHECKIN");
  });

  it("accepts HOMEWORK", () => {
    expect(StreakCategoryEnum.parse("HOMEWORK")).toBe("HOMEWORK");
  });

  it("rejects invalid category", () => {
    expect(() => StreakCategoryEnum.parse("INVALID")).toThrow();
  });
});

describe("StreakResponseSchema", () => {
  it("parses valid streak response", () => {
    const input = {
      category: "JOURNAL",
      currentStreak: 5,
      longestStreak: 10,
      lastActiveDate: "2026-04-04",
    };
    const result = StreakResponseSchema.parse(input);
    expect(result.category).toBe("JOURNAL");
    expect(result.currentStreak).toBe(5);
  });

  it("accepts null lastActiveDate", () => {
    const input = {
      category: "HOMEWORK",
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
    };
    const result = StreakResponseSchema.parse(input);
    expect(result.lastActiveDate).toBeNull();
  });

  it("rejects negative streak value", () => {
    const input = {
      category: "JOURNAL",
      currentStreak: -1,
      longestStreak: 0,
      lastActiveDate: null,
    };
    expect(() => StreakResponseSchema.parse(input)).toThrow();
  });

  it("rejects missing required fields", () => {
    expect(() => StreakResponseSchema.parse({ category: "JOURNAL" })).toThrow();
  });

  it("strips extra fields", () => {
    const input = {
      category: "CHECKIN",
      currentStreak: 3,
      longestStreak: 7,
      lastActiveDate: "2026-04-05",
      extraField: "should be stripped",
    };
    const result = StreakResponseSchema.parse(input);
    expect((result as any).extraField).toBeUndefined();
  });
});

describe("StreakListResponseSchema", () => {
  it("parses array of streak responses", () => {
    const input = [
      { category: "JOURNAL", currentStreak: 5, longestStreak: 10, lastActiveDate: "2026-04-04" },
      { category: "CHECKIN", currentStreak: 3, longestStreak: 7, lastActiveDate: null },
    ];
    const result = StreakListResponseSchema.parse(input);
    expect(result).toHaveLength(2);
  });
});
