# Sprint 14: Steady Work Review + Session Prep + Per-Participant Customization — Feature Specification

## Overview

Sprint 14 introduces two complementary capabilities: (1) a structured pre-session review workflow where participants reflect on their Steady Work before an appointment, paired with a clinician-facing session prep view that aggregates review responses, homework status, stats, and notes; and (2) per-participant homework customization via enrollment overrides that let clinicians hide items, add resources, or attach notes without modifying the shared program.

## Glossary

| Term | Definition |
|---|---|
| **ReviewTemplate** | Program-level configuration defining the set of review questions and barrier checklist sent to participants before appointments. |
| **SessionReview** | A participant-authored, timestamped reflection artifact linked to a specific appointment and enrollment. Contains question/answer pairs and barrier selections. |
| **EnrollmentOverride** | A type-discriminated record that modifies how a participant experiences a module within their enrollment — without changing the underlying program. |
| **Session Prep** | A clinician-facing aggregated view for an upcoming appointment: review responses, homework status, stats, tracker trends, and last session notes. |
| **Barrier Checklist** | A configurable multi-select list of common obstacles to completing Steady Work (e.g., "forgot", "too overwhelmed", "didn't understand the task"). |

---

## User Stories

| ID | Story |
|---|---|
| US-1 | As a **clinician**, I want to **configure review questions per program** so that reflection prompts match the program's emphasis. |
| US-2 | As a **clinician**, I want to **configure a barrier checklist per program** (with sensible defaults) so participants can quickly flag what got in the way. |
| US-3 | As a **participant**, I want to **receive a push notification 24h before my appointment** prompting me to complete my Steady Work Review. |
| US-4 | As a **participant**, I want to **complete the review in under 5 minutes** from the mobile app — answering questions and checking barriers. |
| US-5 | As a **clinician**, I want to **open a session prep view for any upcoming appointment** that shows review responses, homework status, stats, tracker trends, and last session notes. |
| US-6 | As a **clinician**, I want the **session prep view to still be useful** even if the participant did not submit a review. |
| US-7 | As a **clinician**, I want to **hide specific homework items** from a participant's view without modifying the program for other participants. |
| US-8 | As a **clinician**, I want to **add supplemental resources** (link + description) to a specific participant's enrollment. |
| US-9 | As a **clinician**, I want to **attach a clinician note** to a participant's module that the participant sees inline. |
| US-10 | As a **participant**, I want **overrides merged transparently** so my homework view feels intentional, not patched. |
| US-11 | As a **clinician**, I want to **view and manage all overrides** for a participant on a dedicated "Customize" tab. |
| US-12 | As a **clinician**, I want **session prep notes to autosave** so I can jot down thoughts without explicitly saving. |

---

## Functional Requirements

### FR-1: Review template configuration

Clinicians can create or update a review template per program.

**Acceptance Criteria:**
- **GIVEN** an authenticated clinician who owns a program
  **WHEN** they `POST /api/programs/:id/review-template` with `{ questions: [...], barriers: [...] }`
  **THEN** a `ReviewTemplate` is created or updated for that program and returned
- **GIVEN** a program with no review template
  **WHEN** a participant's review is triggered
  **THEN** the system uses the default template (4 questions + 9 barriers defined in `@steady/shared`)
- **GIVEN** a create/update request with more than 10 questions or more than 20 barriers
  **WHEN** submitted
  **THEN** the API responds `400 Bad Request`
- **GIVEN** a clinician who does not own the program
  **WHEN** they attempt to create/update the template
  **THEN** the API responds `404 Not Found`

### FR-2: Review template retrieval

**Acceptance Criteria:**
- **GIVEN** an authenticated clinician who owns a program
  **WHEN** they `GET /api/programs/:id/review-template`
  **THEN** the template is returned, or the default template if none is configured
- **GIVEN** a participant enrolled in the program
  **WHEN** they `GET /api/participant/appointments/:id/review`
  **THEN** the response includes the active template (custom or default) along with any existing review data

### FR-3: Participant submits review

