# Sprint 14: Steady Work Review + Session Prep + Per-Participant Customization — QA Test Plan

## Status: INITIAL PLAN (pre-implementation)

This document defines the test strategy, file layout, traceability matrices, and sign-off criteria for sprint 14. Tests will be written before implementation per TDD workflow (CLAUDE.md).

---

## Test File Layout

### API integration tests (`packages/api/src/__tests__/`)

| File | Scope | Estimated Tests |
|---|---|---|
| `session-review.test.ts` | Review template CRUD, review submission, review retrieval, participant view | ~25 |
| `session-prep.test.ts` | Session prep aggregation, authorization, edge cases | ~12 |
| `enrollment-overrides.test.ts` | Override CRUD, ownership verification, type validation | ~20 |
| `override-merge.test.ts` | `applyOverrides` pure function unit tests | ~15 |
| `review-notification.test.ts` | pg-boss job enqueue/cancel, worker behavior | ~8 |

### Shared schema tests (`packages/shared/src/__tests__/`)

| File | Scope | Estimated Tests |
|---|---|---|
| `review.schema.test.ts` | ReviewTemplate, SubmitReview, default template schemas | ~12 |
| `enrollment-override.schema.test.ts` | Override schemas, discriminated validation, payload shapes | ~10 |

### Web component tests (`apps/web/src/__tests__/`)

| File | Scope | Estimated Tests |
|---|---|---|
| `SessionPrep.test.tsx` | Prep page rendering, panel states, autosave | ~8 |
| `CustomizeTab.test.tsx` | Override list, add/delete flows | ~6 |

**Total estimated: ~116 tests**

---

## FR -> Test Traceability

### FR-1: Review template configuration

| Acceptance Criterion | Test | File |
|---|---|---|
| Clinician creates/updates template | `should create review template for owned program` | `session-review.test.ts` |
| Default template used when none configured | `should return default template when none exists` | `session-review.test.ts` |
| Rejects >10 questions | `should reject template with more than 10 questions` | `session-review.test.ts` |
| Rejects >20 barriers | `should reject template with more than 20 barriers` | `session-review.test.ts` |
| Non-owner gets 404 | `should return 404 for non-owner clinician` | `session-review.test.ts` |

### FR-2: Review template retrieval

| Acceptance Criterion | Test | File |
|---|---|---|
| Owner gets custom template | `should return custom template for program` | `session-review.test.ts` |
| Default returned if none configured | `should return default template when none configured` | `session-review.test.ts` |
| Participant gets template with review data | `should return template and review data for participant` | `session-review.test.ts` |

### FR-3: Participant submits review

| Acceptance Criterion | Test | File |
|---|---|---|
| Successful submission creates SessionReview | `should create session review on submit` | `session-review.test.ts` |
| Re-submission updates existing review | `should update existing review on re-submit` | `session-review.test.ts` |
| No enrollment returns 404 | `should return 404 when participant has no enrollment for appointment` | `session-review.test.ts` |
| Answer >2000 chars rejected | `should reject answer exceeding 2000 chars` | `session-review.test.ts` |
| Audit log written on create | `should write audit log on review creation` | `session-review.test.ts` |
| Audit log written on update | `should write audit log on review update` | `session-review.test.ts` |

### FR-4: Review retrieval

| Acceptance Criterion | Test | File |
|---|---|---|
| Clinician gets review for owned appointment | `should return review for appointment owner` | `session-review.test.ts` |
| Returns null when not submitted | `should return null when review not submitted` | `session-review.test.ts` |
| Non-owner clinician gets 404 | `should return 404 for non-owner clinician on review get` | `session-review.test.ts` |
| Participant gets own review | `should return own review to participant` | `session-review.test.ts` |

### FR-5: Session prep view

| Acceptance Criterion | Test | File |
|---|---|---|
| Returns aggregated prep data | `should return review + homework + stats + notes` | `session-prep.test.ts` |
| Works without submitted review | `should return prep data with review=null when not submitted` | `session-prep.test.ts` |
| Works without enrollment | `should return prep data with empty homework when no enrollment` | `session-prep.test.ts` |
| Non-owner gets 404 | `should return 404 for non-owner clinician` | `session-prep.test.ts` |
| Cross-practice returns 404 | `should return 404 for cross-practice access` | `session-prep.test.ts` |
| Includes tracker summaries | `should include tracker trends in prep data` | `session-prep.test.ts` |
| Includes last session notes | `should include last session notes` | `session-prep.test.ts` |

### FR-6: Session prep notes autosave

| Acceptance Criterion | Test | File |
|---|---|---|
| PATCH updates internalNote | `should update appointment internalNote via PATCH` | Existing `appointments.test.ts` (verified) |
| Autosave debounce | `should debounce autosave calls` | `SessionPrep.test.tsx` |

