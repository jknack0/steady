# Program Template Cloning — Technical Architecture

## Overview
Extend the existing program clone infrastructure to support per-client assignment with inline customization. A new `POST /api/programs/:id/assign` endpoint deep-copies selected modules/parts/trackers into a client-specific program within a transaction, creates an enrollment, and links via `templateSourceId`. The web frontend adds an assignment modal with a tree-view toggle UI, reachable from both the program page and client profile page.

## System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Web Frontend                          │
│                                                          │
│  Program Page ──┐     Client Profile Page ──┐            │
│                 ▼                            ▼            │
│        [Assign to Client]          [Add Program]         │
│                 │                            │            │
│                 ▼                            ▼            │
│         ┌──────────────────────────────┐                 │
│         │  Assignment Modal            │                 │
│         │  1. Pick participant/template │                 │
│         │  2. Tree view with toggles   │                 │
│         │  3. Save / Cancel            │                 │
│         └──────────┬───────────────────┘                 │
│                    │                                     │
└────────────────────┼─────────────────────────────────────┘
                     │ POST /api/programs/:id/assign
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    API Server                            │
│                                                          │
│  programs.ts                                             │
│  ├── GET  /:id/preview         (existing — full tree)    │
│  ├── POST /:id/assign          (NEW — clone + enroll)    │
│  ├── POST /:id/assign/append   (NEW — re-assign append)  │
│  │                                                       │
│  Client program editing (modules.ts / parts.ts):         │
│  ├── DELETE /modules/:id       (hard/soft delete)        │
│  ├── DELETE /parts/:id         (hard/soft delete)        │
│                                                          │
│  clinician.ts                                            │
│  ├── GET /clients              (existing — COND-1)       │
│                                                          │
└──────────────────────┬──────────────────────────────────┘
                       │ prisma.$transaction()
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL                             │
│                                                          │
│  Program (isTemplate=true)  ──templateSourceId──►        │
│  Program (isTemplate=false, client copy)                 │
│    └── Module (+deletedAt)                               │
│         └── Part (+deletedAt)                            │
│    └── DailyTracker (deduplicated)                       │
│    └── Enrollment (auto-created, ACTIVE)                 │
│                                                          │
│  AuditLog ◄── all mutations via middleware               │
└─────────────────────────────────────────────────────────┘
```

## Components

### AssignmentService (NEW)
**Responsibility:** Business logic for cloning a template into a client-specific program with selective modules/parts.
**Location:** `packages/api/src/services/assignment.ts`
**Interface:**
- `assignProgram(clinicianId, templateId, participantId, selections)` — First-time assignment
- `appendModules(clinicianId, clientProgramId, templateId, selections)` — Re-assignment append
**Dependencies:** Prisma client, audit context

### Assignment Routes (NEW endpoints on programs.ts)
**Responsibility:** HTTP layer for assignment operations.
**Location:** Added to `packages/api/src/routes/programs.ts`
**Interface:** REST endpoints (detailed below)
**Dependencies:** AssignmentService, authenticate + requireRole middleware

### AssignmentModal (NEW)
**Responsibility:** UI for the assignment flow — participant/template picker + tree toggle view.
**Location:** `apps/web/src/components/assignment/`
**Interface:** React component receiving `templateId` or `participantId` as entry-point context
**Dependencies:** TanStack Query hooks, shadcn/ui components

### Module/Part Delete Enhancement (MODIFIED)
**Responsibility:** Smart delete — hard delete if no progress, soft delete if progress exists.
**Location:** Modified in `packages/api/src/routes/modules.ts` and `packages/api/src/routes/parts.ts`
**Dependencies:** ModuleProgress, PartProgress queries

## Data Model

### Schema Changes

**Module — add `deletedAt`:**
| Field | Type | Constraints | Notes |
|-------|------|------------|-------|
| deletedAt | DateTime? | nullable | Soft delete marker, mirrors Part pattern |

**No other schema changes needed.** Existing `isTemplate`, `templateSourceId`, `clones` relation, and `deletedAt` on Part are sufficient.

### Key Relationships
```
Template Program (isTemplate=true)
  │
  │ templateSourceId
  ▼
Client Program (isTemplate=false)
  ├── Modules (cloned, with deletedAt)
  │    └── Parts (cloned, with deletedAt)
  ├── DailyTrackers (cloned, deduplicated)
  └── Enrollment (auto-created)
       ├── ModuleProgress
       └── PartProgress
