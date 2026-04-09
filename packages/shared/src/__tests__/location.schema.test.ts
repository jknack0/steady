import { describe, it, expect } from "vitest";
import { CreateLocationSchema, UpdateLocationSchema } from "../schemas/location";

describe("CreateLocationSchema", () => {
  it("accepts a valid IN_PERSON location", () => {
    const result = CreateLocationSchema.safeParse({
      name: "Downtown Office",
      type: "IN_PERSON",
      addressLine1: "123 Main St",
      city: "Austin",
      state: "TX",
      postalCode: "78701",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a VIRTUAL location", () => {
    const result = CreateLocationSchema.safeParse({
      name: "Telehealth",
      type: "VIRTUAL",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    expect(CreateLocationSchema.safeParse({ type: "VIRTUAL" }).success).toBe(false);
  });

  it("rejects invalid type", () => {
    expect(
      CreateLocationSchema.safeParse({ name: "x", type: "HYBRID" }).success,
    ).toBe(false);
  });

  it("rejects name > 200 chars", () => {
    expect(
      CreateLocationSchema.safeParse({ name: "x".repeat(201), type: "IN_PERSON" }).success,
    ).toBe(false);
  });
});

describe("UpdateLocationSchema", () => {
  it("accepts empty patch", () => {
    expect(UpdateLocationSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update", () => {
    expect(UpdateLocationSchema.safeParse({ name: "New Name" }).success).toBe(true);
  });
});
