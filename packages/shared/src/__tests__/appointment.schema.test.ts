import { describe, it, expect } from "vitest";
import {
  CreateAppointmentSchema,
  UpdateAppointmentSchema,
  StatusChangeSchema,
  ListAppointmentsQuerySchema,
} from "../schemas/appointment";

const validCreate = {
  participantId: "pp-1",
  serviceCodeId: "sc-1",
  locationId: "loc-1",
  startAt: "2026-05-01T14:00:00Z",
  endAt: "2026-05-01T15:00:00Z",
};

describe("CreateAppointmentSchema", () => {
  it("accepts a valid payload", () => {
    const result = CreateAppointmentSchema.safeParse(validCreate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.appointmentType).toBe("INDIVIDUAL");
    }
  });

  it("rejects missing required fields", () => {
    const result = CreateAppointmentSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects endAt <= startAt", () => {
    const result = CreateAppointmentSchema.safeParse({
      ...validCreate,
      endAt: validCreate.startAt,
    });
    expect(result.success).toBe(false);
  });

  it("rejects GROUP appointment type", () => {
    const result = CreateAppointmentSchema.safeParse({
      ...validCreate,
      appointmentType: "GROUP",
    });
    expect(result.success).toBe(false);
  });

  it("strips unknown fields", () => {
    const result = CreateAppointmentSchema.safeParse({
      ...validCreate,
      practiceId: "leaked",
      bogus: "field",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).practiceId).toBeUndefined();
      expect((result.data as any).bogus).toBeUndefined();
    }
  });

  it("rejects internalNote > 500 chars", () => {
    const result = CreateAppointmentSchema.safeParse({
      ...validCreate,
      internalNote: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe("UpdateAppointmentSchema", () => {
  it("accepts an empty patch", () => {
    expect(UpdateAppointmentSchema.safeParse({}).success).toBe(true);
  });

  it("rejects endAt before startAt when both supplied", () => {
    const result = UpdateAppointmentSchema.safeParse({
      startAt: "2026-05-01T15:00:00Z",
      endAt: "2026-05-01T14:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("strips immutable fields", () => {
    const result = UpdateAppointmentSchema.safeParse({
      participantId: "pp-other",
      createdById: "user-other",
      statusChangedAt: "2026-05-01T00:00:00Z",
      internalNote: "ok",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).participantId).toBeUndefined();
      expect((result.data as any).createdById).toBeUndefined();
      expect((result.data as any).statusChangedAt).toBeUndefined();
    }
  });
});

describe("StatusChangeSchema", () => {
  it("accepts SCHEDULED", () => {
    expect(StatusChangeSchema.safeParse({ status: "SCHEDULED" }).success).toBe(true);
  });

  it("rejects invalid status", () => {
    expect(StatusChangeSchema.safeParse({ status: "BOGUS" }).success).toBe(false);
  });

  it("accepts cancelReason up to 500 chars", () => {
    expect(
      StatusChangeSchema.safeParse({
        status: "CLIENT_CANCELED",
        cancelReason: "x".repeat(500),
      }).success,
    ).toBe(true);
  });

  it("rejects cancelReason > 500", () => {
    expect(
      StatusChangeSchema.safeParse({
        status: "CLIENT_CANCELED",
        cancelReason: "x".repeat(501),
      }).success,
    ).toBe(false);
  });
});

describe("ListAppointmentsQuerySchema", () => {
  it("accepts a valid range", () => {
    const result = ListAppointmentsQuerySchema.safeParse({
      startAt: "2026-05-01T00:00:00Z",
      endAt: "2026-05-08T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing range", () => {
    expect(
      ListAppointmentsQuerySchema.safeParse({ startAt: "2026-05-01T00:00:00Z" }).success,
    ).toBe(false);
  });

  it("rejects range > 62 days", () => {
    const result = ListAppointmentsQuerySchema.safeParse({
      startAt: "2026-01-01T00:00:00Z",
      endAt: "2026-04-01T00:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("accepts exactly 62 days", () => {
    const result = ListAppointmentsQuerySchema.safeParse({
      startAt: "2026-01-01T00:00:00Z",
      endAt: "2026-03-04T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });
});
