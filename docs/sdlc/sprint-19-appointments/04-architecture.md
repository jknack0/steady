# Sprint 19: Appointment Entity + Clinician Calendar — Technical Architecture

## Overview

Sprint 19 introduces three new Prisma models (`Appointment`, `Location`, `ServiceCode`), one FK addition (`Session.appointmentId`), eleven REST endpoints under `/api/appointments`, `/api/locations`, `/api/service-codes`, plus a new `/appointments` route in the Next.js clinician dashboard with day/week/month calendar views. The design follows Steady's existing layered architecture: Zod schemas in `@steady/shared` → Express routes → service functions → Prisma singleton. Tenant isolation is enforced at the service layer (COND-1) by threading a `practiceId` parameter resolved from the authenticated user's `PracticeMembership`. All mutations flow through the existing Prisma audit middleware, which already runs inside the `runWithAuditUser` context established by `authenticate`. No new runtime dependencies are required.

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ Next.js Web (apps/web)                                              │
│   /appointments route (dashboard group)                             │
│   ├─ <Calendar> → day/week/month views                              │
│   ├─ <AppointmentModal> → create/edit                               │
│   ├─ <AppointmentStatusPopover>                                     │
│   └─ TanStack Query hooks: useAppointments, useCreateAppointment…   │
└──────────────────┬──────────────────────────────────────────────────┘
                   │ HTTPS + JWT
┌──────────────────▼──────────────────────────────────────────────────┐
│ Express API (packages/api)                                          │
│                                                                     │
│  routes/appointments.ts   routes/locations.ts   routes/service-     │
│         │                         │              codes.ts          │
│         │                         │                    │           │
│         ▼                         ▼                    ▼           │
│  services/appointments.ts  services/locations.ts  services/        │
│         │                         │              service-codes.ts  │
│         │  (practiceId threaded explicitly — COND-1)               │
│         ▼                         ▼                    ▼           │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ @steady/db — Prisma singleton + audit middleware           │    │
│  │  (runs inside runWithAuditUser from authenticate)          │    │
│  └────────────────────────────────────────────────────────────┘    │
│                             │                                       │
└─────────────────────────────┼───────────────────────────────────────┘
                              ▼
                    ┌──────────────────┐
                    │ PostgreSQL       │
                    │  appointments    │
                    │  locations       │
                    │  service_codes   │
                    │  sessions (+FK)  │
                    │  audit_logs      │
                    └──────────────────┘

Shared:
  @steady/shared/src/schemas/appointment.ts
                            /location.ts
                            /service-code.ts
