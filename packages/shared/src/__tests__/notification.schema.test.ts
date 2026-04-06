import { describe, it, expect } from "vitest";
import { DismissNotificationSchema, EngageNotificationSchema, NotificationCategoryEnum } from "../schemas/notification-escalation";

describe("NotificationCategoryEnum", () => {
  it("accepts all 5 valid categories", () => {
    const valid = ["MORNING_CHECKIN", "HOMEWORK", "SESSION", "TASK", "WEEKLY_REVIEW"];
    for (const cat of valid) {
      expect(NotificationCategoryEnum.parse(cat)).toBe(cat);
    }
  });

  it("rejects invalid category", () => {
    expect(() => NotificationCategoryEnum.parse("FAKE")).toThrow();
  });
});

describe("DismissNotificationSchema", () => {
  it("parses valid dismiss body", () => {
    const result = DismissNotificationSchema.parse({ category: "HOMEWORK" });
    expect(result.category).toBe("HOMEWORK");
  });

  it("rejects invalid category", () => {
    expect(() => DismissNotificationSchema.parse({ category: "INVALID" })).toThrow();
  });

  it("rejects missing category", () => {
    expect(() => DismissNotificationSchema.parse({})).toThrow();
  });

  it("strips extra fields", () => {
    const result = DismissNotificationSchema.parse({ category: "TASK", extra: "stuff" });
    expect((result as any).extra).toBeUndefined();
  });
});

describe("EngageNotificationSchema", () => {
  it("parses valid engage body", () => {
    const result = EngageNotificationSchema.parse({ category: "MORNING_CHECKIN" });
    expect(result.category).toBe("MORNING_CHECKIN");
  });

  it("rejects invalid category", () => {
    expect(() => EngageNotificationSchema.parse({ category: "GARBAGE" })).toThrow();
  });

  it("rejects missing category", () => {
    expect(() => EngageNotificationSchema.parse({})).toThrow();
  });

  it("strips extra fields", () => {
    const result = EngageNotificationSchema.parse({ category: "SESSION", foo: "bar" });
    expect((result as any).foo).toBeUndefined();
  });
});
