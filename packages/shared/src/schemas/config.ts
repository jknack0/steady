import { z } from "zod";

// ── Enums ──────────────────────────────────────────

export const ProviderTypeEnum = z.enum([
  "THERAPIST",
  "PSYCHIATRIST",
  "PSYCHOLOGIST",
  "COUNSELOR",
  "PSYCH_NP",
  "COACH",
  "OTHER",
]);

export const AssessmentFrequencyEnum = z.enum([
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
]);

// ── Shared Objects ─────────────────────────────────

const DashboardWidgetSchema = z.object({
  widgetId: z.string(),
  visible: z.boolean(),
});

const AssessmentConfigSchema = z.object({
  instrumentId: z.string(),
  frequency: AssessmentFrequencyEnum,
});

const MedicationSchema = z.object({
  name: z.string().max(200),
  dosage: z.string().max(100),
  frequency: z.string().max(100),
  startDate: z.string().optional(),
});

// ── Save Clinician Config ──────────────────────────

export const SaveClinicianConfigSchema = z.object({
  providerType: ProviderTypeEnum,
  presetId: z.string().max(100).optional(),
  primaryModality: z.string().max(200).optional(),
  enabledModules: z.array(z.string().max(50)).min(1),
  dashboardLayout: z.array(DashboardWidgetSchema),
  defaultTrackerPreset: z.string().max(100).optional(),
  defaultAssessments: z.array(AssessmentConfigSchema).optional(),
  practiceName: z.string().max(200).optional(),
  brandColor: z.string().max(7).optional(),
});

// ── Save Client Config ─────────────────────────────

export const SaveClientConfigSchema = z.object({
  enabledModules: z.array(z.string().max(50)).optional(),
  activeTrackers: z.array(z.string()).optional(),
  activeAssessments: z.array(AssessmentConfigSchema).optional(),
  activeMedications: z.array(MedicationSchema).optional(),
});

// ── Types ──────────────────────────────────────────

export type ProviderType = z.infer<typeof ProviderTypeEnum>;
export type AssessmentFrequency = z.infer<typeof AssessmentFrequencyEnum>;
export type SaveClinicianConfigInput = z.infer<
  typeof SaveClinicianConfigSchema
>;
export type SaveClientConfigInput = z.infer<typeof SaveClientConfigSchema>;
