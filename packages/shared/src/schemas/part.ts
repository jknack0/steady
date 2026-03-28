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
  "PDF",
]);

// ── Homework Item Schemas ──────────────────────────────

const customLabelField = z.string().trim().min(1).max(50).optional();

const HomeworkActionSchema = z.object({
  type: z.literal("ACTION"),
  description: z.string().min(1),
  subSteps: z.array(z.string()).default([]),
  addToSteadySystem: z.boolean().default(false),
  dueDateOffsetDays: z.number().int().min(0).nullable().default(null),
  sortOrder: z.number().int().default(0),
  customLabel: customLabelField,
});

const HomeworkResourceReviewSchema = z.object({
  type: z.literal("RESOURCE_REVIEW"),
  resourceTitle: z.string().min(1),
  resourceType: z.enum(["handout", "video", "link", "audio", "pdf"]),
  resourceUrl: z.string().url().or(z.literal("")), // Empty string allowed for audio (file-only resources)
  resourceKey: z.string().optional(), // S3 key for uploaded files — use presign-download to get URL
  audioDurationSecs: z.number().int().min(0).optional(), // Duration in seconds for audio files
  audioDescription: z.string().optional(), // Clinician instructions (e.g., "Listen daily, find a quiet place")
  sortOrder: z.number().int().default(0),
  customLabel: customLabelField,
});

const HomeworkJournalPromptSchema = z.object({
  type: z.literal("JOURNAL_PROMPT"),
  prompts: z.array(z.string()).min(1).default([""]),
  spaceSizeHint: z.enum(["small", "medium", "large"]).default("medium"),
  sortOrder: z.number().int().default(0),
  customLabel: customLabelField,
});

const HomeworkBringToSessionSchema = z.object({
  type: z.literal("BRING_TO_SESSION"),
  reminderText: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  sortOrder: z.number().int().default(0),
  customLabel: customLabelField,
});

const HomeworkFreeTextNoteSchema = z.object({
  type: z.literal("FREE_TEXT_NOTE"),
  content: z.string(),
  sortOrder: z.number().int().default(0),
  customLabel: customLabelField,
});

const HomeworkChoiceSchema = z.object({
  type: z.literal("CHOICE"),
  description: z.string().min(1),
  options: z.array(z.object({ label: z.string().max(200), detail: z.string().max(500).optional() })).min(2),
  sortOrder: z.number().int().default(0),
  customLabel: customLabelField,
});

const HomeworkWorksheetSchema = z.object({
  type: z.literal("WORKSHEET"),
  sortOrder: z.number().int().default(0),
  instructions: z.string().max(2000).optional(),
  columns: z.array(z.object({
    label: z.string().max(200),
    description: z.string().max(500).optional(),
  })).min(1).max(10),
  rowCount: z.number().int().min(1).max(20),
  tips: z.string().max(2000).optional(),
  customLabel: customLabelField,
});

const HomeworkRatingScaleSchema = z.object({
  type: z.literal("RATING_SCALE"),
  description: z.string().max(2000),
  min: z.number().int().min(0).max(10).default(1),
  max: z.number().int().min(1).max(10).default(10),
  minLabel: z.string().max(200).optional(),
  maxLabel: z.string().max(200).optional(),
  sortOrder: z.number().int().default(0),
  customLabel: customLabelField,
});

const HomeworkTimerSchema = z.object({
  type: z.literal("TIMER"),
  description: z.string().max(2000),
  durationSeconds: z.number().int().min(10).max(7200),
  sortOrder: z.number().int().default(0),
  customLabel: customLabelField,
});

const HomeworkMoodCheckSchema = z.object({
  type: z.literal("MOOD_CHECK"),
  description: z.string().max(2000).optional(),
  moods: z.array(z.object({
    emoji: z.string().max(10),
    label: z.string().max(200),
  })).min(2).max(10).default([
    { emoji: "\ud83d\ude0a", label: "Great" },
    { emoji: "\ud83d\ude42", label: "Good" },
    { emoji: "\ud83d\ude10", label: "Okay" },
    { emoji: "\ud83d\ude14", label: "Low" },
    { emoji: "\ud83d\ude22", label: "Struggling" },
  ]),
  includeNote: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  customLabel: customLabelField,
});

const HomeworkHabitTrackerSchema = z.object({
  type: z.literal("HABIT_TRACKER"),
  description: z.string().max(2000),
  habitLabel: z.string().max(200),
  sortOrder: z.number().int().default(0),
  customLabel: customLabelField,
});

export const HomeworkItemSchema = z.discriminatedUnion("type", [
  HomeworkActionSchema,
  HomeworkResourceReviewSchema,
  HomeworkJournalPromptSchema,
  HomeworkBringToSessionSchema,
  HomeworkFreeTextNoteSchema,
  HomeworkChoiceSchema,
  HomeworkWorksheetSchema,
  HomeworkRatingScaleSchema,
  HomeworkTimerSchema,
  HomeworkMoodCheckSchema,
  HomeworkHabitTrackerSchema,
]);

// ── Part Content Schemas (discriminated union) ─────────