**Acceptance Criteria:**
- **GIVEN** an authenticated participant with an upcoming appointment linked to an enrollment
  **WHEN** they `POST /api/appointments/:appointmentId/review` with `{ responses: [{question, answer}], barriers: [string] }`
  **THEN** a `SessionReview` is created with `submittedAt = now()` and returned
- **GIVEN** a review already exists for this appointment+enrollment
  **WHEN** the participant submits again
  **THEN** the existing review is updated (not duplicated)
- **GIVEN** a participant who does not have an enrollment linked to this appointment
  **WHEN** they submit
  **THEN** the API responds `404 Not Found`
- **GIVEN** a submit request where any answer exceeds 2000 chars
  **WHEN** submitted
  **THEN** the API responds `400 Bad Request`
- **GIVEN** a successful submission
  **WHEN** committed
  **THEN** an audit log entry is written with action `CREATE` or `UPDATE`, resource `SessionReview`

### FR-4: Review retrieval

**Acceptance Criteria:**
- **GIVEN** an authenticated clinician
  **WHEN** they `GET /api/appointments/:id/review`
  **THEN** the review for that appointment is returned, or `null` if not submitted
- **GIVEN** an authenticated participant
  **WHEN** they `GET /api/participant/appointments/:id/review`
  **THEN** their own review is returned along with the template questions, or an empty form if not yet submitted
- **GIVEN** a clinician who does not own the appointment
  **WHEN** they request the review
  **THEN** the API responds `404 Not Found`

### FR-5: Session prep view

**Acceptance Criteria:**
- **GIVEN** an authenticated clinician who owns the appointment
  **WHEN** they `GET /api/appointments/:appointmentId/prep`
  **THEN** the response includes: `review` (or null), `homeworkStatus` (current module items with completion), `quickStats` (tasks completed/total, journal count, task completion rate since last session), `trackerSummaries` (last 14 days of tracker data with trends), `lastSessionNotes`, and `sessionNotes` (current draft, if any)
- **GIVEN** the participant did not submit a review
  **WHEN** the clinician opens prep
  **THEN** the review section shows "Not yet submitted" and all other sections are still populated
- **GIVEN** the appointment has no linked enrollment
  **WHEN** the clinician opens prep
  **THEN** the API responds with review=null, homeworkStatus=[], stats based on participant profile data only
- **GIVEN** a clinician who does not own the appointment
  **WHEN** they request prep
  **THEN** the API responds `404 Not Found`

### FR-6: Session prep notes autosave

**Acceptance Criteria:**
- **GIVEN** the session prep page
  **WHEN** the clinician types in the session notes textarea
  **THEN** the content autosaves via `PATCH /api/appointments/:id` to the `internalNote` field after a 2-second debounce
- **GIVEN** a save in progress
  **WHEN** the save succeeds
  **THEN** a "Saved" indicator appears briefly

### FR-7: 24h review notification

**Acceptance Criteria:**
- **GIVEN** an appointment is created or updated with `startAt` more than 24h in the future
  **WHEN** the appointment is saved
  **THEN** a pg-boss job is enqueued with `runAt = startAt - 24h` that sends a push notification to the participant
- **GIVEN** an appointment is rescheduled
  **WHEN** the update is saved
  **THEN** the previous notification job is cancelled and a new one is enqueued
- **GIVEN** an appointment is cancelled
  **WHEN** the status changes to any cancel status
  **THEN** the pending notification job is cancelled
- **GIVEN** the appointment `startAt` is less than 24h from now
  **WHEN** the appointment is created
  **THEN** no notification job is enqueued (too late)

### FR-8: Create enrollment override

**Acceptance Criteria:**
- **GIVEN** an authenticated clinician who owns the enrollment's program
  **WHEN** they `POST /api/enrollments/:id/overrides` with a valid override payload
  **THEN** an `EnrollmentOverride` is created and returned
- **GIVEN** an override of type `HIDE_HOMEWORK_ITEM` with `{ targetPartId: string }`
  **WHEN** created
  **THEN** the target part is hidden from the participant's module delivery
- **GIVEN** an override of type `ADD_RESOURCE` with `{ moduleId, title, url, description? }`
  **WHEN** created
  **THEN** a supplemental resource appears in the participant's module view
