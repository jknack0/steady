import { describe, it, expect } from "vitest";
import {
  CreateEnrollmentSchema,
  UpdateEnrollmentSchema,
} from "../schemas/enrollment";

describe("CreateEnrollmentSchema", () => {
  it("accepts valid enrollment with email only", () => {
    const result = CreateEnrollmentSchema.safeParse({
      participantEmail: "participant@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid enrollment with all fields", () => {
    const result = CreateEnrollmentSchema.safeParse({
      participantEmail: "participant@example.com",
      firstName: "Jane",
      lastName: "Doe",
    });
    expect(result.success).toBe(true);
  });

  it("accepts with firstName only", () => {
    const result = CreateEnrollmentSchema.safeParse({
      participantEmail: "test@test.com",
      firstName: "Jane",
    });
    expect(result.success).toBe(true);
  });

  it("accepts with lastName only", () => {
    const result = CreateEnrollmentSchema.safeParse({
      participantEmail: "test@test.com",
      lastName: "Doe",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing email", () => {
    const result = CreateEnrollmentSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = CreateEnrollmentSchema.safeParse({
      participantEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty email", () => {
    const result = CreateEnrollmentSchema.safeParse({
      participantEmail: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects email without domain", () => {
    const result = CreateEnrollmentSchema.safeParse({
      participantEmail: "user@",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty firstName when provided", () => {
    const result = CreateEnrollmentSchema.safeParse({
      participantEmail: "test@example.com",
      firstName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty lastName when provided", () => {
    const result = CreateEnrollmentSchema.safeParse({
      participantEmail: "test@example.com",
      lastName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects firstName over 100 characters", () => {
    const result = CreateEnrollmentSchema.safeParse({
      participantEmail: "test@example.com",
      firstName: "x".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects lastName over 100 characters", () => {
    const result = CreateEnrollmentSchema.safeParse({
      participantEmail: "test@example.com",
      lastName: "x".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty object", () => {
    const result = CreateEnrollmentSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("UpdateEnrollmentSchema", () => {
  it.each(["ACTIVE", "PAUSED", "COMPLETED", "DROPPED"])(
    "accepts valid status: %s",
    (status) => {
      const result = UpdateEnrollmentSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  );

  it("rejects invalid status", () => {
    const result = UpdateEnrollmentSchema.safeParse({ status: "CANCELLED" });
    expect(result.success).toBe(false);
  });

  it("rejects empty status", () => {
    const result = UpdateEnrollmentSchema.safeParse({ status: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing status", () => {
    const result = UpdateEnrollmentSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects lowercase status", () => {
    const result = UpdateEnrollmentSchema.safeParse({ status: "active" });
    expect(result.success).toBe(false);
  });
});
