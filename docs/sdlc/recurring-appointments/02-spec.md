# Recurring Appointments — Feature Specification

## Overview

Extends the appointment system (Sprint 19) with recurring series. Clinicians define a recurrence pattern; the system auto-generates individual appointments on a rolling 4-week window. Each generated appointment behaves exactly like a manually created one.

## Glossary

| Term | Definition |
|---|---|
| **RecurringSeries** | A template defining a repeating appointment pattern for a clinician-client pair. |
| **Occurrence** | An individual `Appointment` row generated from a series, linked via `recurringSeriesId`. |
| **Rolling window** | The system generates appointments for the next 4 weeks from today. |

## User Stories

| ID | Story |
|---|---|
| US-1 | As a clinician, I want to create a recurring series so my weekly clients are auto-scheduled. |
| US-2 | As a clinician, I want to pause a series when a client goes on vacation. |
| US-3 | As a clinician, I want to edit a single occurrence without affecting the series. |
| US-4 | As a clinician, I want to update all future appointments when the time changes permanently. |
| US-5 | As a clinician, I want to delete a series and clean up all future unattended appointments. |

## Functional Requirements

### FR-1: Create recurring series

**GIVEN** an authenticated clinician with a valid client, service code, location, day of week, start/end time, and recurrence rule
**WHEN** the clinician submits a create series request
**THEN** a `RecurringSeries` is created and the first 4 weeks of appointments are generated with status SCHEDULED

**GIVEN** a create request with recurrenceRule not in [WEEKLY, BIWEEKLY, MONTHLY]
**WHEN** submitted
**THEN** the API responds 400 with Zod validation errors

**GIVEN** a create request with dayOfWeek outside 0-6
**WHEN** submitted
**THEN** the API responds 400

**GIVEN** a create request with startTime not in HH:mm format
**WHEN** submitted
**THEN** the API responds 400

**GIVEN** a create request with endTime <= startTime
**WHEN** submitted
**THEN** the API responds 400

**GIVEN** a create request with seriesStartDate in the past
**WHEN** submitted
**THEN** the API responds 400

**GIVEN** a valid create request
**WHEN** appointments are generated
**THEN** each appointment has `recurringSeriesId` set and copies the series' service code, location, appointment type, and internal note

**GIVEN** a clinician who already has 200 active series
**WHEN** they try to create another
**THEN** the API responds 409 with "Maximum recurring series limit reached"

### FR-2: List recurring series

**GIVEN** an authenticated clinician
**WHEN** they GET /api/recurring-series
**THEN** series for their practice are returned, cursor-paginated, ordered by createdAt desc

**GIVEN** a query with participantId filter
**WHEN** submitted
**THEN** only series for that participant are returned

**GIVEN** a query with isActive filter
**WHEN** submitted
**THEN** only series matching the active status are returned

**GIVEN** a non-account-owner clinician
**WHEN** they list series
**THEN** only their own series are returned

### FR-3: Get single series

**GIVEN** a series ID owned by the clinician's practice
**WHEN** they GET /api/recurring-series/:id
**THEN** the series is returned with upcoming appointments (next 4 weeks)

**GIVEN** a series ID from another practice
**WHEN** requested
**THEN** the API responds 404

### FR-4: Update series

**GIVEN** an active series
**WHEN** the clinician PATCHes startTime, endTime, locationId, serviceCodeId, or seriesEndDate
**THEN** the series is updated, all future SCHEDULED linked appointments are deleted and regenerated with new values

**GIVEN** a PATCH that changes only internalNote
**WHEN** submitted
**THEN** the series updates but existing appointments are NOT regenerated

**GIVEN** a PATCH to a series owned by another practice
**WHEN** submitted
**THEN** the API responds 404

### FR-5: Pause series

**GIVEN** an active series
**WHEN** the clinician POSTs to /api/recurring-series/:id/pause
**THEN** isActive is set to false and no future appointments are generated

**GIVEN** an already-paused series
**WHEN** pause is requested
**THEN** the API responds 409 "Series is already paused"

### FR-6: Resume series

**GIVEN** a paused series
**WHEN** the clinician POSTs to /api/recurring-series/:id/resume
**THEN** isActive is set to true and the next 4 weeks of appointments are generated immediately

**GIVEN** an already-active series
**WHEN** resume is requested
**THEN** the API responds 409 "Series is already active"

### FR-7: Delete series

**GIVEN** a series
**WHEN** the clinician DELETEs /api/recurring-series/:id
**THEN** the series row is hard-deleted and all future SCHEDULED linked appointments are deleted

**GIVEN** linked appointments with status ATTENDED, NO_SHOW, or any canceled status
**WHEN** the series is deleted
**THEN** those appointments are kept (recurringSeriesId becomes null via SetNull)

**GIVEN** a series from another practice
**WHEN** delete is requested
**THEN** the API responds 404

### FR-8: Daily generation job

**GIVEN** the pg-boss cron fires daily at 1 AM UTC
**WHEN** it runs
**THEN** for each active series, appointments are generated for the next 4 weeks if not already existing

**GIVEN** an appointment already exists for a series on a given date
**WHEN** generation runs
**THEN** that date is skipped (no duplicates)

**GIVEN** a series with seriesEndDate set
**WHEN** generation computes dates past the end date
**THEN** those dates are skipped

**GIVEN** a paused series (isActive=false)
**WHEN** generation runs
**THEN** the series is skipped entirely

### FR-9: Edit single occurrence vs all future

**GIVEN** a recurring appointment (has recurringSeriesId)
**WHEN** the clinician edits it via the normal appointment PATCH
**THEN** only that one appointment changes; the series is unaffected

**GIVEN** a recurring appointment
**WHEN** the clinician chooses "Edit all future" in the UI
**THEN** the web app calls PATCH on the series, which regenerates future appointments

### FR-10: Recurring appointment identification

**GIVEN** an appointment with recurringSeriesId set
**WHEN** returned by the API
**THEN** the response includes `recurringSeriesId` so the UI can show a recurring indicator

## Permissions

| Actor | Can do |
|---|---|
| Clinician (standard) | Full CRUD on own series |
| Account owner | Full CRUD on all series in their practice |
| Participant | No access to series endpoints |
| Unauthenticated | Nothing |

## API Surface

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/recurring-series` | Create series + generate first 4 weeks |
| GET | `/api/recurring-series` | List series (cursor-paginated) |
| GET | `/api/recurring-series/:id` | Get single series with upcoming appointments |
| PATCH | `/api/recurring-series/:id` | Update series; regenerate future appointments |
| POST | `/api/recurring-series/:id/pause` | Pause series |
| POST | `/api/recurring-series/:id/resume` | Resume series |
| DELETE | `/api/recurring-series/:id` | Delete series + future SCHEDULED appointments |

## Non-Functional Requirements

- NFR-1: Generation job completes within 30 seconds for 500 active series.
- NFR-2: Series CRUD endpoints respond within 500ms p95.
- NFR-3: All series data is PHI. Same tenant isolation as appointments.
- NFR-4: All mutations audit-logged via existing middleware.
- NFR-5: API and shared tests maintain >80% coverage.