- **GIVEN** an override of type `CLINICIAN_NOTE` with `{ moduleId, content }`
  **WHEN** created
  **THEN** a clinician note appears in the participant's module view
- **GIVEN** an override of type `ADD_HOMEWORK_ITEM` with `{ moduleId, title, description?, itemType }`
  **WHEN** created
  **THEN** an additional homework item appears in the participant's module
- **GIVEN** a clinician who does not own the enrollment's program
  **WHEN** they attempt to create an override
  **THEN** the API responds `404 Not Found`
- **GIVEN** a `HIDE_HOMEWORK_ITEM` override targeting a non-existent part
  **WHEN** submitted
  **THEN** the API responds `400 Bad Request`

### FR-9: List and delete enrollment overrides

**Acceptance Criteria:**
- **GIVEN** an authenticated clinician who owns the enrollment's program
  **WHEN** they `GET /api/enrollments/:id/overrides`
  **THEN** all overrides for that enrollment are returned, ordered by `createdAt desc`
- **GIVEN** an override ID
  **WHEN** the clinician `DELETE /api/enrollments/:id/overrides/:overrideId`
  **THEN** the override is hard-deleted and an audit log entry is written
- **GIVEN** a non-owner clinician
  **WHEN** they attempt to list or delete
  **THEN** the API responds `404 Not Found`

### FR-10: Override merge at query time

**Acceptance Criteria:**
- **GIVEN** a participant with active overrides on their enrollment
  **WHEN** they request module content via the existing participant module delivery endpoint
  **THEN** hidden parts are filtered out, added resources are injected, added homework items are appended, and clinician notes are attached — all transparently
- **GIVEN** an override is deleted
  **WHEN** the participant next requests module content
  **THEN** the original content is restored (no permanent modification)
- **GIVEN** multiple overrides on the same module
  **WHEN** merged
  **THEN** they are applied in `createdAt` order without conflicts

---

## Permissions & Multi-tenancy

| Actor | Can do |
|---|---|
| **Unauthenticated** | Nothing |
| **Participant** | Submit/view own review; view own module content (with overrides merged transparently) |
| **Clinician (standard)** | CRUD review templates on own programs; read reviews for own appointments; session prep for own appointments; CRUD overrides on enrollments for own programs |
| **Clinician (account owner)** | Same as standard + access across practice clinicians' data |
| **Admin** | Same as account owner |

**Tenant isolation:**
- Review template queries filter by program ownership (clinician owns program)
- SessionReview queries filter by appointment ownership (clinician owns appointment) or participant identity
- EnrollmentOverride queries filter by enrollment program ownership
- Cross-practice access returns `404 Not Found`
- Participant endpoints verify participant identity via JWT `participantProfileId`

---

## Data Model Requirements

### New model: `ReviewTemplate`

| Field | Type | Notes |
|---|---|---|
| `id` | String @id @default(cuid()) | |
| `programId` | String @unique | FK -> Program, one template per program |
| `questions` | Json | Array of `{ id: string, text: string, enabled: boolean }` |
| `barriers` | Json | Array of `{ id: string, label: string, enabled: boolean }` |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

### New model: `SessionReview`

| Field | Type | Notes |
|---|---|---|
| `id` | String @id @default(cuid()) | |
| `appointmentId` | String | FK -> Appointment, indexed |
| `enrollmentId` | String | FK -> Enrollment, indexed |
| `participantId` | String | FK -> ParticipantProfile |
| `responses` | Json | Array of `{ questionId: string, question: string, answer: string }` |
| `barriers` | String[] | Array of barrier label strings |
| `submittedAt` | DateTime | |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Unique constraint:** `@@unique([appointmentId, enrollmentId])` -- one review per appointment+enrollment.

### New model: `EnrollmentOverride`

| Field | Type | Notes |
|---|---|---|
| `id` | String @id @default(cuid()) | |
| `enrollmentId` | String | FK -> Enrollment, indexed |
| `overrideType` | OverrideType enum | `HIDE_HOMEWORK_ITEM`, `ADD_HOMEWORK_ITEM`, `ADD_RESOURCE`, `CLINICIAN_NOTE` |
| `moduleId` | String? | FK -> Module (required for ADD_RESOURCE, CLINICIAN_NOTE, ADD_HOMEWORK_ITEM) |
| `targetPartId` | String? | FK -> Part (required for HIDE_HOMEWORK_ITEM) |
| `payload` | Json | Type-specific data (resource URL/title, note content, homework item details) |
| `createdById` | String | FK -> User |
| `createdAt` | DateTime | |

