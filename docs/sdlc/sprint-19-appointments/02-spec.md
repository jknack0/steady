# Sprint 19: Appointment Entity + Clinician Calendar — Feature Specification

## Overview

Introduces the first clinician-facing scheduling primitive in Steady. Clinicians can create, view, edit, and manage single appointments on a day/week/month calendar UI. Appointments carry a service code, location, client reference, status lifecycle, and internal clinician notes. This spec is the foundation for Sprint 20+ (availability, reminders, telehealth, claims, notes-per-appointment).

## Glossary

| Term | Definition |
|---|---|
| **Appointment** | A scheduled clinical engagement between a clinician and one or two clients at a specific time and location. New top-level entity. |
| **Client** | A `ParticipantProfile` viewed in a non-program context. Not a new entity — `ParticipantProfile` with `enrollmentId` nullable. |
| **Location** | A physical or virtual place where appointments occur. Practice-owned. New entity. |
| **Service Code** | A CPT-like code describing the clinical service delivered. Practice-owned, seeded. New entity. |
| **Session** | Existing model — clinical note container. Gains an optional `appointmentId` FK. |

---

## User Stories

| ID | Story |
|---|---|
| US-1 | As a **solo clinician**, I want to **schedule an appointment with a client from a calendar view** so I can **manage my day without switching tools**. |
| US-2 | As a **clinician**, I want to **see my full week at a glance** so I can **plan ahead**. |
| US-3 | As a **clinician**, I want to **mark an appointment as attended / no-show / canceled after it occurs** so I can **track completion accurately for billing and reporting**. |
| US-4 | As a **clinician**, I want to **schedule appointments with clients who aren't enrolled in a Steady program** so I can **use Steady as my full practice-management tool**. |
| US-5 | As a **clinician with multiple locations**, I want to **assign a location to each appointment and filter the calendar by location** so I can **see just the days I'm working from a specific office**. |
| US-6 | As a **clinician**, I want to **add a short internal note to an appointment** ("bring insurance card") so I can **remember context without cluttering clinical notes**. |
| US-7 | As an **account owner of a group practice**, I want to **view the combined calendar of all clinicians in my practice** so I can **oversee scheduling**. |
| US-8 | As a **clinician**, I want the **system to warn me if I'm about to create an overlapping appointment** so I can **double-check before confirming** — but still let me proceed when I want to double-book intentionally. |

---

## Functional Requirements

### FR-1: Appointment creation

Clinicians can create single appointments.

**Acceptance Criteria:**
- **GIVEN** an authenticated clinician and a valid client, service code, location, start/end time
  **WHEN** the clinician submits a create request
  **THEN** a new `Appointment` is persisted with status `SCHEDULED` and returned
- **GIVEN** a create request missing any required field (`clinicianId`, `participantId`, `serviceCodeId`, `locationId`, `startAt`, `endAt`)
  **WHEN** submitted
  **THEN** the API responds `400 Bad Request` with Zod validation errors
- **GIVEN** a create request where `endAt <= startAt`
  **WHEN** submitted
  **THEN** the API responds `400 Bad Request` with message "endAt must be after startAt"
- **GIVEN** a create request referencing a `serviceCodeId` owned by a different practice
  **WHEN** submitted
  **THEN** the API responds `404 Not Found`
- **GIVEN** a create request referencing a `locationId` owned by a different practice
  **WHEN** submitted
  **THEN** the API responds `404 Not Found`
- **GIVEN** a create request referencing a `participantId` not belonging to any practice the clinician is a member of
  **WHEN** submitted
  **THEN** the API responds `404 Not Found`
- **GIVEN** a valid create request
  **WHEN** the appointment is created
  **THEN** an audit log entry is written with action `CREATE`, resource `Appointment`, userId = clinician
- **GIVEN** a create request with no `appointmentType` specified
  **WHEN** submitted
  **THEN** the appointment defaults to type `INDIVIDUAL`
- **GIVEN** a create request with `appointmentType = GROUP`
  **WHEN** submitted
  **THEN** the API responds `400 Bad Request` with message "Group appointments are not yet supported"

### FR-2: Appointment retrieval

Clinicians can fetch a single appointment by ID.

