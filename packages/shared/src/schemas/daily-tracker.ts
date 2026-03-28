import { z } from "zod";

// ── Field Type Enum ─────────────────────────────────

export const TrackerFieldTypeEnum = z.enum([
  "SCALE",
  "NUMBER",
  "YES_NO",
  "MULTI_CHECK",
  "FREE_TEXT",
  "TIME",
  "FEELINGS_WHEEL",
]);

// ── Scale Options ───────────────────────────────────

export const ScaleOptionsSchema = z.object({
  min: z.number().int(),
  max: z.number().int(),
  minLabel: z.string().optional(),
  maxLabel: z.string().optional(),
});

export const MultiCheckOptionsSchema = z.object({
  choices: z.array(z.string()).min(1),
});

export const FeelingWheelOptionsSchema = z.object({
  maxSelections: z.number().int().min(1).max(10).default(3),
});

// ── Field Schemas ───────────────────────────────────

export const CreateTrackerFieldSchema = z.object({
  label: z.string().min(1).max(200),
  fieldType: TrackerFieldTypeEnum,
  options: z.union([ScaleOptionsSchema, MultiCheckOptionsSchema, FeelingWheelOptionsSchema, z.null()]).default(null),
  sortOrder: z.number().int(),
  isRequired: z.boolean().default(true),
}).superRefine((data, ctx) => {
  if (data.fieldType === "SCALE" && (data.options === null || !("min" in data.options))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "SCALE fields require options with min and max", path: ["options"] });
  }
  if (data.fieldType === "MULTI_CHECK" && (data.options === null || !("choices" in data.options))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "MULTI_CHECK fields require options with choices", path: ["options"] });
  }
  if (data.fieldType === "FEELINGS_WHEEL" && (data.options === null || !("maxSelections" in data.options))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "FEELINGS_WHEEL fields require options with maxSelections", path: ["options"] });
  }
});

// ── Tracker CRUD Schemas ────────────────────────────

export const CreateDailyTrackerSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  programId: z.string().optional(),
  enrollmentId: z.string().optional(),
  participantId: z.string(),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/).default("20:00"),
  fields: z.array(CreateTrackerFieldSchema),
});

export const CreateTrackerFromTemplateSchema = z.object({
  templateKey: z.string().min(1),
  programId: z.string().optional(),
  enrollmentId: z.string().optional(),
  participantId: z.string(),
});

export const UpdateDailyTrackerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  isActive: z.boolean().optional(),
  fields: z.array(CreateTrackerFieldSchema).optional(),
});

// ── Entry Schemas ───────────────────────────────────

export const SubmitTrackerEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  responses: z.record(z.string(), z.any()),
});

// ── Types ───────────────────────────────────────────

export type TrackerFieldType = z.infer<typeof TrackerFieldTypeEnum>;
export type ScaleOptions = z.infer<typeof ScaleOptionsSchema>;
export type MultiCheckOptions = z.infer<typeof MultiCheckOptionsSchema>;
export type FeelingWheelOptions = z.infer<typeof FeelingWheelOptionsSchema>;
export type CreateDailyTrackerInput = z.input<typeof CreateDailyTrackerSchema>;
export type UpdateDailyTrackerInput = z.input<typeof UpdateDailyTrackerSchema>;
export type CreateTrackerFromTemplateInput = z.infer<typeof CreateTrackerFromTemplateSchema>;
export type SubmitTrackerEntryInput = z.infer<typeof SubmitTrackerEntrySchema>;
export type CreateTrackerFieldInput = z.input<typeof CreateTrackerFieldSchema>;
