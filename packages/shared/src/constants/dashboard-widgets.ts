import { z } from "zod";
import type { ModuleId } from "./modules";

// ── Widget Definition Interface ─────────────────────

export interface WidgetDefinition {
  id: string;
  label: string;
  description: string;
  page: "dashboard" | "client_overview";
  defaultColumn: "main" | "sidebar";
  supportedColumns: ("main" | "sidebar")[];
  requiresModule: ModuleId | null;
  settingsSchema: z.ZodType | null;
  defaultSettings: Record<string, unknown>;
}

// ── Settings Schemas ────────────────────────────────

export const ItemCountSettings = z.object({
  itemCount: z.number().int().min(1).max(25),
});

export const CheckinAlertSettings = z.object({
  daysBack: z.number().int().min(1).max(14),
  threshold: z.number().int().min(0).max(100),
});

export const RecentSubmissionsSettings = z.object({
  itemCount: z.number().int().min(1).max(25),
  daysBack: z.number().int().min(1).max(30),
});

export const QuickActionsSettings = z.object({
  links: z
    .array(
      z.object({
        label: z.string().max(50),
        path: z.string().max(200),
        icon: z.string().max(50).optional(),
      })
    )
    .max(10),
});

// ── Widget Registry ─────────────────────────────────

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  // ── Dashboard Widgets (20) ──────────────────────
  stat_active_clients: {
    id: "stat_active_clients",
    label: "Active Clients",
    description: "Total number of active clients",
    page: "dashboard",
    defaultColumn: "main",
    supportedColumns: ["main", "sidebar"],
    requiresModule: null,
    settingsSchema: null,
    defaultSettings: {},
  },
  stat_sessions_today: {
    id: "stat_sessions_today",
    label: "Sessions Today",
    description: "Number of sessions scheduled for today",
    page: "dashboard",
    defaultColumn: "main",
    supportedColumns: ["main", "sidebar"],
    requiresModule: null,
    settingsSchema: null,
    defaultSettings: {},
  },
  stat_homework_rate: {
    id: "stat_homework_rate",
    label: "Homework Rate",
    description: "Overall homework completion rate",
    page: "dashboard",
    defaultColumn: "main",
    supportedColumns: ["main", "sidebar"],
    requiresModule: "homework" as ModuleId,
    settingsSchema: null,
    defaultSettings: {},
  },
  stat_overdue_count: {
    id: "stat_overdue_count",
    label: "Overdue Count",
    description: "Number of overdue homework assignments",
    page: "dashboard",
    defaultColumn: "main",
    supportedColumns: ["main", "sidebar"],
    requiresModule: "homework" as ModuleId,
    settingsSchema: null,
    defaultSettings: {},
  },
  todays_sessions: {
    id: "todays_sessions",
    label: "Today's Sessions",
    description: "List of sessions scheduled for today",
    page: "dashboard",
    defaultColumn: "main",
    supportedColumns: ["main", "sidebar"],
    requiresModule: null,
    settingsSchema: null,
    defaultSettings: {},
  },
  checkin_alerts: {
    id: "checkin_alerts",
    label: "Check-in Alerts",
    description: "Alerts for missed or concerning check-ins",
    page: "dashboard",
    defaultColumn: "main",
    supportedColumns: ["main", "sidebar"],
    requiresModule: "daily_tracker" as ModuleId,
    settingsSchema: CheckinAlertSettings,
    defaultSettings: { daysBack: 3, threshold: 30 },
  },
  overdue_homework: {
    id: "overdue_homework",
    label: "Overdue Homework",
    description: "List of overdue homework assignments",
    page: "dashboard",
    defaultColumn: "main",
    supportedColumns: ["main", "sidebar"],
    requiresModule: "homework" as ModuleId,
    settingsSchema: ItemCountSettings,
    defaultSettings: { itemCount: 10 },
  },
  recent_submissions: {
    id: "recent_submissions",
    label: "Recent Submissions",
    description: "Recently submitted homework and assignments",
    page: "dashboard",
    defaultColumn: "sidebar",
    supportedColumns: ["main", "sidebar"],
    requiresModule: "homework" as ModuleId,
    settingsSchema: RecentSubmissionsSettings,
    defaultSettings: { itemCount: 10, daysBack: 7 },
  },
  quick_actions: {
    id: "quick_actions",
    label: "Quick Actions",
    description: "Shortcut links to common actions",
    page: "dashboard",
    defaultColumn: "sidebar",
    supportedColumns: ["main", "sidebar"],
    requiresModule: null,
    settingsSchema: QuickActionsSettings,
    defaultSettings: {
      links: [
        { label: "Programs", path: "/programs" },
        { label: "Clients", path: "/participants" },
        { label: "Sessions", path: "/sessions" },
      ],
    },
  },
  tracker_summary: {
    id: "tracker_summary",
    label: "Tracker Summary",
    description: "Overview of check-in submissions and trends",
    page: "dashboard",
    defaultColumn: "main",
    supportedColumns: ["main", "sidebar"],
    requiresModule: "daily_tracker" as ModuleId,
    settingsSchema: null,
    defaultSettings: {},
  },
  homework_status: {
    id: "homework_status",
    label: "Homework Status",
    description: "Completion rates and pending homework assignments",
    page: "dashboard",
    defaultColumn: "main",
    supportedColumns: ["main", "sidebar"],
    requiresModule: "homework" as ModuleId,
    settingsSchema: null,
    defaultSettings: {},
  },
  journal_activity: {
    id: "journal_activity",
    label: "Journal Activity",
    description: "Recent journal entries and writing frequency",
    page: "dashboard",
    defaultColumn: "sidebar",
    supportedColumns: ["main", "sidebar"],
    requiresModule: "journal" as ModuleId,
    settingsSchema: ItemCountSettings,
    defaultSettings: { itemCount: 5 },
  },
  assessment_scores: {
    id: "assessment_scores",
    label: "Assessment Scores",
    description: "Latest assessment results and score trends over time",
    page: "dashboard",
    defaultColumn: "main",
    supportedColumns: ["main", "sidebar"],
    requiresModule: "assessments" as ModuleId,
    settingsSchema: null,
    defaultSettings: {},
  },
  medication_adherence: {
    id: "medication_adherence",
    label: "Medication Adherence",
    description: "Medication adherence rates and missed dose alerts",
    page: "dashboard",
    defaultColumn: "sidebar",
    supportedColumns: ["main", "sidebar"],
    requiresModule: "medication_tracker" as ModuleId,
    settingsSchema: null,
    defaultSettings: {},
  },
  side_effects_report: {
    id: "side_effects_report",
    label: "Side Effects Report",
    description: "Current side effects and severity trends",
    page: "dashboard",
    defaultColumn: "main",
    supportedColumns: ["main", "sidebar"],
    requiresModule: "side_effects" as ModuleId,
    settingsSchema: null,
    defaultSettings: {},
  },
  program_progress: {
    id: "program_progress",
    label: "Program Progress",
    description: "Module completion status and participant progress through the program",
    page: "dashboard",
    defaultColumn: "main",
    supportedColumns: ["main", "sidebar"],
    requiresModule: "program_modules" as ModuleId,
    settingsSchema: null,
    defaultSettings: {},
  },
  pre_visit: {
    id: "pre_visit",
    label: "Pre-Visit Summary",
    description: "Automated summary of participant activity since last session",
    page: "dashboard",
    defaultColumn: "main",
    supportedColumns: ["main", "sidebar"],
    requiresModule: "pre_visit_summary" as ModuleId,
    settingsSchema: null,
    defaultSettings: {},
  },
  recent_messages: {
    id: "recent_messages",
    label: "Recent Messages",
    description: "Latest secure messages from participants",
    page: "dashboard",
    defaultColumn: "sidebar",
    supportedColumns: ["main", "sidebar"],
    requiresModule: "secure_messaging" as ModuleId,
    settingsSchema: ItemCountSettings,
    defaultSettings: { itemCount: 5 },
  },
  rtm_overview: {
    id: "rtm_overview",
    label: "RTM Overview",
    description: "RTM billing status, monitoring days, and eligible codes",
    page: "dashboard",
    defaultColumn: "main",
    supportedColumns: ["main", "sidebar"],
    requiresModule: "rtm_billing" as ModuleId,
    settingsSchema: null,
    defaultSettings: {},
  },
  todo_progress: {
    id: "todo_progress",
    label: "To-Do Progress",
    description: "Task completion rates and overdue items",
    page: "dashboard",
    defaultColumn: "sidebar",
    supportedColumns: ["main", "sidebar"],
    requiresModule: "todo_list" as ModuleId,
    settingsSchema: null,
    defaultSettings: {},
  },

  // ── Client Overview Widgets (10) ────────────────
  client_demographics: {
    id: "client_demographics",
    label: "Client Info",
    description: "Client demographic information and contact details",
    page: "client_overview",
    defaultColumn: "main",
    supportedColumns: ["main", "sidebar"],
    requiresModule: null,
    settingsSchema: null,
    defaultSettings: {},
  },
  client_sessions: {
    id: "client_sessions",
    label: "Session History",
    description: "History of sessions with this client",
    page: "client_overview",
    defaultColumn: "main",
    supportedColumns: ["main", "sidebar"],
    requiresModule: null,
    settingsSchema: ItemCountSettings,
    defaultSettings: { itemCount: 10 },
  },
  client_homework: {
    id: "client_homework",
    label: "Homework",
    description: "Homework assignments for this client",
    page: "client_overview",
    defaultColumn: "main",
    supportedColumns: ["main", "sidebar"],
    requiresModule: "homework" as ModuleId,
    settingsSchema: null,
    defaultSettings: {},
  },
  client_trackers: {
    id: "client_trackers",
    label: "Daily Trackers",
    description: "Daily tracker entries for this client",
    page: "client_overview",
    defaultColumn: "main",
    supportedColumns: ["main", "sidebar"],
    requiresModule: "daily_tracker" as ModuleId,
    settingsSchema: null,
    defaultSettings: {},
  },
  client_assessments: {
    id: "client_assessments",
    label: "Assessments",
    description: "Assessment results for this client",
    page: "client_overview",
    defaultColumn: "main",
    supportedColumns: ["main", "sidebar"],
    requiresModule: "assessments" as ModuleId,
    settingsSchema: null,
    defaultSettings: {},
  },
  client_journal: {
    id: "client_journal",
    label: "Journal Entries",
    description: "Journal entries from this client",
    page: "client_overview",
    defaultColumn: "sidebar",
    supportedColumns: ["main", "sidebar"],
    requiresModule: "journal" as ModuleId,
    settingsSchema: ItemCountSettings,
    defaultSettings: { itemCount: 5 },
  },
  client_progress: {
    id: "client_progress",
    label: "Program Progress",
    description: "Program progress for this client",
    page: "client_overview",
    defaultColumn: "main",
    supportedColumns: ["main", "sidebar"],
    requiresModule: "program_modules" as ModuleId,
    settingsSchema: null,
    defaultSettings: {},
  },
  client_alerts: {
    id: "client_alerts",
    label: "Alerts",
    description: "Active alerts for this client",
    page: "client_overview",
    defaultColumn: "sidebar",
    supportedColumns: ["main", "sidebar"],
    requiresModule: null,
    settingsSchema: null,
    defaultSettings: {},
  },
  client_notes: {
    id: "client_notes",
    label: "Session Notes",
    description: "Notes from sessions with this client",
    page: "client_overview",
    defaultColumn: "sidebar",
    supportedColumns: ["main", "sidebar"],
    requiresModule: null,
    settingsSchema: ItemCountSettings,
    defaultSettings: { itemCount: 5 },
  },
  client_quick_actions: {
    id: "client_quick_actions",
    label: "Quick Actions",
    description: "Shortcut links for common client actions",
    page: "client_overview",
    defaultColumn: "sidebar",
    supportedColumns: ["main", "sidebar"],
    requiresModule: null,
    settingsSchema: QuickActionsSettings,
    defaultSettings: {
      links: [
        { label: "Schedule Session", path: "/sessions/new" },
        { label: "Assign Homework", path: "/programs" },
      ],
    },
  },
};

// ── Helpers ───────────────────────────────────────────

export function getDashboardWidgets(): WidgetDefinition[] {
  return Object.values(WIDGET_REGISTRY).filter((w) => w.page === "dashboard");
}

export function getClientOverviewWidgets(): WidgetDefinition[] {
  return Object.values(WIDGET_REGISTRY).filter((w) => w.page === "client_overview");
}

export type DashboardWidgetId = string;