**Acceptance Criteria:**
- **GIVEN** an authenticated clinician who owns an appointment
  **WHEN** they `GET /api/appointments/:id`
  **THEN** the full appointment object is returned, including the denormalized service code, location, participant, and clinician
- **GIVEN** a clinician who does NOT own the appointment and does NOT have practice-wide access
  **WHEN** they `GET /api/appointments/:id`
  **THEN** the API responds `404 Not Found`
- **GIVEN** an appointment ID that does not exist
  **WHEN** a clinician requests it
  **THEN** the API responds `404 Not Found`
- **GIVEN** an account owner of a practice
  **WHEN** they request any appointment within their practice
  **THEN** the appointment is returned (practice-wide visibility)

### FR-3: Appointment listing (calendar query)

Clinicians can query appointments in a date range, with filters.

**Acceptance Criteria:**
- **GIVEN** a clinician with appointments
  **WHEN** they `GET /api/appointments?startAt=<iso>&endAt=<iso>`
  **THEN** only appointments overlapping the range are returned, ordered by `startAt` ascending
- **GIVEN** more than 100 appointments match the query
  **WHEN** the clinician requests without a cursor
  **THEN** the first 100 are returned with a `nextCursor` field
- **GIVEN** a query with `cursor=<id>`
  **WHEN** submitted
  **THEN** the next page of up to 100 is returned
- **GIVEN** a query without `startAt`/`endAt`
  **WHEN** submitted
  **THEN** the API responds `400 Bad Request` — date range is required
- **GIVEN** a query with a date range spanning more than 62 days
  **WHEN** submitted
  **THEN** the API responds `400 Bad Request` with message "Date range cannot exceed 62 days"
- **GIVEN** a query with `locationId=<id>`
  **WHEN** submitted
  **THEN** only appointments at that location are returned
- **GIVEN** a query with `status=SCHEDULED,ATTENDED`
  **WHEN** submitted
  **THEN** only matching-status appointments are returned
- **GIVEN** a query with `clinicianId=<other>` by a non-account-owner
  **WHEN** submitted
  **THEN** the API responds `404 Not Found`
- **GIVEN** a query with `clinicianId=<other>` by a practice account owner
  **WHEN** submitted
  **THEN** the other clinician's matching appointments are returned

### FR-4: Appointment editing

Clinicians can edit an appointment they own (mutable fields only).

**Acceptance Criteria:**
- **GIVEN** an existing appointment owned by the clinician
  **WHEN** they `PATCH /api/appointments/:id` with any subset of: `startAt`, `endAt`, `serviceCodeId`, `locationId`, `internalNote`, `appointmentType`
  **THEN** the fields update and the response returns the updated appointment
- **GIVEN** a PATCH request attempting to change `participantId` or `practiceId` or `clinicianId`
  **WHEN** submitted
  **THEN** those fields are ignored (stripped by Zod) and the rest of the update proceeds
- **GIVEN** a PATCH that would move `endAt` before `startAt`
  **WHEN** submitted
  **THEN** the API responds `400 Bad Request`
- **GIVEN** a clinician who does not own the appointment and is not an account owner
  **WHEN** they PATCH
  **THEN** the API responds `404 Not Found`
- **GIVEN** a PATCH to an appointment in a terminal status (ATTENDED, CLIENT_CANCELED, NO_SHOW, LATE_CANCELED, CLINICIAN_CANCELED)
  **WHEN** the field changes are non-time (`internalNote` only)
  **THEN** the update succeeds
- **GIVEN** a PATCH to an appointment in a terminal status
  **WHEN** the field changes include `startAt`, `endAt`, `serviceCodeId`, or `locationId`
  **THEN** the API responds `409 Conflict` with message "Cannot modify scheduling fields of a completed appointment"
- **GIVEN** a successful PATCH
  **WHEN** the update is committed
  **THEN** an audit log entry is written with action `UPDATE`, resource `Appointment`, changed field names (not values)

### FR-5: Appointment status transitions

Clinicians can transition an appointment through its status lifecycle.

**Status enum:** `SCHEDULED`, `ATTENDED`, `NO_SHOW`, `LATE_CANCELED`, `CLIENT_CANCELED`, `CLINICIAN_CANCELED`