**Index:** `@@index([enrollmentId, moduleId])`.

### New enum: `OverrideType`

```
HIDE_HOMEWORK_ITEM
ADD_HOMEWORK_ITEM
ADD_RESOURCE
CLINICIAN_NOTE
```

---

## API Surface

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/api/programs/:id/review-template` | Create/update review template | Clinician (program owner) |
| GET | `/api/programs/:id/review-template` | Get review template | Clinician (program owner) |
| POST | `/api/appointments/:id/review` | Participant submits review | Participant |
| GET | `/api/appointments/:id/review` | Get review for appointment | Clinician (appointment owner) |
| GET | `/api/appointments/:id/prep` | Session prep aggregated view | Clinician (appointment owner) |
| GET | `/api/participant/appointments/:id/review` | Participant view of review form + existing data | Participant |
| POST | `/api/enrollments/:id/overrides` | Create enrollment override | Clinician (program owner) |
| GET | `/api/enrollments/:id/overrides` | List overrides for enrollment | Clinician (program owner) |
| DELETE | `/api/enrollments/:id/overrides/:overrideId` | Remove override | Clinician (program owner) |

---

## Non-Functional Requirements

### NFR-1: Performance

- **NFR-1a:** `GET /api/appointments/:id/prep` returns within **300ms p95** — it aggregates multiple data sources but uses parallel queries
- **NFR-1b:** Override merge adds no more than **50ms** to existing module delivery endpoints
- **NFR-1c:** Review submission round-trip within **400ms p95**

### NFR-2: Pagination

- **NFR-2a:** `GET /api/enrollments/:id/overrides` uses a `take: 200` cap (bounded list — overrides per enrollment are naturally small)
- **NFR-2b:** Session prep data uses bounded takes on sub-queries (homework items per module, recent tasks, recent journal entries)

### NFR-3: Security & HIPAA

- **NFR-3a:** SessionReview responses are PHI (free-text patient content). All queries filter by ownership.
- **NFR-3b:** EnrollmentOverride clinician notes are PHI. Never expose one participant's overrides to another.
- **NFR-3c:** All mutations audit-logged (field names only, never values)
- **NFR-3d:** Barrier selections are PHI (reveal treatment challenges). Same access controls as review responses.
- **NFR-3e:** Logs never contain review response text or override note content — only IDs and operation names
- **NFR-3f:** 24h notification job payload contains only appointment ID and participant user ID — no PHI in the job queue

### NFR-4: Accessibility

- **NFR-4a:** Review screen (mobile) supports VoiceOver/TalkBack — all form fields have accessible labels
- **NFR-4b:** Session prep page (web) is keyboard navigable — Tab cycles panels, Enter/Space expands sections
- **NFR-4c:** Customize tab supports keyboard CRUD — focus management on add/delete

### NFR-5: Testing

- **NFR-5a:** New API routes have integration tests: `session-review.test.ts`, `enrollment-overrides.test.ts`, `session-prep.test.ts`
- **NFR-5b:** New Zod schemas have unit tests in `packages/shared/src/__tests__/`
- **NFR-5c:** Override merge logic has dedicated unit tests with mocked Prisma
- **NFR-5d:** Coverage on `packages/api` and `packages/shared` remains >80%
- **NFR-5e:** Every acceptance criterion has at least one corresponding test

---

## Out of Scope

- Participant-completed review from the web portal (mobile-only for sprint 14)
- Recurring review templates that vary by session number
- Per-appointment question customization
- Group session review (multiple participants per appointment)
- Review response analytics across a cohort
- Per-participant override of tracker configuration
- Version history of EnrollmentOverrides
- Participant-initiated requests to hide homework items
- Drag-to-reorder overrides
- Override of assessment or intake form parts (homework items only)
- Clinician note visibility to other clinicians in the same practice (visible only to originator for sprint 14)
