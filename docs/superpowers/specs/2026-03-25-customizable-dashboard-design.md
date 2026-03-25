# Customizable Dashboard & Client Overview

**Date:** 2026-03-25
**Status:** Draft
**Scope:** Clinician dashboard customization with drag-and-drop widget layout, per-widget settings, and client overview widget system.

## Problem

The clinician dashboard is hardcoded — all widgets are always visible in a fixed layout. The settings page has module toggles and a `dashboardLayout` field in the database, but the dashboard ignores them. Clinicians have different workflows (CBT therapist vs. psychiatrist vs. ADHD coach) and need to configure their dashboard to surface what matters to them.

## Solution

A customizable widget system powered by a typed widget registry in `@steady/shared`, a slide-out customize panel with drag-and-drop, and per-widget settings. The same system applies to both the main dashboard and the client overview page.

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Initial dashboard setup | Provider preset from onboarding | Already built — presets map provider type to default widgets |
| Edit mode UX | Slide-out customize panel (Option C) | Clean dashboard when not editing; panel provides natural home for all widgets + settings; explicit Save/Cancel |
| Stat cards | Widgets, not a fixed row | Everything is customizable — no special cases |
| Widget column placement | Full flexibility (drag between main/sidebar) | Widgets adapt rendering to column context |
| Per-widget settings | Extensible, starting simple | Begin with item counts, days-back; expand based on feedback |
| Customize entry points | Both header icon + sidebar link | Ship both, see which gets used |
| Client overview | Same widget system, different widget set | Reuse panel, drag-and-drop, settings infrastructure |
| Client overview layout | Clinician default + per-client override | Matches existing `ClientConfig` override pattern |
| Backend storage | Extend existing `dashboardLayout` JSON field | No new tables, minimal API changes |

## Data Model

### Widget Registry (`packages/shared/src/constants/dashboard-widgets.ts`)

This file replaces the existing `DASHBOARD_WIDGETS` constant and its `DashboardWidget` interface. The old interface had `size: "half" | "full"` and `requiresModule: string` — these are replaced by `defaultColumn`/`supportedColumns` (which subsume `size`) and `requiresModule` (preserved).

Each widget definition:

```typescript
interface WidgetDefinition {
  id: string;
  label: string;
  description: string;
  page: "dashboard" | "client_overview";
  defaultColumn: "main" | "sidebar";
  supportedColumns: ("main" | "sidebar")[];
  requiresModule: string | null;  // module ID — widget hidden if module disabled
  settingsSchema: ZodSchema | null;
  defaultSettings: Record<string, unknown>;
}
```

**New widgets** (not in current registry): `stat_active_clients`, `stat_sessions_today`, `stat_homework_rate`, `stat_overdue_count`, `todays_sessions`, `checkin_alerts`, `overdue_homework`, `recent_submissions`, `quick_actions`. These replace the hardcoded dashboard sections.

**Existing widgets** (carried over from current registry): `tracker_summary`, `homework_status`, `journal_activity`, `assessment_scores`, `medication_adherence`, `side_effects_report`, `program_progress`, `pre_visit`, `recent_messages`, `rtm_overview`, `todo_progress`.

### Dashboard Layout Shape (stored in `ClinicianConfig.dashboardLayout` JSON)

```typescript
type DashboardLayoutItem = {
  widgetId: string;
  visible: boolean;
  column: "main" | "sidebar";
  order: number;
  settings: Record<string, unknown>;
};

type DashboardLayout = DashboardLayoutItem[];
```

Extends the existing `{ widgetId, visible }` shape with `column`, `order`, and `settings`.

### Backward Compatibility & Migration

The new fields (`column`, `order`, `settings`) are **optional with defaults** in the Zod schema:
- `column` defaults to the widget's `defaultColumn` from the registry
- `order` defaults to the widget's position in the array
- `settings` defaults to `{}` (widget uses its `defaultSettings` when settings are empty)

This means existing `{ widgetId, visible }` data in the database is valid without migration. A **runtime normalization function** (`normalizeDashboardLayout()`) in `@steady/shared` hydrates missing fields from the widget registry when loading a layout. This function runs on the frontend when reading config, not on write — so existing data is never destructively modified.