**Acceptance Criteria:**
- **GIVEN** an appointment with status `SCHEDULED`
  **WHEN** a clinician `POST /api/appointments/:id/status` with `{ status: 'ATTENDED' }`
  **THEN** the status updates to `ATTENDED`, `statusChangedAt` is set to now, and an audit log entry is written
- **GIVEN** all six statuses, any transition between them is ALLOWED
  **WHEN** a clinician changes status
  **THEN** the change is accepted (mistakes happen — allow correction; audit captures the trail)
- **GIVEN** a status change request with an invalid status value
  **WHEN** submitted
  **THEN** the API responds `400 Bad Request`
- **GIVEN** a cancellation status change (`LATE_CANCELED`, `CLIENT_CANCELED`, `CLINICIAN_CANCELED`)
  **WHEN** the request includes an optional `cancelReason` string (max 500 chars)
  **THEN** the reason is persisted on the appointment
- **GIVEN** a status change to ATTENDED
  **WHEN** the appointment's `startAt` is in the future
  **THEN** the request succeeds (clinician may be pre-marking or correcting data; audit captures)

### FR-6: Appointment deletion (hard delete)

Clinicians can hard-delete an appointment they own only if it is in `SCHEDULED` status and was created in the last 24 hours. Deletion is for mistakes; cancellation is for everything else.

**Acceptance Criteria:**
- **GIVEN** an appointment in `SCHEDULED` status created within the last 24 hours and owned by the clinician
  **WHEN** they `DELETE /api/appointments/:id`
  **THEN** the appointment is removed from the database and an audit log entry is written with action `DELETE`
- **GIVEN** an appointment in any non-`SCHEDULED` status
  **WHEN** deletion is requested
  **THEN** the API responds `409 Conflict` with message "Cannot delete a completed or canceled appointment — use cancellation instead"
- **GIVEN** an appointment created more than 24 hours ago
  **WHEN** deletion is requested
  **THEN** the API responds `409 Conflict` with message "Cannot delete an appointment older than 24 hours — cancel it instead"
- **GIVEN** a clinician who does not own the appointment
  **WHEN** deletion is requested
  **THEN** the API responds `404 Not Found`

### FR-7: Conflict detection (warn-only)

The system detects overlapping appointments but does not block creation.

**Acceptance Criteria:**
- **GIVEN** a clinician creating or editing an appointment
  **WHEN** the time range overlaps with an existing non-canceled appointment for the same clinician
  **THEN** the response includes a `conflicts: [appointmentId, ...]` array alongside the saved appointment
- **GIVEN** no conflicts
  **WHEN** an appointment is created or updated
  **THEN** the response includes `conflicts: []`
- **GIVEN** the UI receives a response with non-empty `conflicts`
  **WHEN** rendering
  **THEN** a warning banner is displayed on the appointment card listing the conflict count
- **GIVEN** a conflict detection check
  **WHEN** the existing appointment has status `CLIENT_CANCELED`, `CLINICIAN_CANCELED`, `LATE_CANCELED`, or `NO_SHOW`
  **THEN** it does NOT count as a conflict (canceled slots are free)

### FR-8: Location management

Practices manage their own locations.

**Acceptance Criteria:**
- **GIVEN** a new practice
  **WHEN** it is first accessed for appointment scheduling
  **THEN** two default locations are auto-seeded: `"Main Office"` (IN_PERSON) and `"Telehealth"` (VIRTUAL), both marked `isDefault: true` for their type
- **GIVEN** an account owner
  **WHEN** they `POST /api/locations` with `{ name, type, address?, timezone? }`
  **THEN** a new location is created for their practice
- **GIVEN** an account owner
  **WHEN** they `PATCH /api/locations/:id`
  **THEN** the location updates
- **GIVEN** an account owner
  **WHEN** they `DELETE /api/locations/:id` and no non-canceled appointments reference it
  **THEN** the location is soft-deleted (`isActive: false`)
- **GIVEN** a location with referencing non-canceled appointments
  **WHEN** deletion is requested
  **THEN** the API responds `409 Conflict`
- **GIVEN** any clinician in a practice
  **WHEN** they `GET /api/locations`
  **THEN** all active locations for their practice are returned
- **GIVEN** a non-account-owner clinician
  **WHEN** they attempt to create, update, or delete a location
  **THEN** the API responds `403 Forbidden`

