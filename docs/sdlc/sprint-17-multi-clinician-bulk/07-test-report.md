# Sprint 17: Multi-Clinician Practice Management + Bulk Actions — Test Report

## Results

**Date:** 2026-04-05
**Status:** ALL PASSING

### API Tests (packages/api)

| Test File | Tests | Status |
|-----------|-------|--------|
| practice-management.test.ts | 10 | PASS |
| bulk-actions.test.ts | 15 | PASS |
| All existing tests | 797 | PASS |
| **Total** | **822** | **ALL PASS** |

### Shared Package Tests (packages/shared)

| Tests | Status |
|-------|--------|
| 382 | ALL PASS |

### Typecheck

| Package | Status |
|---------|--------|
| packages/api | PASS (0 errors) |
| apps/web | PASS (0 new errors; 2 pre-existing Next.js validator.ts artifact errors) |

---

## New Test Coverage

### practice-management.test.ts (10 tests)

**Practice Stats (GET /api/practices/:id/stats):**
- Returns 401 without auth
- Returns 403 for participant role
- Returns 404 for non-member
- Returns 403 for non-owner clinician
- Returns aggregate stats for practice owner

**Practice Participants (GET /api/practices/:id/participants):**
- Returns 401 without auth
- Returns 403 for participant role
- Returns 404 for non-member
- Returns 403 for non-owner clinician
- Returns paginated participant list for owner
- Returns empty array for practice with no participants
- Passes search parameter to service

### bulk-actions.test.ts (15 tests)

**Validation:**
- Returns 401 without auth
- Returns 403 for participant role
- Returns 400 for empty participantIds
- Returns 400 for missing action
- Returns 400 for more than 50 participants

**Push Task:**
- Creates tasks for all valid participants
- Skips participants without title
- Creates audit log entry per participant

**Unlock Next Module:**
- Unlocks next module for active enrollments
- Skips participants with no active enrollment
- Skips participants with no locked modules
- Creates audit log entry per participant

**Send Nudge:**
- Creates nudge tasks for all participants
- Uses custom message when provided
- Truncates message at 500 characters
- Creates audit log entry per participant without message content

**Unknown Action:**
- Returns unknown action error per participant

---

## Compliance Verification

| Condition | Verified | Method |
|-----------|----------|--------|
| COND-1: Owner-only access | Yes | Tests verify 403 for non-owners on stats/participants |
| COND-2: Per-participant audit logging | Yes | Tests verify audit entries created, no content logged |
| COND-3: Cross-practice isolation | Yes | Tests verify 404 for non-members |
| COND-4: Max 50 cap | Yes | Test verifies 400 for 51 participants |
| COND-5: Invite email content | N/A | Deferred to email service sprint |
| COND-6: Minimum necessary | Yes | Response shape verified in participant list tests |

---

## Duration

- Test execution: 11.41s (API) + 1.28s (shared)
- Total pipeline: ~15s
