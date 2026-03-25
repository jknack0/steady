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

export const DashboardLayoutItemSchema = z.object({
  widgetId: z.string().max(100),
  visible: z.boolean(),
  column: z.enum(["main", "sidebar"]).default("main"),
  order: z.number().int().min(0).default(0),
  settings: z.record(z.unknown()).default({}),
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
  dashboardLayout: z.array(DashboardLayoutItemSchema).max(50),
  clientOverviewLayout: z.array(DashboardLayoutItemSchema).max(50).optional(),
  defaultTrackerPreset: z.string().max(100).optional(),
  defaultAssessments: z.array(AssessmentConfigSchema).optional(),
  practiceName: z.string().max(200).optional(),
  brandColor: z.string().max(7).optional(),
});

// ── Save Dashboard Layout (PATCH endpoint) ─────────

export const SaveDashboardLayoutSchema = z.object({
  dashboardLayout: z.array(DashboardLayoutItemSchema).max(50).optional(),
  clientOverviewLayout: z.array(DashboardLayoutItemSchema).max(50).optional(),
}).refine(
  (data) => data.dashboardLayout || data.clientOverviewLayout,
  { message: "At least one layout must be provided" }
);

// ── Save Client Overview Layout (PATCH endpoint) ───

export const SaveClientOverviewLayoutSchema = z.object({
  clientOverviewLayout: z.array(DashboardLayoutItemSchema).max(50),
});

// ── Save Client Config ─────────────────────────────

export const SaveClientConfigSchema = z.object({
  enabledModules: z.array(z.string().max(50)).optional(),
  activeTrackers: z.array(z.string()).optional(),
  activeAssessments: z.array(AssessmentConfigSchema).optional(),
  activeMedications: z.array(MedicationSchema).optional(),
  clientOverviewLayout: z.array(DashboardLayoutItemSchema).max(50).optional(),
});

// ── Types ──────────────────────────────────────────

export type ProviderType = z.infer<typeof ProviderTypeEnum>;
export type AssessmentFrequency = z.infer<typeof AssessmentFrequencyEnum>;
export type DashboardLayoutItem = z.infer<typeof DashboardLayoutItemSchema>;
export type SaveClinicianConfigInput = z.infer<typeof SaveClinicianConfigSchema>;
export type SaveClientConfigInput = z.infer<typeof SaveClientConfigSchema>;
export type SaveDashboardLayoutInput = z.infer<typeof SaveDashboardLayoutSchema>;
export type SaveClientOverviewLayoutInput = z.infer<typeof SaveClientOverviewLayoutSchema>;
