import { describe, it, expect } from "vitest";
import { CreateProgramSchema, UpdateProgramSchema } from "../schemas/program";

describe("CreateProgramSchema", () => {
  it("accepts valid input with only title", () => {
    const result = CreateProgramSchema.safeParse({ title: "My Program" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("My Program");
      expect(result.data.cadence).toBe("WEEKLY"); // default
      expect(result.data.enrollmentMethod).toBe("INVITE"); // default
      expect(result.data.sessionType).toBe("ONE_ON_ONE"); // default
    }
  });

  it("accepts valid input with all fields", () => {
    const result = CreateProgramSchema.safeParse({
      title: "Full Program",
      description: "A description",
      cadence: "BIWEEKLY",
      enrollmentMethod: "CODE",
      sessionType: "GROUP",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cadence).toBe("BIWEEKLY");
      expect(result.data.enrollmentMethod).toBe("CODE");
      expect(result.data.sessionType).toBe("GROUP");
    }
  });

  it("rejects empty title", () => {
    const result = CreateProgramSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing title", () => {
    const result = CreateProgramSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects title exceeding max length", () => {
    const result = CreateProgramSchema.safeParse({ title: "x".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejects invalid cadence", () => {
    const result = CreateProgramSchema.safeParse({
      title: "Test",
      cadence: "MONTHLY",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid enrollment method", () => {
    const result = CreateProgramSchema.safeParse({
      title: "Test",
      enrollmentMethod: "OPEN",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid session type", () => {
    const result = CreateProgramSchema.safeParse({
      title: "Test",
      sessionType: "HYBRID",
    });
    expect(result.success).toBe(false);
  });

  it("rejects description exceeding max length", () => {
    const result = CreateProgramSchema.safeParse({
      title: "Test",
      description: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

describe("UpdateProgramSchema", () => {
  it("accepts empty object (no changes)", () => {
    const result = UpdateProgramSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial updates", () => {
    const result = UpdateProgramSchema.safeParse({
      title: "Updated Title",
      status: "PUBLISHED",
    });
    expect(result.success).toBe(true);
  });

  it("accepts followUpCount", () => {
    const result = UpdateProgramSchema.safeParse({ followUpCount: 3 });
    expect(result.success).toBe(true);
  });

  it("rejects negative followUpCount", () => {
    const result = UpdateProgramSchema.safeParse({ followUpCount: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = UpdateProgramSchema.safeParse({ status: "DELETED" });
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = UpdateProgramSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });
});
