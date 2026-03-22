import { z } from "zod";

// ── Part Type Enum ─────────────────────────────────────

export const PartTypeEnum = z.enum([
  "TEXT",
  "VIDEO",
  "STRATEGY_CARDS",
  "JOURNAL_PROMPT",
  "CHECKLIST",
  "RESOURCE_LINK",
  "DIVIDER",
  "HOMEWORK",
  "ASSESSMENT",
  "INTAKE_FORM",
  "SMART_GOALS",
  "STYLED_CONTENT",
]);

// ── Homework Item Schemas ──────────────────────────────

const HomeworkActionSchema = z.object({
  type: z.literal("ACTION"),
  description: z.string().min(1),
  subSteps: z.array(z.string()).default([]),
  addToSteadySystem: z.boolean().default(false),
  dueDateOffsetDays: z.number().int().min(0).nullable().default(null),
  sortOrder: z.number().int(),
});

const HomeworkResourceReviewSchema = z.object({
  type: z.literal("RESOURCE_REVIEW"),
  resourceTitle: z.string().min(1),
  resourceType: z.enum(["handout", "video", "link", "audio"]),
  resourceUrl: z.string().url().or(z.literal("")), // Empty string allowed for audio (file-only resources)
  resourceKey: z.string().optional(), // S3 key for uploaded files — use presign-download to get URL
  audioDurationSecs: z.number().int().min(0).optional(), // Duration in seconds for audio files
  audioDescription: z.string().optional(), // Clinician instructions (e.g., "Listen daily, find a quiet place")
  sortOrder: z.number().int(),
});

const HomeworkJournalPromptSchema = z.object({
  type: z.literal("JOURNAL_PROMPT"),
  prompts: z.array(z.string()).min(1),
  spaceSizeHint: z.enum(["small", "medium", "large"]).default("medium"),
  sortOrder: z.number().int(),
});

const HomeworkBringToSessionSchema = z.object({
  type: z.literal("BRING_TO_SESSION"),
  reminderText: z.string().min(1),
  sortOrder: z.number().int(),
});

const HomeworkFreeTextNoteSchema = z.object({
  type: z.literal("FREE_TEXT_NOTE"),
  content: z.string(),
  sortOrder: z.number().int(),
});

const HomeworkChoiceSchema = z.object({
  type: z.literal("CHOICE"),
  description: z.string().min(1),
  options: z.array(z.object({ label: z.string(), detail: z.string().optional() })).min(2),
  sortOrder: z.number().int(),
});

export const HomeworkItemSchema = z.discriminatedUnion("type", [
  HomeworkActionSchema,
  HomeworkResourceReviewSchema,
  HomeworkJournalPromptSchema,
  HomeworkBringToSessionSchema,
  HomeworkFreeTextNoteSchema,
  HomeworkChoiceSchema,
]);

// ── Part Content Schemas (discriminated union) ─────────

const TextContentSchema = z.object({
  type: z.literal("TEXT"),
  body: z.string(),
  sections: z.array(z.string()).optional(),
});

const VideoContentSchema = z.object({
  type: z.literal("VIDEO"),
  url: z.string(),
  provider: z.enum(["youtube", "vimeo", "loom"]),
  transcriptUrl: z.string().url().optional(),
});

const StrategyCardsContentSchema = z.object({
  type: z.literal("STRATEGY_CARDS"),
  deckName: z.string(),
  cards: z.array(
    z.object({
      title: z.string().min(1),
      body: z.string(),
      emoji: z.string().optional(),
    })
  ),
});

const JournalPromptContentSchema = z.object({
  type: z.literal("JOURNAL_PROMPT"),
  prompts: z.array(z.string()),
  spaceSizeHint: z.enum(["small", "medium", "large"]).default("medium"),
});

const ChecklistContentSchema = z.object({
  type: z.literal("CHECKLIST"),
  items: z.array(
    z.object({
      text: z.string(),
      sortOrder: z.number().int(),
    })
  ),
});

const ResourceLinkContentSchema = z.object({
  type: z.literal("RESOURCE_LINK"),
  url: z.string(),
  fileKey: z.string().optional(), // S3 key for uploaded files — use presign-download to get URL
  description: z.string().optional(),
  resourceType: z.enum(["file", "link", "audio"]).optional(), // Distinguish audio resources in module parts
  audioDurationSecs: z.number().int().min(0).optional(), // Duration in seconds for audio files
});

const DividerContentSchema = z.object({
  type: z.literal("DIVIDER"),
  label: z.string(),
});

export const RecurrenceTypeEnum = z.enum(["NONE", "DAILY", "WEEKLY", "CUSTOM"]);

export const HomeworkInstanceStatusEnum = z.enum(["PENDING", "COMPLETED", "SKIPPED", "MISSED"]);

export const CompleteHomeworkInstanceSchema = z.object({
  response: z.any().nullable().optional(),
});