```

## Components

### `packages/shared/src/schemas/appointment.ts` (new)
**Responsibility:** Zod validation for all Appointment request/response shapes. Single source of truth for web + API.
**Exports:**
- `AppointmentStatusEnum`, `AppointmentTypeEnum` (z.enum)
- `CreateAppointmentSchema`, `UpdateAppointmentSchema`, `StatusChangeSchema`
- `ListAppointmentsQuerySchema`
- `AppointmentResponseSchema`, `AppointmentWithConflictsSchema`
**Dependencies:** `zod`.

### `packages/shared/src/schemas/location.ts` (new)
**Responsibility:** Zod validation for Location CRUD.
**Exports:** `LocationTypeEnum`, `CreateLocationSchema`, `UpdateLocationSchema`, `LocationResponseSchema`.

### `packages/shared/src/schemas/service-code.ts` (new)
**Responsibility:** Read-only Zod response schemas for service codes + seed list constant.
**Exports:** `ServiceCodeResponseSchema`, `SERVICE_CODE_SEED`.

### `packages/api/src/services/appointments.ts` (new)
**Responsibility:** All appointment business logic — creation, listing, updating, status transitions, hard-delete guard, conflict detection, serializer variants. NEVER reads `practiceId` from request; always receives it as a parameter.
**Public functions:**
```ts
createAppointment(ctx: ServiceCtx, input: CreateAppointmentInput): Promise<AppointmentWithConflicts>
listAppointments(ctx: ServiceCtx, query: ListQuery): Promise<{ data: Appointment[]; cursor: string | null }>
getAppointment(ctx: ServiceCtx, id: string): Promise<Appointment | null>
updateAppointment(ctx: ServiceCtx, id: string, patch: UpdateInput): Promise<AppointmentWithConflicts | NotFoundOrConflict>
changeStatus(ctx: ServiceCtx, id: string, status: AppointmentStatus, cancelReason?: string): Promise<Appointment | NotFound>
deleteAppointment(ctx: ServiceCtx, id: string): Promise<DeleteResult>
detectConflicts(ctx: ServiceCtx, clinicianId: string, startAt: Date, endAt: Date, excludeId?: string): Promise<string[]>
toClinicianView(appt: Appointment): AppointmentClinicianView  // COND-7
toParticipantView(appt: Appointment): AppointmentParticipantView  // COND-7 — strips internalNote, cancelReason, audit fields
```
Where `ServiceCtx = { practiceId: string; userId: string; clinicianProfileId?: string; isAccountOwner: boolean }`.

### `packages/api/src/services/locations.ts` (new)
**Public functions:** `listLocations(ctx)`, `createLocation(ctx, input)`, `updateLocation(ctx, id, patch)`, `softDeleteLocation(ctx, id)`, `seedDefaultLocationsForPractice(practiceId, tx?)`.

### `packages/api/src/services/service-codes.ts` (new)
**Public functions:** `listServiceCodes(ctx)`, `seedServiceCodesForPractice(practiceId, tx?)`, `getServiceCodeOrThrow(ctx, id)`.

### `packages/api/src/lib/practice-context.ts` (new small helper)
**Responsibility:** Resolves `ServiceCtx` from `req.user` by querying `PracticeMembership`. Cached per-request on `res.locals.practiceCtx` to avoid repeat lookups. Throws `404` if the user has no active membership (clinicians without a practice cannot access any appointment endpoints).
**Export:** `requirePracticeCtx(req, res, next)` — middleware that populates `res.locals.practiceCtx: ServiceCtx`.

### `packages/api/src/routes/appointments.ts` (new)
**Responsibility:** HTTP layer for all `/api/appointments/*` endpoints. Parses input via Zod, calls service with `res.locals.practiceCtx`, formats responses.
**Middleware stack:** `authenticate` → `requireRole('CLINICIAN','ADMIN')` → `requirePracticeCtx` → `validate(schema)` → handler.

### `packages/api/src/routes/locations.ts` (new)
**Middleware stack identical**, with extra `requireAccountOwner` wrapper on POST/PATCH/DELETE.

### `packages/api/src/routes/service-codes.ts` (new)
**Middleware stack:** `authenticate` → `requireRole('CLINICIAN','ADMIN')` → `requirePracticeCtx`. POST/PATCH/DELETE handlers return `405`.

### `apps/web/src/app/(dashboard)/appointments/page.tsx` (new)
**Responsibility:** Calendar top-level page; reads filter + view state from URL query params.

### Web components (new)
`<Calendar>`, `<CalendarDayView>`, `<CalendarWeekView>`, `<CalendarMonthView>`, `<AppointmentCard>`, `<AppointmentModal>`, `<AppointmentStatusPopover>`, `<CalendarFilters>`, `<ClientSearchSelect>`, `<ServiceCodeSelect>`, `<LocationSelect>` — all under `apps/web/src/components/appointments/`.

### Web hooks (new)
`useAppointments`, `useAppointment`, `useCreateAppointment`, `useUpdateAppointment`, `useChangeAppointmentStatus`, `useDeleteAppointment`, `useLocations`, `useServiceCodes`, `useParticipantSearch` — all in `apps/web/src/hooks/appointments/`.

## Data Model

### New enums

```prisma
enum AppointmentStatus {
  SCHEDULED
  ATTENDED
  NO_SHOW
  LATE_CANCELED
  CLIENT_CANCELED
  CLINICIAN_CANCELED
}

enum AppointmentType {
  INDIVIDUAL
  COUPLE
  GROUP
}

enum LocationType {
  IN_PERSON
  VIRTUAL
}
```

### New model: `Appointment`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String @id @default(cuid()) | PK | |
| practiceId | String | FK → Practice | Tenant key |
| clinicianId | String | FK → ClinicianProfile | Owner |
| participantId | String | FK → ParticipantProfile | Client |
| serviceCodeId | String | FK → ServiceCode | |
| locationId | String | FK → Location | |
| startAt | DateTime | not null | UTC (timestamptz) |
| endAt | DateTime | not null | UTC |
| status | AppointmentStatus | default: SCHEDULED | |
| appointmentType | AppointmentType | default: INDIVIDUAL | |
| internalNote | String? | max 500 | PHI-high |
| cancelReason | String? | max 500 | PHI-high |
| statusChangedAt | DateTime? | server-set | COND-10 |
| createdById | String | FK → User | |
| createdAt | DateTime | @default(now()) | |
| updatedAt | DateTime | @updatedAt | |

**Indexes:**
- `@@index([practiceId, clinicianId, startAt])` — calendar range queries (primary access pattern)
- `@@index([practiceId, locationId, startAt])` — location-filtered queries
- `@@index([practiceId, participantId])` — per-client history
- `@@index([status])` — status filter
- `@@index([createdById])` — audit joins

### New model: `Location`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String @id @default(cuid()) | | |
| practiceId | String | FK → Practice | Tenant key |
| name | String | max 200 | |
| type | LocationType | not null | |
| addressLine1 | String? | max 200 | |
| addressLine2 | String? | max 200 | |
| city | String? | max 100 | |
| state | String? | max 50 | |
| postalCode | String? | max 20 | |
| timezone | String? | IANA | |
| isDefault | Boolean | default false | |
| isActive | Boolean | default true | Soft delete flag |
| createdAt/updatedAt | DateTime | | |

**Indexes:** `@@index([practiceId, isActive])`.

### New model: `ServiceCode`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String @id @default(cuid()) | | |
| practiceId | String | FK → Practice | Tenant key |
| code | String | max 20 | CPT-like |
| description | String | max 200 | |
| defaultDurationMinutes | Int | | |
| defaultPriceCents | Int? | | |
| isActive | Boolean | default true | |
| createdAt/updatedAt | DateTime | | |

**Constraints:** `@@unique([practiceId, code])`, `@@index([practiceId, isActive])`.

### Modified model: `Session`

Add nullable column and relation:
```prisma
appointmentId  String?
appointment    Appointment? @relation(fields: [appointmentId], references: [id], onDelete: SetNull)

@@index([appointmentId])
```

### Modified model: `ParticipantProfile`

**No schema change.** The existing `enrollments: Enrollment[]` relation is already array-valued and can be empty. FR-10 is enforced by a code audit: during engineering, grep for any query paths that assume `participant.enrollments.length > 0` or `participant.enrollments[0]` without null-checks. Documented as a task in `06-implementation-plan.md`.

### AuditLog reuse
The existing `AuditLog` model has a `metadata: Json?` column. Architect decision: the spec's `changedFields` concept is stored as `metadata.changedFields: string[]`. For status transitions, `metadata = { changedFields: ['status'], from, to }`. No schema change to `AuditLog`.

## API Design

All endpoints require `authenticate` + `requireRole('CLINICIAN','ADMIN')` + `requirePracticeCtx`. Responses use the existing `{ success, data?, error? }` envelope.

### `POST /api/appointments`
- **Auth:** Clinician/Admin
- **Body (Zod `CreateAppointmentSchema`):** `{ participantId, serviceCodeId, locationId, startAt (ISO), endAt (ISO), appointmentType?, internalNote? }`
- **Response 201:** `{ success: true, data: { appointment, conflicts: string[] } }`
- **Errors:** 400 (validation / endAt<=startAt / GROUP type / inactive service code), 404 (unknown/cross-tenant participant|serviceCode|location)

### `GET /api/appointments`
- **Query (Zod `ListAppointmentsQuerySchema`):** `startAt`, `endAt` (required), `cursor?`, `limit?` (max 100), `locationId?`, `status?` (comma-separated), `clinicianId?` (account owner only)
- **Response:** `{ success: true, data: Appointment[], cursor: string | null }`
- **Errors:** 400 (missing range / >62 days / invalid status), 404 (cross-tenant clinicianId)

### `GET /api/appointments/:id`
- **Response:** `{ success: true, data: Appointment }` (clinician view — includes internalNote)
- **Errors:** 404 (not found or cross-tenant)

### `PATCH /api/appointments/:id`
- **Body (Zod `UpdateAppointmentSchema`):** any subset of `{ startAt, endAt, serviceCodeId, locationId, internalNote, appointmentType }`. Schema strips `participantId`, `practiceId`, `clinicianId`, `createdById`, `statusChangedAt`, `createdAt`, `updatedAt` (COND-10, COND-13).
- **Response:** `{ success: true, data: { appointment, conflicts } }`
- **Errors:** 400 (endAt<=startAt), 404 (not found/cross-tenant), 409 (terminal-status scheduling-field change)

### `POST /api/appointments/:id/status`
- **Body:** `{ status: AppointmentStatus, cancelReason?: string }`
- **Response:** `{ success: true, data: Appointment }`
- **Errors:** 400 (bad status), 404 (not found)

### `DELETE /api/appointments/:id`
- **Response 204:** empty
- **Errors:** 409 (not SCHEDULED / >24h old / has linked Session), 404

### `GET /api/locations`, `POST`, `PATCH /:id`, `DELETE /:id`
- POST/PATCH/DELETE require `isAccountOwner === true` on ctx. Non-owner → 403.
- DELETE is soft (`isActive=false`). Referenced by non-canceled appointment → 409.

### `GET /api/service-codes`
- Returns all `isActive: true` codes for the practice, ordered by `code` asc.
- `POST`/`PATCH`/`DELETE` → 405 "Service code editing is not yet available".

### `GET /api/participants/search?q=<string>` (extension to existing participant routes)
- **Preconditions:** q.length >= 2. Rate-limited to 30 req/min per user via existing or new middleware.
- **Response:** `{ success: true, data: { participants: [{ id, firstName, lastName, email }] } }` (max 20)
- Audit log written with `metadata: { queryHash: sha256(q) }` — never the plaintext query (COND-9).

### `POST /api/participants` (extension — "Add new client")
- Creates `User` (role=PARTICIPANT) + `ParticipantProfile` without any `Enrollment`. Links via `ClinicianClient` to the creating clinician + practice.

## Data Flow

### Scenario 1: Create appointment
1. Browser POSTs to `/api/appointments` with JWT.
2. `authenticate` → verifies JWT, calls `runWithAuditUser(userId, next)`.
3. `requireRole('CLINICIAN','ADMIN')` → checks role claim.
4. `requirePracticeCtx` → queries `PracticeMembership` for user's `clinicianProfileId`, attaches `{ practiceId, userId, clinicianProfileId, isAccountOwner }` to `res.locals.practiceCtx`.
5. `validate(CreateAppointmentSchema)` → strict parse of body, strips unknowns, coerces dates.
6. Handler calls `createAppointment(ctx, input)`.
7. Service validates `endAt > startAt`, rejects GROUP type, verifies `serviceCodeId`, `locationId`, `participantId` all belong to `ctx.practiceId` (cross-tenant → returns `NotFound` sentinel → 404).
8. Service runs `detectConflicts(ctx, ctx.clinicianProfileId, startAt, endAt)` — returns overlapping non-canceled appointment IDs.
9. Service creates row via Prisma inside a transaction. Audit middleware fires automatically (CREATE on `Appointment`).
10. Service returns `{ appointment, conflicts }`. Handler responds 201.

### Scenario 2: Change status
1. POST `/api/appointments/:id/status` with `{ status: 'ATTENDED' }`.
2. Standard middleware chain.
3. Service `changeStatus(ctx, id, status, cancelReason?)`:
   - Loads appointment filtered by `practiceId` (COND-1). If not found → `NotFound` → 404.
   - If `!ctx.isAccountOwner && appt.clinicianId !== ctx.clinicianProfileId` → 404.
   - Updates `{ status, statusChangedAt: new Date(), cancelReason? }` inside a transaction.
   - After the Prisma update, the audit middleware emits `UPDATE` with `metadata.changedFields = ['status']`. The service additionally writes an enriched audit entry via `prisma.auditLog.create({ data: { userId: ctx.userId, action: 'UPDATE', resourceType: 'Appointment', resourceId: id, metadata: { changedFields: ['status'], from: oldStatus, to: status } } })` — the spec-approved value-level exception (COND-4, COND-5). Middleware-emitted row is deduped by checking `metadata.from` presence, OR the service explicitly skips the middleware by using `prisma.$executeRaw` — see trade-off below.

**Trade-off on status audit enrichment:** Simplest approach: accept that middleware writes one `UPDATE` row with `changedFields: ['status']`, and the service writes an additional enriched row with `{ changedFields: ['status'], from, to }`. Two rows for one action. QA test will assert >= 1 row with `from`/`to` metadata. Chosen because modifying the global audit middleware for this one case creates more risk than an extra audit row.

### Scenario 3: Calendar week query
1. GET `/api/appointments?startAt=2026-04-06T00:00:00Z&endAt=2026-04-13T00:00:00Z`.
2. Middleware chain as above.
3. `validate(ListAppointmentsQuerySchema)` rejects if range > 62 days (COND-14) or missing.
4. `listAppointments(ctx, query)`:
   - Builds `where: { practiceId: ctx.practiceId, AND: [{ startAt: { lt: endAt } }, { endAt: { gt: startAt } }] }` (overlap semantics).
   - Adds `clinicianId` filter: if `query.clinicianId && !ctx.isAccountOwner && query.clinicianId !== ctx.clinicianProfileId` → return 404. Otherwise default to `ctx.clinicianProfileId` when not account owner.
   - Adds optional `locationId`, `status IN (...)` filters.
   - Cursor pagination: `take: limit+1`, ordered by `[startAt asc, id asc]`, `skip: 1 + cursor: { id }` when cursor present.
   - Returns `{ data: items[0..limit], cursor: hasMore ? last.id : null }`.
5. Handler serializes via `toClinicianView(appt)` before responding.

### Scenario 4: Hard delete guard
1. DELETE `/api/appointments/:id`.
2. Service `deleteAppointment(ctx, id)`:
   - Loads appointment (tenant-scoped). Not found → 404.
   - Ownership check: `appt.createdById !== ctx.userId && !ctx.isAccountOwner` → 404.
   - Guards (COND-11): `status !== 'SCHEDULED'` → 409 "Cannot delete a completed or canceled appointment — use cancellation instead".
   - `Date.now() - appt.createdAt.getTime() > 24h` → 409 "Cannot delete an appointment older than 24 hours — cancel it instead".
   - Linked `Session`: `prisma.session.findFirst({ where: { appointmentId: id } })` → if exists → 409 "Cannot delete an appointment with a linked session".
   - `prisma.appointment.delete({ where: { id } })` — audit middleware fires DELETE. FK `Session.appointmentId` has `onDelete: SetNull` (belt and suspenders — guard above rejects, but schema enforces safety).
3. Handler responds 204.

### Scenario 5: First-time practice seeding (idempotent)
Triggered lazily on the first call to any of: `GET /api/appointments`, `GET /api/locations`, `GET /api/service-codes`, or eagerly via a one-time migration task that iterates existing practices.

`seedDefaultLocationsForPractice(practiceId, tx)` — `tx.location.createMany({ data: [mainOffice, telehealth], skipDuplicates: true })` guarded by a pre-check `findFirst({ where: { practiceId, isDefault: true } })`. Same pattern for `seedServiceCodesForPractice(practiceId, tx)` with the 15-item `SERVICE_CODE_SEED` constant. Both run inside a transaction to avoid partial seed on crash. Idempotency guaranteed by the pre-check + the `@@unique([practiceId, code])` constraint on ServiceCode.

## Migration Plan

1. **Single forward-only Prisma migration** `20260405_appointments_sprint19/`:
   - Creates enums `AppointmentStatus`, `AppointmentType`, `LocationType`.
   - Creates tables `appointments`, `locations`, `service_codes` with all indexes and FKs listed above.
   - Adds column `sessions.appointment_id` (nullable) with FK `onDelete: SetNull` + index.
2. **Data seed step** runs in `docker-entrypoint.sh` after `prisma db push`: a node script at `packages/db/src/seeds/appointments-seed.ts` iterates all existing practices and calls `seedDefaultLocationsForPractice` + `seedServiceCodesForPractice`. Idempotent — safe to re-run on every deploy.
3. **Backfill:** none. `sessions.appointment_id` stays NULL for existing rows. No PII touched.
4. **Rollback:** destructive migrations are forbidden by CLAUDE.md. Rollback is handled by a follow-up forward migration if needed.

## Zod Schema Placement & Strategy

Location: `packages/shared/src/schemas/appointment.ts`, `location.ts`, `service-code.ts`. Re-exported via `packages/shared/src/schemas/index.ts`.

**String bounds** follow CLAUDE.md conventions: titles ≤200, notes/reasons ≤500, short codes ≤20.

**Strip strategy:** Use default `z.object(...).parse()` behavior — unknown fields are silently stripped. This gives forward-compatibility for new clients that include additional fields. COND-13 verification test asserts the strip behavior (an extra field in the payload is simply dropped and the rest succeeds). For immutable server fields (`practiceId`, `createdById`, `statusChangedAt`, `createdAt`, `updatedAt`, `id`), the update schema simply omits them — `.parse()` strips them silently.

**Discriminated unions:** not needed for this feature.

**Superrefine:** `CreateAppointmentSchema.superRefine()` validates `endAt > startAt` and rejects `appointmentType === 'GROUP'`. `ListAppointmentsQuerySchema.superRefine()` validates `endAt - startAt <= 62 days`.

**Sketch:**
```ts
export const CreateAppointmentSchema = z.object({
  participantId: z.string().cuid(),
  serviceCodeId: z.string().cuid(),
  locationId: z.string().cuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  appointmentType: AppointmentTypeEnum.optional().default('INDIVIDUAL'),
  internalNote: z.string().max(500).optional(),
}).superRefine((data, ctx) => {
  if (new Date(data.endAt) <= new Date(data.startAt)) {
    ctx.addIssue({ code: 'custom', path: ['endAt'], message: 'endAt must be after startAt' });
  }
  if (data.appointmentType === 'GROUP') {
    ctx.addIssue({ code: 'custom', path: ['appointmentType'], message: 'Group appointments are not yet supported' });
  }
});
```

## Conflict Detection Algorithm (FR-7)

```ts
async function detectConflicts(ctx, clinicianId, startAt, endAt, excludeId?): Promise<string[]> {
  const rows = await prisma.appointment.findMany({
    where: {
      practiceId: ctx.practiceId,
      clinicianId,
      id: excludeId ? { not: excludeId } : undefined,
      status: { notIn: ['CLIENT_CANCELED', 'CLINICIAN_CANCELED', 'LATE_CANCELED', 'NO_SHOW'] },
      AND: [
        { startAt: { lt: endAt } },
        { endAt: { gt: startAt } },
      ],
    },
    select: { id: true },
    take: 10, // we only need to report existence + a small count
  });
  return rows.map(r => r.id);
}
```
Warn-only — the appointment is still persisted; the conflict array is returned to the client.

## Serializer Variants (COND-7)

```ts
type AppointmentRow = Prisma.AppointmentGetPayload<{ include: { serviceCode, location, participant, clinician } }>;

export function toClinicianView(a: AppointmentRow) {
  return {
    id: a.id,
    practiceId: a.practiceId,
    clinicianId: a.clinicianId,
    participantId: a.participantId,
    participant: { id: a.participant.id, firstName: ..., lastName: ..., email: ... },
    serviceCode: { id: a.serviceCode.id, code: a.serviceCode.code, description: a.serviceCode.description, defaultDurationMinutes: a.serviceCode.defaultDurationMinutes },
    location: { id: a.location.id, name: a.location.name, type: a.location.type },
    startAt: a.startAt.toISOString(),
    endAt: a.endAt.toISOString(),
    status: a.status,
    appointmentType: a.appointmentType,
    internalNote: a.internalNote,       // clinician-visible
    cancelReason: a.cancelReason,       // clinician-visible
    statusChangedAt: a.statusChangedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export function toParticipantView(a: AppointmentRow) {
  return {
    id: a.id,
    clinicianId: a.clinicianId,
    serviceCode: { code: a.serviceCode.code, description: a.serviceCode.description },
    location: { name: a.location.name, type: a.location.type },
    startAt: a.startAt.toISOString(),
    endAt: a.endAt.toISOString(),
    status: a.status,
    appointmentType: a.appointmentType,
    // internalNote  — STRIPPED (COND-7)
    // cancelReason  — STRIPPED
    // createdById, statusChangedAt, createdAt, updatedAt  — STRIPPED
  };
}
```

Sprint 19 only calls `toClinicianView`. `toParticipantView` exists and has a unit test asserting the stripped fields are absent. Future sprints will wire it up.

## Tenant Isolation Pattern (COND-1, COND-2)

1. JWT never contains `practiceId`. `requirePracticeCtx` middleware resolves it fresh per request from `PracticeMembership` via `clinicianProfileId`. This prevents JWT-based practice spoofing.
2. `ServiceCtx.practiceId` is the ONLY source of truth; route handlers never forward `req.body.practiceId` or `req.query.practiceId` — Zod schemas don't even declare those fields.
3. Every Prisma query in the three new services includes `where: { practiceId: ctx.practiceId }` as the first filter.
4. Cross-tenant access returns a uniform 404 (COND-2). The service layer returns a typed `NotFound` sentinel; routes never distinguish "doesn't exist" from "belongs to another practice". Same-tenant role violations return 403 (e.g., non-owner trying to create a Location).
5. Unit test helper `assertCrossTenant404(endpoint, method, setupFn)` will be added to `packages/api/src/__tests__/helpers.ts` and applied to every endpoint.

## Audit Logging Approach (COND-4, COND-5, COND-6)

- **Baseline coverage:** The existing Prisma audit middleware (in `@steady/db`) already captures all CREATE/UPDATE/DELETE on every model, including the new ones. No changes required to onboard `Appointment`, `Location`, `ServiceCode`, or the `Session.appointmentId` update.
- **Audit context:** Every request enters through `authenticate`, which calls `runWithAuditUser(userId, next)`. All downstream Prisma operations inherit this context via `AsyncLocalStorage`. Verification test: call a new endpoint with a valid token, assert the resulting audit row has `userId === jwt.userId`.
- **Field names only:** The middleware already writes `metadata.changedFields = [fieldNames]`. Spot test inserts an `internalNote` change and asserts `metadata` contains `['internalNote']`, never the text.
- **Status transition exception (value-level):** Handled in `changeStatus` by explicitly creating a second `AuditLog` row via `prisma.auditLog.create` with `metadata: { changedFields: ['status'], from, to }`. Both status values are enum strings (HIPAA-neutral). Two rows per status change is acceptable and will be documented in QA.
- **Participant search audit (COND-9):** Written explicitly by `searchParticipants` service: `prisma.auditLog.create({ data: { userId, action: 'READ' /* new action? */, resourceType: 'ParticipantSearch', metadata: { queryHash: sha256(q) } } })`. NOTE: `AuditAction` enum has no `READ` — store as `action: 'UPDATE', resourceType: 'ParticipantSearch'` with metadata tag `{ kind: 'search' }` to avoid schema change. Documented trade-off.

## Rate Limiting (COND-9)

Add a lightweight in-memory rate limiter keyed by `userId`: 30 requests / 60s rolling window, applied to `GET /api/participants/search` only. Implementation: a small middleware in `packages/api/src/middleware/rate-limit.ts` using a Map with timestamped buckets. Stateless-API caveat (CLAUDE.md) is acknowledged: for sprint 19 this is per-process and sufficient because the search endpoint is not a horizontal-scale bottleneck. Sprint 20+ will replace with Postgres-backed or Redis-backed rate limiting when other endpoints need the same protection. Documented risk.

## Testing Strategy

### API (`packages/api/src/__tests__/`)

- `appointments.test.ts` — Integration (supertest) against live test DB `steady_adhd_test`. ~45 tests covering every acceptance criterion and COND-1..COND-14.
- `locations.test.ts` — ~15 tests including account-owner gating.
- `service-codes.test.ts` — ~8 tests including seed idempotency and 405 on writes.
- `appointments.service.test.ts` — Unit tests for `detectConflicts`, `toClinicianView`, `toParticipantView`, hard-delete guard.
- `appointments-audit.test.ts` — Dedicated audit log assertions covering COND-4/5/6 including status-transition from/to row and PHI-free changedFields.
- `participants-search.test.ts` — COND-9: min length, rate limit, query-hash audit.
- `helpers.ts` — Add `mockAppointment(...)`, `mockLocation(...)`, `mockServiceCode(...)`, `assertCrossTenant404(...)`, `seedTwoPractices(...)`.

### Shared (`packages/shared/src/__tests__/`)

- `appointment.schema.test.ts` — Round-trip tests with realistic DB payloads, strip-unknown assertion, `endAt > startAt` refinement, GROUP rejection.
- `location.schema.test.ts`, `service-code.schema.test.ts` — Analogous.

### Web (`apps/web/src/__tests__/`)

- `Calendar.test.tsx`, `AppointmentModal.test.tsx`, `AppointmentStatusPopover.test.tsx`, `ClientSearchSelect.test.tsx` — React Testing Library critical flows.
- `useAppointments.test.ts` — TanStack Query hook with mocked fetch.

### Coverage targets
- `packages/api` and `packages/shared`: maintain >80% line coverage (CLAUDE.md NFR-5d).
- Every acceptance criterion has ≥1 test (NFR-5f). QA phase will produce the traceability matrix.

## Time Zone Handling (FR-17)

- **Storage:** Postgres `timestamptz` via Prisma `DateTime`. All writes are UTC.
- **API boundary:** Inbound `startAt`/`endAt` accepted as ISO 8601 strings with offset or `Z`. Zod `.datetime()` validates. Service passes to Prisma which stores UTC.
- **Outbound:** `toISOString()` in serializers produces UTC `...Z`.
- **UI rendering:** Web components use `date-fns-tz` (already a transitive dep via recharts? verify — if not, add `date-fns-tz` ~20kb) to convert UTC → `ClinicianProfile.timezone` for display. Default fallback `America/New_York`.

**New dependency decision:** add `date-fns-tz` to `apps/web` only if not already present. Architect-approved.

## Compliance Controls Traceability

| Condition | Implementation |
|-----------|---------------|
| **COND-1** Tenant isolation at service layer | `ServiceCtx.practiceId` parameter on every service function; resolved by `requirePracticeCtx` middleware from `PracticeMembership`; never from request body/query. Integration test per endpoint. |
| **COND-2** Cross-tenant 404 (not 403) | Services return `NotFound` sentinel for cross-practice lookups; routes map to 404. 403 reserved for same-tenant role failures (e.g., non-owner creating Location). |
| **COND-3** Auth required on every new endpoint | All 11+2 new routes mount `authenticate` + `requireRole('CLINICIAN','ADMIN')`. `router.use(authenticate)` at file top + `requireRole` per handler. Integration test asserts 401/403 for each. |
| **COND-4** Audit coverage on every mutation | Existing Prisma audit middleware (global) covers CREATE/UPDATE/DELETE on new models automatically. Dedicated `appointments-audit.test.ts` asserts row per op. Status transitions add a second explicit audit row. |
| **COND-5** Audit log PHI-free | Middleware writes `metadata.changedFields` as field-name strings only. Test inspects audit rows after `internalNote` update and asserts the text is absent. |
| **COND-6** Audit context propagation | `authenticate` wraps `next()` in `runWithAuditUser(userId, ...)` (already in place). All service Prisma calls inherit via AsyncLocalStorage. Test: unauthenticated request → 0 audit rows. |
| **COND-7** `internalNote`/`cancelReason` never exposed to participants | Dual-serializer `toClinicianView` / `toParticipantView`. Participant view strips the fields. Unit test asserts absence. Sprint 19 only calls clinician view, but the participant serializer is present + tested for future-proofing. |
| **COND-8** Logs contain no PHI body content | All route handlers use `logger.error("<op name>", err)` and `logger.info("<op name>", { id })` — never pass `req.body` / full Prisma results. Smoke test invokes endpoint with known-PHI payload and greps test-log output for zero matches. |
| **COND-9** Participant search rate-limit + min length + hashed audit | New `rate-limit.ts` middleware (30/min per user) applied to `/api/participants/search`. Zod schema rejects `q.length < 2`. Service writes audit with `metadata.queryHash = sha256(q)`, never plaintext. Three integration tests. |
| **COND-10** Server-only timestamps | Zod `UpdateAppointmentSchema` omits `statusChangedAt`, `createdAt`, `updatedAt`, `createdById`, `practiceId`, `clinicianId`, `participantId`. `.parse()` strips them from body. Service sets `statusChangedAt = new Date()` inside `changeStatus`. Test: PATCH with a bogus `statusChangedAt` — DB value is server-side now. |
| **COND-11** Hard delete guards | `deleteAppointment` enforces status=SCHEDULED, age <24h, ownership, no linked Session. Four integration tests (one per rejection path) + happy path with audit assertion. |
| **COND-12** Session FK integrity | Migration declares `onDelete: SetNull` on `Session.appointmentId`. Integration test creates appointment → links session → deletes appointment → asserts session.appointmentId is null. |
| **COND-13** Zod strict parsing | `validate` middleware calls `schema.parse()`. Default strip behavior. Test asserts extra fields are silently dropped, not reaching Prisma. |
| **COND-14** 62-day date range cap | `ListAppointmentsQuerySchema.superRefine()` validates. Integration test asserts 400 at 63 days. |

## Technology Choices

| Decision | Choice | Rationale | Alternatives |
|---|---|---|---|
| Calendar rendering | Hand-rolled components using Tailwind grid + `date-fns` | No heavy calendar library needed for sprint 19 views; full control over accessibility + status colors. Matches existing Steady UI style. | `react-big-calendar` (500kb, styling override pain), `@fullcalendar/react` (commercial-ish, heavy), `@tanstack/react-calendar` (not mature) |
| Time zone lib | `date-fns-tz` | Small, functional, already in the date-fns family likely on the web side | `luxon` (larger, different API), `moment-timezone` (deprecated) |
| Conflict detection | SQL overlap query at service layer | Leverages index `(practiceId, clinicianId, startAt)`; single round-trip; correct semantics | Client-side detection (broken if multiple tabs), trigger-based (added complexity) |
| Rate limiting | In-memory Map (sprint 19 only, search endpoint) | Zero new deps, sufficient for single endpoint | Redis (new infra), pg-based (slower, ok for sprint 20+) |
| Seed strategy | Node script run from `docker-entrypoint.sh` after `prisma db push`, idempotent per practice | Fits existing deploy flow; safe to re-run | Prisma seed file (runs once), SQL seed (harder idempotency) |
| Audit enrichment for status transitions | Extra explicit `auditLog.create` row in service | No global middleware change; low blast radius | Modify audit middleware (risky, cross-cutting) |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| In-memory rate limiter is per-process; horizontally scaled API evades cap | Medium (mitigating COND-9) | Documented; acceptable for sprint 19 because only one endpoint. Sprint 20+ migrates to Postgres-backed rate limiting. |
| Existing `ParticipantProfile` queries implicitly assume `enrollments.length > 0` | Medium (FR-10 regression) | Engineering phase includes a `grep`-based audit of all participant query sites + fix list. QA has targeted tests for un-enrolled participant flows. |
| Audit middleware writes changedFields including server-set fields (e.g., `updatedAt`), creating noise | Low | Middleware already excludes `updatedAt` / `createdAt` from changedFields. Confirmed in existing tests. |
| Time zone display drift between web (`ClinicianProfile.timezone`) and DB (UTC) | Low | Single source of truth = UTC in DB. All conversions in a single utility `apps/web/src/lib/tz.ts`. Test conversions round-trip. |
| Seed script runs on every deploy, minor startup latency per practice | Low | Idempotent `findFirst` pre-check short-circuits in O(1). Measured in migration test. |
| Two audit rows per status change could confuse auditors | Low | QA sign-off documents the two-row pattern; compliance review approved. |
| `GET /api/appointments` cursor + date-range overlap may produce unstable ordering on equal `startAt` | Low | Order by `[startAt asc, id asc]` — deterministic tiebreaker. |
| `conflicts` array could leak cross-practice appointment IDs if a bug breaks tenant filter | High if triggered | `detectConflicts` explicitly filters by `ctx.practiceId`. Dedicated test seeds two practices with overlapping times and asserts zero cross-tenant conflict IDs. |

## File Structure

### New files
```
packages/db/prisma/migrations/20260405_appointments_sprint19/
  └── migration.sql
