import { describe, it, expect } from "vitest";
import { applyOverrides } from "../services/enrollment-overrides";

const baseParts = [
  { id: "part-1", type: "HOMEWORK", title: "Homework 1", sortOrder: 0 },
  { id: "part-2", type: "TEXT", title: "Text Part", sortOrder: 1 },
  { id: "part-3", type: "HOMEWORK", title: "Homework 2", sortOrder: 2 },
];

describe("applyOverrides", () => {
  it("returns original parts when overrides is empty", () => {
    const result = applyOverrides([...baseParts], []);
    expect(result.parts).toEqual(baseParts);
    expect(result.clinicianNotes).toEqual([]);
  });

  it("removes parts targeted by HIDE_HOMEWORK_ITEM", () => {
    const overrides = [
      { id: "o-1", overrideType: "HIDE_HOMEWORK_ITEM", targetPartId: "part-1", payload: {} },
    ];
    const result = applyOverrides([...baseParts], overrides);
    expect(result.parts.find((p: any) => p.id === "part-1")).toBeUndefined();
    expect(result.parts).toHaveLength(2);
  });

  it("preserves all non-hidden parts with identical fields", () => {
    const overrides = [
      { id: "o-1", overrideType: "HIDE_HOMEWORK_ITEM", targetPartId: "part-1", payload: {} },
    ];
    const result = applyOverrides([...baseParts], overrides);
    const textPart = result.parts.find((p: any) => p.id === "part-2");
    expect(textPart).toEqual(baseParts[1]);
    const hwPart = result.parts.find((p: any) => p.id === "part-3");
    expect(hwPart).toEqual(baseParts[2]);
  });

  it("injects ADD_RESOURCE items with source=override", () => {
    const overrides = [
      {
        id: "o-2",
        overrideType: "ADD_RESOURCE",
        payload: { title: "Helpful Link", url: "https://example.com", description: "Read this" },
      },
    ];
    const result = applyOverrides([...baseParts], overrides);
    expect(result.parts).toHaveLength(4);
    const added = result.parts.find((p: any) => p.id === "override-o-2");
    expect(added).toBeTruthy();
    expect(added.source).toBe("override");
    expect(added.type).toBe("RESOURCE_LINK");
    expect(added.title).toBe("Helpful Link");
    expect(added.url).toBe("https://example.com");
  });

  it("appends ADD_HOMEWORK_ITEM items", () => {
    const overrides = [
      {
        id: "o-3",
        overrideType: "ADD_HOMEWORK_ITEM",
        payload: { title: "Extra Practice", itemType: "ACTION" },
      },
    ];
    const result = applyOverrides([...baseParts], overrides);
    expect(result.parts).toHaveLength(4);
    const added = result.parts.find((p: any) => p.id === "override-o-3");
    expect(added).toBeTruthy();
    expect(added.source).toBe("override");
    expect(added.type).toBe("HOMEWORK");
  });

  it("attaches CLINICIAN_NOTE items to module", () => {
    const overrides = [
      {
        id: "o-4",
        overrideType: "CLINICIAN_NOTE",
        payload: { content: "Focus on mindfulness this week." },
      },
    ];
    const result = applyOverrides([...baseParts], overrides);
    expect(result.parts).toHaveLength(3); // notes don't add to parts
    expect(result.clinicianNotes).toHaveLength(1);
    expect(result.clinicianNotes[0].content).toBe("Focus on mindfulness this week.");
    expect(result.clinicianNotes[0].source).toBe("override");
  });

  it("applies multiple override types on same module", () => {
    const overrides = [
      { id: "o-1", overrideType: "HIDE_HOMEWORK_ITEM", targetPartId: "part-1", payload: {} },
      {
        id: "o-2",
        overrideType: "ADD_RESOURCE",
        payload: { title: "Link", url: "https://example.com" },
      },
      {
        id: "o-3",
        overrideType: "ADD_HOMEWORK_ITEM",
        payload: { title: "Extra HW" },
      },
      {
        id: "o-4",
        overrideType: "CLINICIAN_NOTE",
        payload: { content: "Note" },
      },
    ];
    const result = applyOverrides([...baseParts], overrides);
    // 3 original - 1 hidden + 1 resource + 1 homework = 4
    expect(result.parts).toHaveLength(4);
    expect(result.clinicianNotes).toHaveLength(1);
    expect(result.parts.find((p: any) => p.id === "part-1")).toBeUndefined();
    expect(result.parts.filter((p: any) => p.source === "override")).toHaveLength(2);
  });

  it("marks injected items with source=override", () => {
    const overrides = [
      {
        id: "o-2",
        overrideType: "ADD_RESOURCE",
        payload: { title: "Link", url: "https://example.com" },
      },
      {
        id: "o-3",
        overrideType: "ADD_HOMEWORK_ITEM",
        payload: { title: "HW" },
      },
    ];
    const result = applyOverrides([...baseParts], overrides);
    const injected = result.parts.filter((p: any) => p.source === "override");
    expect(injected).toHaveLength(2);
    injected.forEach((item: any) => {
      expect(item.source).toBe("override");
    });
  });

  it("does not filter parts when override is removed (empty overrides)", () => {
    // Simulates: override was deleted -> now no overrides
    const result = applyOverrides([...baseParts], []);
    expect(result.parts).toHaveLength(3);
    expect(result.parts.map((p: any) => p.id)).toEqual(["part-1", "part-2", "part-3"]);
  });
});