const HomeworkContentSchema = z.object({
  type: z.literal("HOMEWORK"),
  dueTimingType: z.enum(["BEFORE_NEXT_SESSION", "SPECIFIC_DATE", "DAYS_AFTER_UNLOCK"]),
  dueTimingValue: z.union([z.string(), z.number()]).nullable().default(null),
  completionRule: z.enum(["ALL", "X_OF_Y"]),
  completionMinimum: z.number().int().nullable().default(null),
  reminderCadence: z.enum(["DAILY", "EVERY_OTHER_DAY", "MID_WEEK"]),
  items: z.array(HomeworkItemSchema),
  recurrence: RecurrenceTypeEnum.default("NONE"),
  recurrenceDays: z.array(z.number().int().min(0).max(6)).default([]),
  recurrenceEndDate: z.string().nullable().default(null),
});

// ── Assessment Schema ─────────────────────────────────

const AssessmentQuestionSchema = z.object({
  question: z.string(),
  type: z.enum(["LIKERT", "MULTIPLE_CHOICE", "FREE_TEXT", "YES_NO"]),
  options: z.array(z.string()).optional(),
  likertMin: z.number().int().optional(),
  likertMax: z.number().int().optional(),
  likertMinLabel: z.string().optional(),
  likertMaxLabel: z.string().optional(),
  required: z.boolean().default(true),
  sortOrder: z.number().int(),
});

export const AssessmentQuestionType = AssessmentQuestionSchema.shape.type;

const AssessmentContentSchema = z.object({
  type: z.literal("ASSESSMENT"),
  title: z.string().default(""),
  instructions: z.string().default(""),
  scoringEnabled: z.boolean().default(false),
  questions: z.array(AssessmentQuestionSchema).default([]),
});

// ── Intake Form Schema ────────────────────────────────

const IntakeFieldSchema = z.object({
  label: z.string(),
  type: z.enum(["TEXT", "TEXTAREA", "SELECT", "MULTI_SELECT", "DATE", "NUMBER", "CHECKBOX"]),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(true),
  section: z.string().default("General"),
  sortOrder: z.number().int(),
});

const IntakeFormContentSchema = z.object({
  type: z.literal("INTAKE_FORM"),
  title: z.string().default(""),
  instructions: z.string().default(""),
  sections: z.array(z.string()).default(["General"]),
  fields: z.array(IntakeFieldSchema).default([]),
});

// ── SMART Goals Schema ────────────────────────────────

const SmartGoalSchema = z.object({
  specific: z.string().default(""),
  measurable: z.string().default(""),
  achievable: z.string().default(""),
  relevant: z.string().default(""),
  timeBound: z.string().default(""),
  category: z.enum(["DAILY_ROUTINE", "WORK", "RELATIONSHIPS", "HEALTH", "SELF_CARE", "OTHER"]).default("OTHER"),
  sortOrder: z.number().int(),
});

const SmartGoalsContentSchema = z.object({
  type: z.literal("SMART_GOALS"),
  instructions: z.string().default(""),
  maxGoals: z.number().int().min(1).default(3),
  categories: z.array(z.string()).default(["DAILY_ROUTINE", "WORK", "RELATIONSHIPS", "HEALTH", "SELF_CARE", "OTHER"]),
  goals: z.array(SmartGoalSchema).default([]),
});

// ── Styled Content Schema ────────────────────────────

const StyledContentSchema = z.object({
  type: z.literal("STYLED_CONTENT"),
  rawContent: z.string().default(""),
  styledHtml: z.string().default(""),
});

export const PartContentSchema = z.discriminatedUnion("type", [
  TextContentSchema,
  VideoContentSchema,
  StrategyCardsContentSchema,
  JournalPromptContentSchema,
  ChecklistContentSchema,
  ResourceLinkContentSchema,
  DividerContentSchema,
  HomeworkContentSchema,
  AssessmentContentSchema,
  IntakeFormContentSchema,
  SmartGoalsContentSchema,
  StyledContentSchema,
]);

// ── Part CRUD Schemas ──────────────────────────────────

export const CreatePartSchema = z.object({
  type: PartTypeEnum,
  title: z.string().min(1, "Title is required").max(200),
  isRequired: z.boolean().optional().default(true),
  content: PartContentSchema,
});

export const UpdatePartSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  isRequired: z.boolean().optional(),
  content: PartContentSchema.optional(),
});

export const ReorderPartsSchema = z.object({
  partIds: z.array(z.string()).min(1),
});

export type PartContent = z.infer<typeof PartContentSchema>;
export type HomeworkItem = z.infer<typeof HomeworkItemSchema>;
export type HomeworkContent = z.infer<typeof HomeworkContentSchema>;
export type RecurrenceType = z.infer<typeof RecurrenceTypeEnum>;
export type HomeworkInstanceStatus = z.infer<typeof HomeworkInstanceStatusEnum>;
export type CreatePartInput = z.input<typeof CreatePartSchema>;
export type UpdatePartInput = z.input<typeof UpdatePartSchema>;
export type ReorderPartsInput = z.infer<typeof ReorderPartsSchema>;
