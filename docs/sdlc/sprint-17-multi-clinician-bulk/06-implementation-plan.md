# Sprint 17: Multi-Clinician Practice Management + Bulk Actions — Implementation Plan

## Summary

Sprint 17 was implemented with no schema changes. All functionality builds on existing Practice and PracticeMembership models.

## Implementation Steps (Completed)

### 1. Backend Service: `practice-management.ts`
- `getPracticeStats()` — Aggregates member count, programs, enrollments, active participants, upcoming appointments across all practice clinicians
- `getPracticeParticipants()` — Cursor-paginated list of all participants with clinician attribution and search

### 2. Route Extensions: `practice.ts`
- `GET /api/practices/:id/stats` — Owner-only, calls getPracticeStats
- `GET /api/practices/:id/participants` — Owner-only, calls getPracticeParticipants with query params

### 3. Bulk Action Enhancements: `clinician.ts`
- Added `userId` parameter to `bulkAction()` for audit logging
- Max 50 participant cap enforced at route level
- Per-participant audit log entries (CREATE/UPDATE, never logs content)
- Message truncation at 500 characters for send-nudge

### 4. Web UI
- `/practice` page with stats cards, member management, participant table
- `use-practice-dashboard.ts` hooks: usePractices, usePracticeStats, usePracticeParticipants, useInviteClinician, useRemoveMember
- Practice nav item added to sidebar (Building2 icon)
- PracticeStatsCards, MemberManagement, PracticeParticipantTable components

### 5. Tests
- `practice-management.test.ts` — 10 tests for stats and participants endpoints
- `bulk-actions.test.ts` — 15 tests for validation, push-task, unlock, nudge, audit logging

## Files Created/Modified

**Created:**
- `packages/api/src/services/practice-management.ts`
- `packages/api/src/__tests__/practice-management.test.ts`
- `packages/api/src/__tests__/bulk-actions.test.ts`
- `apps/web/src/hooks/use-practice-dashboard.ts`
- `apps/web/src/app/(dashboard)/practice/page.tsx`
- `apps/web/src/components/practice/PracticeStatsCards.tsx`
- `apps/web/src/components/practice/MemberManagement.tsx`
- `apps/web/src/components/practice/PracticeParticipantTable.tsx`

**Modified:**
- `packages/api/src/routes/practice.ts` — Added stats + participants routes
- `packages/api/src/routes/clinician.ts` — Added max-50 cap, updated bulkAction call
- `packages/api/src/services/clinician.ts` — Added userId param, audit logging, message truncation
- `apps/web/src/app/(dashboard)/layout.tsx` — Added Practice nav item
