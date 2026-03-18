import { describe, it, expect } from "vitest";
import { RegisterSchema, LoginSchema, RefreshTokenSchema } from "../schemas/auth";

describe("RegisterSchema", () => {
  it("accepts valid registration", () => {
    const result = RegisterSchema.safeParse({
      email: "test@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "User",
    });
    expect(result.success).toBe(true);
  });

  it("defaults role to CLINICIAN", () => {
    const result = RegisterSchema.safeParse({
      email: "test@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "User",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("CLINICIAN");
    }
  });

  it("accepts PARTICIPANT role", () => {
    const result = RegisterSchema.safeParse({
      email: "test@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "User",
      role: "PARTICIPANT",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = RegisterSchema.safeParse({
      email: "not-an-email",
      password: "password123",
      firstName: "Test",
      lastName: "User",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = RegisterSchema.safeParse({
      email: "test@example.com",
      password: "short",
      firstName: "Test",
      lastName: "User",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing firstName", () => {
    const result = RegisterSchema.safeParse({
      email: "test@example.com",
      password: "password123",
      lastName: "User",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = RegisterSchema.safeParse({
      email: "test@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "User",
      role: "ADMIN",
    });
    expect(result.success).toBe(false);
  });
});

describe("LoginSchema", () => {
  it("accepts valid login", () => {
    const result = LoginSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = LoginSchema.safeParse({
      email: "bad",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = LoginSchema.safeParse({
      email: "test@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("RefreshTokenSchema", () => {
  it("accepts valid token", () => {
    const result = RefreshTokenSchema.safeParse({ refreshToken: "some-token" });
    expect(result.success).toBe(true);
  });

  it("rejects empty token", () => {
    const result = RefreshTokenSchema.safeParse({ refreshToken: "" });
    expect(result.success).toBe(false);
  });
});
