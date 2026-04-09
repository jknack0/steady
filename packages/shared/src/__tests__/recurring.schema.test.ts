import { describe, it, expect } from "vitest";
import {
  RecurrenceRuleEnum,
  CreateSeriesSchema,
  UpdateSeriesSchema,
  ListSeriesQuerySchema,
} from "../schemas/recurring";

describe("RecurrenceRuleEnum", () => {
  it("accepts valid rules", () => {
    expect(RecurrenceRuleEnum.parse("WEEKLY")).toBe("WEEKLY");
    expect(RecurrenceRuleEnum.parse("BIWEEKLY")).toBe("BIWEEKLY");
    expect(RecurrenceRuleEnum.parse("MONTHLY")).toBe("MONTHLY");
  });

  it("rejects invalid rules", () => {
    expect(() => RecurrenceRuleEnum.parse("DAILY")).toThrow();
    expect(() => RecurrenceRuleEnum.parse("")).toThrow();
  });
});

describe("CreateSeriesSchema", () => {
  const validInput = {
    participantId: "pp-1",
    serviceCodeId: "sc-1",
    locationId: "loc-1",
    recurrenceRule: "WEEKLY",
    dayOfWeek: 2,
    startTime: "14:00",
    endTime: "14:45",
    seriesStartDate: "2026-05-01T00:00:00.000Z",
  };

  it("accepts valid input", () => {
    const result = CreateSeriesSchema.parse(validInput);
    expect(result.recurrenceRule).toBe("WEEKLY");
    expect(result.dayOfWeek).toBe(2);
    expect(result.startTime).toBe("14:00");
    expect(result.endTime).toBe("14:45");
    expect(result.appointmentType).toBe("INDIVIDUAL"); // default
  });

  it("accepts input with optional fields", () => {
    const result = CreateSeriesSchema.parse({
      ...validInput,
      seriesEndDate: "2026-12-31T00:00:00.000Z",
      appointmentType: "COUPLE",
      internalNote: "Weekly CBT session",
    });
    expect(result.seriesEndDate).toBe("2026-12-31T00:00:00.000Z");
    expect(result.appointmentType).toBe("COUPLE");
    expect(result.internalNote).toBe("Weekly CBT session");
  });

  it("rejects invalid recurrenceRule", () => {
    expect(() =>
      CreateSeriesSchema.parse({ ...validInput, recurrenceRule: "DAILY" }),
    ).toThrow();
  });

  it("rejects dayOfWeek out of range", () => {
    expect(() =>
      CreateSeriesSchema.parse({ ...validInput, dayOfWeek: 7 }),
    ).toThrow();
    expect(() =>
      CreateSeriesSchema.parse({ ...validInput, dayOfWeek: -1 }),
    ).toThrow();
  });

  it("rejects invalid time format", () => {
    expect(() =>
      CreateSeriesSchema.parse({ ...validInput, startTime: "2pm" }),
    ).toThrow();
    expect(() =>
      CreateSeriesSchema.parse({ ...validInput, startTime: "25:00" }),
    ).toThrow();
    expect(() =>
      CreateSeriesSchema.parse({ ...validInput, endTime: "14:60" }),
    ).toThrow();
  });

  it("rejects endTime <= startTime", () => {
    expect(() =>
      CreateSeriesSchema.parse({ ...validInput, endTime: "13:00" }),
    ).toThrow();
    expect(() =>
      CreateSeriesSchema.parse({ ...validInput, endTime: "14:00" }),
    ).toThrow();
  });

  it("rejects GROUP appointment type", () => {
    expect(() =>
      CreateSeriesSchema.parse({ ...validInput, appointmentType: "GROUP" }),
    ).toThrow();
  });

  it("rejects internalNote over 500 chars", () => {
    expect(() =>
      CreateSeriesSchema.parse({ ...validInput, internalNote: "x".repeat(501) }),
    ).toThrow();
  });

  it("rejects missing required fields", () => {
    expect(() => CreateSeriesSchema.parse({})).toThrow();
    expect(() =>
      CreateSeriesSchema.parse({ ...validInput, participantId: undefined }),
    ).toThrow();
  });
});

describe("UpdateSeriesSchema", () => {
  it("accepts partial updates", () => {
    const result = UpdateSeriesSchema.parse({ startTime: "15:00" });
    expect(result.startTime).toBe("15:00");
  });

  it("accepts empty object", () => {
    const result = UpdateSeriesSchema.parse({});
    expect(result).toEqual({});
  });

  it("rejects invalid values", () => {
    expect(() => UpdateSeriesSchema.parse({ dayOfWeek: 8 })).toThrow();
    expect(() =>
      UpdateSeriesSchema.parse({ startTime: "bad" }),
    ).toThrow();
  });

  it("rejects endTime <= startTime when both provided", () => {
    expect(() =>
      UpdateSeriesSchema.parse({ startTime: "15:00", endTime: "14:00" }),
    ).toThrow();
  });

  it("allows nullable seriesEndDate", () => {
    const result = UpdateSeriesSchema.parse({ seriesEndDate: null });
    expect(result.seriesEndDate).toBeNull();
  });
});

describe("ListSeriesQuerySchema", () => {
  it("accepts valid query", () => {
    const result = ListSeriesQuerySchema.parse({
      participantId: "pp-1",
      isActive: "true",
      limit: "50",
    });
    expect(result.participantId).toBe("pp-1");
    expect(result.isActive).toBe(true);
    expect(result.limit).toBe(50);
  });

  it("accepts empty query", () => {
    const result = ListSeriesQuerySchema.parse({});
    expect(result).toEqual({});
  });

  it("coerces limit to number", () => {
    const result = ListSeriesQuerySchema.parse({ limit: "25" });
    expect(result.limit).toBe(25);
  });

  it("transforms isActive string to boolean", () => {
    expect(ListSeriesQuerySchema.parse({ isActive: "true" }).isActive).toBe(true);
    expect(ListSeriesQuerySchema.parse({ isActive: "false" }).isActive).toBe(false);
  });
});
