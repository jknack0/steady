import { z } from "zod";

// ── Enums ──────────────────────────────────────────

export const MonitoringTypeEnum = z.enum(["CBT", "MSK", "RESPIRATORY"]);

export const RtmActivityTypeEnum = z.enum([
  "DATA_REVIEW",
  "PROGRAM_ADJUSTMENT",
  "OUTCOME_ANALYSIS",
  "INTERACTIVE_COMMUNICATION",
  "OTHER",
]);

export const RtmEnrollmentStatusEnum = z.enum(["ACTIVE", "PAUSED", "ENDED"]);

export const BillingPeriodStatusEnum = z.enum([
  "ACTIVE",
  "THRESHOLD_MET",
  "BILLED",
  "EXPIRED",
]);

// ── Create RTM Enrollment ──────────────────────────

export const CreateRtmEnrollmentSchema = z.object({
  enrollmentId: z.string().optional(),
  clientId: z.string(),
  monitoringType: MonitoringTypeEnum.default("CBT"),
  diagnosisCodes: z.array(z.string().max(10)).min(1).max(20),
  payerName: z.string().min(1).max(200),
  subscriberId: z.string().min(1).max(200),
  groupNumber: z.string().max(200).optional(),
  startDate: z.string(),
});

// ── Log RTM Time ───────────────────────────────────

export const LogRtmTimeSchema = z.object({
  billingPeriodId: z.string().optional(),
  rtmEnrollmentId: z.string().optional(),
  activityType: RtmActivityTypeEnum,
  durationMinutes: z.number().int().min(1).max(480),
  description: z.string().max(2000).default("Monitoring time"),
  activityDate: z.string().optional(),
  isInteractiveCommunication: z.boolean().default(false),
});

// ── Update RTM Enrollment ──────────────────────────

export const UpdateRtmEnrollmentSchema = z.object({
  status: RtmEnrollmentStatusEnum.optional(),
  endDate: z.string().optional(),
  consentSignedAt: z.string().optional(),
});

// ── Update Billing Period ──────────────────────────

export const UpdateBillingPeriodSchema = z.object({
  status: BillingPeriodStatusEnum.optional(),
  notes: z.string().max(2000).optional(),
});

// ── Save Billing Profile ───────────────────────────

export const SaveBillingProfileSchema = z.object({
  providerName: z.string().min(1).max(200),
  credentials: z.string().min(1).max(50),
  npiNumber: z.string().regex(/^\d{10}$/, "NPI must be 10 digits"),
  taxId: z.string().regex(/^\d{9}$/, "Tax ID must be 9 digits"),
  practiceName: z.string().min(1).max(200),
  practiceAddress: z.string().min(1).max(500),
  practiceCity: z.string().min(1).max(200),
  practiceState: z.string().min(1).max(2),
  practiceZip: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code"),
  practicePhone: z.string().min(1).max(20),
  licenseNumber: z.string().min(1).max(100),
  licenseState: z.string().min(1).max(2),
  placeOfServiceCode: z.string().max(2).default("02"),
});

// ── RTM Consent ────────────────────────────────────

export const RtmConsentSchema = z.object({
  rtmEnrollmentId: z.string(),
  consentGiven: z.boolean().refine((val) => val === true, "Consent must be given"),
  signatureName: z.string().min(1).max(200),
});

// ── Types ──────────────────────────────────────────

export type MonitoringType = z.infer<typeof MonitoringTypeEnum>;
export type RtmActivityType = z.infer<typeof RtmActivityTypeEnum>;
export type RtmEnrollmentStatus = z.infer<typeof RtmEnrollmentStatusEnum>;
export type BillingPeriodStatus = z.infer<typeof BillingPeriodStatusEnum>;
export type CreateRtmEnrollmentInput = z.infer<typeof CreateRtmEnrollmentSchema>;
export type LogRtmTimeInput = z.infer<typeof LogRtmTimeSchema>;
export type UpdateRtmEnrollmentInput = z.infer<typeof UpdateRtmEnrollmentSchema>;
export type UpdateBillingPeriodInput = z.infer<typeof UpdateBillingPeriodSchema>;
export type SaveBillingProfileInput = z.infer<typeof SaveBillingProfileSchema>;
export type RtmConsentInput = z.infer<typeof RtmConsentSchema>;