packages/db/src/seeds/
  └── appointments-seed.ts                 # runs per-practice, idempotent

packages/shared/src/schemas/
  ├── appointment.ts                        # NEW
  ├── location.ts                           # NEW
  └── service-code.ts                       # NEW

packages/api/src/lib/
  └── practice-context.ts                   # requirePracticeCtx middleware + ServiceCtx type
packages/api/src/middleware/
  └── rate-limit.ts                         # in-memory limiter (COND-9)
packages/api/src/services/
  ├── appointments.ts                       # NEW
  ├── locations.ts                          # NEW
  └── service-codes.ts                      # NEW
packages/api/src/routes/
  ├── appointments.ts                       # NEW (11 routes)
  ├── locations.ts                          # NEW (5 routes)
  └── service-codes.ts                      # NEW (1 route + 405 guards)
packages/api/src/__tests__/
  ├── appointments.test.ts                  # NEW (integration)
  ├── appointments.service.test.ts          # NEW (unit)
  ├── appointments-audit.test.ts            # NEW (COND-4/5/6)
  ├── locations.test.ts                     # NEW
  ├── service-codes.test.ts                 # NEW
  └── participants-search.test.ts           # NEW (COND-9)

packages/shared/src/__tests__/
  ├── appointment.schema.test.ts            # NEW
  ├── location.schema.test.ts               # NEW
  └── service-code.schema.test.ts           # NEW

