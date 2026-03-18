import { describe, it, expect } from "vitest";
import {
  CreateModuleSchema,
  UpdateModuleSchema,
  ReorderModulesSchema,
} from "../schemas/module";

describe("CreateModuleSchema", () => {
  it("accepts valid input with only title", () => {
    const result = CreateModuleSchema.safeParse({ title: "Module 1" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Module 1");
      expect(result.data.unlockRule).toBe("SEQUENTIAL"); // default
    }
  });

  it("accepts all optional fields", () => {
    const result = CreateModuleSchema.safeParse({
      title: "Full Module",
      subtitle: "A subtitle",
      summary: "Summary text",
      estimatedMinutes: 30,
      unlockRule: "TIME_BASED",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = CreateModuleSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing title", () => {
    const result = CreateModuleSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid unlockRule", () => {
    const result = CreateModuleSchema.safeParse({
      title: "Test",
      unlockRule: "AUTO",
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero estimatedMinutes", () => {
    const result = CreateModuleSchema.safeParse({
      title: "Test",
      estimatedMinutes: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative estimatedMinutes", () => {
    const result = CreateModuleSchema.safeParse({
      title: "Test",
      estimatedMinutes: -5,
    });
    expect(result.success).toBe(false);
  });
});

describe("UpdateModuleSchema", () => {
  it("accepts empty object", () => {
    const result = UpdateModuleSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial updates", () => {
    const result = UpdateModuleSchema.safeParse({
      title: "New Title",
      estimatedMinutes: 45,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = UpdateModuleSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });
});

describe("ReorderModulesSchema", () => {
  it("accepts array of IDs", () => {
    const result = ReorderModulesSchema.safeParse({
      moduleIds: ["id-1", "id-2", "id-3"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty array", () => {
    const result = ReorderModulesSchema.safeParse({ moduleIds: [] });
    expect(result.success).toBe(false);
  });

  it("rejects missing moduleIds", () => {
    const result = ReorderModulesSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
