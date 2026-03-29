# Program Template Cloning — QA Test Report

## Verdict: CONDITIONAL PASS (Pre-Implementation)

This is a **pre-implementation test plan**. The feature has not been built yet — the Engineer produced an implementation plan (Task 1-15). This report defines the verification criteria that MUST pass before QA sign-off. Once implementation is complete, each item below must be independently verified.

## Summary
- Tests to write: ~22 API integration tests + ~8 frontend component tests
- Acceptance criteria to verify: 15 (across FR-1 through FR-6)
- Compliance conditions to verify: 4
- NFRs to verify: 3

## Test Plan

### Acceptance Criteria Verification

#### FR-1: Assign from Program Page

| AC | Test Approach | Test File |
|---|---|---|
| FR-1.1: Participant picker shows clinician's clients | API test: `POST /programs/:id/assign` with valid clinician returns success; with non-client participant returns 403 | `assignment.test.ts` |
| FR-1.2: Program tree with toggles | Frontend test: ProgramTreeSelect renders all modules/parts with checkboxes checked by default | `ProgramTreeSelect.test.tsx` |
| FR-1.3: Unchecking module unchecks all parts | Frontend test: Click module checkbox → verify all child part checkboxes unchecked, summary count updated | `ProgramTreeSelect.test.tsx` |
| FR-1.4: Unchecking individual parts keeps module | Frontend test: Uncheck one part → module shows indeterminate state, other parts still checked | `ProgramTreeSelect.test.tsx` |
| FR-1.5: Save deep-copies selected content | API test: `POST /programs/:id/assign` with excludedModuleIds/excludedPartIds → verify created program has correct modules/parts, enrollment created | `assignment.test.ts` |
| FR-1.6: Cancel = no side effects | Frontend test: Open modal, make selections, click Cancel → verify no API call made, no state changed | `AssignmentModal.test.tsx` |

#### FR-2: Assign from Client Profile

| AC | Test Approach | Test File |
|---|---|---|
| FR-2.1: Template picker shows published templates | API test: `GET /programs/templates` returns only `isTemplate: true` + `status: PUBLISHED` programs | `assignment.test.ts` |
| FR-2.2: Same customization flow | Frontend test: AssignmentModal with `participantId` prop shows TemplatePicker in Step 1, ProgramTreeSelect in Step 2 | `AssignmentModal.test.tsx` |

#### FR-3: Re-Assignment (Append)

| AC | Test Approach | Test File |
|---|---|---|
| FR-3.1: Modules appended after existing | API test: `POST /programs/:id/assign` returns 409 with clientProgramId; `POST /programs/:id/assign/append` creates modules with sortOrder > max existing sortOrder | `assignment.test.ts` |
| FR-3.2: Same exclude flow for append | API test: `POST /programs/:id/assign/append` with excludedModuleIds respects exclusions | `assignment.test.ts` |
| FR-3.3: Daily tracker deduplication | API test: Append with tracker that has same name as existing → verify tracker NOT duplicated; tracker with different name → verify it IS created | `assignment.test.ts` |

#### FR-4: Post-Assignment Editing

| AC | Test Approach | Test File |
|---|---|---|
| FR-4.1: Can remove modules/parts | API test: `DELETE /modules/:id` and `DELETE /parts/:id` with clinician ownership → returns success | `assignment.test.ts` |
| FR-4.2: Hard delete if no progress | API test: Delete module/part with no ModuleProgress/PartProgress records → verify record is gone from DB (hard delete), response says `{ deleted: "hard" }` | `assignment.test.ts` |
| FR-4.3: Soft delete if progress exists | API test: Delete module with ModuleProgress (status != LOCKED) → verify `deletedAt` is set (not null), record still in DB, response says `{ deleted: "soft" }` | `assignment.test.ts` |

#### FR-5: Enrollment List Quick-Edit

| AC | Test Approach | Test File |
|---|---|---|
| FR-5.1: Edit link per participant | Frontend test: Enrollment list renders "Edit" button/link for each participant row | `EnrollmentSection.test.tsx` |
| FR-5.2: Navigates to client profile | Frontend test: Click "Edit" → verify router navigation to `/participants/[id]` | `EnrollmentSection.test.tsx` |

#### FR-6: Template Lineage

| AC | Test Approach | Test File |
|---|---|---|
| FR-6.1: templateSourceId set on clone | API test: After `POST /programs/:id/assign`, verify created program has `templateSourceId === template.id` | `assignment.test.ts` |

### Compliance Verification

