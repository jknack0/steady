import { describe, it, expect } from "vitest";
import { CreateOverrideSchema, OverrideTypeEnum } from "../schemas/enrollment-override";

describe("OverrideTypeEnum", () => {
  it("accepts valid types", () => {
    expect(OverrideTypeEnum.parse("HIDE_HOMEWORK_ITEM")).toBe("HIDE_HOMEWORK_ITEM");
    expect(OverrideTypeEnum.parse("ADD_HOMEWORK_ITEM")).toBe("ADD_HOMEWORK_ITEM");
    expect(OverrideTypeEnum.parse("ADD_RESOURCE")).toBe("ADD_RESOURCE");
    expect(OverrideTypeEnum.parse("CLINICIAN_NOTE")).toBe("CLINICIAN_NOTE");
  });

  it("rejects invalid type", () => {
    expect(() => OverrideTypeEnum.parse("INVALID")).toThrow();
  });
});

describe("CreateOverrideSchema", () => {
  it("parses HIDE_HOMEWORK_ITEM with targetPartId", () => {
    const result = CreateOverrideSchema.parse({
      overrideType: "HIDE_HOMEWORK_ITEM",
      targetPartId: "part-123",
      payload: {},
    });
    expect(result.overrideType).toBe("HIDE_HOMEWORK_ITEM");
    expect(result.targetPartId).toBe("part-123");
  });

  it("rejects HIDE without targetPartId", () => {
    expect(() =>
      CreateOverrideSchema.parse({
        overrideType: "HIDE_HOMEWORK_ITEM",
        payload: {},
      }),
    ).toThrow(/targetPartId required/);
  });

  it("parses ADD_RESOURCE with moduleId + payload", () => {
    const result = CreateOverrideSchema.parse({
      overrideType: "ADD_RESOURCE",
      moduleId: "mod-1",
      payload: { title: "Link", url: "https://example.com", description: "Desc" },
    });
    expect(result.overrideType).toBe("ADD_RESOURCE");
    expect(result.payload.title).toBe("Link");
    expect(result.payload.url).toBe("https://example.com");
  });

  it("rejects ADD_RESOURCE without moduleId", () => {
    expect(() =>
      CreateOverrideSchema.parse({
        overrideType: "ADD_RESOURCE",
        payload: { title: "Link", url: "https://example.com" },
      }),
    ).toThrow(/moduleId required/);
  });

  it("rejects ADD_RESOURCE without title", () => {
    expect(() =>
      CreateOverrideSchema.parse({
        overrideType: "ADD_RESOURCE",
        moduleId: "mod-1",
        payload: { url: "https://example.com" },
      }),
    ).toThrow(/title required/);
  });

  it("rejects ADD_RESOURCE without url", () => {
    expect(() =>
      CreateOverrideSchema.parse({
        overrideType: "ADD_RESOURCE",
        moduleId: "mod-1",
        payload: { title: "Link" },
      }),
    ).toThrow(/url required/);
  });

  it("parses CLINICIAN_NOTE with content", () => {
    const result = CreateOverrideSchema.parse({
      overrideType: "CLINICIAN_NOTE",
      moduleId: "mod-1",
      payload: { content: "A note for the participant." },
    });
    expect(result.payload.content).toBe("A note for the participant.");
  });

  it("rejects CLINICIAN_NOTE without content", () => {
    expect(() =>
      CreateOverrideSchema.parse({
        overrideType: "CLINICIAN_NOTE",
        moduleId: "mod-1",
        payload: {},
      }),
    ).toThrow(/content required/);
  });

  it("parses ADD_HOMEWORK_ITEM with title", () => {
    const result = CreateOverrideSchema.parse({
      overrideType: "ADD_HOMEWORK_ITEM",
      moduleId: "mod-1",
      payload: { title: "Extra work", itemType: "ACTION" },
    });
    expect(result.payload.title).toBe("Extra work");
  });

  it("rejects ADD_HOMEWORK_ITEM without title", () => {
    expect(() =>
      CreateOverrideSchema.parse({
        overrideType: "ADD_HOMEWORK_ITEM",
        moduleId: "mod-1",
        payload: { itemType: "ACTION" },
      }),
    ).toThrow(/title required/);
  });

  it("rejects invalid overrideType", () => {
    expect(() =>
      CreateOverrideSchema.parse({
        overrideType: "UNKNOWN",
        payload: {},
      }),
    ).toThrow();
  });

  it("strips unknown fields from payload", () => {
    const result = CreateOverrideSchema.parse({
      overrideType: "CLINICIAN_NOTE",
      moduleId: "mod-1",
      payload: { content: "Note", secretField: "should be stripped" },
    });
    expect((result.payload as any).secretField).toBeUndefined();
  });

  it("rejects content >5000 chars for CLINICIAN_NOTE", () => {
    expect(() =>
      CreateOverrideSchema.parse({
        overrideType: "CLINICIAN_NOTE",
        moduleId: "mod-1",
        payload: { content: "x".repeat(5001) },
      }),
    ).toThrow();
  });
});
