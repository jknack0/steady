import { describe, it, expect } from "vitest";
import {
  ReminderSettingsSchema,
  UpdateReminderSettingsSchema,
  ParticipantCancelAppointmentSchema,
  ParticipantInvoiceListQuerySchema,
  DEFAULT_REMINDER_SETTINGS,
  ReminderTypeEnum,
  ReminderStatusEnum,
} from "../schemas/reminder";

describe("ReminderTypeEnum", () => {
  it("accepts valid types", () => {
    expect(ReminderTypeEnum.parse("EMAIL")).toBe("EMAIL");
    expect(ReminderTypeEnum.parse("PUSH")).toBe("PUSH");
    expect(ReminderTypeEnum.parse("SMS")).toBe("SMS");
  });

  it("rejects invalid type", () => {
    expect(() => ReminderTypeEnum.parse("PHONE")).toThrow();
  });
});

describe("ReminderStatusEnum", () => {
  it("accepts valid statuses", () => {
    expect(ReminderStatusEnum.parse("PENDING")).toBe("PENDING");
    expect(ReminderStatusEnum.parse("SENT")).toBe("SENT");
    expect(ReminderStatusEnum.parse("FAILED")).toBe("FAILED");
    expect(ReminderStatusEnum.parse("CANCELED")).toBe("CANCELED");
  });

  it("rejects invalid status", () => {
    expect(() => ReminderStatusEnum.parse("EXPIRED")).toThrow();
  });
});

describe("ReminderSettingsSchema", () => {
  it("accepts valid settings", () => {
    const result = ReminderSettingsSchema.parse({
      enableReminders: true,
      reminderTimes: [1440, 60],
    });
    expect(result.enableReminders).toBe(true);
    expect(result.reminderTimes).toEqual([1440, 60]);
  });

  it("accepts single reminder time", () => {
    const result = ReminderSettingsSchema.parse({
      enableReminders: true,
      reminderTimes: [30],
    });
    expect(result.reminderTimes).toEqual([30]);
  });

  it("accepts max 5 reminder times", () => {
    const result = ReminderSettingsSchema.parse({
      enableReminders: true,
      reminderTimes: [60, 120, 240, 480, 1440],
    });
    expect(result.reminderTimes).toHaveLength(5);
  });

  it("rejects empty reminderTimes", () => {
    expect(() =>
      ReminderSettingsSchema.parse({
        enableReminders: true,
        reminderTimes: [],
      })
    ).toThrow();
  });

  it("rejects more than 5 reminder times", () => {
    expect(() =>
      ReminderSettingsSchema.parse({
        enableReminders: true,
        reminderTimes: [5, 10, 30, 60, 120, 240],
      })
    ).toThrow();
  });

  it("rejects reminder time below 5 minutes", () => {
    expect(() =>
      ReminderSettingsSchema.parse({
        enableReminders: true,
        reminderTimes: [3],
      })
    ).toThrow();
  });

  it("rejects reminder time above 10080 minutes", () => {
    expect(() =>
      ReminderSettingsSchema.parse({
        enableReminders: true,
        reminderTimes: [20000],
      })
    ).toThrow();
  });

  it("rejects missing enableReminders", () => {
    expect(() =>
      ReminderSettingsSchema.parse({
        reminderTimes: [60],
      })
    ).toThrow();
  });

  it("rejects non-integer reminder times", () => {
    expect(() =>
      ReminderSettingsSchema.parse({
        enableReminders: true,
        reminderTimes: [60.5],
      })
    ).toThrow();
  });
});

describe("DEFAULT_REMINDER_SETTINGS", () => {
  it("parses through the schema without changes", () => {
    const result = ReminderSettingsSchema.parse(DEFAULT_REMINDER_SETTINGS);
    expect(result).toEqual(DEFAULT_REMINDER_SETTINGS);
  });
});

describe("ParticipantCancelAppointmentSchema", () => {
  it("accepts empty object", () => {
    const result = ParticipantCancelAppointmentSchema.parse({});
    expect(result.cancelReason).toBeUndefined();
  });

  it("accepts cancelReason", () => {
    const result = ParticipantCancelAppointmentSchema.parse({
      cancelReason: "Schedule conflict",
    });
    expect(result.cancelReason).toBe("Schedule conflict");
  });

  it("rejects cancelReason over 500 chars", () => {
    expect(() =>
      ParticipantCancelAppointmentSchema.parse({
        cancelReason: "x".repeat(501),
      })
    ).toThrow();
  });
});

describe("ParticipantInvoiceListQuerySchema", () => {
  it("accepts empty object with defaults", () => {
    const result = ParticipantInvoiceListQuerySchema.parse({});
    expect(result.limit).toBe(50);
    expect(result.cursor).toBeUndefined();
  });

  it("accepts cursor and limit", () => {
    const result = ParticipantInvoiceListQuerySchema.parse({
      cursor: "inv-5",
      limit: "25",
    });
    expect(result.cursor).toBe("inv-5");
    expect(result.limit).toBe(25);
  });

  it("caps limit at 100", () => {
    expect(() =>
      ParticipantInvoiceListQuerySchema.parse({ limit: "200" })
    ).toThrow();
  });

  it("rejects limit below 1", () => {
    expect(() =>
      ParticipantInvoiceListQuerySchema.parse({ limit: "0" })
    ).toThrow();
  });
});
