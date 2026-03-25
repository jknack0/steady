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

1. For each participant with >1 tracker:
   a. Pick the tracker with the most entries as the "primary"
   b. Collect all fields from other trackers — skip duplicates (same label + fieldType)
   c. Append non-duplicate fields to the primary tracker (with incremented sortOrder)
   d. For each entry in non-primary trackers: if the primary tracker has no entry for that date, create one with the responses mapped to new field IDs. If it does, merge the response keys.
   e. Delete non-primary trackers (cascade deletes their fields and entries)
2. Log: participant ID, trackers merged count, fields added, entries migrated

This runs as a one-time Node script in `packages/api/src/scripts/merge-trackers.ts`, invoked manually.

## API Changes

### Modified Endpoints

**`POST /api/daily-trackers`**
- Add check: if a tracker already exists for `participantId`, return `409 Conflict` with error "Check-in already exists for this participant"
- The `programId` and `enrollmentId` fields become optional/unused for the single check-in model (kept for backward compat but not required)

**`POST /api/daily-trackers/from-template`**
- Same 409 check — can't create from template if one already exists

**`GET /api/daily-trackers?participantId=X`**
- Returns array with 0 or 1 trackers (no change to response shape, but UI treats it as singular)

### New Endpoint

**`GET /api/daily-trackers/participant/:participantId`**
- Convenience endpoint: returns the single check-in for a participant (or 404)
- Includes fields (ordered by sortOrder) and `_count.entries`
- Avoids the caller needing to handle arrays

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

Chart rendering: reuse the trend chart logic from `TrackerDataView` (`apps/web/src/components/tracker-data-view.tsx`). For each Scale/Number field, show a line chart. For Yes/No fields, show a completion streak. Keep it compact — the widget is in a dashboard grid, not a full page.

**Main column:** Show charts for each field (small sparkline-style or compact line charts). Show streak + completion rate.
**Sidebar column:** Show streak count + completion rate as numbers only.

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

The `DailyTrackerSection` on program detail pages currently lets clinicians create trackers per program. This becomes:
- Remove the ability to create trackers at the program level
- Or: keep it as a way to define a "default check-in template" for the program that gets applied when a client enrolls

For now, simplest approach: remove program-level tracker creation. Trackers are per-participant only.

## Mobile App Changes

Minimal changes needed:
- `DailyTrackerCards` already fetches trackers and shows cards — with one tracker, it shows one card
- The card label can be hardcoded to "Daily Check-in" or use the tracker name
- The form submission flow is unchanged
- No multi-tracker navigation needed

## Testing Strategy

- **Migration script:** Test with mock data — single tracker (no-op), two trackers (merge), overlapping entries (merge responses)
- **API 409 constraint:** Test creating second tracker for same participant
- **New endpoint:** Test `GET /api/daily-trackers/participant/:participantId` — found, not found, includes fields
- **Edit Check-in Modal:** React Testing Library — add field, remove field, reorder, save
- **Widget:** Test chart rendering with trend data, empty state, no-checkin state