### FR-7: 24h review notification

| Acceptance Criterion | Test | File |
|---|---|---|
| Job enqueued on appointment create | `should enqueue notification job when appointment created >24h out` | `review-notification.test.ts` |
| Job not enqueued when <24h | `should not enqueue job when appointment is <24h away` | `review-notification.test.ts` |
| Old job cancelled on reschedule | `should cancel previous job on appointment reschedule` | `review-notification.test.ts` |
| Job cancelled on appointment cancel | `should cancel job when appointment status changes to canceled` | `review-notification.test.ts` |
| Worker skips cancelled appointment | `should skip notification if appointment is cancelled at execution time` | `review-notification.test.ts` |

### FR-8: Create enrollment override

| Acceptance Criterion | Test | File |
|---|---|---|
| Creates HIDE_HOMEWORK_ITEM override | `should create hide override with valid targetPartId` | `enrollment-overrides.test.ts` |
| Creates ADD_RESOURCE override | `should create add-resource override with title + url` | `enrollment-overrides.test.ts` |
| Creates CLINICIAN_NOTE override | `should create clinician-note override with content` | `enrollment-overrides.test.ts` |
| Creates ADD_HOMEWORK_ITEM override | `should create add-homework override with title + itemType` | `enrollment-overrides.test.ts` |
| Non-owner gets 404 | `should return 404 for non-owner clinician` | `enrollment-overrides.test.ts` |
| Invalid targetPartId gets 400 | `should return 400 for HIDE with non-existent targetPartId` | `enrollment-overrides.test.ts` |
| Missing moduleId gets 400 | `should return 400 for ADD_RESOURCE without moduleId` | `enrollment-overrides.test.ts` |
| Audit log written | `should write audit log on override creation` | `enrollment-overrides.test.ts` |

### FR-9: List and delete overrides

| Acceptance Criterion | Test | File |
|---|---|---|
| Lists all overrides for enrollment | `should list overrides ordered by createdAt desc` | `enrollment-overrides.test.ts` |
| Delete removes override | `should hard-delete override and write audit log` | `enrollment-overrides.test.ts` |
| Non-owner list gets 404 | `should return 404 for non-owner on list` | `enrollment-overrides.test.ts` |
| Non-owner delete gets 404 | `should return 404 for non-owner on delete` | `enrollment-overrides.test.ts` |
| Delete non-existent returns 404 | `should return 404 for non-existent override` | `enrollment-overrides.test.ts` |

### FR-10: Override merge at query time

| Acceptance Criterion | Test | File |
|---|---|---|
| Hidden parts filtered out | `should remove parts targeted by HIDE_HOMEWORK_ITEM` | `override-merge.test.ts` |
| Added resources injected | `should inject ADD_RESOURCE items with source=override` | `override-merge.test.ts` |
| Added homework appended | `should append ADD_HOMEWORK_ITEM items` | `override-merge.test.ts` |
| Clinician notes attached | `should attach CLINICIAN_NOTE items to module` | `override-merge.test.ts` |
| Original content preserved | `should preserve all non-hidden parts with identical fields` | `override-merge.test.ts` |
| Deleted override restores original | `should not filter parts when override is removed` | `override-merge.test.ts` |
| Multiple overrides compose | `should apply multiple override types on same module` | `override-merge.test.ts` |
| Empty overrides = identity | `should return original parts when overrides is empty` | `override-merge.test.ts` |
| Source marker present | `should mark injected items with source=override` | `override-merge.test.ts` |

---

## Compliance Condition -> Test Traceability

| Condition | Test | File |
|---|---|---|
| **COND-1** Ownership verification | `should return 404 for cross-ownership review access` | `session-review.test.ts` |
| | `should return 404 for cross-ownership override access` | `enrollment-overrides.test.ts` |
| **COND-2** Prep authorization | `should return 404 for cross-practice prep access` | `session-prep.test.ts` |
| **COND-3** Audit on mutations | `should write audit log on review create` | `session-review.test.ts` |
| | `should write audit log on override create` | `enrollment-overrides.test.ts` |
| | `should write audit log on override delete` | `enrollment-overrides.test.ts` |
| | `should write audit log on template upsert` | `session-review.test.ts` |
| **COND-4** Audit context propagation | `should have userId on audit rows from review routes` | `session-review.test.ts` |
| **COND-5** No PHI in logs | Code review checklist item (manual) |
| **COND-6** Override isolation | `should not expose overrides from other enrollments` | `enrollment-overrides.test.ts` |
| | `should merge only own enrollment overrides in delivery` | `override-merge.test.ts` |
| **COND-7** Review access control | `should return 404 when participant accesses another's review` | `session-review.test.ts` |
| | `should return 401 for unauthenticated review access` | `session-review.test.ts` |
| **COND-8** Job payload PHI-free | `should enqueue job with only appointmentId and participantUserId` | `review-notification.test.ts` |
| | `should skip notification for cancelled appointment` | `review-notification.test.ts` |
| **COND-9** Override merge integrity | `should preserve original parts identically` | `override-merge.test.ts` |
| | `should mark injected items with source=override` | `override-merge.test.ts` |
| **COND-10** Review uniqueness | `should upsert on re-submit (exactly one row)` | `session-review.test.ts` |

