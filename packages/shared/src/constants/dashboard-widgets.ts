import type { ModuleId } from "./modules";

export const DASHBOARD_WIDGETS = {
  tracker_summary: {
    id: "tracker_summary",
    label: "Tracker Summary",
    description: "Overview of check-in submissions and trends",
    size: "half" as const,
    requiresModule: "daily_tracker" as ModuleId | null,
  },
  homework_status: {
    id: "homework_status",
    label: "Homework Status",
    description: "Completion rates and pending homework assignments",
    size: "half" as const,
    requiresModule: "homework" as ModuleId | null,
  },
  journal_activity: {
    id: "journal_activity",
    label: "Journal Activity",
    description: "Recent journal entries and writing frequency",
    size: "half" as const,
    requiresModule: "journal" as ModuleId | null,
  },
  assessment_scores: {
    id: "assessment_scores",
    label: "Assessment Scores",
    description: "Latest assessment results and score trends over time",
    size: "half" as const,
    requiresModule: "assessments" as ModuleId | null,
  },
  medication_adherence: {
    id: "medication_adherence",
    label: "Medication Adherence",
    description: "Medication adherence rates and missed dose alerts",
    size: "half" as const,
    requiresModule: "medication_tracker" as ModuleId | null,
  },
  side_effects_report: {
    id: "side_effects_report",
    label: "Side Effects Report",
    description: "Current side effects and severity trends",
    size: "half" as const,
    requiresModule: "side_effects" as ModuleId | null,
  },
  program_progress: {
    id: "program_progress",
    label: "Program Progress",
    description: "Module completion status and participant progress through the program",
    size: "half" as const,
    requiresModule: "program_modules" as ModuleId | null,
  },
  pre_visit: {
    id: "pre_visit",
    label: "Pre-Visit Summary",
    description: "Automated summary of participant activity since last session",
    size: "full" as const,
    requiresModule: "pre_visit_summary" as ModuleId | null,
  },
  recent_messages: {
    id: "recent_messages",
    label: "Recent Messages",
    description: "Latest secure messages from participants",
    size: "half" as const,
    requiresModule: "secure_messaging" as ModuleId | null,
  },
  rtm_overview: {
    id: "rtm_overview",
    label: "RTM Overview",
    description: "RTM billing status, monitoring days, and eligible codes",
    size: "full" as const,
    requiresModule: "rtm_billing" as ModuleId | null,
  },
  todo_progress: {
    id: "todo_progress",
    label: "To-Do Progress",
    description: "Task completion rates and overdue items",
    size: "half" as const,
    requiresModule: "todo_list" as ModuleId | null,
  },
} as const;

export type DashboardWidgetId = keyof typeof DASHBOARD_WIDGETS;
