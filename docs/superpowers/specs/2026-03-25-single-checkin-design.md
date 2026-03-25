# Single Check-in Per Client

**Date:** 2026-03-25
**Status:** Draft
**Scope:** Consolidate multiple daily trackers into one check-in per client. Add field editor modal. Show graphs on client overview widget. Migrate existing data.

## Problem

Clinicians can create multiple separate trackers for each client. This fragments the check-in experience — the client sees multiple cards in the mobile app, data is split across trackers, and there's no unified view. Clinicians want one check-in per client with customizable fields, and they want to see the trend graphs immediately on the client overview.

## Solution

Enforce one `DailyTracker` per participant at the application level. Merge existing multi-tracker data via migration. Add a field editor modal for clinicians. Reuse existing `TrackerDataView` charts in the `client_trackers` widget.

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Data model | Keep `DailyTracker` model, enforce one-per-participant in app layer | No schema migration needed, just a constraint |
| Existing data | Merge all trackers per participant into one | Preserves historical data, clean cut to new model |
| Field editing | Modal dialog | Clinician requested modal over inline |
| Chart display | Reuse `TrackerDataView` in `client_trackers` widget | Already built with Recharts, handles Scale/Number trends |
| Mobile impact | Minimal — one card instead of many | Existing tracker card + form works as-is |

## Data Model

No Prisma schema changes. The existing models are sufficient:

- `DailyTracker` — one per participant (enforced by app logic, not DB constraint)
- `DailyTrackerField` — multiple fields per tracker (Scale, Number, Yes/No, Multi-Check, Free Text, Time)
- `DailyTrackerEntry` — one per participant per day, `responses` JSON keyed by field ID

### Application-Level Constraint

The API enforces one tracker per participant:
- `POST /api/daily-trackers` checks if a tracker already exists for the `participantId` — returns 409 if so
- The web UI shows "Set Up Check-in" when none exists, "Edit Check-in" when one does
- No "Add another tracker" option

## Migration

A one-time migration script that runs for each participant with multiple trackers:

1. For each participant with >1 tracker (skip trackers with no `participantId` — program-only trackers are excluded):
   a. Pick the tracker with the most entries as the "primary"
   b. Collect all fields from other trackers — deduplicate by `label + fieldType + JSON.stringify(options)` (not just label+type, to preserve fields with different options like different Scale ranges)
   c. Append non-duplicate fields to the primary tracker (with incremented sortOrder). For each appended field, record the old→new field ID mapping.
   d. For each entry in non-primary trackers: remap response keys from old field IDs to new field IDs using the mapping. If the primary tracker has no entry for that date, create one. If it does, merge the response keys (no key collisions possible since field IDs are different after remapping).
   e. Delete non-primary trackers (cascade deletes their fields and entries)
2. **Each participant's merge runs inside `prisma.$transaction`** — if any step fails, the entire merge for that participant rolls back. The script continues to the next participant.
3. Log: participant ID, trackers merged count, fields added, entries migrated

This runs as a one-time Node script in `packages/api/src/scripts/merge-trackers.ts`, invoked manually.

## API Changes

### Modified Endpoints

**`POST /api/daily-trackers`**
- **`participantId` becomes required** (update `CreateDailyTrackerSchema` to make it non-optional). Program-level tracker creation is removed.
- Add check: if a tracker already exists for `participantId`, return `409 Conflict` with error "Check-in already exists for this participant"
- **Schema change:** Update `CreateDailyTrackerSchema` to allow `fields` array to be empty (remove `.min(1)`) to support the "start blank" flow. An empty check-in gets fields added via the Edit modal.

**`POST /api/daily-trackers/from-template`**
- Same 409 check — only applies when `participantId` is provided (which it always will be under the new model)
- Update `CreateTrackerFromTemplateSchema` to make `participantId` required

**`GET /api/daily-trackers?participantId=X`**
- Returns array with 0 or 1 trackers (no change to response shape, but UI treats it as singular)

### New Endpoint

**`GET /api/daily-trackers/participant/:participantId`**
- Convenience endpoint: returns the single check-in for a participant (or 404)
- Includes fields (ordered by sortOrder) and `_count.entries`
- Avoids the caller needing to handle arrays
- **Route ordering:** Must be registered BEFORE `/:id` routes in Express, otherwise `participant` gets matched as `:id`
- **Authorization:** Must verify the requesting clinician has a relationship with the participant (via enrollment or `ClinicianClient` record) before returning data — same ownership pattern as other clinician-facing endpoints

### Unchanged Endpoints

