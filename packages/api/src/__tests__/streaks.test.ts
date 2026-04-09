import { describe, it, expect } from "vitest";
import { calculateStreak } from "../services/streaks";

describe("calculateStreak — core algorithm", () => {
  const today = "2026-04-05";

  it("returns 0 for empty activity dates", () => {
    const result = calculateStreak([], today);
    expect(result.currentStreak).toBe(0);
    expect(result.lastActiveDate).toBeNull();
  });

  it("returns 1 for single active day (today)", () => {
    const result = calculateStreak(["2026-04-05"], today);
    expect(result.currentStreak).toBe(1);
    expect(result.lastActiveDate).toBe("2026-04-05");
  });

  it("counts 5 consecutive days", () => {
    const dates = ["2026-04-01", "2026-04-02", "2026-04-03", "2026-04-04", "2026-04-05"];
    const result = calculateStreak(dates, today);
    expect(result.currentStreak).toBe(5);
    expect(result.gapDaysUsed).toBe(0);
  });

  it("applies gap-day forgiveness for 1 missed day within 7-day window", () => {
    // Active: 1,2,3, skip 4, 5
    const dates = ["2026-04-01", "2026-04-02", "2026-04-03", "2026-04-05"];
    const result = calculateStreak(dates, today);
    expect(result.currentStreak).toBe(5);
    expect(result.gapDaysUsed).toBe(1);
  });

  it("resets streak when 2 days missed in same 7-day window", () => {
    // Active: 1,2, skip 3, skip 4, 5
    const dates = ["2026-04-01", "2026-04-02", "2026-04-05"];
    const result = calculateStreak(dates, today);
    // Day 5 active (streak=1). Day 4 gap — peek at day 3, but day 3 not active -> can't forgive -> streak=1
    expect(result.currentStreak).toBe(1);
  });

  it("resets gapDaysUsed allowance at day 8 of streak", () => {
    // 14-day streak with one gap in each 7-day window
    const dates = [
      "2026-03-23", "2026-03-24", "2026-03-25", "2026-03-26", "2026-03-27", "2026-03-28",
      // skip 29
      "2026-03-30", "2026-03-31", "2026-04-01", "2026-04-02", "2026-04-03", "2026-04-04",
      // skip Apr 4 not needed, it's there
      "2026-04-05",
    ];
    const result = calculateStreak(dates, today);
    // Should be 14 days (13 active + 1 gap in first window)
    expect(result.currentStreak).toBe(14);
  });

  it("updates longestStreak when current exceeds existing", () => {
    const dates = ["2026-04-03", "2026-04-04", "2026-04-05"];
    const result = calculateStreak(dates, today, 2);
    expect(result.longestStreak).toBe(3);
  });

  it("preserves longestStreak when current is less", () => {
    const dates = ["2026-04-05"];
    const result = calculateStreak(dates, today, 10);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(10);
  });

  it("same-day only counts as streak of 1", () => {
    const result = calculateStreak(["2026-04-05"], today);
    expect(result.currentStreak).toBe(1);
  });

  it("returns streak 0 if last active was 2+ days ago with no forgiveness available", () => {
    const dates = ["2026-04-02"];
    const result = calculateStreak(dates, today);
    // today (5) not active, forgive -> 4 not active either -> broken
    expect(result.currentStreak).toBe(0);
  });

  it("handles unsorted dates correctly", () => {
    const dates = ["2026-04-03", "2026-04-05", "2026-04-04"];
    const result = calculateStreak(dates, today);
    expect(result.currentStreak).toBe(3);
  });

  it("streak breaks if today is not active and yesterday is not active (even with forgiveness)", () => {
    // Last active was 3 days ago, with no activity in between
    const dates = ["2026-04-02", "2026-04-01"];
    const result = calculateStreak(dates, today);
    // today (5) not active -> forgive (gap=1), day 4 not active -> can't forgive again -> streak = 0
    expect(result.currentStreak).toBe(0);
  });
});
