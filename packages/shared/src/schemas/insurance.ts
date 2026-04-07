import { z } from "zod";

// ── Enums ──────────────────────────────────────────────

export const SubscriberRelationshipEnum = z.enum(["SELF", "SPOUSE", "CHILD", "OTHER"]);
export type SubscriberRelationship = z.infer<typeof SubscriberRelationshipEnum>;

export const ClaimStatusEnum = z.enum(["DRAFT", "SUBMITTED", "ACCEPTED", "REJECTED", "DENIED", "PAID"]);
export type ClaimStatus = z.infer<typeof ClaimStatusEnum>;

// ── Insurance Upsert ───────────────────────────────────

const BaseUpsertInsurance = z.object({
  payerId: z.string().min(1).max(200),
  payerName: z.string().min(1).max(200),
  subscriberId: z.string().min(1).max(200),
  groupNumber: z.string().max(200).optional(),
  relationshipToSubscriber: SubscriberRelationshipEnum,
  policyHolderFirstName: z.string().max(200).optional(),
  policyHolderLastName: z.string().max(200).optional(),
  policyHolderDob: z.string().max(200).optional(),
  policyHolderGender: z.string().max(200).optional(),
});

export const UpsertInsuranceSchema = BaseUpsertInsurance.superRefine((data, ctx) => {
  if (data.relationshipToSubscriber !== "SELF") {
    if (!data.policyHolderFirstName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Policy holder first name is required when relationship is not SELF",
        path: ["policyHolderFirstName"],
      });
    }
    if (!data.policyHolderLastName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Policy holder last name is required when relationship is not SELF",
        path: ["policyHolderLastName"],
      });
    }
    if (!data.policyHolderDob) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Policy holder date of birth is required when relationship is not SELF",
        path: ["policyHolderDob"],
      });
    }
  }
});
export type UpsertInsuranceInput = z.infer<typeof BaseUpsertInsurance>;

// ── Create Claim ───────────────────────────────────────

export const CreateClaimSchema = z.object({
  appointmentId: z.string().min(1),
  diagnosisCodes: z.array(z.string().min(1).max(20)).min(1, "At least one diagnosis code is required").max(4),
  placeOfServiceCode: z.string().max(10).optional(),
});
export type CreateClaimInput = z.infer<typeof CreateClaimSchema>;

// ── Resubmit Claim ─────────────────────────────────────

export const ResubmitClaimSchema = z.object({
  diagnosisCodes: z.array(z.string().min(1).max(20)).min(1).max(4).optional(),
  serviceCode: z.string().max(20).optional(),
});
export type ResubmitClaimInput = z.infer<typeof ResubmitClaimSchema>;

// ── List Claims Query ──────────────────────────────────

export const ListClaimsQuerySchema = z.object({
  status: ClaimStatusEnum.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListClaimsQuery = z.infer<typeof ListClaimsQuerySchema>;

// ── Stedi Config ───────────────────────────────────────

export const StediApiKeySchema = z.object({
  apiKey: z.string().min(1, "API key is required").max(500),
});
export type StediApiKeyInput = z.infer<typeof StediApiKeySchema>;

// ── Eligibility ────────────────────────────────────────

export const CheckEligibilitySchema = z.object({
  serviceCode: z.string().max(20).optional(),
});
export type CheckEligibilityInput = z.infer<typeof CheckEligibilitySchema>;

// ── Diagnosis Code Search ──────────────────────────────

export const DiagnosisCodeSearchSchema = z.object({
  q: z.string().min(2).max(200),
  participantId: z.string().optional(),
});
export type DiagnosisCodeSearchInput = z.infer<typeof DiagnosisCodeSearchSchema>;

// ── Payer Search ───────────────────────────────────────

export const PayerSearchSchema = z.object({
  q: z.string().min(2).max(200),
});
export type PayerSearchInput = z.infer<typeof PayerSearchSchema>;