apps/web/src/app/(dashboard)/appointments/
  ├── page.tsx                              # NEW — calendar entry
  └── layout.tsx                            # NEW — if needed
apps/web/src/components/appointments/
  ├── Calendar.tsx
  ├── CalendarDayView.tsx
  ├── CalendarWeekView.tsx
  ├── CalendarMonthView.tsx
  ├── AppointmentCard.tsx
  ├── AppointmentModal.tsx
  ├── AppointmentStatusPopover.tsx
  ├── CalendarFilters.tsx
  ├── ClientSearchSelect.tsx
  ├── ServiceCodeSelect.tsx
  └── LocationSelect.tsx
apps/web/src/hooks/appointments/
  ├── useAppointments.ts
  ├── useAppointment.ts
  ├── useCreateAppointment.ts
  ├── useUpdateAppointment.ts
  ├── useChangeAppointmentStatus.ts
  ├── useDeleteAppointment.ts
  ├── useLocations.ts
  ├── useServiceCodes.ts
  └── useParticipantSearch.ts
apps/web/src/lib/
  ├── tz.ts                                 # time-zone conversion helpers
  └── strings/appointments.ts               # i18n-ready strings (NFR-8a)
apps/web/src/__tests__/appointments/
  ├── Calendar.test.tsx
  ├── AppointmentModal.test.tsx
  ├── AppointmentStatusPopover.test.tsx
  └── ClientSearchSelect.test.tsx
```

### Modified files
```
packages/db/prisma/schema.prisma            # add enums + 3 models + Session.appointmentId + indexes
packages/shared/src/schemas/index.ts        # re-export new schemas
packages/api/src/index.ts (or app.ts)       # mount new routers
packages/api/src/routes/participant.ts      # add search + create-without-enrollment endpoints (or new participants.ts)
packages/api/src/__tests__/helpers.ts       # new mock helpers + assertCrossTenant404
apps/web/src/components/layout/Sidebar.tsx  # add "Calendar" nav item between Participants and Sessions
docker-entrypoint.sh                        # invoke seed script after prisma db push
```

### Files possibly touched (FR-10 audit)
Any file in `packages/api/src/` that dereferences `participantProfile.enrollments[0]` without a null check. Engineering phase will produce the exact list via `grep -n "enrollments\[0\]\|enrollments\.length" packages/api/src/`.
