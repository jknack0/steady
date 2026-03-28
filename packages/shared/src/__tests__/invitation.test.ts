import { describe, it, expect } from "vitest";
import {
  CreateInvitationSchema,
  RegisterWithInviteSchema,
} from "../schemas/invitation";

describe("CreateInvitationSchema", () => {
  it("accepts valid invitation with all fields", () => {
    const result = CreateInvitationSchema.safeParse({
      patientName: "Jane Doe",
      patientEmail: "jane@example.com",
      programId: "prog_123",
      sendEmail: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.patientName).toBe("Jane Doe");
      expect(result.data.sendEmail).toBe(true);
    }
  });

  it("accepts valid invitation without optional fields", () => {
    const result = CreateInvitationSchema.safeParse({
      patientName: "Jane Doe",
      patientEmail: "jane@example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.programId).toBeUndefined();
      expect(result.data.sendEmail).toBe(false);
    }
  });

  it("rejects missing patientName", () => {
    const result = CreateInvitationSchema.safeParse({
      patientEmail: "jane@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing patientEmail", () => {
    const result = CreateInvitationSchema.safeParse({
      patientName: "Jane Doe",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = CreateInvitationSchema.safeParse({
      patientName: "Jane Doe",
      patientEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects patientName over 200 chars", () => {
    const result = CreateInvitationSchema.safeParse({
      patientName: "a".repeat(201),
      patientEmail: "jane@example.com",
    });
    expect(result.success).toBe(false);
  });
});

describe("RegisterWithInviteSchema", () => {
  it("accepts valid registration with invite code", () => {
    const result = RegisterWithInviteSchema.safeParse({
      inviteCode: "STEADY-7X2K",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      password: "securePass123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts lowercase invite code and uppercases it", () => {
    const result = RegisterWithInviteSchema.safeParse({
      inviteCode: "steady-7x2k",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      password: "securePass123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inviteCode).toBe("STEADY-7X2K");
    }
  });

  it("rejects missing code", () => {
    const result = RegisterWithInviteSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      password: "securePass123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid code format", () => {
    const result = RegisterWithInviteSchema.safeParse({
      inviteCode: "INVALID",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      password: "securePass123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password under 8 chars", () => {
    const result = RegisterWithInviteSchema.safeParse({
      inviteCode: "STEADY-7X2K",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = RegisterWithInviteSchema.safeParse({
      inviteCode: "STEADY-7X2K",
      firstName: "Jane",
      lastName: "Doe",
      email: "not-email",
      password: "securePass123",
    });
    expect(result.success).toBe(false);
  });
});
