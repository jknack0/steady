import { describe, it, expect } from "vitest";
import {
  UpsertInsuranceSchema,
  CreateClaimSchema,
  ClaimStatusEnum,
  ListClaimsQuerySchema,
} from "../schemas/insurance";

// ── UpsertInsuranceSchema ───────────────────────────

describe("UpsertInsuranceSchema", () => {
  it("accepts valid payload with relationship=SELF (no policyHolder fields)", () => {
    const result = UpsertInsuranceSchema.safeParse({
      payerId: "PAYER001",
      payerName: "Aetna",
      subscriberId: "SUB123",
      relationshipToSubscriber: "SELF",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.payerId).toBe("PAYER001");
      expect(result.data.payerName).toBe("Aetna");
      expect(result.data.subscriberId).toBe("SUB123");
      expect(result.data.relationshipToSubscriber).toBe("SELF");
    }
  });

  it("accepts valid payload with optional groupNumber", () => {
    const result = UpsertInsuranceSchema.safeParse({
      payerId: "PAYER001",
      payerName: "Aetna",
      subscriberId: "SUB123",
      groupNumber: "GRP456",
      relationshipToSubscriber: "SELF",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.groupNumber).toBe("GRP456");
    }
  });

  it("accepts valid payload with relationship=SPOUSE and policyHolder fields", () => {
    const result = UpsertInsuranceSchema.safeParse({
      payerId: "PAYER001",
      payerName: "Aetna",
      subscriberId: "SUB123",
      relationshipToSubscriber: "SPOUSE",
      policyHolderFirstName: "John",
      policyHolderLastName: "Doe",
      policyHolderDob: "1980-01-15",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.relationshipToSubscriber).toBe("SPOUSE");
      expect(result.data.policyHolderFirstName).toBe("John");
      expect(result.data.policyHolderLastName).toBe("Doe");
      expect(result.data.policyHolderDob).toBe("1980-01-15");
    }
  });

  it("accepts valid payload with relationship=CHILD and policyHolder fields", () => {
    const result = UpsertInsuranceSchema.safeParse({
      payerId: "PAYER001",
      payerName: "Blue Cross",
      subscriberId: "SUB789",
      relationshipToSubscriber: "CHILD",
      policyHolderFirstName: "Mary",
      policyHolderLastName: "Smith",
      policyHolderDob: "1975-06-20",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid payload with relationship=OTHER and policyHolder fields", () => {
    const result = UpsertInsuranceSchema.safeParse({
      payerId: "PAYER001",
      payerName: "United",
      subscriberId: "SUB555",
      relationshipToSubscriber: "OTHER",
      policyHolderFirstName: "Pat",
      policyHolderLastName: "Jones",
      policyHolderDob: "1990-12-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing payerId", () => {
    const result = UpsertInsuranceSchema.safeParse({
      payerName: "Aetna",
      subscriberId: "SUB123",
      relationshipToSubscriber: "SELF",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing payerName", () => {
    const result = UpsertInsuranceSchema.safeParse({
      payerId: "PAYER001",
      subscriberId: "SUB123",
      relationshipToSubscriber: "SELF",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing subscriberId", () => {
    const result = UpsertInsuranceSchema.safeParse({
      payerId: "PAYER001",
      payerName: "Aetna",
      relationshipToSubscriber: "SELF",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing relationshipToSubscriber", () => {
    const result = UpsertInsuranceSchema.safeParse({
      payerId: "PAYER001",
      payerName: "Aetna",
      subscriberId: "SUB123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid relationshipToSubscriber value", () => {
    const result = UpsertInsuranceSchema.safeParse({
      payerId: "PAYER001",
      payerName: "Aetna",
      subscriberId: "SUB123",
      relationshipToSubscriber: "COUSIN",
    });
    expect(result.success).toBe(false);
  });

  it("rejects relationship=SPOUSE without policyHolder fields", () => {
    const result = UpsertInsuranceSchema.safeParse({
      payerId: "PAYER001",
      payerName: "Aetna",
      subscriberId: "SUB123",
      relationshipToSubscriber: "SPOUSE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects relationship=CHILD without policyHolderFirstName", () => {
    const result = UpsertInsuranceSchema.safeParse({
      payerId: "PAYER001",
      payerName: "Aetna",
      subscriberId: "SUB123",
      relationshipToSubscriber: "CHILD",
      policyHolderLastName: "Doe",
      policyHolderDob: "1980-01-15",
    });
    expect(result.success).toBe(false);
  });

  it("rejects relationship=SPOUSE without policyHolderLastName", () => {
    const result = UpsertInsuranceSchema.safeParse({
      payerId: "PAYER001",
      payerName: "Aetna",
      subscriberId: "SUB123",
      relationshipToSubscriber: "SPOUSE",
      policyHolderFirstName: "John",
      policyHolderDob: "1980-01-15",
    });
    expect(result.success).toBe(false);
  });

  it("rejects relationship=SPOUSE without policyHolderDob", () => {
    const result = UpsertInsuranceSchema.safeParse({
      payerId: "PAYER001",
      payerName: "Aetna",
      subscriberId: "SUB123",
      relationshipToSubscriber: "SPOUSE",
      policyHolderFirstName: "John",
      policyHolderLastName: "Doe",
    });
    expect(result.success).toBe(false);
  });

  it("rejects payerName over 200 chars", () => {
    const result = UpsertInsuranceSchema.safeParse({
      payerId: "PAYER001",
      payerName: "a".repeat(201),
      subscriberId: "SUB123",
      relationshipToSubscriber: "SELF",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty payerId", () => {
    const result = UpsertInsuranceSchema.safeParse({
      payerId: "",
      payerName: "Aetna",
      subscriberId: "SUB123",
      relationshipToSubscriber: "SELF",
    });
    expect(result.success).toBe(false);
  });
});

// ── CreateClaimSchema ───────────────────────────────

describe("CreateClaimSchema", () => {
  it("accepts valid payload with appointmentId and diagnosisCodes", () => {
    const result = CreateClaimSchema.safeParse({
      appointmentId: "appt-1",
      diagnosisCodes: ["F90.0"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.appointmentId).toBe("appt-1");
      expect(result.data.diagnosisCodes).toEqual(["F90.0"]);
    }
  });

  it("accepts multiple diagnosis codes", () => {
    const result = CreateClaimSchema.safeParse({
      appointmentId: "appt-1",
      diagnosisCodes: ["F90.0", "F90.1", "F90.2"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.diagnosisCodes).toHaveLength(3);
    }
  });

  it("accepts optional placeOfServiceCode", () => {
    const result = CreateClaimSchema.safeParse({
      appointmentId: "appt-1",
      diagnosisCodes: ["F90.0"],
      placeOfServiceCode: "11",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.placeOfServiceCode).toBe("11");
    }
  });

  it("rejects missing appointmentId", () => {
    const result = CreateClaimSchema.safeParse({
      diagnosisCodes: ["F90.0"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing diagnosisCodes", () => {
    const result = CreateClaimSchema.safeParse({
      appointmentId: "appt-1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty diagnosisCodes array", () => {
    const result = CreateClaimSchema.safeParse({
      appointmentId: "appt-1",
      diagnosisCodes: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty string in diagnosisCodes", () => {
    const result = CreateClaimSchema.safeParse({
      appointmentId: "appt-1",
      diagnosisCodes: [""],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty appointmentId", () => {
    const result = CreateClaimSchema.safeParse({
      appointmentId: "",
      diagnosisCodes: ["F90.0"],
    });
    expect(result.success).toBe(false);
  });
});

// ── ClaimStatusEnum ─────────────────────────────────

describe("ClaimStatusEnum", () => {
  it.each(["DRAFT", "SUBMITTED", "ACCEPTED", "REJECTED", "PAID", "DENIED"])(
    "accepts valid claim status: %s",
    (value) => {
      const result = ClaimStatusEnum.safeParse(value);
      expect(result.success).toBe(true);
    }
  );

  it("rejects invalid status", () => {
    const result = ClaimStatusEnum.safeParse("PENDING");
    expect(result.success).toBe(false);
  });

  it("rejects empty string", () => {
    const result = ClaimStatusEnum.safeParse("");
    expect(result.success).toBe(false);
  });

  it("rejects lowercase status", () => {
    const result = ClaimStatusEnum.safeParse("draft");
    expect(result.success).toBe(false);
  });
});

// ── ListClaimsQuerySchema ───────────────────────────

describe("ListClaimsQuerySchema", () => {
  it("accepts empty query (all optional)", () => {
    const result = ListClaimsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts status filter", () => {
    const result = ListClaimsQuerySchema.safeParse({ status: "SUBMITTED" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("SUBMITTED");
    }
  });

  it("accepts cursor for pagination", () => {
    const result = ListClaimsQuerySchema.safeParse({ cursor: "claim-50" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cursor).toBe("claim-50");
    }
  });

  it("accepts limit for pagination", () => {
    const result = ListClaimsQuerySchema.safeParse({ limit: "25" });
    expect(result.success).toBe(true);
  });

  it("accepts all filters combined", () => {
    const result = ListClaimsQuerySchema.safeParse({
      status: "PAID",
      cursor: "claim-100",
      limit: "10",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status filter", () => {
    const result = ListClaimsQuerySchema.safeParse({ status: "UNKNOWN" });
    expect(result.success).toBe(false);
  });
});
