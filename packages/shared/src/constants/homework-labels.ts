/** Human-readable system default labels for each homework item type. */
export const HOMEWORK_TYPE_SYSTEM_LABELS = {
  ACTION: "Action Item",
  RESOURCE_REVIEW: "Resource Review",
  JOURNAL_PROMPT: "Journal Prompt",
  BRING_TO_SESSION: "Bring to Session",
  FREE_TEXT_NOTE: "Free Text Note",
  CHOICE: "Choice",
  WORKSHEET: "Worksheet",
  RATING_SCALE: "Rating Scale",
  TIMER: "Timer",
  MOOD_CHECK: "Mood Check",
  HABIT_TRACKER: "Habit Tracker",
} as const;

export type HomeworkItemType = keyof typeof HOMEWORK_TYPE_SYSTEM_LABELS;

/**
 * Resolve the display label for a homework item type.
 *
 * Resolution order:
 * 1. Item-level custom label (per-item override set by clinician on the part)
 * 2. Clinician defaults (practice-wide defaults from ClinicianConfig.homeworkLabels)
 * 3. System default (HOMEWORK_TYPE_SYSTEM_LABELS)
 */
export function resolveHomeworkItemLabel(
  itemType: HomeworkItemType,
  itemCustomLabel?: string,
  clinicianDefaults?: Partial<Record<HomeworkItemType, string>>
): string {
  if (itemCustomLabel) return itemCustomLabel;
  if (clinicianDefaults && clinicianDefaults[itemType]) return clinicianDefaults[itemType]!;
  return HOMEWORK_TYPE_SYSTEM_LABELS[itemType];
}
