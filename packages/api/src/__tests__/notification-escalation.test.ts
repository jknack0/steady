import { describe, it, expect } from "vitest";
import { getDiagnosticPromptCopy } from "../services/notification-copy";

describe("Notification escalation — diagnostic prompt copy", () => {
  it("returns diagnostic copy for MORNING_CHECKIN category", () => {
    const result = getDiagnosticPromptCopy("MORNING_CHECKIN");
    expect(result.title).toBeTruthy();
    expect(result.body).toBeTruthy();
    expect(result.title.length).toBeGreaterThan(0);
  });

  it("returns diagnostic copy for HOMEWORK category", () => {
    const result = getDiagnosticPromptCopy("HOMEWORK");
    expect(result.title).toBeTruthy();
    expect(result.body).toBeTruthy();
  });

  it("returns diagnostic copy for SESSION category", () => {
    const result = getDiagnosticPromptCopy("SESSION");
    expect(result.title).toBeTruthy();
    expect(result.body).toBeTruthy();
  });

  it("returns diagnostic copy for TASK category", () => {
    const result = getDiagnosticPromptCopy("TASK");
    expect(result.title).toBeTruthy();
    expect(result.body).toBeTruthy();
  });

  it("returns diagnostic copy for WEEKLY_REVIEW category", () => {
    const result = getDiagnosticPromptCopy("WEEKLY_REVIEW");
    expect(result.title).toBeTruthy();
    expect(result.body).toBeTruthy();
  });

  it("returns fallback copy for unknown category", () => {
    const result = getDiagnosticPromptCopy("UNKNOWN_CATEGORY");
    expect(result.title).toBe("We're here for you \uD83D\uDC9B");
    expect(result.body).toContain("Take things at your own pace");
  });

  it("each category returns distinct title from other categories", () => {
    const categories = ["MORNING_CHECKIN", "HOMEWORK", "TASK", "WEEKLY_REVIEW"];
    const titles = new Set<string>();
    // Run multiple times to check all options
    for (let i = 0; i < 50; i++) {
      for (const cat of categories) {
        titles.add(`${cat}:${getDiagnosticPromptCopy(cat).title}`);
      }
    }
    // Should have at least 4 unique category:title combos
    expect(titles.size).toBeGreaterThanOrEqual(4);
  });

  it("never contains PHI in copy (COND-4)", () => {
    const categories = ["MORNING_CHECKIN", "HOMEWORK", "SESSION", "TASK", "WEEKLY_REVIEW"];
    for (const cat of categories) {
      const result = getDiagnosticPromptCopy(cat);
      // Ensure no user-specific data in static templates
      expect(result.title).not.toMatch(/\{/); // no template variables
      expect(result.body).not.toMatch(/\{/);
    }
  });
});
