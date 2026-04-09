# Program Template Cloning — Implementation Plan

## Pre-Implementation Setup

**Verify clean baseline:**
- Confirm all existing tests pass
- Confirm on `feature/program-template-cloning` branch

## Task Breakdown

### Task 1: Schema Change — Add `deletedAt` to Module

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

**Steps:**
- [ ] Add `deletedAt DateTime?` field to Module model (after `updatedAt`)
- [ ] Run `npm run db:generate` to regenerate Prisma client
- [ ] Run `npm run db:push` to push schema to dev database
- [ ] Commit: `feat(db): add deletedAt to Module model for soft delete support`

---

### Task 2: Zod Schemas — Assignment Validation

**Files:**
- Create: `packages/shared/src/schemas/assignment.ts`
- Modify: `packages/shared/src/index.ts` (add export)
- Test: `packages/shared/src/__tests__/assignment.test.ts`

**Steps:**
- [ ] Write failing tests for AssignProgramSchema (valid payload, missing participantId, empty arrays)
- [ ] Write failing tests for AppendModulesSchema (valid payload, missing clientProgramId)
- [ ] Implement AssignProgramSchema: `{ participantId: string, title?: string (max 200), excludedModuleIds: string[], excludedPartIds: string[] }`
- [ ] Implement AppendModulesSchema: `{ clientProgramId: string, excludedModuleIds: string[], excludedPartIds: string[] }`
- [ ] Export from `packages/shared/src/index.ts`
- [ ] Verify tests pass
- [ ] Commit: `feat(shared): add Zod schemas for program assignment`

---

### Task 3: Assignment Service — `assignProgram`

**Files:**
- Create: `packages/api/src/services/assignment.ts`

**Steps:**
- [ ] Implement `assignProgram(clinicianId, templateId, participantId, selections)`:
  - Verify template exists, is published, isTemplate: true
  - Verify participant is clinician's client via ClinicianClient (COND-1)
  - Check for existing client program from same template → throw 409 with clientProgramId
  - Within `prisma.$transaction()` (COND-3):
    - Create Program: `isTemplate: false`, `templateSourceId: template.id`, `status: "PUBLISHED"`
    - Clone modules (excluding excludedModuleIds), preserving sortOrder (COND-4)
    - Clone parts per module (excluding excludedPartIds, where deletedAt is null), preserving sortOrder (COND-4)
    - Clone daily trackers + fields
    - Create Enrollment: `status: "ACTIVE"`, `participantId`
  - Return created program + enrollment
- [ ] Commit: `feat(api): add assignProgram service function`

---

### Task 4: Assignment Service — `appendModules`

**Files:**
- Modify: `packages/api/src/services/assignment.ts`

**Steps:**
- [ ] Implement `appendModules(clinicianId, clientProgramId, templateId, selections)`:
  - Verify template and client program ownership
  - Get max sortOrder from existing modules in client program
  - Within `prisma.$transaction()` (COND-3):
    - Clone selected modules with sortOrder offset = maxSortOrder + 1 (COND-4)
    - Clone parts per module, preserving relative sortOrder (COND-4)
    - Clone daily trackers — deduplicate by name
  - Return updated program summary
- [ ] Commit: `feat(api): add appendModules service function`

---

### Task 5: API Routes — Assign + Append Endpoints

**Files:**
- Modify: `packages/api/src/routes/programs.ts`

**Steps:**
- [ ] Add `POST /:id/assign` route:
  - `authenticate`, `requireRole("CLINICIAN")`, `validate(AssignProgramSchema)`
  - Call `assignProgram` service
  - Return 201 with program + enrollment
  - Handle 404, 403, 409 errors
- [ ] Add `POST /:id/assign/append` route:
  - `authenticate`, `requireRole("CLINICIAN")`, `validate(AppendModulesSchema)`
  - Call `appendModules` service
  - Return 200 with updated program summary
  - Handle 404, 403 errors
- [ ] Commit: `feat(api): add assign and append routes to programs`

---

### Task 6: Smart Delete — Modules

**Files:**
- Modify: `packages/api/src/routes/modules.ts`

