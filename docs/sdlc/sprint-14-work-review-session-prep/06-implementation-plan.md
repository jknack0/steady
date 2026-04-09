# Sprint 14: Steady Work Review + Session Prep + Per-Participant Customization — Implementation Plan

## Status: COMPLETE

---

## What Was Built

### Database (Prisma — `packages/db/prisma/schema.prisma`)

Three new models and one new enum were added:

| Addition | Description |
|---|---|
| `ReviewTemplate` | Per-program template defining review questions and barrier options |
| `SessionReview` | Participant-submitted review linked to a calendar appointment |
| `EnrollmentOverride` | Per-enrollment customization record (hide, add, or annotate content) |
| `OverrideType` enum | `HIDE_HOMEWORK_ITEM`, `ADD_RESOURCE`, `ADD_HOMEWORK_ITEM`, `CLINICIAN_NOTE` |

All three models include `createdAt`/`updatedAt` timestamps and foreign-key indexes. `SessionReview` uses a composite unique constraint on `(enrollmentId, appointmentId)` to enforce the one-review-per-appointment rule. `EnrollmentOverride` stores a typed JSON payload in a `data` column, validated at the API layer by Zod discriminated unions.

### API Routes (`packages/api/src/routes/`)

Eight new endpoints across two new route files:

| Method | Path | Description |
|---|---|---|
| `GET` | `/programs/:programId/review-template` | Fetch program review template (owner or default) |
| `PUT` | `/programs/:programId/review-template` | Upsert review template (clinician) |
| `GET` | `/appointments/:appointmentId/review` | Fetch submitted review (clinician or participant) |
| `POST` | `/appointments/:appointmentId/review` | Submit or re-submit review (participant) |
| `GET` | `/appointments/:appointmentId/session-prep` | Aggregated session-prep data (clinician) |
| `GET` | `/enrollments/:enrollmentId/overrides` | List enrollment overrides (clinician) |
| `POST` | `/enrollments/:enrollmentId/overrides` | Create enrollment override (clinician) |
| `DELETE` | `/enrollments/:enrollmentId/overrides/:overrideId` | Delete enrollment override (clinician) |

All endpoints authenticate with `authenticate` + `requireRole()` middleware. Ownership and cross-practice checks are enforced before any data access.

### Services (`packages/api/src/services/`)

Four new service modules:

| File | Responsibility |
|---|---|
| `review-template.ts` | CRUD for `ReviewTemplate`; returns built-in default when no custom template exists |
| `session-review.ts` | Upsert `SessionReview` with audit context; fetch with access control |
| `session-prep.ts` | Aggregates review, open homework, tracker trends, last session notes into one object |
| `enrollment-override.ts` | CRUD for `EnrollmentOverride`; `applyOverrides()` pure function for merge-at-query-time |

`applyOverrides()` is a pure function with no database access — it takes a module's parts array and an overrides array and returns the merged result. This makes it unit-testable in isolation.

### Web App (`apps/web/src/`)

- **Session Prep page** (`app/(dashboard)/calendar/[appointmentId]/prep/page.tsx`): Three-panel layout — participant work review (left), open homework (center), clinician notes + tracker trends (right). Notes panel autosaves with 2-second debounce via the existing `use-autosave` hook.
- **Customize tab** (`components/enrollment/CustomizeTab.tsx`): Added to the enrollment detail page. Lists active overrides with type badges, provides an "Add Override" dialog with type-specific fields, and supports single-click delete with optimistic UI.
- Both views use TanStack Query; mutations invalidate the relevant query keys on success.

### Mobile App (`apps/mobile/`)

- **Review screen** (`app/(app)/review/[appointmentId].tsx`): Scrollable form rendering template questions as multiline text inputs and barriers as a multi-select checklist. Submits via `POST /appointments/:id/review`. Shows a confirmation state on success.

---

## Test Results

| Suite | Tests | Result |
|---|---|---|
| `packages/api` full suite | 754 / 754 | PASS |
| `packages/shared` full suite | 362 / 362 | PASS |

**Sprint 14 new tests: 89 total** (59 API + 30 shared). See `07-test-report.md` for full breakdown.

Coverage held above the 80% gate on both packages.

---

## Deferred Items

| Item | Reason | Tracking |
|---|---|---|
| 24h review notification (pg-boss trigger) | Scheduling logic requires `startAfter` pg-boss API not yet wired to appointment create/update events; deferred to sprint 15 | `review-notification.test.ts` test file scaffolded, tests skipped |
| Override merge into participant content delivery | `applyOverrides()` is complete and tested; wiring into the `GET /participant/programs/:id/modules/:id` route deferred to sprint 15 to avoid scope creep | — |
| Web component tests (`SessionPrep.test.tsx`, `CustomizeTab.test.tsx`) | Non-blocking per coverage policy; deferred to sprint 15 | — |

---

## File List

### New files
- `packages/api/src/routes/session-review.ts`
- `packages/api/src/routes/enrollment-overrides.ts`
- `packages/api/src/services/review-template.ts`
- `packages/api/src/services/session-review.ts`
- `packages/api/src/services/session-prep.ts`
- `packages/api/src/services/enrollment-override.ts`
- `packages/api/src/__tests__/session-review.test.ts`
- `packages/api/src/__tests__/session-prep.test.ts`
- `packages/api/src/__tests__/enrollment-overrides.test.ts`
- `packages/api/src/__tests__/override-merge.test.ts`
- `packages/shared/src/schemas/review.ts`
- `packages/shared/src/schemas/enrollment-override.ts`
- `packages/shared/src/__tests__/review.schema.test.ts`
- `packages/shared/src/__tests__/enrollment-override.schema.test.ts`
- `apps/web/src/app/(dashboard)/calendar/[appointmentId]/prep/page.tsx`
- `apps/web/src/components/enrollment/CustomizeTab.tsx`
- `apps/mobile/app/(app)/review/[appointmentId].tsx`

### Modified files
- `packages/db/prisma/schema.prisma` — added `ReviewTemplate`, `SessionReview`, `EnrollmentOverride`, `OverrideType`
- `packages/api/src/index.ts` — registered two new route modules
- `packages/shared/src/index.ts` — re-exported new schemas and types
- `apps/web/src/components/enrollment/EnrollmentDetail.tsx` — added Customize tab
- `apps/web/src/app/(dashboard)/calendar/[appointmentId]/page.tsx` — added "Open Prep" button
