# Program Flow Redesign — Technical Architecture

## Overview
Refactor the Programs page into a two-tab layout (Template Library + My Programs) and remove the DRAFT/PUBLISHED status gate. This is primarily a UI restructure with targeted API query changes — no schema modifications. The existing clone, assign, and program editor infrastructure is reused. A new "promote" endpoint handles "Save as My Program" from client copies.

## System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Programs Page                         │
│                                                          │
│  ┌─ My Programs (default) ──┐  ┌─ Template Library ───┐ │
│  │ GET /api/programs         │  │ GET /api/programs/   │ │
│  │ (clinicianId = me,        │  │     templates        │ │
│  │  isTemplate: true)        │  │ (clinicianId != me,  │ │
│  │                           │  │  isTemplate: true)   │ │
│  │ [Create] [Assign] [Edit]  │  │ [Use Template]       │ │
│  └───────────────────────────┘  │ [Assign to Client]   │ │
│                                  └──────────────────────┘ │
└──────────────────────┬──────────────────────────────────┘
                       │
         ┌─────────────┼─────────────────┐
         ▼             ▼                 ▼
   POST /:id/clone  POST /:id/assign  POST /:id/promote
   (Use Template)   (Assign to Client) (Save as My Program)
         │             │                 │
         ▼             ▼                 ▼
    My Programs    Client Copy       My Programs
   (isTemplate:    (isTemplate:     (isTemplate:
    true)           false)           true)