const TextContentSchema = z.object({
  type: z.literal("TEXT"),
  body: z.string().max(50000),
  sections: z.array(z.string().max(200)).optional(),
});

const VideoContentSchema = z.object({
  type: z.literal("VIDEO"),
  url: z.string().url().or(z.literal("")),
  provider: z.enum(["youtube", "vimeo", "loom"]),
  transcriptUrl: z.string().url().or(z.literal("")).optional(),
});

const StrategyCardsContentSchema = z.object({
  type: z.literal("STRATEGY_CARDS"),
  deckName: z.string().min(1).max(200),
  cards: z.array(
    z.object({
      title: z.string().min(1).max(200),
      body: z.string().max(2000),
      emoji: z.string().max(10).optional(),
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
      text: z.string().min(1).max(500),
      sortOrder: z.number().int().default(0),
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

// ── Homework Response Schemas ─────────────────────────

const ActionResponseSchema = z.object({
  type: z.literal("ACTION"),
  completed: z.boolean(),
  subStepsDone: z.array(z.boolean()).default([]),
});

const JournalPromptResponseSchema = z.object({
  type: z.literal("JOURNAL_PROMPT"),
  entries: z.array(z.string().max(50000)),
});

const WorksheetResponseSchema = z.object({
  type: z.literal("WORKSHEET"),
  rows: z.array(z.record(z.string(), z.string().max(5000))),
});

const ChoiceResponseSchema = z.object({
  type: z.literal("CHOICE"),
  selectedIndex: z.number().int().min(0),
});

const ResourceReviewResponseSchema = z.object({
  type: z.literal("RESOURCE_REVIEW"),
  reviewed: z.boolean(),
});

const RatingScaleResponseSchema = z.object({
  type: z.literal("RATING_SCALE"),
  value: z.number().int(),
});

const TimerResponseSchema = z.object({
  type: z.literal("TIMER"),
  elapsedSeconds: z.number().int().min(0),
  completed: z.boolean(),
});

const MoodCheckResponseSchema = z.object({
  type: z.literal("MOOD_CHECK"),
  mood: z.string().max(200),
  note: z.string().max(5000).optional(),
});

const HabitTrackerResponseSchema = z.object({
  type: z.literal("HABIT_TRACKER"),
  done: z.boolean(),
});

const BringToSessionResponseSchema = z.object({
  type: z.literal("BRING_TO_SESSION"),
  acknowledged: z.boolean(),
});

const FreeTextNoteResponseSchema = z.object({
  type: z.literal("FREE_TEXT_NOTE"),
  acknowledged: z.boolean(),
});

export const HomeworkItemResponseSchema = z.discriminatedUnion("type", [
  ActionResponseSchema,
  JournalPromptResponseSchema,
  WorksheetResponseSchema,
  ChoiceResponseSchema,
  ResourceReviewResponseSchema,
  RatingScaleResponseSchema,
  TimerResponseSchema,
  MoodCheckResponseSchema,
  HabitTrackerResponseSchema,
  BringToSessionResponseSchema,
  FreeTextNoteResponseSchema,
]);

export const HomeworkResponseSchema = z.record(z.string(), HomeworkItemResponseSchema);

export const SaveHomeworkResponseSchema = z.object({
  responses: HomeworkResponseSchema,
});

export const CompleteHomeworkInstanceSchema = z.object({
  response: HomeworkResponseSchema.nullable().optional(),
});

// Base object used in discriminatedUnion (must remain ZodObject, not ZodEffects)
const HomeworkContentSchema = z.object({
  type: z.literal("HOMEWORK"),
  dueTimingType: z.enum(["BEFORE_NEXT_SESSION", "SPECIFIC_DATE", "DAYS_AFTER_UNLOCK"]),
  dueTimingValue: z.union([z.string(), z.number()]).nullable().default(null),
  completionRule: z.enum(["ALL", "X_OF_Y", "MAJORITY"]),
  completionMinimum: z.number().int().min(1).nullable().default(null),
  reminderCadence: z.enum(["DAILY", "EVERY_OTHER_DAY", "MID_WEEK", "NONE"]),
  items: z.array(HomeworkItemSchema),
  recurrence: RecurrenceTypeEnum.default("NONE"),
  recurrenceDays: z.array(z.number().int().min(0).max(6)).default([]),
  recurrenceEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
});

// Refined version with cross-field validation — use this for explicit validation calls
export const HomeworkContentRefinedSchema = HomeworkContentSchema.superRefine((data, ctx) => {
  if (data.dueTimingType === "SPECIFIC_DATE" && data.dueTimingValue !== null && typeof data.dueTimingValue !== "string") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "SPECIFIC_DATE requires a date string", path: ["dueTimingValue"] });
  }
  if (data.dueTimingType === "DAYS_AFTER_UNLOCK" && data.dueTimingValue !== null && typeof data.dueTimingValue !== "number") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "DAYS_AFTER_UNLOCK requires a number", path: ["dueTimingValue"] });
  }
  if (data.completionRule === "X_OF_Y" && data.completionMinimum === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "X_OF_Y requires completionMinimum", path: ["completionMinimum"] });
  }
});