### FR-9: Service code library

Practices have a read-only service code library seeded with defaults.

**Acceptance Criteria:**
- **GIVEN** a new practice
  **WHEN** it is first accessed for appointment scheduling
  **THEN** 15 default service codes are seeded (see Service Code Seed List)
- **GIVEN** any clinician
  **WHEN** they `GET /api/service-codes`
  **THEN** all active service codes for their practice are returned, ordered by code ascending
- **GIVEN** any clinician
  **WHEN** they `POST`, `PATCH`, or `DELETE` a service code
  **THEN** the API responds `405 Method Not Allowed` with message "Service code editing is not yet available"
- **GIVEN** a service code with `isActive: false`
  **WHEN** a clinician lists service codes
  **THEN** the inactive code is NOT returned
- **GIVEN** a clinician creating an appointment
  **WHEN** they reference an inactive service code
  **THEN** the API responds `400 Bad Request` with message "Service code is not active"

### FR-10: Participant profile enrollment decoupling

`ParticipantProfile` can exist without a program `Enrollment`.

**Acceptance Criteria:**
- **GIVEN** an existing `ParticipantProfile` without any `Enrollment` records
  **WHEN** a clinician attempts to schedule an appointment with them
  **THEN** the appointment is created successfully
- **GIVEN** a new clinician-initiated client creation flow (via a new "Add Client" button on the calendar)
  **WHEN** the clinician submits client name + email
  **THEN** a `ParticipantProfile` is created without any `Enrollment` record
- **GIVEN** existing tests and code paths that assumed `enrollment` was non-null
  **WHEN** those code paths execute against an un-enrolled profile
  **THEN** they must handle `null`/empty `enrollments` array gracefully (scope: audit existing code for implicit assumptions; fix any found)

### FR-11: Session–Appointment linkage

The existing `Session` model gains an optional `appointmentId` foreign key.

**Acceptance Criteria:**
- **GIVEN** a migration is applied
  **WHEN** the schema is deployed
  **THEN** `Session` has a new nullable column `appointmentId` with an index and FK constraint to `Appointment(id)` with `onDelete: SetNull`
- **GIVEN** existing `Session` records
  **WHEN** the migration runs
  **THEN** all existing rows have `appointmentId = NULL` (no backfill)
- **GIVEN** an appointment is deleted
  **WHEN** the delete is committed
  **THEN** any `Session.appointmentId` pointing to it is set to `NULL`
- **Sprint 19 scope:** the FK column is added, but no new UI or API actively reads/writes it. Sprint 25 will build the "create Session from Appointment" flow.

### FR-12: Internal note field

Each appointment has an optional short internal note.

**Acceptance Criteria:**
- **GIVEN** an appointment create or edit request
  **WHEN** it includes `internalNote: "bring insurance card"` (max 500 chars)
  **THEN** the note is persisted on the appointment
- **GIVEN** a request with `internalNote` longer than 500 chars
  **WHEN** submitted
  **THEN** the API responds `400 Bad Request` with Zod validation error
- **GIVEN** an appointment with an internal note
  **WHEN** a participant (client) requests any view of it
  **THEN** the internal note is NOT exposed to the participant (clinician-only)
- **GIVEN** the clinician calendar UI
  **WHEN** an appointment card is rendered
  **THEN** the internal note is displayed if present (small text, clipped to 80 chars with a "…" overflow)

### FR-13: Clinician calendar UI — day/week/month views

The web app exposes a new `/appointments` route with three view modes.

**Acceptance Criteria:**
- **GIVEN** a clinician on the calendar page
  **WHEN** the page loads
  **THEN** it defaults to the week view for the current week, showing all their appointments
- **GIVEN** the calendar page
  **WHEN** the clinician toggles to the day view
  **THEN** a single-day timeline is shown with hour gridlines from 6am to 10pm
- **GIVEN** the calendar page
  **WHEN** the clinician toggles to the month view
  **THEN** a grid of the current month is shown with appointment dots/counts per day
- **GIVEN** any view
  **WHEN** the clinician clicks "Previous" / "Next" / "Today"
  **THEN** the view updates to the new date range
- **GIVEN** the day or week view
  **WHEN** the clinician clicks an empty time slot
  **THEN** the create-appointment modal opens with `startAt` pre-filled to the clicked time and `endAt` defaulted to `startAt + serviceCode.defaultDuration`
