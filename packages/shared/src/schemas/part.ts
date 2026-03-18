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
  resourceType: z.enum(["handout", "video", "link"]),
  resourceUrl: z.string().url(),
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
  description: z.string().optional(),
});

const DividerContentSchema = z.object({
  type: z.literal("DIVIDER"),
  label: z.string(),
});

const HomeworkContentSchema = z.object({
  type: z.literal("HOMEWORK"),
  dueTimingType: z.enum(["BEFORE_NEXT_SESSION", "SPECIFIC_DATE", "DAYS_AFTER_UNLOCK"]),
  dueTimingValue: z.union([z.string(), z.number()]).nullable().default(null),
  completionRule: z.enum(["ALL", "X_OF_Y"]),
  completionMinimum: z.number().int().nullable().default(null),
  reminderCadence: z.enum(["DAILY", "EVERY_OTHER_DAY", "MID_WEEK"]),
  items: z.array(HomeworkItemSchema),
});

// Phase 2 stubs
const AssessmentContentSchema = z.object({
  type: z.literal("ASSESSMENT"),
  placeholder: z.literal(true).default(true),
});

const IntakeFormContentSchema = z.object({
  type: z.literal("INTAKE_FORM"),
  placeholder: z.literal(true).default(true),
});

const SmartGoalsContentSchema = z.object({
  type: z.literal("SMART_GOALS"),
  placeholder: z.literal(true).default(true),
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
export type CreatePartInput = z.input<typeof CreatePartSchema>;
export type UpdatePartInput = z.input<typeof UpdatePartSchema>;
export type ReorderPartsInput = z.infer<typeof ReorderPartsSchema>;