// ── Assessment Schema ─────────────────────────────────

const AssessmentQuestionSchema = z.object({
  question: z.string().min(1).max(1000),
  type: z.enum(["LIKERT", "MULTIPLE_CHOICE", "FREE_TEXT", "YES_NO"]),
  options: z.array(z.string().max(500)).optional(),
  likertMin: z.number().int().optional(),
  likertMax: z.number().int().optional(),
  likertMinLabel: z.string().max(100).optional(),
  likertMaxLabel: z.string().max(100).optional(),
  required: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
}).superRefine((data, ctx) => {
  if (data.type === "MULTIPLE_CHOICE" && (!data.options || data.options.length < 2)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "MULTIPLE_CHOICE requires at least 2 options", path: ["options"] });
  }
  if (data.type === "LIKERT") {
    if (data.likertMin === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "LIKERT requires likertMin", path: ["likertMin"] });
    }
    if (data.likertMax === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "LIKERT requires likertMax", path: ["likertMax"] });
    }
    if (data.likertMin !== undefined && data.likertMax !== undefined && data.likertMin >= data.likertMax) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "likertMin must be less than likertMax", path: ["likertMax"] });
    }
  }
});

export const AssessmentQuestionType = z.enum(["LIKERT", "MULTIPLE_CHOICE", "FREE_TEXT", "YES_NO"]);

const AssessmentContentSchema = z.object({
  type: z.literal("ASSESSMENT"),
  title: z.string().max(500).default(""),
  instructions: z.string().max(2000).default(""),
  scoringEnabled: z.boolean().default(false),
  questions: z.array(AssessmentQuestionSchema).default([]),
});

// ── Intake Form Schema ────────────────────────────────

const IntakeFieldSchema = z.object({
  label: z.string().min(1).max(200),
  type: z.enum(["TEXT", "TEXTAREA", "SELECT", "MULTI_SELECT", "DATE", "NUMBER", "CHECKBOX"]),
  placeholder: z.string().max(200).optional(),
  options: z.array(z.string().max(500)).optional(),
  required: z.boolean().default(true),
  section: z.string().max(200).default("General"),
  sortOrder: z.number().int().default(0),
}).superRefine((data, ctx) => {
  if ((data.type === "SELECT" || data.type === "MULTI_SELECT") && (!data.options || data.options.length < 1)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${data.type} requires at least 1 option`, path: ["options"] });
  }
});

const IntakeFormContentSchema = z.object({
  type: z.literal("INTAKE_FORM"),
  title: z.string().max(500).default(""),
  instructions: z.string().max(2000).default(""),
  sections: z.array(z.string().max(200)).default(["General"]),
  fields: z.array(IntakeFieldSchema).default([]),
});

// ── SMART Goals Schema ────────────────────────────────

const SmartGoalSchema = z.object({
  specific: z.string().max(1000).default(""),
  measurable: z.string().max(1000).default(""),
  achievable: z.string().max(1000).default(""),
  relevant: z.string().max(1000).default(""),
  timeBound: z.string().max(1000).default(""),
  category: z.enum(["DAILY_ROUTINE", "WORK", "RELATIONSHIPS", "HEALTH", "SELF_CARE", "OTHER"]).default("OTHER"),
  sortOrder: z.number().int().default(0),
});

const SmartGoalsContentSchema = z.object({
  type: z.literal("SMART_GOALS"),
  instructions: z.string().max(2000).default(""),
  maxGoals: z.number().int().min(1).default(3),
  categories: z.array(z.string().max(100)).default(["DAILY_ROUTINE", "WORK", "RELATIONSHIPS", "HEALTH", "SELF_CARE", "OTHER"]),
  goals: z.array(SmartGoalSchema).default([]),
});

// ── Styled Content Schema ────────────────────────────

const StyledContentSchema = z.object({
  type: z.literal("STYLED_CONTENT"),
  rawContent: z.string().max(100000).default(""),
  styledHtml: z.string().max(200000).default(""),
});

const PdfContentSchema = z.object({
  type: z.literal("PDF"),
  fileKey: z.string(),
  url: z.string().url().or(z.literal("")),
  fileName: z.string().max(200),
  description: z.string().max(2000).optional(),
  pageCount: z.number().int().min(1).optional(),
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
  PdfContentSchema,
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
export type WorksheetHomeworkItem = z.infer<typeof HomeworkWorksheetSchema>;
export type HomeworkContent = z.infer<typeof HomeworkContentSchema>;
export type HomeworkItemResponse = z.infer<typeof HomeworkItemResponseSchema>;
export type HomeworkResponse = z.infer<typeof HomeworkResponseSchema>;
export type RecurrenceType = z.infer<typeof RecurrenceTypeEnum>;
export type HomeworkInstanceStatus = z.infer<typeof HomeworkInstanceStatusEnum>;
export type CreatePartInput = z.input<typeof CreatePartSchema>;
export type UpdatePartInput = z.input<typeof UpdatePartSchema>;
export type ReorderPartsInput = z.infer<typeof ReorderPartsSchema>;