- **GIVEN** the day or week view
  **WHEN** the clinician clicks an existing appointment card
  **THEN** the edit-appointment modal opens
- **GIVEN** any view
  **WHEN** an appointment card is rendered
  **THEN** it displays: client name, service code, location, start–end time, status (color-coded), internal note preview (if any), conflict warning (if any)
- **GIVEN** the calendar page
  **WHEN** the clinician has no appointments in the current range
  **THEN** an empty state is shown with a "Schedule your first appointment" CTA

### FR-14: Calendar filters

**Acceptance Criteria:**
- **GIVEN** the calendar page
  **WHEN** the clinician opens the filter dropdown
  **THEN** they can filter by location (multi-select) and status (multi-select)
- **GIVEN** a practice account owner
  **WHEN** they view the calendar
  **THEN** they additionally see a "Clinician" multi-select filter defaulting to their own appointments
- **GIVEN** filters are applied
  **WHEN** the URL changes
  **THEN** filters are encoded in query params so the view is shareable/bookmarkable
- **GIVEN** active filters
  **WHEN** the clinician clicks "Clear filters"
  **THEN** all filters are removed and the calendar refreshes

### FR-15: Create/Edit appointment modal

**Acceptance Criteria:**
- **GIVEN** the create modal
  **WHEN** it opens
  **THEN** it shows fields: Client (searchable dropdown), Service Code (dropdown), Location (dropdown), Start date + time, End date + time (auto-derived from service code default duration, editable), Appointment type (INDIVIDUAL / COUPLE), Internal note (textarea, 500 char limit with counter)
- **GIVEN** the client dropdown
  **WHEN** the clinician types
  **THEN** it searches `ParticipantProfile` by name/email, returns up to 20 matches, and includes an "Add new client" option at the bottom
- **GIVEN** the clinician clicks "Add new client"
  **WHEN** the inline creation flow opens
  **THEN** they can enter name + email, submit, and the new client is auto-selected in the modal
- **GIVEN** the edit modal
  **WHEN** it opens for an existing appointment
  **THEN** all fields are pre-filled and the Client field is displayed read-only
- **GIVEN** the edit modal for a completed/canceled appointment
  **WHEN** it opens
  **THEN** only the `internalNote` field is editable; all others are read-only with a banner
- **GIVEN** the modal is open and dirty
  **WHEN** the clinician closes without saving
  **THEN** a confirm dialog asks "Discard changes?"
- **GIVEN** a save action that triggers a conflict warning
  **WHEN** the response returns `conflicts: [...]`
  **THEN** a yellow banner appears in the modal listing the conflicting appointment(s); the appointment is still saved

### FR-16: Status change quick actions

**Acceptance Criteria:**
- **GIVEN** an appointment card in any view
  **WHEN** the clinician clicks the status badge or a "⋯" menu on the card
  **THEN** a popover shows all six status options; clicking one calls the status-change endpoint and updates the UI optimistically
- **GIVEN** a cancellation status selection
  **WHEN** the popover shows it
  **THEN** a small text input appears for optional `cancelReason`
- **GIVEN** a status change succeeds
  **WHEN** the UI updates
  **THEN** the card color updates to match the new status and a toast notification confirms the change
- **GIVEN** a status change fails
  **WHEN** the API returns an error
  **THEN** the optimistic update is rolled back and an error toast is shown

### FR-17: Time zone handling

**Acceptance Criteria:**
- **GIVEN** an appointment create request with `startAt` and `endAt` as ISO 8601 strings with timezone info
  **WHEN** persisted
  **THEN** Prisma stores them as UTC (Postgres `timestamptz`)
- **GIVEN** an API response
  **WHEN** returning appointment times
  **THEN** values are ISO 8601 strings in UTC (`...Z`)
- **GIVEN** the clinician calendar UI
  **WHEN** rendering times
  **THEN** times are displayed in the clinician's configured time zone (from `ClinicianProfile.timezone`, defaulting to `America/New_York` if unset)

### FR-18: Audit logging

All mutations are audit-logged via existing middleware.

