# Recurring Appointments -- Implementation Plan

## Overview

Recurring appointment series allow clinicians to schedule repeating appointments (weekly, biweekly, monthly) for participants. A pg-boss cron job generates the next 4 weeks of individual appointments from active series daily.

## Backend (Completed)

1. **Prisma schema**: `RecurringSeries` model with `RecurrenceRule` enum (WEEKLY, BIWEEKLY, MONTHLY). `Appointment.recurringSeriesId` FK with `SetNull` on delete.
2. **Service layer** (`packages/api/src/services/recurring-series.ts`): CRUD + generation logic. `computeOccurrenceDates()` handles all three rules. Idempotent generation skips existing appointments within 1-hour tolerance.
3. **Routes** (`packages/api/src/routes/recurring-series.ts`): 7 endpoints -- POST /, GET /, GET /:id, PATCH /:id, POST /:id/pause, POST /:id/resume, DELETE /:id.
4. **Zod schemas** (`packages/shared/src/schemas/recurring.ts`): CreateSeriesSchema, UpdateSeriesSchema, ListSeriesQuerySchema with HH:mm time validation and cross-field refinements.
5. **Queue**: Daily cron registered in `packages/api/src/services/queue.ts`.

## API Tests

- `packages/api/src/__tests__/recurring-series.test.ts`: ~30 tests covering CRUD, auth guards, validation, cross-tenant isolation, pagination, generation logic (WEEKLY/BIWEEKLY/MONTHLY), idempotency, seriesEndDate enforcement.
- Mock pattern: extends existing setup.ts with `recurringSeries` model mocks and `mockRecurringSeries()` helper.

## Web UI

1. **Hooks** (`apps/web/src/hooks/use-recurring-series.ts`): TanStack Query hooks matching use-appointments.ts pattern.
2. **AppointmentModal**: Repeat toggle in CREATE mode with frequency dropdown and optional end date. Submits via `useCreateSeries` when enabled.
3. **AppointmentCard**: Recurring indicator icon when `recurringSeriesId` is present.
4. **RecurringSeriesPanel**: Dialog accessible from Calendar header. Lists active/paused series with pause/resume/delete controls.

## Key Decisions

- Generation window: 4 weeks rolling, refreshed daily by cron.
- Conflict detection: warn-only (does not block creation).
- Series limit: 200 active per clinician.
- Past appointments: never generated or deleted by series operations.
- Delete cascade: future SCHEDULED appointments deleted; past/attended preserved with null FK.

## Deferred

- Editing individual occurrences (exception handling) -- future sprint.
- GROUP appointment type for recurring series.
- Mobile participant view of recurring series metadata.