```

## Components

### Programs Page (MODIFIED)
**Responsibility:** Two-tab view — My Programs and Template Library
**Location:** `apps/web/src/app/(dashboard)/programs/page.tsx`
**Changes:** Add tab state, render different lists per tab, add "Use Template" and "Assign to Client" actions on template cards

### Template Library API (MODIFIED)
**Responsibility:** Return seeded templates not owned by current clinician
**Location:** `packages/api/src/routes/programs.ts` — GET /templates
**Changes:** Add `clinicianId: { not: req.user.clinicianProfileId }` filter, remove `status: "PUBLISHED"` filter

### Promote Endpoint (NEW)
**Responsibility:** Clone a client program's structure into clinician's My Programs
**Location:** `packages/api/src/routes/programs.ts` — POST /:id/promote
**Interface:** Takes a program ID (client copy), deep-copies structure without progress into a new isTemplate: true program
**Dependencies:** Existing clone transaction pattern

### Status Removal (MODIFIED — multiple files)
**Responsibility:** Remove DRAFT/PUBLISHED gates throughout the app
**Files:** programs.ts, enrollments.ts, enrollment-section.tsx, invite-patient-modal.tsx, program editor page

## Data Model

No schema changes. Behavioral changes only:

| Field | Current Use | New Use |
|---|---|---|
| isTemplate | true = template, false = non-template | true = template/my program, false = client copy |
| templateSourceId | Links clone to source | Same — lineage tracking |
| status | DRAFT/PUBLISHED/ARCHIVED gates | Only ARCHIVED is meaningful. Default to PUBLISHED on creation. |
| clinicianId | Ownership | Also used to distinguish seeds (admin-owned) from clinician programs |

## API Design

### GET /api/programs/templates (MODIFIED)
- **Changes:** Add `clinicianId: { not: req.user.clinicianProfileId }` to WHERE clause. Remove `status: "PUBLISHED"` filter. Add `status: { not: "ARCHIVED" }` instead.
- **Response:** Same shape — template cards with module count

### GET /api/programs (EXISTING — no changes needed)
- Already filters `clinicianId: req.user.clinicianProfileId, isTemplate: true, status: { not: "ARCHIVED" }`
- This is the My Programs query

### POST /api/programs/:id/promote (NEW)
- **Auth:** `authenticate` + `requireRole("CLINICIAN")`
- **Request:** `{ title?: string }` (optional custom title)
- **Logic:**
  1. Verify source program exists and clinician owns it
  2. Verify source is a client copy (isTemplate: false)
  3. Clone program + modules + parts + trackers in transaction (reuse existing clone logic)
  4. Set isTemplate: true, templateSourceId: source.templateSourceId (preserve original lineage)
  5. Exclude: enrollments, progress, homework instances
- **Response:** `{ success: true, data: { id, title, ... } }`
- **Errors:** 404 (not found), 400 (already a template)

### POST /api/programs/:id/clone (MODIFIED)
- **Change:** Remove `status: "PUBLISHED"` from source lookup WHERE clause
- **Change:** Set default status to "PUBLISHED" instead of "DRAFT" for cloned programs

### POST /api/programs (MODIFIED)
- **Change:** New programs default to isTemplate: true, status: "PUBLISHED"

### POST /api/programs/:programId/enrollments (MODIFIED)
- **Change:** Remove the `program.status !== "PUBLISHED"` check

## Data Flow

### Scenario 1: Use Template
1. Clinician clicks "Use Template" on Template Library card
2. Frontend calls POST /api/programs/:id/clone
3. API clones program with isTemplate: true, status: "PUBLISHED", clinicianId: current user
4. Frontend navigates to /programs/:newId (program editor)

### Scenario 2: Assign to Client (from either tab)
1. Clinician clicks "Assign to Client"
2. AssignmentModal opens (existing flow)
3. POST /api/programs/:id/assign creates client copy with isTemplate: false
4. Enrollment created automatically

### Scenario 3: Save as My Program
1. Clinician on client profile page clicks "Save as My Program"
2. Frontend calls POST /api/programs/:id/promote
3. API clones structure (no progress) with isTemplate: true
4. Toast: "Saved to My Programs"

### Scenario 4: Create from Scratch
1. Clinician clicks "Create Program" on My Programs tab
2. POST /api/programs creates new program with isTemplate: true, status: "PUBLISHED"
3. Frontend navigates to editor

## Compliance Controls

This feature inherits all controls from the template cloning feature (COND-1 through COND-4). No additional conditions.

| Condition | Implementation |
|---|---|
| Template Library read-only | Templates endpoint returns only non-owned programs. Ownership checks on all edit/delete routes prevent modification. |
| "Save as My Program" excludes client data | Promote endpoint clones structure only — same pattern as clone endpoint which skips enrollments, progress, homework instances. |
| Audit trail | All operations through Prisma audit middleware — inherited. |

## Technology Choices

| Decision | Choice | Rationale | Alternatives Considered |
|---|---|---|---|
| Promote endpoint | New route, reuses clone logic | Clone already handles deep copy correctly; promote just changes output flags | Separate service — unnecessary |
| Tab state | URL query param ?tab=templates | Bookmarkable, shareable | React state only — loses tab on refresh |
| Status removal | Keep field, stop checking it | Zero migration risk, backward compatible | Remove from schema — too risky |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Seeded templates mixed with clinician programs after clone | Confusing My Programs list | Clone sets clinicianId to current user — ownership clearly distinguishes |
| Removing PUBLISHED check breaks enrollment | Clients enrolled in incomplete programs | Clinicians control when to assign — the assign action is the new gate |
| Legacy DRAFT programs hidden | Data loss perception | Stop filtering by status (except ARCHIVED) — show all |

## File Structure

### Modified Files
```
packages/api/src/routes/programs.ts            — Modify GET /templates, POST /clone, add POST /:id/promote
packages/api/src/routes/enrollments.ts          — Remove PUBLISHED status check
apps/web/src/app/(dashboard)/programs/page.tsx  — Two-tab layout
apps/web/src/app/(dashboard)/programs/[id]/page.tsx — Remove status toggle/badge
apps/web/src/components/enrollment-section.tsx  — Remove PUBLISHED gates
apps/web/src/components/invite-patient-modal.tsx — Remove PUBLISHED filter
apps/web/src/app/(dashboard)/participants/[id]/page.tsx — Add "Save as My Program" button
```

### No New Files Needed
All changes fit into existing files. The promote endpoint is added to programs.ts alongside clone.