| Condition | Verification Approach | Evidence Required |
|---|---|---|
| COND-1: Server-side participant scoping | API test: Call `POST /programs/:id/assign` with `participantId` that is NOT in clinician's `ClinicianClient` table → must return 403, not 404 or success. Also verify `GET /clinician/clients` only returns clinician's own clients. | Test output showing 403 response |
| COND-2: Audit trail for hard deletes | API test: Perform hard delete on a module → query `audit_logs` table for a DELETE action on that resource ID. Also perform soft delete → query for UPDATE action. Both must have entries. | Test output showing audit log entries exist |
| COND-3: Transaction atomicity | API test: Mock a failure mid-clone → verify NO program, modules, or enrollment were created (transaction rolled back). | Test output showing rollback |
| COND-4: Sort order preservation | API test: Clone template with modules at sortOrder 0, 1, 2 → verify client program modules have same sortOrder values. For append: existing modules at 0, 1, 2 → appended modules start at 3. | Test output showing sortOrder values |

### NFR Verification

| NFR | Verification Approach |
|---|---|
| NFR-1: Clone < 3s for 20 modules / 200 parts | Performance test: Create template with 20 modules, 10 parts each → time the assign endpoint → assert < 3000ms |
| NFR-2: Ownership enforcement | API tests: All endpoints tested with wrong clinician → verify 403/404 (not data leak) |
| NFR-3: Transaction integrity | Covered by COND-3 above |

### Adversarial Testing

| Attack Vector | Test | Expected Result |
|---|---|---|
| Assign non-template program | `POST /assign` with `isTemplate: false` program | 404 |
| Assign unpublished template | `POST /assign` with `status: DRAFT` template | 404 |
| Assign to non-existent participant | `POST /assign` with fake participantId | 403 (not 500) |
| Assign with excludedModuleIds containing invalid IDs | `POST /assign` with `excludedModuleIds: ["nonexistent"]` | Should succeed — nonexistent IDs simply don't match anything |
| Delete module from someone else's program | `DELETE /modules/:id` where module belongs to another clinician's program | 404 (not 403, to avoid leaking existence) |
| Concurrent assignment of same template to same client | Two simultaneous `POST /assign` calls | One succeeds, one gets 409 |
| XSS in custom title | `POST /assign` with `title: "<script>alert(1)</script>"` | Title stored as-is (sanitized on render), no server-side execution |
| Extremely long excludedModuleIds array | Array with 10,000 entries | Request should still succeed or fail gracefully with 400 |
| SQL injection in participantId | `POST /assign` with `participantId: "'; DROP TABLE programs;--"` | Prisma parameterizes queries — should return 403 |

### UX State Verification (Frontend)

| Component/State | Verification |
|---|---|
| AssignmentModal — loading clients | Skeleton rows render while query is pending |
| AssignmentModal — empty clients | "No clients found. Add a client first." message with link |
| AssignmentModal — empty templates | "No published templates available." message |
| AssignmentModal — search no results | "No matches for '[query]'" message |
| AssignmentModal — saving state | Assign button shows spinner + "Assigning...", all inputs disabled |
| AssignmentModal — network error | Inline error banner, Assign re-enables, selections preserved |
| AssignmentModal — 409 conflict | Conflict view with Cancel, View Existing, Add Modules buttons |
| ProgramTreeSelect — all selected | All checked, summary shows total count |
| ProgramTreeSelect — nothing selected | Assign button disabled |
| ProgramTreeSelect — module indeterminate | Dash icon when some parts unchecked |
| Client Program Card — collapsed | Title, module count, date, "from template" link |
| Client Program Card — expanded | Modules with progress badges, trash icons |
| Confirm dialog — soft delete copy | "This client has started this module. It will be hidden but preserved for audit purposes." |
| Confirm dialog — hard delete copy | "This client hasn't started this module. It will be permanently removed." |

## Issues

### Critical
None identified pre-implementation.

### High
None identified pre-implementation.

### Medium
- **M-1**: Verify that existing module queries across ALL routes add `deletedAt: null` filter after schema migration. Missing this filter would show soft-deleted modules to participants. (Task 15 in implementation plan addresses this — must be verified.)

### Low
- **L-1**: Consider adding an index on `Module.deletedAt` if query performance degrades with soft deletes at scale.

## Sign-off

**QA Sign-off:** CONDITIONAL — Test plan is ready. Sign-off will be granted after implementation is complete and ALL tests above pass independently. The engineer must notify QA when Tasks 1-15 are complete for verification.

**Signed:** QA Engineer
**Date:** 2026-03-28