**Steps:**
- [ ] Enhance existing `DELETE /:id` route:
  - Check ModuleProgress for this module across all enrollments
  - If any progress with status != LOCKED → soft delete (set `deletedAt = now()`) (COND-2)
  - If no progress → hard delete (existing behavior) (COND-2)
  - Return `{ success: true, data: { deleted: "hard" | "soft" } }`
- [ ] Commit: `feat(api): smart delete for modules (hard/soft based on progress)`

---

### Task 7: Smart Delete — Parts

**Files:**
- Modify: `packages/api/src/routes/parts.ts`

**Steps:**
- [ ] Enhance existing `DELETE /:id` route:
  - Check PartProgress for this part
  - If any progress with status != NOT_STARTED → soft delete (COND-2)
  - If no progress → hard delete (COND-2)
  - Return `{ success: true, data: { deleted: "hard" | "soft" } }`
- [ ] Commit: `feat(api): smart delete for parts (hard/soft based on progress)`

---

### Task 8: API Integration Tests — Assignment

**Files:**
- Create: `packages/api/src/__tests__/assignment.test.ts`

**Steps:**
- [ ] Write tests for `POST /api/programs/:id/assign`:
  - Happy path: clones template with exclusions, creates enrollment
  - 404: template not found
  - 403: participant not clinician's client (COND-1)
  - 409: client already has program from this template
  - Verify transaction atomicity (COND-3)
  - Verify sortOrder preservation (COND-4)
  - Verify daily tracker cloning
- [ ] Write tests for `POST /api/programs/:id/assign/append`:
  - Happy path: appends modules with offset sortOrder
  - 404: template or client program not found
  - 403: clinician doesn't own client program
  - Verify tracker deduplication by name
  - Verify sortOrder offset (COND-4)
- [ ] Write tests for smart delete:
  - Module hard delete (no progress)
  - Module soft delete (has progress) (COND-2)
  - Part hard delete (no progress)
  - Part soft delete (has progress) (COND-2)
- [ ] Verify all tests pass
- [ ] Commit: `test(api): add integration tests for program assignment`

---

### Task 9: Frontend Hooks — Assignment Mutations

**Files:**
- Create: `apps/web/src/hooks/use-assignment.ts`

**Steps:**
- [ ] Implement `useAssignProgram()` mutation hook:
  - Calls `POST /api/programs/${id}/assign`
  - Invalidates `["programs"]` and `["clinician-participant"]` query keys
- [ ] Implement `useAppendModules()` mutation hook:
  - Calls `POST /api/programs/${id}/assign/append`
  - Invalidates same query keys
- [ ] Implement `useTemplates()` query hook:
  - Calls `GET /api/programs/templates`
  - Returns published templates with module counts
- [ ] Implement `useDeleteModule()` mutation hook (smart delete)
- [ ] Implement `useDeletePart()` mutation hook (smart delete)
- [ ] Commit: `feat(web): add TanStack Query hooks for program assignment`

---

### Task 10: Frontend — ProgramTreeSelect Component

**Files:**
- Create: `apps/web/src/components/assignment/ProgramTreeSelect.tsx`

**Steps:**
- [ ] Implement checkbox tree with accordion pattern:
  - Props: `modules` array with nested parts, `onChange` callback
  - State: `excludedModuleIds` and `excludedPartIds` sets
  - Module checkbox: toggle all child parts
  - Part checkbox: update module indeterminate state
  - Collapsed: show module name with part count
  - Summary line: "[N] modules, [N] parts selected"
- [ ] Use shadcn Checkbox + custom accordion (Chevron toggle pattern from existing code)
- [ ] Commit: `feat(web): add ProgramTreeSelect component`

---

### Task 11: Frontend — ParticipantPicker + TemplatePicker

**Files:**
- Create: `apps/web/src/components/assignment/ParticipantPicker.tsx`
- Create: `apps/web/src/components/assignment/TemplatePicker.tsx`

**Steps:**
- [ ] ParticipantPicker:
  - Fetches clients via `GET /api/clinician/clients` (COND-1: server-filtered)
  - Searchable list with name + status badge
  - Loading skeleton, empty state, selected highlight
