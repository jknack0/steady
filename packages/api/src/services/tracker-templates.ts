import { prisma } from "@steady/db";

// ── Template Definition ─────────────────────────────

interface TemplateField {
  label: string;
  fieldType: "SCALE" | "NUMBER" | "YES_NO" | "MULTI_CHECK" | "FREE_TEXT" | "TIME" | "FEELINGS_WHEEL";
  options?: Record<string, unknown>;
  isRequired: boolean;
}

export interface TrackerTemplate {
  key: string;
  name: string;
  description: string;
  fields: TemplateField[];
}

// ── Preset Templates ────────────────────────────────

const TEMPLATES: TrackerTemplate[] = [
  {
    key: "mood-log",
    name: "Mood Log",
    description: "Track daily mood, anxiety, and energy levels",
    fields: [
      { label: "Mood", fieldType: "SCALE", options: { min: 0, max: 10, minLabel: "Very low", maxLabel: "Great" }, isRequired: true },
      { label: "Anxiety", fieldType: "SCALE", options: { min: 0, max: 10, minLabel: "None", maxLabel: "Extreme" }, isRequired: true },
      { label: "Energy", fieldType: "SCALE", options: { min: 0, max: 10, minLabel: "No energy", maxLabel: "Very energetic" }, isRequired: true },
      { label: "Notes", fieldType: "FREE_TEXT", isRequired: false },
    ],
  },
  {
    key: "dbt-diary-card",
    name: "DBT Diary Card",
    description: "Track urges, emotions, and DBT skills used",
    fields: [
      { label: "Urge to Self-Harm", fieldType: "SCALE", options: { min: 0, max: 5, minLabel: "None", maxLabel: "Very strong" }, isRequired: true },
      { label: "Urge to Use Substances", fieldType: "SCALE", options: { min: 0, max: 5, minLabel: "None", maxLabel: "Very strong" }, isRequired: true },
      { label: "Sadness", fieldType: "SCALE", options: { min: 0, max: 5, minLabel: "None", maxLabel: "Very strong" }, isRequired: true },
      { label: "Anger", fieldType: "SCALE", options: { min: 0, max: 5, minLabel: "None", maxLabel: "Very strong" }, isRequired: true },
      { label: "Fear", fieldType: "SCALE", options: { min: 0, max: 5, minLabel: "None", maxLabel: "Very strong" }, isRequired: true },
      { label: "Joy", fieldType: "SCALE", options: { min: 0, max: 5, minLabel: "None", maxLabel: "Very strong" }, isRequired: true },
      {
        label: "Skills Used",
        fieldType: "MULTI_CHECK",
        options: {
          choices: [
            "Wise Mind", "Observe", "Describe", "Participate",
            "Non-Judgmental Stance", "One-Mindfully", "Effectiveness",
            "DEAR MAN", "GIVE", "FAST",
            "TIPP", "Opposite Action", "Check the Facts",
            "Distress Tolerance", "Radical Acceptance", "Self-Soothe",
            "STOP", "Pros and Cons",
          ],
        },
        isRequired: false,
      },
      { label: "Notes", fieldType: "FREE_TEXT", isRequired: false },
    ],
  },
  {
    key: "sleep-diary",
    name: "Sleep Diary",
    description: "Track sleep patterns, quality, and habits",
    fields: [
      { label: "Bedtime", fieldType: "TIME", isRequired: true },
      { label: "Time Fell Asleep", fieldType: "TIME", isRequired: true },
      { label: "Number of Awakenings", fieldType: "NUMBER", isRequired: true },
      { label: "Wake Time", fieldType: "TIME", isRequired: true },
      { label: "Out of Bed Time", fieldType: "TIME", isRequired: true },
      { label: "Sleep Quality", fieldType: "SCALE", options: { min: 1, max: 5, minLabel: "Very poor", maxLabel: "Excellent" }, isRequired: true },
      { label: "Caffeine After 2pm", fieldType: "YES_NO", isRequired: true },
      { label: "Screens in Bed", fieldType: "YES_NO", isRequired: true },
    ],
  },
  {
    key: "craving-tracker",
    name: "Craving Tracker",
    description: "Monitor craving intensity, triggers, and coping strategies",
    fields: [
      { label: "Craving Intensity", fieldType: "SCALE", options: { min: 0, max: 10, minLabel: "None", maxLabel: "Overwhelming" }, isRequired: true },
      { label: "Trigger", fieldType: "FREE_TEXT", isRequired: false },
      { label: "Used Coping Skill", fieldType: "YES_NO", isRequired: true },
      { label: "Which Skill", fieldType: "FREE_TEXT", isRequired: false },
      { label: "Did You Use", fieldType: "YES_NO", isRequired: true },
    ],
  },
  {
    key: "ocd-exposure-log",
    name: "OCD Exposure Log",
    description: "Track exposures, SUDS ratings, and compulsion resistance",
    fields: [
      { label: "Exposure Completed", fieldType: "YES_NO", isRequired: true },
      { label: "SUDS Before", fieldType: "SCALE", options: { min: 0, max: 100, minLabel: "No distress", maxLabel: "Extreme distress" }, isRequired: true },
      { label: "SUDS Peak", fieldType: "SCALE", options: { min: 0, max: 100, minLabel: "No distress", maxLabel: "Extreme distress" }, isRequired: true },
      { label: "SUDS After", fieldType: "SCALE", options: { min: 0, max: 100, minLabel: "No distress", maxLabel: "Extreme distress" }, isRequired: true },
      { label: "Resisted Compulsion", fieldType: "YES_NO", isRequired: true },
      { label: "Notes", fieldType: "FREE_TEXT", isRequired: false },
    ],
  },
  {
    key: "food-log",
    name: "Food Log",
    description: "Track meals, eating behaviors, and associated feelings",
    fields: [
      { label: "Meal/Snack", fieldType: "FREE_TEXT", isRequired: true },
      { label: "Time", fieldType: "TIME", isRequired: true },
      { label: "Location", fieldType: "FREE_TEXT", isRequired: false },
      { label: "Feelings Before", fieldType: "FREE_TEXT", isRequired: false },
      { label: "Binge", fieldType: "YES_NO", isRequired: true },
      { label: "Purge", fieldType: "YES_NO", isRequired: true },
    ],
  },
  {
    key: "feelings-check-in",
    name: "Feelings Check-in",
    description: "Track daily emotions using the Willcox feelings wheel",
    fields: [
      {
        label: "How are you feeling?",
        fieldType: "FEELINGS_WHEEL",
        options: { maxSelections: 3 },
        isRequired: true,
      },
      {
        label: "What's on your mind?",
        fieldType: "FREE_TEXT",
        isRequired: false,
      },
    ],
  },
];

// ── Public API ──────────────────────────────────────

export function getTrackerTemplates(): TrackerTemplate[] {
  return TEMPLATES;
}

export async function createTrackerFromTemplate(
  templateKey: string,
  createdById: string,
  programId?: string,
  enrollmentId?: string,
  participantId?: string
): Promise<string> {
  const template = TEMPLATES.find((t) => t.key === templateKey);
  if (!template) {
    throw new Error(`Template not found: ${templateKey}`);
  }

  const tracker = await prisma.dailyTracker.create({
    data: {
      name: template.name,
      description: template.description,
      createdById,
      programId: programId || null,
      enrollmentId: enrollmentId || null,
      participantId: participantId || null,
      fields: {
        create: template.fields.map((field, index) => ({
          label: field.label,
          fieldType: field.fieldType,
          options: (field.options || undefined) as any,
          sortOrder: index,
          isRequired: field.isRequired,
        })),
      },
    },
  });

  return tracker.id;
}
