import type { ModuleId } from "./modules";
import type { ProviderType } from "../schemas/config";
import type { DashboardWidgetId } from "./dashboard-widgets";

export interface ProviderPreset {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly providerType: ProviderType;
  readonly enabledModules: readonly ModuleId[];
  readonly defaultTrackerPreset: string;
  readonly dashboardLayout: readonly DashboardWidgetId[];
  readonly defaultAssessments: readonly string[];
}

export const PROVIDER_PRESETS = {
  THERAPIST_CBT: {
    id: "THERAPIST_CBT",
    label: "Therapist — CBT",
    description: "Cognitive Behavioral Therapy focus with thought records, homework, and structured skill-building",
    providerType: "THERAPIST",
    enabledModules: [
      "daily_tracker", "homework", "journal", "assessments",
      "strategy_cards", "program_modules", "pre_visit_summary",
      "secure_messaging", "rtm_billing",
    ],
    defaultTrackerPreset: "cbt_standard",
    dashboardLayout: [
      "tracker_summary", "homework_status", "journal_activity",
      "assessment_scores", "program_progress", "pre_visit",
      "recent_messages", "rtm_overview",
    ],
    defaultAssessments: ["ASRS", "PHQ-9", "GAD-7"],
  },
  THERAPIST_DBT: {
    id: "THERAPIST_DBT",
    label: "Therapist — DBT",
    description: "Dialectical Behavior Therapy focus with emotion regulation tracking and distress tolerance skills",
    providerType: "THERAPIST",
    enabledModules: [
      "daily_tracker", "homework", "journal", "assessments",
      "strategy_cards", "program_modules", "pre_visit_summary",
      "secure_messaging", "rtm_billing",
    ],
    defaultTrackerPreset: "dbt_diary_card",
    dashboardLayout: [
      "tracker_summary", "homework_status", "journal_activity",
      "assessment_scores", "program_progress", "pre_visit",
      "recent_messages", "rtm_overview",
    ],
    defaultAssessments: ["ASRS", "PHQ-9", "DERS-18"],
  },
  THERAPIST_TRAUMA: {
    id: "THERAPIST_TRAUMA",
    label: "Therapist — Trauma",
    description: "Trauma-focused therapy with PTSD symptom tracking and safety planning",
    providerType: "THERAPIST",
    enabledModules: [
      "daily_tracker", "homework", "journal", "assessments",
      "strategy_cards", "audio_resources", "program_modules",
      "pre_visit_summary", "secure_messaging", "rtm_billing",
    ],
    defaultTrackerPreset: "trauma_focused",
    dashboardLayout: [
      "tracker_summary", "homework_status", "journal_activity",
      "assessment_scores", "program_progress", "pre_visit",
      "recent_messages", "rtm_overview",
    ],
    defaultAssessments: ["ASRS", "PCL-5", "PHQ-9", "GAD-7"],
  },
  THERAPIST_OCD: {
    id: "THERAPIST_OCD",
    label: "Therapist — OCD",
    description: "OCD-focused with exposure hierarchy tracking and compulsion monitoring",
    providerType: "THERAPIST",
    enabledModules: [
      "daily_tracker", "homework", "journal", "assessments",
      "strategy_cards", "program_modules", "pre_visit_summary",
      "secure_messaging", "rtm_billing",
    ],
    defaultTrackerPreset: "ocd_erp",
    dashboardLayout: [
      "tracker_summary", "homework_status", "journal_activity",
      "assessment_scores", "program_progress", "pre_visit",
      "recent_messages", "rtm_overview",
    ],
    defaultAssessments: ["ASRS", "Y-BOCS", "PHQ-9", "GAD-7"],
  },
  THERAPIST_SUBSTANCE: {
    id: "THERAPIST_SUBSTANCE",
    label: "Therapist — Substance Use",
    description: "Substance use treatment with craving tracking and relapse prevention",
    providerType: "THERAPIST",
    enabledModules: [
      "daily_tracker", "homework", "journal", "assessments",
      "strategy_cards", "program_modules", "pre_visit_summary",
      "secure_messaging", "rtm_billing",
    ],
    defaultTrackerPreset: "substance_use",
    dashboardLayout: [
      "tracker_summary", "homework_status", "journal_activity",
      "assessment_scores", "program_progress", "pre_visit",
      "recent_messages", "rtm_overview",
    ],
    defaultAssessments: ["ASRS", "AUDIT", "DAST-10", "PHQ-9"],
  },
  THERAPIST_INSOMNIA: {
    id: "THERAPIST_INSOMNIA",
    label: "Therapist — Insomnia (CBT-I)",
    description: "Insomnia-focused CBT with sleep diary and sleep hygiene tracking",
    providerType: "THERAPIST",
    enabledModules: [
      "daily_tracker", "homework", "journal", "assessments",
      "strategy_cards", "program_modules", "pre_visit_summary",
      "secure_messaging", "rtm_billing",
    ],
    defaultTrackerPreset: "cbti_sleep_diary",
    dashboardLayout: [
      "tracker_summary", "homework_status", "journal_activity",
      "assessment_scores", "program_progress", "pre_visit",
      "recent_messages", "rtm_overview",
    ],
    defaultAssessments: ["ASRS", "ISI", "PHQ-9", "GAD-7"],
  },
  PSYCHIATRIST_MED_MGMT: {
    id: "PSYCHIATRIST_MED_MGMT",
    label: "Psychiatrist — Medication Management",
    description: "Medication-focused with adherence tracking, side effects monitoring, and outcome assessments",
    providerType: "PSYCHIATRIST",
    enabledModules: [
      "daily_tracker", "assessments", "medication_tracker",
      "side_effects", "pre_visit_summary", "secure_messaging",
      "rtm_billing",
    ],
    defaultTrackerPreset: "med_management",
    dashboardLayout: [
      "tracker_summary", "medication_adherence", "side_effects_report",
      "assessment_scores", "pre_visit", "recent_messages", "rtm_overview",
    ],
    defaultAssessments: ["ASRS", "PHQ-9", "GAD-7"],
  },
  PSYCHIATRIST_INTEGRATED: {
    id: "PSYCHIATRIST_INTEGRATED",
    label: "Psychiatrist — Integrated",
    description: "Combined medication management and therapy with full monitoring suite",
    providerType: "PSYCHIATRIST",
    enabledModules: [
      "daily_tracker", "homework", "journal", "assessments",
      "medication_tracker", "side_effects", "strategy_cards",
      "program_modules", "pre_visit_summary", "secure_messaging",
      "rtm_billing",
    ],
    defaultTrackerPreset: "integrated_psych",
    dashboardLayout: [
      "tracker_summary", "medication_adherence", "side_effects_report",
      "homework_status", "journal_activity", "assessment_scores",
      "program_progress", "pre_visit", "recent_messages", "rtm_overview",
    ],
    defaultAssessments: ["ASRS", "PHQ-9", "GAD-7"],
  },
  PSYCH_NP: {
    id: "PSYCH_NP",
    label: "Psychiatric Nurse Practitioner",
    description: "Medication management with monitoring, similar to psychiatrist med management",
    providerType: "PSYCH_NP",
    enabledModules: [
      "daily_tracker", "assessments", "medication_tracker",
      "side_effects", "pre_visit_summary", "secure_messaging",
      "rtm_billing",
    ],
    defaultTrackerPreset: "med_management",
    dashboardLayout: [
      "tracker_summary", "medication_adherence", "side_effects_report",
      "assessment_scores", "pre_visit", "recent_messages", "rtm_overview",
    ],
    defaultAssessments: ["ASRS", "PHQ-9", "GAD-7"],
  },
  COACH_ADHD: {
    id: "COACH_ADHD",
    label: "ADHD Coach",
    description: "Executive function coaching with productivity tools and habit tracking",
    providerType: "COACH",
    enabledModules: [
      "daily_tracker", "journal", "strategy_cards", "todo_list",
      "calendar", "secure_messaging",
    ],
    defaultTrackerPreset: "coaching_exec_function",
    dashboardLayout: [
      "tracker_summary", "journal_activity", "todo_progress",
      "recent_messages",
    ],
    defaultAssessments: ["ASRS"],
  },
  GENERAL: {
    id: "GENERAL",
    label: "General",
    description: "Balanced default configuration suitable for any provider type",
    providerType: "OTHER",
    enabledModules: [
      "daily_tracker", "homework", "journal", "assessments",
      "strategy_cards", "program_modules", "pre_visit_summary",
      "secure_messaging",
    ],
    defaultTrackerPreset: "general",
    dashboardLayout: [
      "tracker_summary", "homework_status", "journal_activity",
      "assessment_scores", "program_progress", "pre_visit",
      "recent_messages",
    ],
    defaultAssessments: ["ASRS", "PHQ-9", "GAD-7"],
  },
} as const satisfies Record<string, ProviderPreset>;

export type ProviderPresetId = keyof typeof PROVIDER_PRESETS;

export function getPresetsForProviderType(
  providerType: ProviderType
): ProviderPreset[] {
  return Object.values(PROVIDER_PRESETS).filter(
    (preset) => preset.providerType === providerType
  );
}