```typescript
function normalizeDashboardLayout(
  layout: PartialDashboardLayoutItem[],
  registry: WidgetDefinition[]
): DashboardLayoutItem[] {
  return layout.map((item, index) => {
    const widget = registry.find(w => w.id === item.widgetId);
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

The Zod schema for `DashboardLayoutItem` uses `.optional().default()` for the new fields so the `PUT /api/config` endpoint accepts both old and new payloads without breaking.

### Dashboard Widgets (page: "dashboard")

| Widget ID | Label | Default Column | Settings |
|---|---|---|---|
| `stat_active_clients` | Active Clients | main | — |
| `stat_sessions_today` | Sessions Today | main | — |
| `stat_homework_rate` | Homework Rate | main | — |
| `stat_overdue_count` | Overdue Count | main | — |
| `todays_sessions` | Today's Sessions | main | — |
| `checkin_alerts` | Check-in Alerts | main | `{ daysBack: 3, threshold: 30 }` |
| `overdue_homework` | Overdue Homework | main | `{ itemCount: 10 }` |
| `recent_submissions` | Recent Submissions | sidebar | `{ itemCount: 10, daysBack: 7 }` |
| `quick_actions` | Quick Actions | sidebar | `{ links: z.array(z.object({ label: z.string().max(50), path: z.string().max(200), icon: z.string().max(50).optional() })).max(10) }` |
| `tracker_summary` | Tracker Summary | main | — |
| `homework_status` | Homework Status | main | — |
| `journal_activity` | Journal Activity | sidebar | `{ itemCount: 5 }` |
| `assessment_scores` | Assessment Scores | main | — |
| `medication_adherence` | Medication Adherence | sidebar | — |
| `side_effects_report` | Side Effects | main | — |
| `program_progress` | Program Progress | main | — |
| `pre_visit` | Pre-Visit Summary | main | — |
| `recent_messages` | Recent Messages | sidebar | `{ itemCount: 5 }` |
| `rtm_overview` | RTM Overview | main | — |
| `todo_progress` | Todo Progress | sidebar | — |

### Client Overview Widgets (page: "client_overview")

| Widget ID | Label | Default Column | Notes |
|---|---|---|---|
| `client_demographics` | Client Info | main | Name, enrollment date, program, status |
| `client_sessions` | Session History | main | Past/upcoming sessions |
| `client_homework` | Homework | main | Assigned + completed + overdue |
| `client_trackers` | Daily Trackers | main | Recent entries, trend sparklines |
| `client_assessments` | Assessments | main | Score history with charts |
| `client_journal` | Journal Entries | sidebar | Recent entries |
| `client_progress` | Program Progress | main | Module completion |
| `client_alerts` | Alerts | sidebar | Low scores, overdue items |
| `client_notes` | Session Notes | sidebar | Recent clinician notes |
| `client_quick_actions` | Quick Actions | sidebar | Customizable links scoped to client |

### Database Changes

**`ClinicianConfig`** (schema.prisma):
- `dashboardLayout` — already exists, shape extends to include `column`, `order`, `settings` (backward compatible via optional fields)
- `clientOverviewLayout Json?` — new nullable JSON field, same shape as `dashboardLayout`. Added as a top-level field (not inside `customConfig`) for consistency with `dashboardLayout`.

**`ClientConfig`** (schema.prisma):
- `clientOverviewLayout Json?` — new nullable JSON field, optional per-client override. Top-level field, not inside `customConfig`.

Both are nullable JSON fields — `prisma db push` adds them without data migration.

## Widget Component Architecture

### Props Interface

```typescript
interface WidgetProps {
  column: "main" | "sidebar";
  settings: Record<string, unknown>;
  isEditing: boolean;
}

interface ClientWidgetProps extends WidgetProps {
  clientId: string;
}
```

### File Structure

```
apps/web/src/components/dashboard-widgets/
  widget-shell.tsx          → shared wrapper (drag handle, header, loading/error states)
  stat-widget.tsx           → all 4 stat card variants
  todays-sessions.tsx
  checkin-alerts.tsx
  overdue-homework.tsx
  recent-submissions.tsx
  quick-actions.tsx
  tracker-summary.tsx
  homework-status.tsx
  journal-activity.tsx
  assessment-scores.tsx
  medication-adherence.tsx
  side-effects-report.tsx
  program-progress.tsx
  pre-visit-summary.tsx
  recent-messages.tsx
  rtm-overview.tsx
  todo-progress.tsx
  index.ts                  → registry mapping widgetId → component