```

## API Design

### POST /api/programs/:id/assign
**Purpose:** Clone template into client-specific program with selected content
**Auth:** `authenticate` + `requireRole("CLINICIAN")`
**Request:**
```typescript
{
  participantId: string,           // ParticipantProfile ID
  title?: string,                  // Optional custom title
  excludedModuleIds: string[],     // Module IDs to skip
  excludedPartIds: string[]        // Part IDs to skip (within included modules)
}
```
**Response:**
```typescript
{
  success: true,
  data: {
    program: { id, title, status, templateSourceId },
    enrollment: { id, status, participantId }
  }
}
```
**Errors:**
- 404: Template not found or not published
- 403: Participant not clinician's client (COND-1)
- 409: Client already has an active program from this template (redirect to append)

**Logic:**
1. Verify template exists, is published, `isTemplate: true`
2. Verify participant is clinician's client via `ClinicianClient` table (COND-1)
3. Check for existing client program from same template — if exists, return 409 with existing program ID
4. Within `prisma.$transaction()` (COND-3):
   a. Create Program with `isTemplate: false`, `templateSourceId: template.id`, `clinicianId`, `status: "PUBLISHED"`
   b. Clone modules (excluding `excludedModuleIds`), preserving `sortOrder` (COND-4)
   c. Clone parts per module (excluding `excludedPartIds`, excluding `deletedAt != null`), preserving `sortOrder` (COND-4)
   d. Clone daily trackers + fields
   e. Create Enrollment with `status: "ACTIVE"`, `participantId`
5. Return created program + enrollment

### POST /api/programs/:id/assign/append
**Purpose:** Re-assign template — append modules to existing client program
**Auth:** `authenticate` + `requireRole("CLINICIAN")`
**Request:**
```typescript
{
  clientProgramId: string,         // Existing client program to append to
  excludedModuleIds: string[],     // Module IDs to skip
  excludedPartIds: string[]        // Part IDs to skip
}
```
**Response:**
```typescript
{
  success: true,
  data: {
    program: { id, title, moduleCount },
    appendedModules: number
  }
}
```
**Errors:**
- 404: Template or client program not found
- 403: Clinician doesn't own client program

**Logic:**
1. Verify template and client program ownership
2. Get max `sortOrder` from existing modules in client program
3. Within `prisma.$transaction()` (COND-3):
   a. Clone selected modules with `sortOrder` offset = maxSortOrder + 1 (COND-4)
   b. Clone parts per module, preserving relative `sortOrder` (COND-4)
   c. Clone daily trackers — deduplicate by `name` (skip if name already exists on client program)
4. Return updated program summary

### DELETE /api/modules/:id (ENHANCED)
**Purpose:** Smart delete — hard or soft based on progress
**Auth:** `authenticate` + `requireRole("CLINICIAN")`
**Logic:**
1. Verify clinician owns the program containing this module
2. Check `ModuleProgress` for this module across all enrollments
3. If any progress records exist with status != LOCKED → soft delete (`deletedAt = now()`) (COND-2: audit middleware captures the UPDATE)
4. If no progress → hard delete (COND-2: audit middleware captures the DELETE)
**Response:** `{ success: true, data: { deleted: "hard" | "soft" } }`

### DELETE /api/parts/:id (ENHANCED)
**Purpose:** Smart delete — hard or soft based on progress
**Auth:** `authenticate` + `requireRole("CLINICIAN")`
**Logic:** Same pattern as module delete but checks `PartProgress`
**Response:** `{ success: true, data: { deleted: "hard" | "soft" } }`

### GET /api/programs/:id/preview (EXISTING — no changes)
Already returns the full program tree with all modules and parts. Used by the assignment modal to populate the toggle tree.

### GET /api/clinician/clients (EXISTING — COND-1 satisfied)
Already filters by `clinicianId`. The participant picker in the assignment modal calls this endpoint — server-side scoping is already enforced.

## Data Flow

### Scenario 1: First-Time Assignment (from Program Page)
1. Clinician clicks "Assign to Client" on template program page
2. Frontend opens AssignmentModal with `templateId`
3. Modal fetches `GET /clinician/clients` for participant picker (COND-1: server-filtered)
4. Clinician selects participant
5. Modal fetches `GET /programs/:id/preview` for full tree
6. Clinician toggles off unwanted modules/parts
7. Clinician clicks "Assign"
8. Frontend calls `POST /programs/:id/assign` with selections
9. API validates ownership, runs transactional clone (COND-3), preserves sort orders (COND-4)
10. API returns new program + enrollment
11. Frontend navigates to client profile or shows success

### Scenario 2: Re-Assignment (Append)
1. Clinician initiates assignment for a template the client already has
2. `POST /programs/:id/assign` returns 409 with existing `clientProgramId`
3. Frontend shows: "Client already has this program. Would you like to add more modules?"
4. If confirmed, opens same tree toggle view
5. Frontend calls `POST /programs/:id/assign/append` with `clientProgramId` + selections
6. API appends modules after existing content (COND-4: sort order offset)
7. API deduplicates trackers by name

### Scenario 3: Post-Assignment Editing
1. Clinician navigates to client profile → client's program
2. Program editor shows modules/parts with delete buttons
3. Clinician clicks delete on a module
4. Frontend calls `DELETE /modules/:id`
5. API checks progress → hard delete or soft delete
6. Audit middleware captures the operation (COND-2)

## Compliance Controls

| Condition | Implementation |
|---|---|
| COND-1: Server-side participant scoping | `GET /clinician/clients` already filters by `clinicianId`. Assignment endpoint additionally verifies participant exists in `ClinicianClient` table for the requesting clinician. |
| COND-2: Audit trail for hard deletes | Prisma audit middleware intercepts all `delete` operations (verified: middleware checks `action === "delete"`). Hard deletes generate audit entries automatically. Soft deletes (UPDATE with `deletedAt`) also captured. |
| COND-3: Transaction atomicity | All clone operations (assign + append) wrapped in `prisma.$transaction()`. Follows existing clone endpoint pattern. |
| COND-4: Sort order preservation | First assignment: clone `sortOrder` values directly. Re-assignment: offset appended modules by `MAX(sortOrder) + 1` from existing modules. Parts preserve relative order within their module. |

## Technology Choices

| Decision | Choice | Rationale | Alternatives Considered |
|---|---|---|---|
| Assignment service location | New service file `assignment.ts` | Separation from existing program CRUD; complex transaction logic warrants its own module | Extending programs route inline — rejected: too large |
| Tree toggle UI | Checkbox tree with shadcn/ui Accordion + Checkbox | Matches existing UI patterns, no new dependencies | @dnd-kit tree — overkill, we're not reordering |
| Client program status | Created as PUBLISHED (not DRAFT) | Client programs are ready to use immediately; no publish step needed for copies | DRAFT — rejected: adds unnecessary friction |
| Deduplication strategy | By tracker `name` string match | Simple, deterministic, no false positives from ID-based matching across clones | Content hash — over-engineered |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Large programs slow clone | Poor UX on assignment | Transaction with bounded content (max 20 modules x 200 parts); monitor query time; index on `programId` + `sortOrder` already exists |
| Orphaned progress data on hard delete | Data integrity | Check progress BEFORE delete; cascade delete handles PartProgress -> Part relationship |
| 409 conflict UX for re-assignment | Confusing flow | Clear messaging: "Client already has this program. Would you like to add more modules?" with link to existing program |
| Module deletedAt migration | Existing queries return soft-deleted modules | Add `deletedAt: null` filter to ALL module queries (program detail, preview, participant views). Migration is additive — no data loss. |

## File Structure

### New Files
```
packages/api/src/services/assignment.ts          — Assignment business logic
apps/web/src/components/assignment/
  AssignmentModal.tsx                             — Main modal component
  ProgramTreeSelect.tsx                           — Tree view with checkboxes
  ParticipantPicker.tsx                           — Client selector
apps/web/src/hooks/use-assignment.ts              — TanStack Query hooks
packages/shared/src/schemas/assignment.ts         — Zod schemas for assign/append
packages/api/src/__tests__/assignment.test.ts     — API integration tests
```

### Modified Files
```
packages/db/prisma/schema.prisma                  — Add deletedAt to Module
packages/api/src/routes/programs.ts               — Add assign + append endpoints
packages/api/src/routes/modules.ts                — Enhance DELETE with smart delete
packages/api/src/routes/parts.ts                  — Enhance DELETE with smart delete
apps/web/src/app/(dashboard)/programs/[id]/page.tsx — Add "Assign to Client" button
apps/web/src/app/(dashboard)/participants/[id]/page.tsx — Add "Add Program" button + program editor
apps/web/src/hooks/use-programs.ts                — Add useAssignProgram, useAppendModules hooks
```
