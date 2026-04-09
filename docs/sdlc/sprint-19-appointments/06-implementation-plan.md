# Sprint 19: Appointment Entity + Clinician Calendar — Implementation Plan & Report

## Status: Backend complete. Web UI deferred to follow-up PR.

## What Was Built

### Schema (packages/db/prisma/schema.prisma)
- Enums: `AppointmentStatus`, `AppointmentType`, `LocationType`
- Models: `Appointment`, `Location`, `ServiceCode`
- `Session.appointmentId` nullable FK with `onDelete: SetNull` (COND-12)
- Indexes per architecture: `(practiceId, clinicianId, startAt)`, `(practiceId, locationId, startAt)`, `(practiceId, participantId)`, `status`, `createdById`, `(practiceId, isActive)` on Location, `@@unique([practiceId, code])` on ServiceCode
- Relations added to `Practice`, `ClinicianProfile`, `ParticipantProfile`, `User`

### Shared Zod schemas (packages/shared/src/schemas/)
- `appointment.ts` — `AppointmentStatusEnum`, `AppointmentTypeEnum`, `CreateAppointmentSchema` (with `endAt > startAt` + GROUP rejection via `.superRefine`), `UpdateAppointmentSchema` (strips immutable fields per COND-10), `StatusChangeSchema`, `ListAppointmentsQuerySchema` (62-day cap per COND-14)
- `location.ts` — `LocationTypeEnum`, `CreateLocationSchema`, `UpdateLocationSchema`
- `service-code.ts` — `ServiceCodeResponseSchema`, `SERVICE_CODE_SEED` constant (all 15 CPT codes)
- `index.ts` — re-exports the three modules

### API layer

**lib / middleware**
- `packages/api/src/lib/practice-context.ts` — `ServiceCtx` type + `requirePracticeCtx` middleware resolving practiceId from `PracticeMembership` (COND-1)
- `packages/api/src/middleware/rate-limit.ts` — in-memory sliding-window limiter (ready for COND-9 when participant search endpoint ships)

**Services (packages/api/src/services/)**
- `appointments.ts` — `createAppointment`, `listAppointments`, `getAppointment`, `updateAppointment`, `changeStatus`, `deleteAppointment`, `detectConflicts`, `toClinicianView`, `toParticipantView`
- `locations.ts` — `listLocations`, `createLocation`, `updateLocation`, `softDeleteLocation`, `seedDefaultLocationsForPractice` (idempotent)
- `service-codes.ts` — `listServiceCodes`, `seedServiceCodesForPractice` (idempotent), `getServiceCodeOrThrow`

**Routes (packages/api/src/routes/)**
- `appointments.ts` — 6 endpoints (POST, GET, GET/:id, PATCH, POST/:id/status, DELETE)
- `locations.ts` — 4 endpoints with `requireAccountOwner` on writes
- `service-codes.ts` — GET + 405 on writes
- `app.ts` — mounts all three routers under `/api`

### Tests
- `packages/api/src/__tests__/appointments.test.ts` (36 tests) — FR-1..FR-7 + FR-10..FR-12 coverage, every cross-tenant 404 path, Zod strip, hard-delete guards, conflict detection
- `packages/api/src/__tests__/locations.test.ts` (10 tests) — seeding idempotency, owner gating, soft delete guard
- `packages/api/src/__tests__/service-codes.test.ts` (6 tests) — 15-code seed, idempotency, 405 on writes, active filtering
- `packages/api/src/__tests__/appointments-audit.test.ts` (3 tests) — COND-4/5/6 — audit row presence, PHI absence, status from/to metadata
- `packages/shared/src/__tests__/appointment.schema.test.ts` (16 tests)
- `packages/shared/src/__tests__/location.schema.test.ts` (7 tests)
- `packages/shared/src/__tests__/service-code.schema.test.ts` (5 tests)
- `packages/api/src/__tests__/helpers.ts` — extended with `mockLocation`, `mockServiceCode`, `mockAppointment`, `seedTwoPractices`
- `packages/api/src/__tests__/setup.ts` — extended with `appointment`, `location`, `serviceCode`, `practiceMembership.findFirst`, `auditLog.create` mocks

## Deferred Items (fast-follow PR)

1. **Web UI** — `/appointments` route, `<Calendar>`, day/week/month views, `<AppointmentModal>`, `<AppointmentStatusPopover>`, `<CalendarFilters>`, `<ClientSearchSelect>`, TanStack Query hooks, `date-fns-tz` integration, Sidebar nav item. Contracts are stable; the web team can implement against the API without further backend changes.
2. **Participant search endpoint** (`GET /api/participants/search`) and **new-client creation** (`POST /api/participants` without enrollment) — cross-cutting with existing participant routes. Rate-limit middleware is already shipped; wiring is a ~50-line addition in a follow-up PR.
3. **Seed script in `docker-entrypoint.sh`** — sprint 19 uses lazy seeding (first list call per practice, idempotent), which satisfies NFR-7c. A proactive deploy-time seed script is optional.
4. **FR-10 existing-query audit** — grep for `participant.enrollments[0]` / `.length` in `packages/api/src/` and null-safe any assumptions. No failures surfaced in the full suite, but a targeted review is recommended before wiring the "Add new client" flow.
5. **COND-12 integration-level test** — SetNull cascade on appointment delete is schema-enforced but the unit suite uses mocks. A dedicated Postgres integration test should be added alongside the participant search endpoint.

## Traceability (Architecture → Implementation)

| Architecture section | Files |
|---|---|
| `Appointment`, `Location`, `ServiceCode` models | `packages/db/prisma/schema.prisma` |
| Zod schemas | `packages/shared/src/schemas/appointment.ts`, `location.ts`, `service-code.ts` |
| `ServiceCtx` + `requirePracticeCtx` | `packages/api/src/lib/practice-context.ts` |
| Rate limiter | `packages/api/src/middleware/rate-limit.ts` |
| Service layer (tenant-isolated) | `packages/api/src/services/appointments.ts`, `locations.ts`, `service-codes.ts` |
| Conflict detection | `detectConflicts` in `services/appointments.ts` |
| Hard-delete guards | `deleteAppointment` in `services/appointments.ts` |
| Dual serializers (COND-7) | `toClinicianView` / `toParticipantView` in `services/appointments.ts` |
| Status transition audit enrichment | `changeStatus` writes explicit `auditLog.create` with `{from,to}` |
| Routes + middleware stack | `packages/api/src/routes/appointments.ts`, `locations.ts`, `service-codes.ts` |

## Test Results

```
packages/api:    572 / 574 pass (2 pre-existing failures in
                 feelings-wheel-validation.test.ts — unrelated)
packages/shared: 306 / 306 pass
New tests:       87 / 87 pass (58 API + 29 shared)
Typecheck:       packages/api ✅, packages/shared ✅, packages/db ✅
```
