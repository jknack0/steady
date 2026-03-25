# Customizable Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded clinician dashboard with a customizable widget system — drag-and-drop layout, per-widget settings, and the same system reused on the client overview page.

**Architecture:** A typed widget registry in `@steady/shared` defines all available widgets with their settings schemas. The existing `dashboardLayout` JSON field on `ClinicianConfig` stores the layout (extended with `column`, `order`, `settings`). The frontend reads the layout, renders widgets from a component registry, and provides a slide-out customize panel for editing. `@dnd-kit` (already installed) handles drag-and-drop.

**Tech Stack:** React 19, TypeScript strict, TanStack Query, @dnd-kit/core + @dnd-kit/sortable, Tailwind CSS, Zod, Prisma, Express

**Spec:** `docs/superpowers/specs/2026-03-25-customizable-dashboard-design.md`

---

## File Map

### Shared Package (`packages/shared/`)

| File | Action | Purpose |
|---|---|---|
| `src/constants/dashboard-widgets.ts` | **Rewrite** | New `WidgetDefinition` interface, 20 dashboard widgets + 10 client overview widgets |
| `src/constants/provider-presets.ts` | **Modify** | Update `ProviderPreset` interface, change `dashboardLayout` from flat ID array to `DashboardLayoutItem[]`, add `clientOverviewLayout` |
| `src/schemas/config.ts` | **Modify** | Extend `DashboardWidgetSchema` with `column`, `order`, `settings`; add `SaveDashboardLayoutSchema`; add `clientOverviewLayout` to both config schemas |
| `src/lib/normalize-layout.ts` | **Create** | `normalizeDashboardLayout()` function — hydrates missing fields from registry |

### API Package (`packages/api/`)

| File | Action | Purpose |
|---|---|---|
| `src/services/config.ts` | **Modify** | Extend `saveClinicianConfig` data type, add `saveDashboardLayout` + `saveClientOverviewLayout` service functions, update `createDefaultConfig`, add `clientOverviewLayout` to `resolveClientConfig` |
| `src/routes/config.ts` | **Modify** | Add `PATCH /dashboard-layout` and `PATCH /clients/:clientId/overview-layout` routes |
| `src/__tests__/config.test.ts` | **Create** | Tests for config routes — layout save/load, PATCH endpoints, backward compatibility |

### Database (`packages/db/`)

| File | Action | Purpose |
|---|---|---|
| `prisma/schema.prisma` | **Modify** | Add `clientOverviewLayout Json?` to `ClinicianConfig` and `ClientConfig` |

### Web App (`apps/web/`)

| File | Action | Purpose |
|---|---|---|
| `src/hooks/use-config.ts` | **Modify** | Add `useSaveDashboardLayout` mutation hook, update `ClinicianConfigData` type |
| `src/components/dashboard-widgets/widget-shell.tsx` | **Create** | Shared widget wrapper — drag handle, title, loading skeleton, error boundary |
| `src/components/dashboard-widgets/stat-widget.tsx` | **Create** | Renders all 4 stat card variants |
| `src/components/dashboard-widgets/todays-sessions.tsx` | **Create** | Today's sessions widget (extracted from current dashboard) |
| `src/components/dashboard-widgets/checkin-alerts.tsx` | **Create** | Check-in alerts widget (extracted) |
| `src/components/dashboard-widgets/overdue-homework.tsx` | **Create** | Overdue homework widget (extracted) |
| `src/components/dashboard-widgets/recent-submissions.tsx` | **Create** | Recent submissions widget (extracted) |
| `src/components/dashboard-widgets/quick-actions.tsx` | **Create** | Quick actions widget (extracted) |
| `src/components/dashboard-widgets/index.ts` | **Create** | Widget component registry mapping IDs → components |
| `src/components/customize-panel.tsx` | **Create** | Slide-out customize panel with toggle/reorder/settings |
| `src/components/widget-grid.tsx` | **Create** | Layout renderer — reads layout, renders two columns, wraps in DndContext |
| `src/app/(dashboard)/dashboard/page.tsx` | **Rewrite** | Config-driven layout using widget-grid + customize panel |
| `src/app/(dashboard)/layout.tsx` | **Modify** | Add "Customize Dashboard" link in sidebar nav |

---

## Task 1: Extend Zod Schema & Types

**Files:**
- Modify: `packages/shared/src/schemas/config.ts`
- Test: `packages/shared/src/__tests__/config-schema.test.ts`

- [ ] **Step 1: Write failing tests for the extended schema**

Create `packages/shared/src/__tests__/config-schema.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  SaveClinicianConfigSchema,
  SaveClientConfigSchema,
  SaveDashboardLayoutSchema,
  DashboardLayoutItemSchema,
} from "../schemas/config";

describe("DashboardLayoutItemSchema", () => {
  it("accepts full item with all fields", () => {
    const result = DashboardLayoutItemSchema.safeParse({
      widgetId: "stat_active_clients",
      visible: true,
      column: "main",
      order: 0,
      settings: { itemCount: 5 },
    });
    expect(result.success).toBe(true);
  });

  it("accepts legacy shape with only widgetId and visible (backward compat)", () => {
    const result = DashboardLayoutItemSchema.safeParse({
      widgetId: "tracker_summary",
      visible: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.column).toBe("main");
      expect(result.data.order).toBe(0);
      expect(result.data.settings).toEqual({});
    }
  });

  it("rejects invalid column value", () => {
    const result = DashboardLayoutItemSchema.safeParse({
      widgetId: "test",
      visible: true,
      column: "footer",
    });
    expect(result.success).toBe(false);
  });
});

describe("SaveClinicianConfigSchema", () => {
  it("accepts clientOverviewLayout", () => {
    const result = SaveClinicianConfigSchema.safeParse({
      providerType: "THERAPIST",
      enabledModules: ["daily_tracker"],
      dashboardLayout: [{ widgetId: "stat_active_clients", visible: true }],
      clientOverviewLayout: [
        { widgetId: "client_demographics", visible: true, column: "main", order: 0, settings: {} },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("caps layout array at 50 items", () => {
    const items = Array.from({ length: 51 }, (_, i) => ({
      widgetId: `widget_${i}`,
      visible: true,
    }));
    const result = SaveClinicianConfigSchema.safeParse({
      providerType: "THERAPIST",
      enabledModules: ["daily_tracker"],
      dashboardLayout: items,
    });
    expect(result.success).toBe(false);
  });
});

describe("SaveDashboardLayoutSchema", () => {
  it("accepts dashboardLayout only", () => {
    const result = SaveDashboardLayoutSchema.safeParse({
      dashboardLayout: [{ widgetId: "stat_active_clients", visible: true, column: "main", order: 0, settings: {} }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts clientOverviewLayout only", () => {
    const result = SaveDashboardLayoutSchema.safeParse({
      clientOverviewLayout: [{ widgetId: "client_demographics", visible: true, column: "main", order: 0, settings: {} }],
    });
    expect(result.success).toBe(true);
  });
});

describe("SaveClientConfigSchema", () => {
  it("accepts clientOverviewLayout", () => {
    const result = SaveClientConfigSchema.safeParse({
      clientOverviewLayout: [
        { widgetId: "client_homework", visible: true, column: "main", order: 0, settings: {} },
      ],
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/shared && npx vitest run src/__tests__/config-schema.test.ts`
Expected: FAIL — `SaveDashboardLayoutSchema` and `DashboardLayoutItemSchema` not exported

- [ ] **Step 3: Implement schema changes**

Modify `packages/shared/src/schemas/config.ts`:

```typescript
import { z } from "zod";

// ── Enums ──────────────────────────────────────────

export const ProviderTypeEnum = z.enum([
  "THERAPIST",
  "PSYCHIATRIST",
  "PSYCHOLOGIST",
  "COUNSELOR",
  "PSYCH_NP",
  "COACH",
  "OTHER",
]);

export const AssessmentFrequencyEnum = z.enum([
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
]);

// ── Shared Objects ─────────────────────────────────

export const DashboardLayoutItemSchema = z.object({
  widgetId: z.string().max(100),
  visible: z.boolean(),
  column: z.enum(["main", "sidebar"]).default("main"),
  order: z.number().int().min(0).default(0),
  settings: z.record(z.unknown()).default({}),
});

const AssessmentConfigSchema = z.object({
  instrumentId: z.string(),
  frequency: AssessmentFrequencyEnum,
});

const MedicationSchema = z.object({
  name: z.string().max(200),
  dosage: z.string().max(100),
  frequency: z.string().max(100),
  startDate: z.string().optional(),
});

// ── Save Clinician Config ──────────────────────────

export const SaveClinicianConfigSchema = z.object({
  providerType: ProviderTypeEnum,
  presetId: z.string().max(100).optional(),
  primaryModality: z.string().max(200).optional(),
  enabledModules: z.array(z.string().max(50)).min(1),
  dashboardLayout: z.array(DashboardLayoutItemSchema).max(50),
  clientOverviewLayout: z.array(DashboardLayoutItemSchema).max(50).optional(),
  defaultTrackerPreset: z.string().max(100).optional(),
  defaultAssessments: z.array(AssessmentConfigSchema).optional(),
  practiceName: z.string().max(200).optional(),
  brandColor: z.string().max(7).optional(),
});

// ── Save Dashboard Layout (PATCH endpoint) ─────────

export const SaveDashboardLayoutSchema = z.object({
  dashboardLayout: z.array(DashboardLayoutItemSchema).max(50).optional(),
  clientOverviewLayout: z.array(DashboardLayoutItemSchema).max(50).optional(),
}).refine(
  (data) => data.dashboardLayout || data.clientOverviewLayout,
  { message: "At least one layout must be provided" }
);

// ── Save Client Overview Layout (PATCH endpoint) ───

export const SaveClientOverviewLayoutSchema = z.object({
  clientOverviewLayout: z.array(DashboardLayoutItemSchema).max(50),
});

// ── Save Client Config ─────────────────────────────

export const SaveClientConfigSchema = z.object({
  enabledModules: z.array(z.string().max(50)).optional(),
  activeTrackers: z.array(z.string()).optional(),
  activeAssessments: z.array(AssessmentConfigSchema).optional(),
  activeMedications: z.array(MedicationSchema).optional(),
  clientOverviewLayout: z.array(DashboardLayoutItemSchema).max(50).optional(),
});

// ── Types ──────────────────────────────────────────

export type ProviderType = z.infer<typeof ProviderTypeEnum>;
export type AssessmentFrequency = z.infer<typeof AssessmentFrequencyEnum>;
export type DashboardLayoutItem = z.infer<typeof DashboardLayoutItemSchema>;
export type SaveClinicianConfigInput = z.infer<typeof SaveClinicianConfigSchema>;
export type SaveClientConfigInput = z.infer<typeof SaveClientConfigSchema>;
export type SaveDashboardLayoutInput = z.infer<typeof SaveDashboardLayoutSchema>;
export type SaveClientOverviewLayoutInput = z.infer<typeof SaveClientOverviewLayoutSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/shared && npx vitest run src/__tests__/config-schema.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/schemas/config.ts packages/shared/src/__tests__/config-schema.test.ts
git commit -m "feat(shared): extend dashboard layout schema with column, order, settings

Add backward-compatible fields to DashboardLayoutItemSchema.
Add SaveDashboardLayoutSchema for PATCH endpoint.
Add clientOverviewLayout to both config schemas."
```

---

## Task 2: Rewrite Widget Registry

**Files:**
- Rewrite: `packages/shared/src/constants/dashboard-widgets.ts`
- Create: `packages/shared/src/lib/normalize-layout.ts`
- Test: `packages/shared/src/__tests__/dashboard-widgets.test.ts`

- [ ] **Step 1: Write failing tests for registry and normalization**

Create `packages/shared/src/__tests__/dashboard-widgets.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  WIDGET_REGISTRY,
  getDashboardWidgets,
  getClientOverviewWidgets,
  type WidgetDefinition,
} from "../constants/dashboard-widgets";
import { normalizeDashboardLayout } from "../lib/normalize-layout";

describe("WIDGET_REGISTRY", () => {
  it("contains all 20 dashboard widgets", () => {
    const dashboardWidgets = getDashboardWidgets();
    expect(dashboardWidgets.length).toBe(20);
  });

  it("contains all 10 client overview widgets", () => {
    const clientWidgets = getClientOverviewWidgets();
    expect(clientWidgets.length).toBe(10);
  });

  it("every widget has required fields", () => {
    for (const widget of Object.values(WIDGET_REGISTRY)) {
      expect(widget.id).toBeTruthy();
      expect(widget.label).toBeTruthy();
      expect(widget.page).toMatch(/^(dashboard|client_overview)$/);
      expect(widget.defaultColumn).toMatch(/^(main|sidebar)$/);
      expect(widget.supportedColumns.length).toBeGreaterThan(0);
    }
  });

  it("widget defaultSettings match settingsSchema when present", () => {
    for (const widget of Object.values(WIDGET_REGISTRY)) {
      if (widget.settingsSchema) {
        const result = widget.settingsSchema.safeParse(widget.defaultSettings);
        expect(result.success).toBe(true);
      }
    }
  });
});

describe("normalizeDashboardLayout", () => {
  const registry = Object.values(WIDGET_REGISTRY);

  it("hydrates missing column, order, settings from legacy items", () => {
    const legacy = [
      { widgetId: "tracker_summary", visible: true },
      { widgetId: "homework_status", visible: false },
    ];
    const result = normalizeDashboardLayout(legacy, registry);
    expect(result[0].column).toBe("main"); // tracker_summary default
    expect(result[0].order).toBe(0);
    expect(result[0].settings).toEqual({});
    expect(result[1].visible).toBe(false);
    expect(result[1].order).toBe(1);
  });

  it("preserves explicitly set fields", () => {
    const items = [
      { widgetId: "recent_submissions", visible: true, column: "main" as const, order: 5, settings: { itemCount: 3 } },
    ];
    const result = normalizeDashboardLayout(items, registry);
    expect(result[0].column).toBe("main"); // explicitly set to main, even though default is sidebar
    expect(result[0].order).toBe(5);
    expect(result[0].settings).toEqual({ itemCount: 3 });
  });

  it("handles unknown widget IDs gracefully", () => {
    const items = [{ widgetId: "nonexistent_widget", visible: true }];
    const result = normalizeDashboardLayout(items, registry);
    expect(result[0].column).toBe("main"); // fallback
    expect(result[0].order).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/shared && npx vitest run src/__tests__/dashboard-widgets.test.ts`
Expected: FAIL — `WIDGET_REGISTRY`, `getDashboardWidgets`, `normalizeDashboardLayout` not found

- [ ] **Step 3: Rewrite widget registry**

Rewrite `packages/shared/src/constants/dashboard-widgets.ts`:

```typescript
import { z } from "zod";
import type { ModuleId } from "./modules";

// ── Widget Definition ─────────────────────────────

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

// ── Settings Schemas ──────────────────────────────

const ItemCountSettings = z.object({
  itemCount: z.number().int().min(1).max(25),
});

const CheckinAlertSettings = z.object({
  daysBack: z.number().int().min(1).max(14),
  threshold: z.number().int().min(0).max(100),
});

const RecentSubmissionsSettings = z.object({
  itemCount: z.number().int().min(1).max(25),
  daysBack: z.number().int().min(1).max(30),
});

const QuickActionLink = z.object({
  label: z.string().max(50),
  path: z.string().max(200),
  icon: z.string().max(50).optional(),
});

const QuickActionsSettings = z.object({
  links: z.array(QuickActionLink).max(10),
});

// ── Dashboard Widgets ─────────────────────────────

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  // Stat cards (new — previously hardcoded)
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
    description: "Number of sessions scheduled today",
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
    description: "Weekly homework completion percentage",
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

  // Content widgets (new — previously hardcoded sections)
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
    description: "Low tracker scores from recent days",
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
    description: "Homework assignments past their due date",
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
    description: "Completed homework from participants",
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
    description: "Shortcut links to common pages",
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

  // Existing widgets (carried over, interface updated)
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
    description: "Latest assessment results and score trends",
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
    description: "Module completion status and participant progress",
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

  // ── Client Overview Widgets ─────────────────────

  client_demographics: {
    id: "client_demographics",
    label: "Client Info",
    description: "Name, enrollment date, program, status",
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
    description: "Past and upcoming sessions for this client",
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
    description: "Assigned, completed, and overdue homework",
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
    description: "Recent tracker entries and trend sparklines",
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
    description: "Assessment score history with charts",
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
    description: "Recent journal entries from this client",
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
    description: "Module completion and current position",
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
    description: "Low scores and overdue items for this client",
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
    description: "Clinician notes from recent sessions",
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
    description: "Customizable links scoped to this client",
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

// ── Helpers ───────────────────────────────────────

export function getDashboardWidgets(): WidgetDefinition[] {
  return Object.values(WIDGET_REGISTRY).filter((w) => w.page === "dashboard");
}

export function getClientOverviewWidgets(): WidgetDefinition[] {
  return Object.values(WIDGET_REGISTRY).filter((w) => w.page === "client_overview");
}

// Backward compat — old code may import this type
export type DashboardWidgetId = string;
```

- [ ] **Step 4: Create normalize-layout utility**

Create `packages/shared/src/lib/normalize-layout.ts`:

```typescript
import type { WidgetDefinition } from "../constants/dashboard-widgets";

export interface PartialDashboardLayoutItem {
  widgetId: string;
  visible: boolean;
  column?: "main" | "sidebar";
  order?: number;
  settings?: Record<string, unknown>;
}

export interface DashboardLayoutItem {
  widgetId: string;
  visible: boolean;
  column: "main" | "sidebar";
  order: number;
  settings: Record<string, unknown>;
}

export function normalizeDashboardLayout(
  layout: PartialDashboardLayoutItem[],
  registry: WidgetDefinition[]
): DashboardLayoutItem[] {
  return layout.map((item, index) => {
    const widget = registry.find((w) => w.id === item.widgetId);
    return {
      widgetId: item.widgetId,
      visible: item.visible,
      column: item.column ?? widget?.defaultColumn ?? "main",
      order: item.order ?? index,
      settings: { ...(widget?.defaultSettings ?? {}), ...(item.settings ?? {}) },
    };
  });
}
```

The `normalizeDashboardLayout` function should import `DashboardLayoutItem` from `../schemas/config` (the Zod-inferred type is the single source of truth) rather than defining its own interface. Remove the `DashboardLayoutItem` interface from this file — use the type from schemas.

Update the file to:

```typescript
import type { WidgetDefinition } from "../constants/dashboard-widgets";
import type { DashboardLayoutItem } from "../schemas/config";

export interface PartialDashboardLayoutItem {
  widgetId: string;
  visible: boolean;
  column?: "main" | "sidebar";
  order?: number;
  settings?: Record<string, unknown>;
}

export function normalizeDashboardLayout(
  layout: PartialDashboardLayoutItem[],
  registry: WidgetDefinition[]
): DashboardLayoutItem[] {
  return layout.map((item, index) => {
    const widget = registry.find((w) => w.id === item.widgetId);
    return {
      widgetId: item.widgetId,
      visible: item.visible,
      column: item.column ?? widget?.defaultColumn ?? "main",
      order: item.order ?? index,
      settings: { ...(widget?.defaultSettings ?? {}), ...(item.settings ?? {}) },
    };
  });
}
```

Export from shared package — add to `packages/shared/src/constants/index.ts`:

```typescript
// Add this line after the existing dashboard-widgets export:
export { normalizeDashboardLayout, type PartialDashboardLayoutItem } from "../lib/normalize-layout";
```

Note: `DashboardLayoutItem` is already exported from `schemas/config.ts` which is re-exported via `schemas/index.ts`. No need to re-export it from constants.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/shared && npx vitest run src/__tests__/dashboard-widgets.test.ts`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/constants/dashboard-widgets.ts packages/shared/src/lib/normalize-layout.ts packages/shared/src/constants/index.ts packages/shared/src/__tests__/dashboard-widgets.test.ts
git commit -m "feat(shared): rewrite widget registry with 30 widgets and normalization

Replace DASHBOARD_WIDGETS with WIDGET_REGISTRY containing 20 dashboard
and 10 client overview widgets. Add normalizeDashboardLayout() for
backward-compatible hydration of legacy layout items."
```

---

## Task 3: Update Provider Presets

**Files:**
- Modify: `packages/shared/src/constants/provider-presets.ts`
- Test: `packages/shared/src/__tests__/provider-presets.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/shared/src/__tests__/provider-presets.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { PROVIDER_PRESETS } from "../constants/provider-presets";
import { WIDGET_REGISTRY } from "../constants/dashboard-widgets";

describe("PROVIDER_PRESETS", () => {
  it("all presets have dashboardLayout as DashboardLayoutItem[]", () => {
    for (const preset of Object.values(PROVIDER_PRESETS)) {
      expect(Array.isArray(preset.dashboardLayout)).toBe(true);
      for (const item of preset.dashboardLayout) {
        expect(item).toHaveProperty("widgetId");
        expect(item).toHaveProperty("visible");
        expect(item).toHaveProperty("column");
        expect(item).toHaveProperty("order");
        expect(item).toHaveProperty("settings");
      }
    }
  });

  it("all presets have clientOverviewLayout", () => {
    for (const preset of Object.values(PROVIDER_PRESETS)) {
      expect(Array.isArray(preset.clientOverviewLayout)).toBe(true);
      expect(preset.clientOverviewLayout.length).toBeGreaterThan(0);
    }
  });

  it("all widget IDs in presets exist in registry", () => {
    for (const preset of Object.values(PROVIDER_PRESETS)) {
      for (const item of preset.dashboardLayout) {
        expect(WIDGET_REGISTRY[item.widgetId]).toBeDefined();
      }
      for (const item of preset.clientOverviewLayout) {
        expect(WIDGET_REGISTRY[item.widgetId]).toBeDefined();
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/shared && npx vitest run src/__tests__/provider-presets.test.ts`
Expected: FAIL — presets still use flat `DashboardWidgetId[]`

- [ ] **Step 3: Update provider presets**

Update the `ProviderPreset` interface and convert all 11 presets. The key changes:
1. Change `dashboardLayout` type from `readonly DashboardWidgetId[]` to `DashboardLayoutItem[]` (imported from `normalize-layout.ts`)
2. Add `clientOverviewLayout: DashboardLayoutItem[]`
3. Convert each preset's flat array to objects with `{ widgetId, visible: true, column, order, settings: {} }`