apps/web/src/components/client-widgets/
  client-demographics.tsx
  client-sessions.tsx
  client-homework.tsx
  client-trackers.tsx
  client-assessments.tsx
  client-journal.tsx
  client-progress.tsx
  client-alerts.tsx
  client-notes.tsx
  client-quick-actions.tsx
  index.ts                  → registry mapping widgetId → component
```

### Widget Shell

Shared wrapper component handling:
- Drag handle (visible only in edit mode)
- Widget title bar
- Loading skeleton state
- Error boundary with retry
- Column-aware layout (passes `column` prop to child)

### Widget Rendering

Each widget adapts to its column context:
- **Main column:** Full rendering — tables, charts, detailed lists
- **Sidebar:** Compact rendering — condensed lists, smaller text, fewer items

The widget component checks its `column` prop and renders accordingly. No separate component needed per column — just conditional layout within the same component.

## Customize Panel

### Component: `apps/web/src/components/customize-panel.tsx`

Slide-out panel from the right side of the dashboard.

### Behavior

1. **Opening:** Click pencil icon in dashboard header OR "Customize Dashboard" in sidebar nav
2. **Panel content:**
   - Search/filter input at top
   - "Widgets" section: enabled widgets with drag handles, toggle switches, gear icons
   - "Available" section: disabled widgets (dimmed) with toggle switches
   - Save / Cancel buttons at bottom
3. **Drag-and-drop in panel:** Reorder widgets. Dashboard updates live as preview.
4. **Toggle switch:** Flip widget visibility. Widget moves between "Widgets" and "Available" sections.
5. **Gear icon:** Expands per-widget settings inline. Settings form auto-generated from widget's `settingsSchema`.
6. **Dashboard in edit mode:** Dashed borders on widgets, drag handles visible, "drop widget here" zones in columns. Widgets can be dragged between main and sidebar columns directly on the dashboard.
7. **Save:** Persists layout to API via `PUT /api/config`. Panel closes. Dashboard re-renders with saved layout.
8. **Cancel:** Discards local changes. Panel closes. Dashboard reverts to last saved state.

### State Management

- Local state copy of layout on panel open (not TanStack Query mutation until Save)
- **Two separate `DndContext` scopes:** one for the panel list (reorder only) and one for the dashboard columns (cross-column drag). Toggling a widget on in the panel adds it to the dashboard; dragging on the dashboard moves it between columns. No cross-context drag from panel to dashboard — keeps the interaction model simple.
- Column assignment updates when widget is dragged between dashboard columns

### Error Handling

- **Save failure:** Panel stays open, shows inline error toast ("Failed to save layout — try again"). Layout reverts to last saved state on Cancel.
- **Config fetch loading:** Panel shows skeleton loader until config is ready. Dashboard shows widget skeletons.
- **Optimistic UI:** Not used — save is explicit (Save button), so the panel blocks briefly on save with a spinner on the Save button.

## Dashboard Page Refactor

### Current State
Hardcoded widgets in `apps/web/src/app/(dashboard)/dashboard/page.tsx`. Ignores `dashboardLayout` from config.

### New Behavior

1. Fetch `dashboardLayout` from `useClinicianConfig()`
2. If no layout exists (new user pre-onboarding), show a default layout
3. Split layout by `column`, filter by `visible: true`, sort by `order`
4. Look up each widget's component from the registry
5. Render main column (2/3 width) and sidebar column (1/3 width)
6. Wrap in `@dnd-kit` `DndContext` with `SortableContext` per column

### Responsive Behavior

- **Desktop (lg+):** Two-column layout — main (2/3) + sidebar (1/3). Customize panel slides in from right.
- **Tablet/mobile (<lg):** Sidebar column stacks below main column. Customize panel becomes full-width overlay.
- Follows existing responsive pattern in the current dashboard (`grid-cols-1 lg:grid-cols-3`).

### Entry Points for Customize

- **Header icon:** Pencil/gear icon next to the greeting area in the dashboard page header
- **Sidebar nav:** "Customize Dashboard" link under the Dashboard nav item in the sidebar

## Client Overview Page

Same widget system as dashboard, applied to the existing client overview page at `apps/web/src/app/(dashboard)/participants/[id]/page.tsx` (the "Overview" tab). Different widget set, same customize panel and drag-and-drop infrastructure.

### Layout Resolution

1. Check `ClientConfig.clientOverviewLayout` for this specific client
2. Fall back to `ClinicianConfig.clientOverviewLayout`
3. Fall back to preset defaults

### Per-Client Customization

When customizing per-client, a banner in the panel reads: "Customizing for [Client Name] — Reset to default" to make it clear the clinician is creating an override.

## API & Backend Changes

### Schema Updates (`packages/shared/src/schemas/config.ts`)

- Extend `DashboardLayoutItem` schema: add `column` (enum: main/sidebar, optional, default "main"), `order` (number, optional), `settings` (record, optional, default `{}`)
- Layout arrays capped at `.max(50)` to prevent unbounded growth
- Add `clientOverviewLayout` (optional) to `SaveClinicianConfigSchema`
- Add `clientOverviewLayout` (optional) to client config save schema
- Add `SaveDashboardLayoutSchema` for the new `PATCH` endpoint — accepts only `{ dashboardLayout }` or `{ clientOverviewLayout }`

### API Route Changes (`packages/api/src/routes/config.ts`)

- `PUT /api/config` — already saves `dashboardLayout`, now accepts richer shape + `clientOverviewLayout`
- `PUT /api/config/clients/:clientId` — add `clientOverviewLayout` for per-client overrides
- `PATCH /api/config/dashboard-layout` — **new endpoint** for saving only the dashboard layout (avoids requiring the full config payload when customizing). Accepts `{ dashboardLayout }` or `{ clientOverviewLayout }`.
- `PATCH /api/config/clients/:clientId/overview-layout` — **new endpoint** for saving per-client overview layout only.

### Config Service (`packages/api/src/services/config.ts`)

- Update `resolveClientConfig()` to merge `clientOverviewLayout` using same fallback pattern as `enabledModules`

### Preset Updates (`packages/shared/src/constants/provider-presets.ts`)

- Update all 11 presets with richer layout shape (`column`, `order`, `settings`)
- Update `ProviderPreset` interface: change `dashboardLayout` from `readonly DashboardWidgetId[]` to `DashboardLayoutItem[]`
- Update `createDefaultConfig` in `services/config.ts` to use the new shape directly (remove the current mapping from flat array to `{ widgetId, visible }`)
- Add `clientOverviewLayout` defaults to each preset

### Prisma Schema

- Add `clientOverviewLayout Json?` to `ClinicianConfig` model
- Add `clientOverviewLayout Json?` to `ClientConfig` model

## Widget Data Fetching

**Dashboard widgets:** The existing `GET /api/clinician/dashboard` endpoint returns all dashboard data in one call. For the initial implementation, keep this single-endpoint approach — the endpoint already returns sessions, homework rates, alerts, etc. Widgets that need data not in this endpoint (e.g., journal activity, assessment scores) get their own TanStack Query hook. Each widget component is responsible for its own data fetching via hooks.

**Client overview widgets:** Each widget fetches its own data using existing API endpoints scoped to the client ID (e.g., `GET /api/enrollments?participantId=X`, `GET /api/sessions?participantId=X`). No new aggregation endpoint needed — the existing per-resource endpoints are sufficient.

**Performance:** Only visible widgets fetch data. Hidden widgets (in the registry but toggled off) do not mount and do not fire queries. TanStack Query's deduplication handles the case where multiple widgets share data from the same endpoint.

## Settings Page Cleanup

The current settings page has module toggles that don't connect to the dashboard. Two options:

1. **Remove the "Enabled Modules" section** from settings — it's now redundant since widgets are toggled directly on the dashboard
2. **Keep it as a high-level toggle** — enabled modules control what's available in the widget registry (if a module is disabled, its widgets don't appear in the customize panel)

**Recommendation:** Option 2 — modules are a broader concept (they affect what participants see too), so keep them in settings. The dashboard customize panel only shows widgets for enabled modules.

## Testing Strategy

- **Widget registry:** Unit tests for each widget definition — valid settingsSchema, valid defaults
- **Dashboard layout schema:** Zod validation tests — valid layouts, invalid column values, missing fields
- **API:** Integration tests for saving/loading layouts with the extended shape
- **Customize panel:** React Testing Library — open panel, toggle widget, reorder, save, cancel
- **Widget components:** Render tests with `column: "main"` and `column: "sidebar"` to verify both layouts
- **Drag-and-drop:** Integration tests with `@dnd-kit` test utilities for cross-column moves
- **Client overview:** Test layout resolution (client override → clinician default → preset)