- [ ] TemplatePicker:
  - Fetches published templates via `GET /api/programs/templates`
  - Cards with title, description snippet, module count
  - Loading skeleton, empty state, selected highlight
- [ ] Commit: `feat(web): add ParticipantPicker and TemplatePicker components`

---

### Task 12: Frontend — AssignmentModal

**Files:**
- Create: `apps/web/src/components/assignment/AssignmentModal.tsx`

**Steps:**
- [ ] Implement multi-step modal:
  - Props: `open`, `onOpenChange`, entry point context (`templateId` or `participantId`)
  - Step 1: ParticipantPicker (from program page) or TemplatePicker (from client page)
  - Step 2: ProgramTreeSelect with Assign button
  - Conflict state: "Program Already Assigned" with 3 buttons
  - Loading/error states per UX spec
  - Uses Dialog component (lg size)
- [ ] Commit: `feat(web): add AssignmentModal component`

---

### Task 13: Frontend — Program Page Integration

**Files:**
- Modify: `apps/web/src/app/(dashboard)/programs/[id]/page.tsx`

**Steps:**
- [ ] Add "Assign to Client" button (only shown when `program.isTemplate === true`)
- [ ] Wire up AssignmentModal with `templateId` entry point
- [ ] Add "Edit" link to enrollment list rows (navigates to `/participants/[id]`)
- [ ] Commit: `feat(web): add Assign to Client button and enrollment edit links`

---

### Task 14: Frontend — Client Profile Integration

**Files:**
- Modify: `apps/web/src/app/(dashboard)/participants/[id]/page.tsx`

**Steps:**
- [ ] Add "Add Program" button in Overview tab
- [ ] Wire up AssignmentModal with `participantId` entry point
- [ ] Add Client Program Card component:
  - Shows assigned programs with "from template" lineage link
  - Expandable accordion with modules/parts
  - Trash icons with confirm dialog (context-aware copy for hard/soft delete)
  - Progress indicators per module/part
- [ ] Commit: `feat(web): add Add Program button and Client Program Card`

---

### Task 15: Module Query Filters — Exclude Soft-Deleted

**Files:**
- Modify: `packages/api/src/routes/programs.ts` (GET endpoints)
- Modify: `packages/api/src/routes/modules.ts` (GET endpoints)

**Steps:**
- [ ] Add `deletedAt: null` filter to all module queries:
  - Program detail (GET /:id)
  - Program preview (GET /:id/preview)
  - Any module list endpoints
- [ ] Verify existing tests still pass
- [ ] Commit: `fix(api): filter soft-deleted modules from all queries`

---

## Compliance Checklist

| Condition | Implementation | Verified By |
|---|---|---|
| COND-1: Server-side participant scoping | Assignment service checks ClinicianClient table; GET /clinician/clients already filters by clinicianId | Task 3 + Task 8 tests |
| COND-2: Audit trail for hard deletes | Prisma audit middleware captures DELETE operations; smart delete uses hard/soft appropriately | Task 6 + Task 7 + Task 8 tests |
| COND-3: Transaction atomicity | assignProgram and appendModules both use prisma.$transaction() | Task 3 + Task 4 + Task 8 tests |
| COND-4: Sort order preservation | Clone preserves sortOrder; append offsets by MAX(sortOrder) + 1 | Task 3 + Task 4 + Task 8 tests |

## Implementation Order

```
Task 1  → Schema change (foundation)
Task 2  → Zod schemas (validation layer)
Task 3  → assignProgram service (core logic)
Task 4  → appendModules service (core logic)
Task 5  → API routes (HTTP layer)
Task 6  → Smart delete modules (enhancement)
Task 7  → Smart delete parts (enhancement)
Task 8  → Integration tests (verification)
Task 15 → Module query filters (cleanup)
Task 9  → Frontend hooks (data layer)
Task 10 → ProgramTreeSelect (UI component)
Task 11 → Pickers (UI components)
Task 12 → AssignmentModal (UI container)
Task 13 → Program page integration
Task 14 → Client profile integration
```

Backend first (Tasks 1-8, 15), then frontend (Tasks 9-14). Each task is independently testable and commitable.