For the interface at the top of `packages/shared/src/constants/provider-presets.ts`:

```typescript
import type { ModuleId } from "./modules";
import type { ProviderType } from "../schemas/config";
import type { DashboardLayoutItem } from "../lib/normalize-layout";

export interface ProviderPreset {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly providerType: ProviderType;
  readonly enabledModules: readonly ModuleId[];
  readonly defaultTrackerPreset: string;
  readonly dashboardLayout: DashboardLayoutItem[];
  readonly clientOverviewLayout: DashboardLayoutItem[];
  readonly defaultAssessments: readonly string[];
}
```

Helper to build layout items (add before `PROVIDER_PRESETS`):

```typescript
function layoutItems(
  widgets: Array<{ id: string; column?: "main" | "sidebar" }>
): DashboardLayoutItem[] {
  return widgets.map((w, i) => ({
    widgetId: w.id,
    visible: true,
    column: w.column ?? "main",
    order: i,
    settings: {},
  }));
}

const DEFAULT_CLIENT_OVERVIEW = layoutItems([
  { id: "client_demographics" },
  { id: "client_sessions" },
  { id: "client_homework" },
  { id: "client_trackers" },
  { id: "client_assessments" },
  { id: "client_progress" },
  { id: "client_journal", column: "sidebar" },
  { id: "client_alerts", column: "sidebar" },
  { id: "client_notes", column: "sidebar" },
  { id: "client_quick_actions", column: "sidebar" },
]);
```

Then convert each preset. Example for THERAPIST_CBT:

```typescript
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
  dashboardLayout: layoutItems([
    { id: "stat_active_clients" },
    { id: "stat_sessions_today" },
    { id: "stat_homework_rate" },
    { id: "stat_overdue_count" },
    { id: "todays_sessions" },
    { id: "checkin_alerts" },
    { id: "overdue_homework" },
    { id: "tracker_summary" },
    { id: "homework_status" },
    { id: "assessment_scores" },
    { id: "program_progress" },
    { id: "pre_visit" },
    { id: "recent_submissions", column: "sidebar" },
    { id: "journal_activity", column: "sidebar" },
    { id: "recent_messages", column: "sidebar" },
    { id: "quick_actions", column: "sidebar" },
    { id: "rtm_overview" },
  ]),
  clientOverviewLayout: DEFAULT_CLIENT_OVERVIEW,
  defaultAssessments: ["ASRS", "PHQ-9", "GAD-7"],
},
```

Apply same pattern to all 11 presets. Each includes the 4 stat cards + `todays_sessions` + `quick_actions` + `recent_submissions`, plus the module-specific widgets they already had. The `column` assignment follows widget `defaultColumn` from the registry. Remove `as const satisfies Record<string, ProviderPreset>` (since `DashboardLayoutItem[]` is mutable) and replace with `: Record<string, ProviderPreset>`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/shared && npx vitest run src/__tests__/provider-presets.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/constants/provider-presets.ts packages/shared/src/__tests__/provider-presets.test.ts
git commit -m "feat(shared): update presets with rich layout items and client overview

Convert ProviderPreset.dashboardLayout from flat ID array to
DashboardLayoutItem[]. Add clientOverviewLayout to all 11 presets."
```

---

## Task 4: Prisma Schema + API Backend

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Modify: `packages/api/src/services/config.ts`
- Modify: `packages/api/src/routes/config.ts`
- Create: `packages/api/src/__tests__/config.test.ts`

- [ ] **Step 1: Write failing API tests**

Create `packages/api/src/__tests__/config.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";
import { authHeader } from "./helpers";
import { prisma } from "@steady/db";

const mockPrisma = prisma as any;

