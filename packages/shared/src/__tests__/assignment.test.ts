import { describe, it, expect } from "vitest";
import { AssignProgramSchema, AppendModulesSchema } from "../schemas/assignment";

describe("AssignProgramSchema", () => {
  it("accepts a valid payload with all fields", () => {
    const result = AssignProgramSchema.safeParse({
      participantId: "participant-1",
      title: "Custom Title",
      excludedModuleIds: ["mod-1"],
      excludedPartIds: ["part-1", "part-2"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.participantId).toBe("participant-1");
      expect(result.data.title).toBe("Custom Title");
      expect(result.data.excludedModuleIds).toEqual(["mod-1"]);
      expect(result.data.excludedPartIds).toEqual(["part-1", "part-2"]);
    }
  });

  it("accepts minimal payload with just participantId", () => {
    const result = AssignProgramSchema.safeParse({
      participantId: "participant-1",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.excludedModuleIds).toEqual([]);
      expect(result.data.excludedPartIds).toEqual([]);
      expect(result.data.title).toBeUndefined();
    }
  });

  it("rejects missing participantId", () => {
    const result = AssignProgramSchema.safeParse({
      excludedModuleIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty participantId", () => {
    const result = AssignProgramSchema.safeParse({
      participantId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects title over 200 characters", () => {
    const result = AssignProgramSchema.safeParse({
      participantId: "participant-1",
      title: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });
});

describe("AppendModulesSchema", () => {
  it("accepts a valid payload", () => {
    const result = AppendModulesSchema.safeParse({
      clientProgramId: "program-1",
      excludedModuleIds: ["mod-1"],
      excludedPartIds: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.clientProgramId).toBe("program-1");
    }
  });

  it("accepts minimal payload with just clientProgramId", () => {
    const result = AppendModulesSchema.safeParse({
      clientProgramId: "program-1",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.excludedModuleIds).toEqual([]);
      expect(result.data.excludedPartIds).toEqual([]);
    }
  });

  it("rejects missing clientProgramId", () => {
    const result = AppendModulesSchema.safeParse({
      excludedModuleIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty clientProgramId", () => {
    const result = AppendModulesSchema.safeParse({
      clientProgramId: "",
    });
    expect(result.success).toBe(false);
  });
});
