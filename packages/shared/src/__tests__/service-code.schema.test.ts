import { describe, it, expect } from "vitest";
import { ServiceCodeResponseSchema, SERVICE_CODE_SEED } from "../schemas/service-code";

describe("SERVICE_CODE_SEED", () => {
  it("contains exactly 15 seed entries", () => {
    expect(SERVICE_CODE_SEED).toHaveLength(15);
  });

  it("has unique codes", () => {
    const codes = SERVICE_CODE_SEED.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("includes core codes", () => {
    const codes = SERVICE_CODE_SEED.map((s) => s.code);
    for (const c of ["90791", "90832", "90834", "90837", "90785"]) {
      expect(codes).toContain(c);
    }
  });
});

describe("ServiceCodeResponseSchema", () => {
  it("accepts a valid payload", () => {
    const result = ServiceCodeResponseSchema.safeParse({
      id: "sc-1",
      practiceId: "p-1",
      code: "90834",
      description: "Psychotherapy, 45 min",
      defaultDurationMinutes: 45,
      defaultPriceCents: 14000,
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts null price", () => {
    const result = ServiceCodeResponseSchema.safeParse({
      id: "sc-1",
      practiceId: "p-1",
      code: "90834",
      description: "Psychotherapy, 45 min",
      defaultDurationMinutes: 45,
      defaultPriceCents: null,
      isActive: true,
    });
    expect(result.success).toBe(true);
  });
});