describe("Config Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PATCH /api/config/dashboard-layout", () => {
    it("saves dashboard layout only", async () => {
      mockPrisma.clinicianConfig.update.mockResolvedValue({ id: "config-1" });
      mockPrisma.clinicianConfig.findUnique.mockResolvedValue({ id: "config-1", clinicianId: "test-clinician-profile-id" });

      const layout = [
        { widgetId: "stat_active_clients", visible: true, column: "main", order: 0, settings: {} },
      ];

      const res = await request(app)
        .patch("/api/config/dashboard-layout")
        .set(...authHeader())
        .send({ dashboardLayout: layout });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.clinicianConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clinicianId: "test-clinician-profile-id" },
          data: expect.objectContaining({ dashboardLayout: layout }),
        })
      );
    });

    it("saves clientOverviewLayout only", async () => {
      mockPrisma.clinicianConfig.update.mockResolvedValue({ id: "config-1" });
      mockPrisma.clinicianConfig.findUnique.mockResolvedValue({ id: "config-1" });

      const layout = [
        { widgetId: "client_demographics", visible: true, column: "main", order: 0, settings: {} },
      ];

      const res = await request(app)
        .patch("/api/config/dashboard-layout")
        .set(...authHeader())
        .send({ clientOverviewLayout: layout });

      expect(res.status).toBe(200);
      expect(mockPrisma.clinicianConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ clientOverviewLayout: layout }),
        })
      );
    });

    it("rejects empty body", async () => {
      const res = await request(app)
        .patch("/api/config/dashboard-layout")
        .set(...authHeader())
        .send({});

      expect(res.status).toBe(400);
    });

    it("requires auth", async () => {
      const res = await request(app)
        .patch("/api/config/dashboard-layout")
        .send({ dashboardLayout: [] });

      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /api/config/clients/:clientId/overview-layout", () => {
    it("saves client overview layout", async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue({ id: "enrollment-1" });
      mockPrisma.clientConfig.upsert.mockResolvedValue({ id: "cc-1" });

      const layout = [
        { widgetId: "client_demographics", visible: true, column: "main", order: 0, settings: {} },
      ];

      const res = await request(app)
        .patch("/api/config/clients/client-user-id/overview-layout")
        .set(...authHeader())
        .send({ clientOverviewLayout: layout });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns 404 for unrelated client", async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .patch("/api/config/clients/unknown-user/overview-layout")
        .set(...authHeader())
        .send({ clientOverviewLayout: [] });

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/config (backward compat)", () => {
    it("accepts legacy dashboardLayout shape", async () => {
      mockPrisma.clinicianConfig.upsert.mockResolvedValue({ id: "config-1" });

      const res = await request(app)
        .put("/api/config")
        .set(...authHeader())
        .send({
          providerType: "THERAPIST",
          enabledModules: ["daily_tracker"],
          dashboardLayout: [
            { widgetId: "tracker_summary", visible: true },
          ],
        });

      expect(res.status).toBe(200);
    });

    it("accepts new dashboardLayout shape with all fields", async () => {
      mockPrisma.clinicianConfig.upsert.mockResolvedValue({ id: "config-1" });

      const res = await request(app)
        .put("/api/config")
        .set(...authHeader())
        .send({
          providerType: "THERAPIST",
          enabledModules: ["daily_tracker"],
          dashboardLayout: [
            { widgetId: "tracker_summary", visible: true, column: "main", order: 0, settings: {} },
          ],
          clientOverviewLayout: [
            { widgetId: "client_demographics", visible: true, column: "main", order: 0, settings: {} },
          ],
        });

      expect(res.status).toBe(200);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/api && npx vitest run src/__tests__/config.test.ts`
Expected: FAIL — PATCH route doesn't exist

- [ ] **Step 3: Add `clientOverviewLayout` to Prisma schema**

In `packages/db/prisma/schema.prisma`, add to `ClinicianConfig` model (after line 767 `dashboardLayout`):

```prisma
clientOverviewLayout Json?
```

Add to `ClientConfig` model (after line 789 `customConfig`):

```prisma
clientOverviewLayout Json?
```

Then run: `cd packages/db && npx prisma db push`

- [ ] **Step 4: Update config service**

Modify `packages/api/src/services/config.ts`:

1. Update `saveClinicianConfig` data parameter type — add optional `clientOverviewLayout`:

```typescript
// In the data parameter (line 27-37), add:
clientOverviewLayout?: Array<{ widgetId: string; visible: boolean; column?: string; order?: number; settings?: Record<string, unknown> }>;
```

Add `clientOverviewLayout` to both the `create` and `update` blocks of the upsert:

```typescript
clientOverviewLayout: data.clientOverviewLayout ? (data.clientOverviewLayout as any) : undefined,
```

2. Add new service functions after `saveClinicianConfig`:

```typescript
export async function saveDashboardLayout(
  clinicianProfileId: string,
  data: {
    dashboardLayout?: Array<{ widgetId: string; visible: boolean; column: string; order: number; settings: Record<string, unknown> }>;
    clientOverviewLayout?: Array<{ widgetId: string; visible: boolean; column: string; order: number; settings: Record<string, unknown> }>;
  }
): Promise<ClinicianConfig> {
  const updateData: Record<string, unknown> = {};
  if (data.dashboardLayout) updateData.dashboardLayout = data.dashboardLayout;
  if (data.clientOverviewLayout) updateData.clientOverviewLayout = data.clientOverviewLayout;

  return prisma.clinicianConfig.update({
    where: { clinicianId: clinicianProfileId },
    data: updateData,
  });
}

export async function saveClientOverviewLayout(
  clientId: string,
  clinicianId: string,
  layout: Array<{ widgetId: string; visible: boolean; column: string; order: number; settings: Record<string, unknown> }>
): Promise<ClientConfig> {
  return prisma.clientConfig.upsert({
    where: {
      clientId_clinicianId: { clientId, clinicianId },
    },
    create: {
      clientId,
      clinicianId,
      clientOverviewLayout: layout as any,
    },
    update: {
      clientOverviewLayout: layout as any,
    },
  });
}
```

3. Update `createDefaultConfig` (line 200-245) — the preset now has full `DashboardLayoutItem[]`, so remove the `.map()` conversion:

```typescript
// Replace lines 211-215:
const dashboardLayout = [...preset.dashboardLayout];
const clientOverviewLayout = [...preset.clientOverviewLayout];

// Add clientOverviewLayout to both create and update blocks:
clientOverviewLayout: clientOverviewLayout as any,
```

4. Update `saveClientConfig` data parameter — add optional `clientOverviewLayout`:

```typescript
clientOverviewLayout?: Array<{ widgetId: string; visible: boolean; column?: string; order?: number; settings?: Record<string, unknown> }>;
```

Add to both create and update blocks of the upsert.

- [ ] **Step 5: Add PATCH routes**

Modify `packages/api/src/routes/config.ts`:

Add import for `SaveDashboardLayoutSchema` (line 5-7):

```typescript
import {
  SaveClinicianConfigSchema,
  SaveClientConfigSchema,
  SaveDashboardLayoutSchema,
  SaveClientOverviewLayoutSchema,
} from "@steady/shared";
```

Add import for new service functions (line 10-18):

```typescript
import {
  getClinicianConfig,
  saveClinicianConfig,
  saveDashboardLayout,
  saveClientOverviewLayout,
  getClientConfig,
  saveClientConfig,
  createDefaultConfig,
  resolveClientConfig,
  NotFoundError,
} from "../services/config";
```

Add PATCH route after the PUT route (after line 58):

```typescript
// PATCH /api/config/dashboard-layout — Save layout only
router.patch(
  "/dashboard-layout",
  validate(SaveDashboardLayoutSchema),
  async (req: Request, res: Response) => {
    try {
      const clinicianId = req.user!.clinicianProfileId!;
      const config = await saveDashboardLayout(clinicianId, req.body);
      res.json({ success: true, data: config });
    } catch (err) {
      logger.error("Save dashboard layout error", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to save dashboard layout" });
    }
  }
);
```

Add PATCH route for client overview layout (after the PUT /clients/:clientId route, after line 154):

```typescript
// PATCH /api/config/clients/:clientId/overview-layout — Save client overview layout
router.patch(
  "/clients/:clientId/overview-layout",
  validate(SaveClientOverviewLayoutSchema),
  async (req: Request, res: Response) => {
    try {
      const clinicianId = req.user!.clinicianProfileId!;
      const { clientId } = req.params;

      const enrollment = await prisma.enrollment.findFirst({
        where: {
          participant: { userId: clientId },
          program: { clinicianId },
        },
        select: { id: true },
      });

      if (!enrollment) {
        res.status(404).json({ success: false, error: "Client not found" });
        return;
      }

      const config = await saveClientOverviewLayout(
        clientId, clinicianId, req.body.clientOverviewLayout
      );
      res.json({ success: true, data: config });
    } catch (err) {
      logger.error("Save client overview layout error", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to save client overview layout" });
    }
  }
);
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd packages/api && npx vitest run src/__tests__/config.test.ts`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/api/src/services/config.ts packages/api/src/routes/config.ts packages/api/src/__tests__/config.test.ts
git commit -m "feat(api): add PATCH endpoints for dashboard layout + client overview

Add clientOverviewLayout to Prisma schema. Add saveDashboardLayout and
saveClientOverviewLayout service functions. Add PATCH routes for
layout-only saves. Update createDefaultConfig for new preset shape."
```

---

## Task 5: Widget Shell & First Dashboard Widgets

**Files:**
- Create: `apps/web/src/components/dashboard-widgets/widget-shell.tsx`
- Create: `apps/web/src/components/dashboard-widgets/stat-widget.tsx`
- Create: `apps/web/src/components/dashboard-widgets/todays-sessions.tsx`
- Create: `apps/web/src/components/dashboard-widgets/checkin-alerts.tsx`
- Create: `apps/web/src/components/dashboard-widgets/overdue-homework.tsx`
- Create: `apps/web/src/components/dashboard-widgets/recent-submissions.tsx`
- Create: `apps/web/src/components/dashboard-widgets/quick-actions.tsx`
- Create: `apps/web/src/components/dashboard-widgets/index.ts`

This task extracts the existing hardcoded dashboard sections into widget components. No new functionality — just refactoring existing JSX into the widget component pattern.

- [ ] **Step 1: Create widget-shell.tsx**

This is the shared wrapper that all widgets render inside. It provides the drag handle (in edit mode), title bar, and loading/error states.

```typescript
"use client";

import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";

export interface WidgetProps {
  column: "main" | "sidebar";
  settings: Record<string, unknown>;
  isEditing: boolean;
}

interface WidgetShellProps {
  title: string;
  icon?: React.ElementType;
  isEditing: boolean;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
}

export function WidgetShell({
  title,
  icon: Icon,
  isEditing,
  children,
  className,
  headerAction,
  dragAttributes,
  dragListeners,
}: WidgetShellProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-5",
        isEditing && "border-dashed border-muted-foreground/30",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        {isEditing && (
          <button
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground -ml-1"
            {...dragAttributes}
            {...dragListeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <h2 className="font-semibold flex-1">{title}</h2>
        {headerAction}
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create stat-widget.tsx**

Extract from the current `StatCard` in dashboard/page.tsx (lines 269-297). This widget renders one stat card and adapts to column context.

```typescript
"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Users, Calendar, TrendingUp, AlertTriangle,
} from "lucide-react";
import type { WidgetProps } from "./widget-shell";

const STAT_CONFIGS: Record<string, {
  icon: React.ElementType;
  dataKey: string;
  label: string;
  href?: string;
  format?: (val: number) => string;
  color?: (val: number) => string;
}> = {
  stat_active_clients: {
    icon: Users,
    dataKey: "totalClients",
    label: "Active Clients",
    href: "/participants",
  },
  stat_sessions_today: {
    icon: Calendar,
    dataKey: "todaySessionCount",
    label: "Sessions Today",
    href: "/sessions",
  },
  stat_homework_rate: {
    icon: TrendingUp,
    dataKey: "weekHomeworkRate",
    label: "Homework Rate",
    format: (v) => `${v}%`,
    color: (v) => v >= 70 ? "text-green-600" : v >= 40 ? "text-amber-600" : "text-red-500",
  },
  stat_overdue_count: {
    icon: AlertTriangle,
    dataKey: "overdueCount",
    label: "Overdue",
    color: (v) => v > 0 ? "text-red-500" : "text-green-600",
  },
};

interface StatWidgetProps extends WidgetProps {
  widgetId: string;
  dashboardData: {
    stats: Record<string, number>;
  };
}

export function StatWidget({ widgetId, dashboardData, column }: StatWidgetProps) {
  const config = STAT_CONFIGS[widgetId];
  if (!config) return null;

  const value = dashboardData.stats[config.dataKey] ?? 0;
  const displayValue = config.format ? config.format(value) : value;
  const colorClass = config.color?.(value);

  const content = (
    <div className={cn(
      "rounded-lg border p-4 transition-colors",
      config.href && "hover:border-primary/30 hover:shadow-sm"
    )}>
      <div className="flex items-center gap-2 mb-2">
        <config.icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{config.label}</span>
      </div>
      <p className={cn("text-2xl font-bold", colorClass)}>{displayValue}</p>
    </div>
  );

  return config.href ? <Link href={config.href}>{content}</Link> : content;
}
```

- [ ] **Step 3: Create todays-sessions.tsx, checkin-alerts.tsx, overdue-homework.tsx**

Extract the corresponding sections from the current dashboard page. Each component receives `dashboardData` and `column` as props and renders the same JSX that currently lives inline. For the `sidebar` column variant, render a compact version (fewer details, smaller text).

For `todays-sessions.tsx` — extract lines 117-162 from current dashboard. For `sidebar` column, show only time + client name (no Prepare button, no program title).

For `checkin-alerts.tsx` — extract lines 164-188. For `sidebar`, show just client name + value in a compact row.

For `overdue-homework.tsx` — extract lines 190-211. For `sidebar`, show just client name + days overdue.

Each file follows the same pattern:

```typescript
"use client";

import type { WidgetProps } from "./widget-shell";
import { WidgetShell } from "./widget-shell";
// ... relevant imports from current dashboard

interface TodaysSessionsProps extends WidgetProps {
  dashboardData: { todaySessions: Array<{...}> };
  // dragAttributes/dragListeners for edit mode
}

export function TodaysSessionsWidget({ column, isEditing, dashboardData, ...dragProps }: TodaysSessionsProps) {
  return (
    <WidgetShell title="Today's Sessions" icon={Calendar} isEditing={isEditing} {...dragProps}>
      {/* JSX extracted from current dashboard, with column-aware rendering */}
    </WidgetShell>
  );
}
```

- [ ] **Step 4: Create recent-submissions.tsx and quick-actions.tsx**

Same extraction pattern from the right column (lines 214-261). `recent-submissions` respects `settings.itemCount` and `settings.daysBack` from widget settings. `quick-actions` renders `settings.links` array.

- [ ] **Step 5: Create index.ts registry**

```typescript
import type { ComponentType } from "react";
import type { WidgetProps } from "./widget-shell";
import { StatWidget } from "./stat-widget";
import { TodaysSessionsWidget } from "./todays-sessions";
import { CheckinAlertsWidget } from "./checkin-alerts";
import { OverdueHomeworkWidget } from "./overdue-homework";
import { RecentSubmissionsWidget } from "./recent-submissions";
import { QuickActionsWidget } from "./quick-actions";

// Placeholder for widgets not yet implemented
function PlaceholderWidget({ column }: WidgetProps) {
  return (
    <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
      Widget coming soon
    </div>
  );
}

// Widget props are heterogeneous (StatWidget needs widgetId+dashboardData, others need different data)
// so we use `any` here and type-check at the individual component level
export const WIDGET_COMPONENTS: Record<string, ComponentType<any>> = {
  // Stat cards
  stat_active_clients: StatWidget,
  stat_sessions_today: StatWidget,
  stat_homework_rate: StatWidget,
  stat_overdue_count: StatWidget,
  // Content widgets
  todays_sessions: TodaysSessionsWidget,
  checkin_alerts: CheckinAlertsWidget,
  overdue_homework: OverdueHomeworkWidget,
  recent_submissions: RecentSubmissionsWidget,
  quick_actions: QuickActionsWidget,
  // Placeholders for future widgets
  tracker_summary: PlaceholderWidget,
  homework_status: PlaceholderWidget,
  journal_activity: PlaceholderWidget,
  assessment_scores: PlaceholderWidget,
  medication_adherence: PlaceholderWidget,
  side_effects_report: PlaceholderWidget,
  program_progress: PlaceholderWidget,
  pre_visit: PlaceholderWidget,
  recent_messages: PlaceholderWidget,
  rtm_overview: PlaceholderWidget,
  todo_progress: PlaceholderWidget,
};

export { WidgetShell, type WidgetProps } from "./widget-shell";
```

- [ ] **Step 6: Verify build compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/dashboard-widgets/
git commit -m "feat(web): extract dashboard sections into widget components

Create widget-shell, stat-widget, todays-sessions, checkin-alerts,
overdue-homework, recent-submissions, quick-actions. Placeholder
components for widgets not yet implemented."
```

---

## Task 6: Widget Grid & Config Hook Updates

**Files:**
- Create: `apps/web/src/components/widget-grid.tsx`
- Modify: `apps/web/src/hooks/use-config.ts`

- [ ] **Step 1: Update use-config.ts**

Update `ClinicianConfigData` interface to include new fields (line 15):

```typescript
dashboardLayout: Array<{
  widgetId: string;
  visible: boolean;
  column?: string;
  order?: number;
  settings?: Record<string, unknown>;
}>;
clientOverviewLayout?: Array<{
  widgetId: string;
  visible: boolean;
  column?: string;
  order?: number;
  settings?: Record<string, unknown>;
}> | null;
```

Add `useSaveDashboardLayout` mutation hook:

```typescript
export function useSaveDashboardLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      dashboardLayout?: Array<{ widgetId: string; visible: boolean; column: string; order: number; settings: Record<string, unknown> }>;
      clientOverviewLayout?: Array<{ widgetId: string; visible: boolean; column: string; order: number; settings: Record<string, unknown> }>;
    }) => api.patch("/api/config/dashboard-layout", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinician-config"] });
    },
  });
}
```

- [ ] **Step 2: Create widget-grid.tsx**

This component reads a `DashboardLayoutItem[]`, splits into main/sidebar columns, and renders widgets from the component registry. It wraps each column in a `@dnd-kit` `SortableContext` when in edit mode.

```typescript
"use client";

import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { WIDGET_COMPONENTS } from "./dashboard-widgets";
import { normalizeDashboardLayout, WIDGET_REGISTRY } from "@steady/shared";
import type { DashboardLayoutItem } from "@steady/shared";

interface WidgetGridProps {
  layout: Array<{ widgetId: string; visible: boolean; column?: string; order?: number; settings?: Record<string, unknown> }>;
  isEditing: boolean;
  dashboardData: any;
  onLayoutChange?: (layout: DashboardLayoutItem[]) => void;
}

function SortableWidget({ item, isEditing, dashboardData }: {
  item: DashboardLayoutItem;
  isEditing: boolean;
  dashboardData: any;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.widgetId,
    disabled: !isEditing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Component = WIDGET_COMPONENTS[item.widgetId];
  if (!Component) return null;

  const isStatWidget = item.widgetId.startsWith("stat_");

  return (
    <div ref={setNodeRef} style={style}>
      <Component
        widgetId={item.widgetId}
        column={item.column}
        settings={item.settings}
        isEditing={isEditing}
        dashboardData={dashboardData}
        dragAttributes={attributes}
        dragListeners={listeners}
      />
    </div>
  );
}

export function WidgetGrid({ layout, isEditing, dashboardData, onLayoutChange }: WidgetGridProps) {
  const registry = Object.values(WIDGET_REGISTRY);
  const normalized = useMemo(() => normalizeDashboardLayout(layout, registry), [layout, registry]);

  const mainWidgets = normalized
    .filter((w) => w.visible && w.column === "main")
    .sort((a, b) => a.order - b.order);

  const sidebarWidgets = normalized
    .filter((w) => w.visible && w.column === "sidebar")
    .sort((a, b) => a.order - b.order);

  // Separate stat cards from other main widgets
  const statWidgets = mainWidgets.filter((w) => w.widgetId.startsWith("stat_"));
  const contentWidgets = mainWidgets.filter((w) => !w.widgetId.startsWith("stat_"));

  function handleDragEnd(event: DragEndEvent) {
    if (!onLayoutChange) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const updated = [...normalized];
    const activeIdx = updated.findIndex((w) => w.widgetId === active.id);
    const overIdx = updated.findIndex((w) => w.widgetId === over.id);
    if (activeIdx === -1 || overIdx === -1) return;

    // Swap order values
    const activeOrder = updated[activeIdx].order;
    updated[activeIdx] = { ...updated[activeIdx], order: updated[overIdx].order };
    updated[overIdx] = { ...updated[overIdx], order: activeOrder };

    onLayoutChange(updated);
  }

  function handleDragOver(event: DragOverEvent) {
    if (!onLayoutChange) return;
    const { active, over } = event;
    if (!over) return;

    const activeItem = normalized.find((w) => w.widgetId === active.id);
    const overItem = normalized.find((w) => w.widgetId === over.id);
    if (!activeItem || !overItem) return;

    // If dragged to a different column, update column assignment
    if (activeItem.column !== overItem.column) {
      const updated = normalized.map((w) =>
        w.widgetId === active.id ? { ...w, column: overItem.column } : w
      );
      onLayoutChange(updated);
    }
  }

  const content = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Stat cards grid */}
        {statWidgets.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SortableContext items={statWidgets.map((w) => w.widgetId)} strategy={verticalListSortingStrategy}>
              {statWidgets.map((widget) => (
                <SortableWidget key={widget.widgetId} item={widget} isEditing={isEditing} dashboardData={dashboardData} />
              ))}
            </SortableContext>
          </div>
        )}
        {/* Main content widgets */}
        <SortableContext items={contentWidgets.map((w) => w.widgetId)} strategy={verticalListSortingStrategy}>
          {contentWidgets.map((widget) => (
            <SortableWidget key={widget.widgetId} item={widget} isEditing={isEditing} dashboardData={dashboardData} />
          ))}
        </SortableContext>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <SortableContext items={sidebarWidgets.map((w) => w.widgetId)} strategy={verticalListSortingStrategy}>
          {sidebarWidgets.map((widget) => (
            <SortableWidget key={widget.widgetId} item={widget} isEditing={isEditing} dashboardData={dashboardData} />
          ))}
        </SortableContext>
        {isEditing && sidebarWidgets.length === 0 && (
          <div className="rounded-lg border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
            Drop widget here
          </div>
        )}
      </div>
    </div>
  );

  if (isEditing) {
    return (
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        {content}
      </DndContext>
    );
  }

  return content;
}
```

- [ ] **Step 3: Verify build compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/widget-grid.tsx apps/web/src/hooks/use-config.ts
git commit -m "feat(web): add widget grid layout renderer with drag-and-drop

WidgetGrid reads normalized layout, splits into main/sidebar columns,
renders from component registry. DnD via @dnd-kit for edit mode.
Add useSaveDashboardLayout hook for PATCH endpoint."
```

---

## Task 7: Customize Panel

**Files:**
- Create: `apps/web/src/components/customize-panel.tsx`

- [ ] **Step 1: Create customize-panel.tsx**

Slide-out panel component. It receives the current layout, a list of available widgets (filtered by enabled modules), and callbacks for save/cancel.

Key behaviors:
- Maintains local copy of layout state (not persisted until Save)
- Lists enabled widgets with toggle switches, drag handles, gear icons
- Lists available (disabled) widgets below
- Gear icon expands inline settings form per widget
- Search/filter at top
- Save/Cancel buttons at bottom
- Uses its own `DndContext` for reordering within the panel list

The panel is ~200-250 lines. It uses:
- `@dnd-kit/sortable` for reorder in the panel list
- `WIDGET_REGISTRY` from `@steady/shared` for widget metadata
- `Sheet` component from shadcn/ui (or a custom slide-out div with Tailwind)

Check if Sheet exists: `apps/web/src/components/ui/sheet.tsx`. If not, use a custom div with fixed positioning and transition.

```typescript
"use client";

import { useState, useMemo } from "react";
import { X, Search, Settings, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { WIDGET_REGISTRY, getDashboardWidgets } from "@steady/shared";
import type { DashboardLayoutItem } from "@steady/shared";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface CustomizePanelProps {
  layout: DashboardLayoutItem[];
  enabledModules: string[];
  onSave: (layout: DashboardLayoutItem[]) => void;
  onCancel: () => void;
  isSaving: boolean;
  page?: "dashboard" | "client_overview";
  clientName?: string; // for per-client override banner
}

// ... Panel implementation with:
// - search filter state
// - local layout state (cloned from props on mount)
// - toggle handler (flips visible, moves between sections)
// - settings expansion state per widget
// - inline settings form (renders inputs based on widget's settingsSchema)
// - DndContext for reorder within panel list
// - Save/Cancel buttons
```

- [ ] **Step 2: Verify build compiles**

Run: `cd apps/web && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/customize-panel.tsx
git commit -m "feat(web): add customize panel for dashboard widget management

Slide-out panel with widget toggles, drag-to-reorder, inline per-widget
settings, search filter, and Save/Cancel buttons."
```

---

## Task 8: Dashboard Page Refactor

**Files:**
- Rewrite: `apps/web/src/app/(dashboard)/dashboard/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Rewrite dashboard page**

Replace the entire hardcoded dashboard with the config-driven layout. The new page:

1. Fetches dashboard data via existing `useQuery` for `clinician-dashboard`
2. Fetches layout from `useClinicianConfig()`
3. Manages `isCustomizing` state (boolean)
4. Renders `WidgetGrid` in normal mode, or `WidgetGrid + CustomizePanel` in edit mode
5. Provides a pencil icon button in the header to toggle customize mode

```typescript
"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { useClinicianConfig, useSaveDashboardLayout } from "@/hooks/use-config";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { WidgetGrid } from "@/components/widget-grid";
import { CustomizePanel } from "@/components/customize-panel";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { normalizeDashboardLayout, WIDGET_REGISTRY } from "@steady/shared";
import type { DashboardLayoutItem } from "@steady/shared";

// ... DashboardData interface (same as current)

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: config } = useClinicianConfig();
  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ["clinician-dashboard"],
    queryFn: () => api.get("/api/clinician/dashboard"),
    refetchInterval: 60000,
  });
  const saveLayout = useSaveDashboardLayout();
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [editingLayout, setEditingLayout] = useState<DashboardLayoutItem[] | null>(null);

  const layout = config?.dashboardLayout ?? [];
  const enabledModules = config?.enabledModules ?? [];
  const registry = Object.values(WIDGET_REGISTRY);
  const normalizedLayout = normalizeDashboardLayout(layout, registry);

  const handleCustomizeOpen = useCallback(() => {
    setEditingLayout([...normalizedLayout]);
    setIsCustomizing(true);
  }, [normalizedLayout]);

  const handleSave = useCallback(async (newLayout: DashboardLayoutItem[]) => {
    await saveLayout.mutateAsync({ dashboardLayout: newLayout });
    setIsCustomizing(false);
    setEditingLayout(null);
  }, [saveLayout]);

  const handleCancel = useCallback(() => {
    setIsCustomizing(false);
    setEditingLayout(null);
  }, []);

  if (isLoading) return <LoadingState />;
  if (!dashboardData) return null;

  const greeting = getGreeting();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title={`${greeting}, ${user?.firstName}`}
        subtitle={`${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · ${dashboardData.stats.todaySessionCount} sessions today`}
        actions={
          <Button variant="ghost" size="sm" onClick={handleCustomizeOpen} className="gap-2">
            <Settings className="h-4 w-4" />
            Customize
          </Button>
        }
      />

      <WidgetGrid
        layout={isCustomizing ? (editingLayout ?? normalizedLayout) : normalizedLayout}
        isEditing={isCustomizing}
        dashboardData={dashboardData}
        onLayoutChange={setEditingLayout}
      />

      {isCustomizing && editingLayout && (
        <CustomizePanel
          layout={editingLayout}
          enabledModules={enabledModules}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={saveLayout.isPending}
        />
      )}
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
```

Note: `PageHeader` accepts an `actions` prop (not `children`). The code above uses the correct pattern.

- [ ] **Step 2: Add "Customize Dashboard" to sidebar nav**

In `apps/web/src/app/(dashboard)/layout.tsx`, add a link under the Dashboard nav item. Find the `mainNavItems` array (around line 38) and the `NavSection` component. Add a small "Customize" sub-link under Dashboard that navigates to `/dashboard?customize=true`, or simply add it as a secondary action in the sidebar.

Alternatively, add a small gear icon next to the "Dashboard" nav item label that triggers the customize panel. This requires the sidebar to communicate with the dashboard page — simplest approach is a URL search param `?customize=true` that the dashboard page reads on mount.

- [ ] **Step 3: Verify the app works**

Run: `npm run dev` and navigate to `http://localhost:3000/dashboard`
Expected: Dashboard renders widgets from config layout. Customize button opens the panel.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(dashboard)/dashboard/page.tsx apps/web/src/app/(dashboard)/layout.tsx
git commit -m "feat(web): config-driven dashboard with customize panel

Replace hardcoded dashboard with WidgetGrid driven by clinician config.
Add Customize button in header and sidebar nav link. Slide-out panel
for toggling, reordering, and configuring widgets."
```

---

## Task 9: Client Overview Widgets (Scaffolding)

**Files:**
- Create: `apps/web/src/components/client-widgets/index.ts`
- Create: `apps/web/src/components/client-widgets/client-demographics.tsx`
- Create: `apps/web/src/components/client-widgets/client-sessions.tsx`
- Create: `apps/web/src/components/client-widgets/client-homework.tsx`
- Create: (remaining 7 client widget files as placeholders)

This task scaffolds the client overview widget components. Only `client_demographics`, `client_sessions`, and `client_homework` need full implementations initially (extracted from the existing participant detail page). The rest get placeholder implementations.

- [ ] **Step 1: Create client widget components**

Each client widget follows the same pattern as dashboard widgets but receives `clientId` as a prop and fetches its own data.

```typescript
// client-demographics.tsx
"use client";

import type { WidgetProps } from "../dashboard-widgets/widget-shell";
import { WidgetShell } from "../dashboard-widgets/widget-shell";

interface ClientDemographicsProps extends WidgetProps {
  clientId: string;
  clientData: { name: string; enrolledAt: string; programTitle: string; status: string };
}

export function ClientDemographicsWidget({ clientData, isEditing, ...dragProps }: ClientDemographicsProps) {
  return (
    <WidgetShell title="Client Info" isEditing={isEditing} {...dragProps}>
      {/* Render client demographics */}
    </WidgetShell>
  );
}
```

- [ ] **Step 2: Create index.ts registry**

Same pattern as dashboard widgets — maps widget IDs to components, with PlaceholderWidget for unimplemented ones.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/client-widgets/
git commit -m "feat(web): scaffold client overview widget components

Create client-demographics, client-sessions, client-homework with
implementations. Placeholder components for remaining 7 client widgets."
```

---

## Task 10: Client Overview Page Integration

**Files:**
- Modify: `apps/web/src/app/(dashboard)/participants/[id]/page.tsx`
- Modify: `apps/web/src/hooks/use-config.ts`

- [ ] **Step 1: Add client overview layout hook**

Add to `use-config.ts`:

```typescript
export function useSaveClientOverviewLayout(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (layout: Array<{ widgetId: string; visible: boolean; column: string; order: number; settings: Record<string, unknown> }>) =>
      api.patch(`/api/config/clients/${clientId}/overview-layout`, { clientOverviewLayout: layout }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinician-config"] });
      queryClient.invalidateQueries({ queryKey: ["client-config", clientId] });
    },
  });
}
```

- [ ] **Step 2: Update participant overview tab**

In the participant detail page, replace the hardcoded overview tab content with a `WidgetGrid` that reads from the resolved client overview layout. Add the same Customize button and panel.

The layout resolution:
1. Fetch `ClientConfig` for this participant (existing hook or API call)
2. If `clientOverviewLayout` exists on it, use it
3. Otherwise use `ClinicianConfig.clientOverviewLayout`
4. Otherwise use preset defaults

- [ ] **Step 3: Test manually**

Run: `npm run dev`, navigate to a participant detail page
Expected: Overview tab renders widgets from config. Customize button works.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(dashboard)/participants/[id]/page.tsx apps/web/src/hooks/use-config.ts
git commit -m "feat(web): config-driven client overview with customize support

Replace hardcoded participant overview tab with WidgetGrid.
Layout resolves from client config → clinician config → preset defaults.
Per-client customization with override banner."
```

---

## Task 11: End-to-End Verification & Cleanup

- [ ] **Step 1: Run all tests**

```bash
npm run test
```

Expected: All existing tests pass + new tests pass.

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: No type errors.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: No lint errors.

- [ ] **Step 4: Manual smoke test**

1. Start dev: `npm run dev`
2. Go to `/dashboard` — verify widgets render from config
3. Click Customize — verify panel opens with all widgets listed
4. Toggle a widget off — verify it disappears from dashboard
5. Drag a widget from main to sidebar — verify it re-renders in compact form
6. Change a widget setting (e.g., Recent Submissions item count) — verify
7. Save — verify layout persists (refresh page, layout is preserved)
8. Cancel — verify layout reverts
9. Go to participant detail page — verify overview tab uses widget grid
10. Customize on participant page — verify per-client override works

- [ ] **Step 5: Final commit if any cleanup needed**

Stage only the files that changed during cleanup (use `git status` to identify them), then:

```bash
git commit -m "chore: cleanup and verify customizable dashboard implementation"
```
