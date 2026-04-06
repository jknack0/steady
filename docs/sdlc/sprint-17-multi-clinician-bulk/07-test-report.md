# Sprint 17: Multi-Clinician Practice Management + Bulk Actions — Test Plan

## Overview

Estimated ~35 tests across 2 new test files plus enhancements to 1 existing file.

---

## Test Files

### `packages/api/src/__tests__/practice-management.test.ts` (~20 tests)

**Practice Stats (GET /api/practices/:id/stats):**
- Returns 401 without auth
- Returns 403 for participant role
- Returns 403 for non-owner clinician
- Returns aggregate stats for practice owner
- Includes per-clinician breakdown
- Counts active participants correctly
- Counts upcoming appointments (next 7 days)
- Handles practice with no data gracefully
- Returns 404 for non-existent practice

**Practice Participants (GET /api/practices/:id/participants):**
- Returns 401 without auth
- Returns 403 for non-owner clinician
- Returns paginated participant list for owner
- Includes clinician name per participant
- Respects cursor pagination
- Filters by search query (name)
- Filters by search query (email)
- Returns empty array for practice with no participants
- Limits to 50 per page
- Returns 404 for non-existent practice

### `packages/api/src/__tests__/bulk-actions.test.ts` (~15 tests)

**Bulk Action Validation:**
- Returns 400 for empty participantIds
- Returns 400 for more than 50 participants
- Returns 400 for missing action

**Bulk Push Task:**
- Creates tasks for all valid participants
- Skips participants without title
- Creates audit log entry per participant
- Returns succeeded/failed counts

**Bulk Unlock Next Module:**
- Unlocks next module for active enrollments
- Skips participants with no active enrollment
- Skips participants with no locked modules
- Creates audit log entry per participant

**Bulk Send Nudge:**
- Creates nudge tasks for all participants
- Truncates message at 500 characters
- Creates audit log entry per participant

**Practice Owner Override:**
- Practice owner can bulk-act on other clinicians' participants

---

## Coverage Targets

| Package | Current | Target | Status |
|---------|---------|--------|--------|
| packages/api | >80% | >80% | TBD |
| packages/shared | >80% | >80% | TBD |

---

## Test Infrastructure

- All tests use mocked Prisma via `setup.ts`
- Auth headers from `helpers.ts` (createTestToken, authHeader, participantAuthHeader)
- Supertest for HTTP-level integration tests
- Notification service mocked to prevent side effects