---

## Adversarial Tests

| Test | File | Assertion |
|---|---|---|
| XSS in review response text | `session-review.test.ts` | Stored verbatim; DB parameterized; React/RN auto-escape on render |
| Review response >2000 chars | `session-review.test.ts` | 400 Bad Request |
| Override payload with arbitrary keys | `enrollment-overrides.test.ts` | Extra keys stripped by Zod |
| Clinician note >2000 chars | `enrollment-overrides.test.ts` | 400 Bad Request |
| URL injection in ADD_RESOURCE | `enrollment-overrides.test.ts` | Stored as-is; rendered safely by React |
| Cross-participant review read | `session-review.test.ts` | 404 (never 403) |
| Cross-enrollment override read | `enrollment-overrides.test.ts` | 404 |
| Unauthenticated access to all new endpoints | All test files | 401 |
| Wrong role access (participant on clinician endpoints) | All test files | 403 |
| Concurrent review submissions (race condition) | `session-review.test.ts` | Upsert handles gracefully; exactly one row |

---

## Schema Round-Trip Tests

| Schema | Test | File |
|---|---|---|
| `UpsertReviewTemplateSchema` | Parse valid template with all field types | `review.schema.test.ts` |
| | Reject template with 0 questions | `review.schema.test.ts` |
| | Reject template with 11 questions | `review.schema.test.ts` |
| | Reject barrier label >200 chars | `review.schema.test.ts` |
| `SubmitReviewSchema` | Parse valid submission with responses + barriers | `review.schema.test.ts` |
| | Reject answer >2000 chars | `review.schema.test.ts` |
| | Reject empty responses array | `review.schema.test.ts` |
| | Strip unknown fields | `review.schema.test.ts` |
| `CreateOverrideSchema` | Parse HIDE_HOMEWORK_ITEM with targetPartId | `enrollment-override.schema.test.ts` |
| | Parse ADD_RESOURCE with moduleId + payload | `enrollment-override.schema.test.ts` |
| | Reject HIDE without targetPartId | `enrollment-override.schema.test.ts` |
| | Reject ADD_RESOURCE without moduleId | `enrollment-override.schema.test.ts` |
| | Reject invalid overrideType | `enrollment-override.schema.test.ts` |
| | Strip unknown fields from payload | `enrollment-override.schema.test.ts` |

---

## Coverage Targets

| Package | Current | Target | Gate |
|---|---|---|---|
| `packages/api` | >80% | >80% after sprint 14 | Blocking |
| `packages/shared` | >80% | >80% after sprint 14 | Blocking |
| `apps/web` | Secondary | Maintain existing | Non-blocking |
| `apps/mobile` | Secondary | Maintain existing | Non-blocking |

---

## Sign-off Criteria

1. All ~116 planned tests pass (`npx vitest run` in api + shared)
2. Full `packages/api` suite passes (no regressions)
3. Full `packages/shared` suite passes (no regressions)
4. Typecheck passes on all packages (`npm run typecheck`)
5. Every FR acceptance criterion has at least one passing test (traceability matrix above)
6. Every compliance condition has at least one passing test (compliance matrix above)
7. All adversarial tests pass
8. Coverage >80% on `packages/api` and `packages/shared`
9. Code review confirms COND-5 (no PHI in logs)
10. Override merge preserves original content integrity (COND-9 round-trip tests)

---

## Verification Commands

```bash
# Sprint 14 tests only
cd /home/drfart/dev/steady/packages/api && npx vitest run \
  src/__tests__/session-review.test.ts \
  src/__tests__/session-prep.test.ts \
  src/__tests__/enrollment-overrides.test.ts \
  src/__tests__/override-merge.test.ts \
  src/__tests__/review-notification.test.ts

cd /home/drfart/dev/steady/packages/shared && npx vitest run \
  src/__tests__/review.schema.test.ts \
  src/__tests__/enrollment-override.schema.test.ts

# Full suite (regression check)
cd /home/drfart/dev/steady/packages/api && npx vitest run
cd /home/drfart/dev/steady/packages/shared && npx vitest run

# Typecheck
cd /home/drfart/dev/steady && npm run typecheck

# Coverage
cd /home/drfart/dev/steady/packages/api && npx vitest run --coverage
cd /home/drfart/dev/steady/packages/shared && npx vitest run --coverage
```