**Acceptance Criteria:**
- **GIVEN** any CREATE, UPDATE, or DELETE on Appointment, Location, or ServiceCode
  **WHEN** the transaction commits
  **THEN** an `AuditLog` row is written via the existing Prisma audit middleware with: `userId`, `action`, `resourceType`, `resourceId`, `changedFields` (names only, never values)
- **GIVEN** a status transition
  **WHEN** it succeeds
  **THEN** the audit log records `UPDATE` with `changedFields: ['status']` plus a metadata entry `{ from: 'SCHEDULED', to: 'ATTENDED' }` (status transitions are the one exception where value-level metadata IS logged, because the from/to pair is non-PII and high-value for auditability)
- **GIVEN** the existing audit middleware requires `runWithAuditUser(userId, fn)` context
  **WHEN** appointment routes are implemented
  **THEN** they run within the existing `authenticate` middleware that already sets audit context

---

## Permissions & Multi-tenancy

| Actor | Can do |
|---|---|
| **Unauthenticated user** | Nothing |
| **Participant role** | Nothing (sprint 19 has no participant-facing appointment UI) |
| **Clinician (standard)** | Full CRUD on own appointments; read service codes and locations of their practice |
| **Clinician (account owner)** | All of above + CRUD on locations + read appointments for all clinicians in their practice |
| **Admin role** | Same as account owner for now (sprint 19 doesn't differentiate) |

**Tenant isolation rules:**
- Every query MUST filter by the clinician's practice membership
- Service code lookups MUST verify `serviceCode.practiceId === clinician.practiceId`
- Location lookups MUST verify `location.practiceId === clinician.practiceId`
- Participant references MUST verify the participant is in a practice the clinician is a member of
- Cross-practice access returns `404 Not Found` (no existence leakage)
- Same-tenant permission failures return `403 Forbidden`
- Zod validates all inputs; no raw request bodies hit Prisma

---

## Data Model Requirements (high-level, Architect will finalize)

### New model: `Appointment`

| Field | Type | Notes |
|---|---|---|
| `id` | String @id @default(cuid()) | |
| `practiceId` | String | FK → Practice, indexed |
| `clinicianId` | String | FK → ClinicianProfile, indexed |
| `participantId` | String | FK → ParticipantProfile, indexed |
| `serviceCodeId` | String | FK → ServiceCode |
| `locationId` | String | FK → Location |
| `startAt` | DateTime | UTC, indexed |
| `endAt` | DateTime | UTC |
| `status` | AppointmentStatus enum | default: SCHEDULED, indexed |
| `appointmentType` | AppointmentType enum | default: INDIVIDUAL |
| `internalNote` | String? | max 500 chars |
| `cancelReason` | String? | max 500 chars |
| `statusChangedAt` | DateTime? | updated on every status transition |
| `createdById` | String | FK → User (who created it) |
| `createdAt` | DateTime | @default(now()) |
| `updatedAt` | DateTime | @updatedAt |

**Composite indexes:**
- `(practiceId, clinicianId, startAt)` — for calendar queries
- `(practiceId, locationId, startAt)` — for location-filtered queries

**Enums:**
```
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
  GROUP  // reserved, not supported in sprint 19
}
```

### New model: `Location`

| Field | Type | Notes |
|---|---|---|
| `id` | String @id @default(cuid()) | |
| `practiceId` | String | FK → Practice, indexed |
| `name` | String | max 200 chars |
| `type` | LocationType enum | IN_PERSON or VIRTUAL |
| `addressLine1` | String? | max 200 chars |
| `addressLine2` | String? | max 200 chars |
| `city` | String? | max 100 chars |
| `state` | String? | max 50 chars |
| `postalCode` | String? | max 20 chars |
| `timezone` | String? | IANA TZ string |
| `isDefault` | Boolean | default: false |
| `isActive` | Boolean | default: true |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

### New model: `ServiceCode`

| Field | Type | Notes |
|---|---|---|
| `id` | String @id @default(cuid()) | |
| `practiceId` | String | FK → Practice, indexed |
| `code` | String | e.g., "90834", max 20 chars |
| `description` | String | e.g., "Psychotherapy, 45 min", max 200 chars |
| `defaultDurationMinutes` | Int | e.g., 45 |
| `defaultPriceCents` | Int? | e.g., 15000 = $150.00 |
| `isActive` | Boolean | default: true |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Unique constraint:** `(practiceId, code)` — a practice cannot have two service codes with the same CPT code

### Modification: `Session`

Add nullable field:
```
appointmentId  String?  @index
appointment    Appointment? @relation(fields: [appointmentId], references: [id], onDelete: SetNull)
```

### Modification: `ParticipantProfile`

No schema change. Enforce at application layer that a `ParticipantProfile` can exist without any `Enrollment` records. Audit existing queries that assume enrollment is present.

### Service Code Seed List

```
90791 | Psychiatric Diagnostic Evaluation          | 60 min | $200
90832 | Psychotherapy, 30 min                       | 30 min | $100
90834 | Psychotherapy, 45 min                       | 45 min | $140
90837 | Psychotherapy, 60 min                       | 60 min | $180
90846 | Family Psychotherapy w/o patient, 50 min    | 50 min | $160
90847 | Family Psychotherapy w/ patient, 50 min     | 50 min | $170
90853 | Group Psychotherapy                         | 60 min | $80
90839 | Psychotherapy for crisis, first 60 min      | 60 min | $220
90840 | Psychotherapy for crisis, each add'l 30 min | 30 min | $110
96127 | Brief emotional/behavioral assessment       | 10 min | $15
96136 | Psychological test administration, 30 min   | 30 min | $100
96138 | Psychological test administration, 30 min (tech) | 30 min | $70
99354 | Prolonged service, first hour               | 60 min | $150
99355 | Prolonged service, each add'l 30 min        | 30 min | $75
90785 | Interactive complexity add-on               |  0 min | $25
```

---

## API Surface

All endpoints live under `/api` and require JWT auth + CLINICIAN or ADMIN role.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/appointments` | Create appointment |
| GET | `/api/appointments` | List appointments (cursor-paginated, range-required) |
| GET | `/api/appointments/:id` | Get single appointment |
| PATCH | `/api/appointments/:id` | Update appointment |
| POST | `/api/appointments/:id/status` | Change status |
| DELETE | `/api/appointments/:id` | Hard-delete (24h window, SCHEDULED only) |
| GET | `/api/locations` | List practice locations |
| POST | `/api/locations` | Create location (account owner only) |
| PATCH | `/api/locations/:id` | Update location (account owner only) |
| DELETE | `/api/locations/:id` | Soft-delete location (account owner only) |
| GET | `/api/service-codes` | List practice service codes |

**Response shape:**
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "message" }
```

**List response shape:**
```json
{
  "success": true,
  "data": [...],
  "cursor": "cuid-of-last-item" | null
}
```

**Create/update appointment response includes conflicts:**
```json
{
  "success": true,
  "data": { "appointment": { ... }, "conflicts": ["id1", "id2"] }
}
```

---

## UI Requirements (Next.js 16 web app)

### Pages

- **New route:** `/appointments` (dashboard group) — the clinician calendar
- Sidebar nav item "Calendar" between "Participants" and "Sessions"

### Components (new)

| Component | Purpose |
|---|---|
| `<Calendar />` | Top-level container with view toggle, nav, filters |
| `<CalendarDayView />` | Day timeline with hour gridlines |
| `<CalendarWeekView />` | 7-day grid with hour rows |
| `<CalendarMonthView />` | Month grid with appointment dots |
| `<AppointmentCard />` | Visual rendering of a single appointment in any view |
| `<AppointmentModal />` | Create/edit dialog |
| `<AppointmentStatusPopover />` | Status change quick-action |
| `<CalendarFilters />` | Location + status + clinician filters |
| `<ClientSearchSelect />` | Searchable participant picker with "Add new client" flow |
| `<ServiceCodeSelect />` | Dropdown for service codes |
| `<LocationSelect />` | Dropdown for locations |

### State management

- TanStack Query for all server state
- Query keys: `['appointments', { from, to, clinicianId?, locationId?, status? }]`
- Mutations invalidate the date-range query on success
- Optimistic updates for status changes

### Styling

- Tailwind + existing theme tokens
- Status colors (from `packages/shared/src/theme`):
  - SCHEDULED: blue
  - ATTENDED: green
  - NO_SHOW: red
  - LATE_CANCELED: amber
  - CLIENT_CANCELED: gray
  - CLINICIAN_CANCELED: gray (with distinct icon)

---

## Non-Functional Requirements

### NFR-1: Performance

- **NFR-1a:** `GET /api/appointments?startAt=...&endAt=...` for a 7-day range returns within **200ms p95** for a practice with 500 appointments in that range
- **NFR-1b:** Calendar week view first paint within **500ms** on a mid-tier laptop (assuming warm cache)
- **NFR-1c:** Appointment create round-trip within **400ms p95**

### NFR-2: Pagination

- **NFR-2a:** `GET /api/appointments` uses cursor-based pagination, 100 items per page max
- **NFR-2b:** Date range is REQUIRED and capped at 62 days

### NFR-3: Security & HIPAA

- **NFR-3a:** All appointment data is PHI. Every query filters by practice membership.
- **NFR-3b:** All mutations audit-logged (field names only; status transition from/to is the sole exception)
- **NFR-3c:** `internalNote` is never exposed to participants
- **NFR-3d:** Cross-practice access returns `404 Not Found` (no existence leakage)
- **NFR-3e:** Zod validates all inputs; no raw request bodies hit Prisma
- **NFR-3f:** Logs never contain appointment body data — only IDs and operation names

### NFR-4: Accessibility (WCAG 2.1 AA)

- **NFR-4a:** Calendar views are keyboard navigable (arrow keys move between slots, Enter opens modal)
- **NFR-4b:** All interactive elements have accessible names
- **NFR-4c:** Status color is not the sole indicator — a text label accompanies the color
- **NFR-4d:** Modal traps focus and restores on close
- **NFR-4e:** Screen reader announces appointment count when the date range changes

### NFR-5: Testing

- **NFR-5a:** API routes have integration tests via supertest (one test file per route module: `appointments.test.ts`, `locations.test.ts`, `service-codes.test.ts`)
- **NFR-5b:** Service layer has unit tests (mocked Prisma)
- **NFR-5c:** Zod schemas have round-trip tests (parse real-shaped payloads; verify field preservation)
- **NFR-5d:** Coverage on `packages/api` and `packages/shared` remains **>80%** after this sprint
- **NFR-5e:** Web components have React Testing Library tests for critical flows (create appointment, change status, filter calendar)
- **NFR-5f:** Every acceptance criterion in this spec has at least one corresponding test — **no acceptance criterion ships without a test**

### NFR-6: Observability

- **NFR-6a:** Every route logs operation name + duration + result (success/error) via the existing `logger`
- **NFR-6b:** Errors log error name + message only (no PII, no full objects)

### NFR-7: Database

- **NFR-7a:** All required indexes created (see Data Model section)
- **NFR-7b:** Migration is forward-only; no destructive changes
- **NFR-7c:** Seed migration for service codes and default locations runs idempotently per practice

### NFR-8: i18n readiness

- **NFR-8a:** All user-facing strings in the web app are in a centralized strings module (not hardcoded), even though sprint 19 ships English-only

---

## Dependencies

- Existing: `@steady/db` Prisma singleton, audit middleware, `authenticate` + `requireRole` middleware, `runWithAuditUser`, `@steady/shared` Zod schemas, shadcn/ui components, TanStack Query
- External: none new (no new npm packages required unless Architect identifies one for calendar rendering)

## Assumptions

1. `ClinicianProfile` has a `timezone` field or one can be added trivially (verify in Architecture phase)
2. `PracticeMembership` carries enough role info to identify the account owner (if not, add an `isAccountOwner` boolean)
3. Existing `ParticipantProfile` queries do not hard-require `Enrollment` (verify during engineering; fix any violations found)
4. The existing `/dashboard` route group is the right place for `/appointments`

## Out of Scope (explicitly deferred)

Recurring series, availability blocks, client-initiated booking, reminders (email/SMS/voice), automatic cancellation fees, group appointments with 3+ participants, service code edit UI, full role-based visibility (Practice Manager, Supervisor, Biller, Scheduler roles), calendar color-coding by clinician/service, multi-clinician admin filters beyond account owner, calendar sync (Google/Apple/Outlook), telehealth launch, insurance claim auto-generation, session note auto-creation from appointment, waitlist, drag-to-reschedule, bulk operations, CSV export, mobile app UI for clinicians.
