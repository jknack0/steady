/**
 * Shared RTM (Remote Therapeutic Monitoring) constants.
 *
 * Consolidates duplicate constant definitions that were previously
 * defined locally across multiple dashboard pages.
 */

export const ACTIVITY_TYPES = [
  { value: "DATA_REVIEW", label: "Data Review" },
  { value: "PROGRAM_ADJUSTMENT", label: "Program Adjustment" },
  { value: "OUTCOME_ANALYSIS", label: "Outcome Analysis" },
  { value: "INTERACTIVE_COMMUNICATION", label: "Interactive Communication" },
  { value: "OTHER", label: "Other" },
] as const;

export const ACTIVITY_LABELS: Record<string, string> = {
  DATA_REVIEW: "Data Review",
  PROGRAM_ADJUSTMENT: "Program Adjustment",
  OUTCOME_ANALYSIS: "Outcome Analysis",
  INTERACTIVE_COMMUNICATION: "Interactive Communication",
  OTHER: "Other",
};

export interface TimePreset {
  label: string;
  duration: number;
  activityType: string;
  description: string;
  isInteractive?: boolean;
}

export const TIME_PRESETS: TimePreset[] = [
  {
    label: "5 min data review",
    duration: 5,
    activityType: "DATA_REVIEW",
    description: "Reviewed client engagement data and tracker submissions.",
    isInteractive: false,
  },
  {
    label: "10 min program adjustment",
    duration: 10,
    activityType: "PROGRAM_ADJUSTMENT",
    description: "Reviewed progress and adjusted program content based on outcomes.",
    isInteractive: false,
  },
  {
    label: "15 min outcome analysis",
    duration: 15,
    activityType: "OUTCOME_ANALYSIS",
    description: "Analyzed tracker data trends and clinical outcomes for treatment planning.",
    isInteractive: false,
  },
  {
    label: "20 min interactive session",
    duration: 20,
    activityType: "INTERACTIVE_COMMUNICATION",
    description: "Live interactive session with client to discuss progress and treatment plan.",
    isInteractive: true,
  },
];

export const QUICK_LOG_PRESETS = [
  { minutes: 5, label: "5 min review", activity: "DATA_REVIEW" },
  { minutes: 10, label: "10 min adjustment", activity: "PROGRAM_ADJUSTMENT" },
  { minutes: 15, label: "15 min analysis", activity: "OUTCOME_ANALYSIS" },
  {
    minutes: 20,
    label: "20 min session",
    activity: "INTERACTIVE_COMMUNICATION",
  },
] as const;
