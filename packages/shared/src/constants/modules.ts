import type { ProviderType } from "../schemas/config";

export type ModuleCategory =
  | "MONITORING"
  | "ENGAGEMENT"
  | "PRODUCTIVITY"
  | "CLINICAL"
  | "COMMUNICATION"
  | "BILLING";

export const MODULE_CATEGORIES = [
  "MONITORING",
  "ENGAGEMENT",
  "PRODUCTIVITY",
  "CLINICAL",
  "COMMUNICATION",
  "BILLING",
] as const;

export const MODULE_REGISTRY = {
  daily_tracker: {
    id: "daily_tracker",
    label: "Check-in",
    description: "Track daily symptoms, mood, focus, and medication adherence with customizable metrics",
    icon: "Activity",
    category: "MONITORING" as ModuleCategory,
    defaultFor: ["THERAPIST", "PSYCHIATRIST", "PSYCHOLOGIST", "COUNSELOR", "PSYCH_NP", "COACH"] as ProviderType[],
    clientFacing: true,
    dashboardWidget: true,
  },
  homework: {
    id: "homework",
    label: "Homework",
    description: "Assign and track therapeutic homework between sessions",
    icon: "BookOpen",
    category: "ENGAGEMENT" as ModuleCategory,
    defaultFor: ["THERAPIST", "PSYCHOLOGIST", "COUNSELOR"] as ProviderType[],
    clientFacing: true,
    dashboardWidget: true,
  },
  journal: {
    id: "journal",
    label: "Journal",
    description: "Guided and free-form journaling for reflection and thought tracking",
    icon: "PenLine",
    category: "ENGAGEMENT" as ModuleCategory,
    defaultFor: ["THERAPIST", "PSYCHOLOGIST", "COUNSELOR", "COACH"] as ProviderType[],
    clientFacing: true,
    dashboardWidget: true,
  },
  assessments: {
    id: "assessments",
    label: "Assessments",
    description: "Standardized clinical assessments (ASRS, PHQ-9, GAD-7) for outcome measurement",
    icon: "ClipboardCheck",
    category: "CLINICAL" as ModuleCategory,
    defaultFor: ["THERAPIST", "PSYCHIATRIST", "PSYCHOLOGIST", "COUNSELOR", "PSYCH_NP"] as ProviderType[],
    clientFacing: true,
    dashboardWidget: true,
  },
  strategy_cards: {
    id: "strategy_cards",
    label: "Strategy Cards",
    description: "Quick-reference coping strategies and techniques accessible on demand",
    icon: "Lightbulb",
    category: "ENGAGEMENT" as ModuleCategory,
    defaultFor: ["THERAPIST", "PSYCHOLOGIST", "COUNSELOR", "COACH"] as ProviderType[],
    clientFacing: true,
    dashboardWidget: false,
  },
  medication_tracker: {
    id: "medication_tracker",
    label: "Medication Tracker",
    description: "Track medication schedules, dosages, and adherence over time",
    icon: "Pill",
    category: "MONITORING" as ModuleCategory,
    defaultFor: ["PSYCHIATRIST", "PSYCH_NP"] as ProviderType[],
    clientFacing: true,
    dashboardWidget: true,
  },
  side_effects: {
    id: "side_effects",
    label: "Side Effects",
    description: "Monitor and report medication side effects with severity tracking",
    icon: "AlertTriangle",
    category: "MONITORING" as ModuleCategory,
    defaultFor: ["PSYCHIATRIST", "PSYCH_NP"] as ProviderType[],
    clientFacing: true,
    dashboardWidget: true,
  },
  todo_list: {
    id: "todo_list",
    label: "To-Do List",
    description: "Task management with prioritization and completion tracking for daily life",
    icon: "CheckSquare",
    category: "PRODUCTIVITY" as ModuleCategory,
    defaultFor: ["COACH"] as ProviderType[],
    clientFacing: true,
    dashboardWidget: true,
  },
  calendar: {
    id: "calendar",
    label: "Calendar",
    description: "Session scheduling, reminders, and time management tools",
    icon: "Calendar",
    category: "PRODUCTIVITY" as ModuleCategory,
    defaultFor: ["COACH"] as ProviderType[],
    clientFacing: true,
    dashboardWidget: true,
  },
  audio_resources: {
    id: "audio_resources",
    label: "Audio Resources",
    description: "Guided meditations, mindfulness exercises, and psychoeducation audio content",
    icon: "Headphones",
    category: "ENGAGEMENT" as ModuleCategory,
    defaultFor: [] as ProviderType[],
    clientFacing: true,
    dashboardWidget: false,
  },
  program_modules: {
    id: "program_modules",
    label: "Program Modules",
    description: "Structured psychoeducation and skill-building content delivered in sequential modules",
    icon: "GraduationCap",
    category: "CLINICAL" as ModuleCategory,
    defaultFor: ["THERAPIST", "PSYCHOLOGIST", "COUNSELOR"] as ProviderType[],
    clientFacing: true,
    dashboardWidget: true,
  },
  pre_visit_summary: {
    id: "pre_visit_summary",
    label: "Pre-Visit Summary",
    description: "Automated summary of participant activity and progress since last session",
    icon: "FileText",
    category: "CLINICAL" as ModuleCategory,
    defaultFor: ["THERAPIST", "PSYCHIATRIST", "PSYCHOLOGIST", "COUNSELOR", "PSYCH_NP"] as ProviderType[],
    clientFacing: false,
    dashboardWidget: true,
  },
  secure_messaging: {
    id: "secure_messaging",
    label: "Secure Messaging",
    description: "HIPAA-compliant messaging between clinician and participant",
    icon: "MessageSquareLock",
    category: "COMMUNICATION" as ModuleCategory,
    defaultFor: ["THERAPIST", "PSYCHIATRIST", "PSYCHOLOGIST", "COUNSELOR", "PSYCH_NP", "COACH"] as ProviderType[],
    clientFacing: true,
    dashboardWidget: true,
  },
  rtm_billing: {
    id: "rtm_billing",
    label: "RTM Billing",
    description: "Remote Therapeutic Monitoring billing code tracking and superbill generation",
    icon: "Receipt",
    category: "BILLING" as ModuleCategory,
    defaultFor: ["THERAPIST", "PSYCHIATRIST", "PSYCHOLOGIST", "PSYCH_NP"] as ProviderType[],
    clientFacing: false,
    dashboardWidget: true,
  },
} as const;

export type ModuleId = keyof typeof MODULE_REGISTRY;

export function getModulesForCategory(
  category: ModuleCategory
): (typeof MODULE_REGISTRY)[ModuleId][] {
  return Object.values(MODULE_REGISTRY).filter(
    (mod) => mod.category === category
  );
}

export function getDefaultModules(providerType: ProviderType): ModuleId[] {
  return (Object.entries(MODULE_REGISTRY) as [ModuleId, (typeof MODULE_REGISTRY)[ModuleId]][])
    .filter(([, mod]) => mod.defaultFor.includes(providerType))
    .map(([id]) => id);
}
