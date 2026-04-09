# Sprint 17: Multi-Clinician Practice Management + Bulk Actions — Technical Architecture

## Overview

Sprint 17 adds two new endpoints to the existing practice routes (stats, participants), enhances the existing bulk action service with practice-scoped authorization and audit logging, and creates a new Practice Dashboard page in the web app. No schema changes are required — Practice, PracticeMembership, and all related models already exist. The design reuses the existing `requirePracticeCtx` middleware and `ServiceCtx` pattern established in Sprint 19.

## System Diagram

```
+------------------------------------------------------------------+
| Next.js Web (apps/web)                                            |
|   /practice route (dashboard group) -- owner only                 |
|   +- <PracticeStats> -- aggregate stat cards                      |
|   +- <MemberManagement> -- invite/remove clinicians               |
|   +- Practice participant table with clinician column             |
|   /participants route -- enhanced with bulk action bar             |
|   +- <BulkActionBar> -- floating multi-select action bar          |
|   TanStack Query hooks: usePracticeStats, usePracticeParticipants |
+-------------------------------+----------------------------------+
                                | HTTPS + JWT
+-------------------------------v----------------------------------+
| Express API (packages/api)                                        |
|                                                                   |
|  routes/practice.ts (extended)                                    |
|    GET /:id/stats          -- practice-management.ts              |
|    GET /:id/participants   -- practice-management.ts              |
|                                                                   |
|  routes/clinician.ts (existing)                                   |
|    POST /participants/bulk -- clinician.ts (enhanced)             |
|                                                                   |
|  services/practice-management.ts (new)                            |
|    getPracticeStats(ctx)                                          |
|    getPracticeParticipants(ctx, query)                            |
|                                                                   |
|  services/clinician.ts (enhanced)                                 |
|    bulkAction() -- add max-50 cap, audit logging                  |
+-------------------------------+----------------------------------+
                                |
                    +-----------v-----------+
                    | PostgreSQL            |
                    |  practices            |
                    |  practice_memberships |
                    |  programs             |
                    |  enrollments          |
                    |  tasks                |
                    |  module_progress      |
                    |  audit_logs           |
                    +-----------------------+
```

## Components

### `packages/api/src/services/practice-management.ts` (new)

**Responsibility:** Practice owner dashboard queries -- stats aggregation and practice-wide participant listing.

**Public functions:**
```ts
getPracticeStats(practiceId: string): Promise<PracticeStatsResult>
getPracticeParticipants(practiceId: string, query: { cursor?: string; limit?: number; search?: string }): Promise<PaginatedResult>
```

**Design decisions:**
- Stats query uses `prisma.enrollment.count()` and `prisma.appointment.count()` for efficient aggregation rather than loading full records
- Participant list joins Enrollment -> ParticipantProfile -> User and Program -> ClinicianProfile -> User to resolve clinician names
- Cursor-based pagination with max 50 per page

### `packages/api/src/routes/practice.ts` (extended)

Two new route handlers added to the existing practice router:

- `GET /:id/stats` -- Verifies owner via membership lookup, calls `getPracticeStats`
- `GET /:id/participants` -- Verifies owner, calls `getPracticeParticipants` with query params

Both use the same ownership verification pattern as the existing PUT /:id handler.

### `packages/api/src/services/clinician.ts` (enhanced)

The existing `bulkAction()` function is enhanced with:
1. **Max 50 cap** -- Returns 400 if participantIds.length > 50
2. **Per-participant audit logging** -- After each successful action, creates an AuditLog entry with the acting clinician's userId, action type, and resource ID (never logs message content)
3. **Practice owner override** -- If the caller is a practice owner (detected via optional ServiceCtx parameter), skip the individual ownership check for participants in the same practice

### `apps/web/src/app/(dashboard)/practice/page.tsx` (new)

Practice dashboard page with three sections:
1. Aggregate stats cards (clinicians, programs, enrollments, participants, appointments)
2. Member management (list members, invite form, remove button)
3. Practice-wide participant table with clinician column and cursor pagination

### `apps/web/src/hooks/use-practice-dashboard.ts` (new)

TanStack Query hooks:
- `usePracticeStats(practiceId)` -- Fetches GET /api/practices/:id/stats
- `usePracticeParticipants(practiceId, params)` -- Fetches GET /api/practices/:id/participants
- `useInviteClinician(practiceId)` -- Mutation for POST /api/practices/:id/invite
- `useRemoveMember(practiceId)` -- Mutation for DELETE /api/practices/:id/members/:memberId

### `apps/web/src/components/practice/` (new directory)

- `PracticeStatsCards.tsx` -- Grid of stat cards
- `MemberManagement.tsx` -- Member list with invite form and remove confirmation
- `PracticeParticipantTable.tsx` -- Table with clinician column, search, pagination

---

## Data Flow

### Practice Stats
1. Client calls `GET /api/practices/:id/stats`
2. Route verifies ownership via PracticeMembership lookup
3. Service queries: membership count, program count (via Program.clinicianId IN practice members), enrollment counts, appointment count (next 7 days)
4. Returns aggregated totals + per-clinician breakdown

### Practice Participants
1. Client calls `GET /api/practices/:id/participants?cursor=X&search=Y`
2. Route verifies ownership
3. Service queries Enrollment with joins to ParticipantProfile.User and Program.ClinicianProfile.User
4. Filters by practice membership (clinicianId IN practice clinician IDs)
5. Returns cursor-paginated results with clinician name per row

### Enhanced Bulk Action
1. Client calls `POST /api/clinician/participants/bulk` with `{ action, participantIds, data }`
2. Route checks participantIds.length <= 50
3. For each participant: execute action, create audit log entry
4. Return results array with per-participant success/failure

---

## Error Handling

| Scenario | HTTP | Response |
|----------|------|----------|
| Non-owner requests stats/participants | 403 | "Only practice owners can view..." |
| Non-member requests any practice endpoint | 404 | "Practice not found" |
| Bulk action > 50 participants | 400 | "Maximum 50 participants per bulk action" |
| Bulk action participant not owned | -- | Skipped in results array with error |
| Practice not found | 404 | "Practice not found" |

---

## Testing Strategy

### API Tests
- `practice-management.test.ts` (~20 tests): Stats endpoint, participants endpoint, auth checks, pagination, search filtering
- Enhanced `practice.test.ts`: Invite and remove already tested, add audit logging verification
- `bulk-actions.test.ts` (~15 tests): Max cap, audit logging, practice owner override, error cases

### Web Tests
- Practice dashboard renders stats and member list
- Bulk action bar appears on selection, executes actions

---

## Security Considerations

1. **Cross-practice isolation**: All queries filter by practice membership IDs, not just practiceId
2. **Owner verification**: Direct PracticeMembership.role check, not trusting client-provided roles
3. **Audit completeness**: Bulk actions create N audit entries for N participants
4. **No PII in logs**: Audit entries contain only resource IDs and action types
5. **Rate limiting**: 50-participant cap prevents abuse and ensures reasonable audit trail size