- `PUT /api/daily-trackers/:id` — still works for field updates
- `DELETE /api/daily-trackers/:id` — still works
- `GET /api/daily-trackers/:id/entries` — still works
- `GET /api/daily-trackers/:id/trends` — still works (this powers the charts)
- `GET /api/daily-trackers/templates` — still works (used for initial setup)

## Web UI Changes

### Client Overview — `client_trackers` Widget

Replace the current placeholder-style widget with embedded trend charts:

1. Fetch the single check-in via `GET /api/daily-trackers/participant/:participantId`
2. If no check-in exists: show "No check-in set up" + "Set Up Check-in" button
3. If check-in exists but no entries: show field list + "Waiting for first entry" message
4. If entries exist: fetch trends via `GET /api/daily-trackers/:id/trends` and render charts

Chart rendering: extract a new `TrackerCharts` sub-component from `TrackerDataView` that handles just the chart rendering (Recharts line charts for Scale/Number fields). `TrackerDataView` is a full-page component with its own queries, back button, and entry history — it's too heavy for a widget. The extracted `TrackerCharts` accepts pre-fetched trend data and renders compact charts.

**Main column:** Show compact line charts for each Scale/Number field (sparkline-style). Show streak count + completion rate below charts.
**Sidebar column:** Show streak count + completion rate as numbers only (no charts — fetch trends but only extract the stats, don't render Recharts).

### Edit Check-in Modal

A new `EditCheckinModal` component (`apps/web/src/components/edit-checkin-modal.tsx`):

- Opens from the `client_trackers` widget via "Edit" button (or from Trackers tab)
- Uses `size="md"` dialog tier
- Content:
  - Header: "Edit Check-in" + description
  - Body (scrollable):
    - List of current fields, each showing: drag handle, field label, field type badge, delete (X) button
    - Drag-to-reorder via `@dnd-kit` (same pattern as other DnD in the app)
    - "Add Field" section at bottom: type selector dropdown → label input → type-specific options (min/max for Scale, choices for Multi-Check) → "Add" button
  - Footer: "Save" + "Cancel"
- On Save: calls `PUT /api/daily-trackers/:id` with the updated fields array
- Uses the existing `useUpdateDailyTracker` hook
- **Cache invalidation:** On success, must also invalidate `["client-trackers", participantId]` (the widget's query key) so the widget refreshes. Either extend `useUpdateDailyTracker` to accept `participantId` for invalidation, or handle in the modal's `onSuccess` callback.

### Set Up Check-in Flow

When no check-in exists for a client:

1. Widget shows "Set Up Check-in" button
2. Clicking opens the existing "Add Check-in" dialog (already built in the Trackers tab) but simplified:
   - Option A: Pick a template (existing template picker)
   - Option B: Start blank (opens the Edit Check-in Modal with no fields)
3. Creates the tracker via `POST /api/daily-trackers` or `POST /api/daily-trackers/from-template`

### Trackers Tab

Simplify the existing Trackers tab on the participant detail page:
- Instead of a list of multiple trackers, show the single check-in's details
- Show the full `TrackerDataView` (charts, entries, stats) — same as current but for one tracker
- "Edit Fields" button opens the Edit Check-in Modal
- Remove "Add Check-in" button (replaced by setup flow in widget)
- Remove per-tracker pause/resume/delete actions (single check-in is always active, can only be edited)

### Programs Page — DailyTrackerSection

**Remove program-level tracker creation.** The `DailyTrackerSection` component on program detail pages is removed. Trackers are per-participant only. The `programId` field on `DailyTracker` model is kept for backward compat but no longer used for new tracker creation. Existing program-scoped trackers (those with `programId` but no `participantId`) are left as-is — they're orphans that don't affect the new model.

## Mobile App Changes

Minimal changes needed:
- `DailyTrackerCards` already fetches trackers and shows cards — with one tracker, it shows one card
- The card label can be hardcoded to "Daily Check-in" or use the tracker name
- The form submission flow is unchanged
- No multi-tracker navigation needed

## Testing Strategy

- **Migration script:** Test with mock data — single tracker (no-op), two trackers (merge), overlapping entries on same date (merge responses), participant with program-only tracker (excluded), fields with same label but different options (not deduped), transaction rollback on failure
- **API 409 constraint:** Test creating second tracker for same participant, test creating without participantId (rejected)
- **New endpoint:** Test `GET /api/daily-trackers/participant/:participantId` — found, not found, includes fields, ownership verification (403 for unrelated clinician)
- **Schema changes:** Test `CreateDailyTrackerSchema` with required `participantId`, empty fields array accepted
- **Edit Check-in Modal:** React Testing Library — add field, remove field, reorder, save, cache invalidation
- **Widget:** Test chart rendering with trend data, empty state, no-checkin state, sidebar mode (stats only, no charts)
