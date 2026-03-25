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

Each widget definition:

```typescript
interface WidgetDefinition {
  id: string;
  label: string;
  description: string;
  page: "dashboard" | "client_overview";
  defaultColumn: "main" | "sidebar";
  supportedColumns: ("main" | "sidebar")[];
  settingsSchema: ZodSchema | null;
  defaultSettings: Record<string, unknown>;
}
```

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
| `quick_actions` | Quick Actions | sidebar | `{ links: [{ label, path, icon? }] }` |
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
- `dashboardLayout` — already exists, shape extends to include `column`, `order`, `settings`
- `clientOverviewLayout` — new JSON field, same shape as `dashboardLayout`

**`ClientConfig`** (schema.prisma):
- `clientOverviewLayout` — new JSON field, optional per-client override

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
- `@dnd-kit` `DndContext` wraps both the panel list and the dashboard columns
- Column assignment updates when widget is dragged between dashboard columns

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

### Entry Points for Customize

- **Header icon:** Pencil/gear icon next to the greeting area in the dashboard page header
- **Sidebar nav:** "Customize Dashboard" link under the Dashboard nav item in the sidebar

## Client Overview Page

Same system as dashboard, different widget set.

### Layout Resolution

1. Check `ClientConfig.clientOverviewLayout` for this specific client
2. Fall back to `ClinicianConfig.clientOverviewLayout`
3. Fall back to preset defaults

### Per-Client Customization

When customizing per-client, a banner in the panel reads: "Customizing for [Client Name] — Reset to default" to make it clear the clinician is creating an override.

## API & Backend Changes

### Schema Updates (`packages/shared/src/schemas/config.ts`)

- Extend `DashboardLayoutItem` schema: add `column` (enum: main/sidebar), `order` (number), `settings` (record, validated per-widget)
- Add `clientOverviewLayout` to `SaveClinicianConfigSchema`
- Add `clientOverviewLayout` to client config save schema

### API Route Changes (`packages/api/src/routes/config.ts`)

- `PUT /api/config` — already saves `dashboardLayout`, now accepts richer shape + `clientOverviewLayout`
- `PUT /api/config/clients/:clientId` — add `clientOverviewLayout` for per-client overrides
- No new endpoints needed

### Config Service (`packages/api/src/services/config.ts`)

- Update `resolveClientConfig()` to merge `clientOverviewLayout` using same fallback pattern as `enabledModules`

### Preset Updates (`packages/shared/src/constants/provider-presets.ts`)

- Update all 11 presets with richer layout shape (`column`, `order`, `settings`)
- Add `clientOverviewLayout` defaults to each preset

### Prisma Schema

- Add `clientOverviewLayout Json?` to `ClinicianConfig` model
- Add `clientOverviewLayout Json?` to `ClientConfig` model

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
