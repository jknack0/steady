# Recurring Appointments — Technical Architecture

## Overview

Adds a `RecurringSeries` Prisma model, a nullable `recurringSeriesId` FK on `Appointment`, a `RecurrenceRule` enum, seven REST endpoints under `/api/recurring-series`, a pg-boss daily cron job for appointment generation, and web UI updates for creating/managing recurring series.

## System Diagram

```
┌──────────────────────────────────────────────────────────────┐
│ Next.js Web (apps/web)                                        │
│   AppointmentModal → "Repeat" toggle → createSeries mutation  │
│   RecurringSeriesList → pause/resume/delete actions           │
│   AppointmentCard → recurring indicator icon                  │
│   EditChoiceDialog → "Just this one" / "All future"           │
│   TanStack Query hooks: useRecurringSeries, useCreateSeries…  │
└───────────────────┬──────────────────────────────────────────┘
                    │ HTTPS + JWT
┌───────────────────▼──────────────────────────────────────────┐
│ Express API (packages/api)                                    │
│                                                               │
│  routes/recurring-series.ts                                   │
│         │                                                     │
│         ▼                                                     │
│  services/recurring-series.ts                                 │
│         │  (uses detectConflicts from appointments service)    │
│         ▼                                                     │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ @steady/db — Prisma singleton + audit middleware          ││
│  └──────────────────────────────────────────────────────────┘│
│                                                               │
│  services/queue.ts → pg-boss cron: recurring-series-generate  │
│         │                                                     │
│         ▼ daily at 1:00 AM UTC                                │
│  services/recurring-series.ts#generateAllSeriesAppointments() │
└───────────────────────────────────────────────────────────────┘
```

## Data Model

### New enum: `RecurrenceRule`

```prisma
enum RecurrenceRule {
  WEEKLY
  BIWEEKLY
  MONTHLY
}
```

### New model: `RecurringSeries`

| Field | Type | Notes |
|---|---|---|
| id | String @id @default(cuid()) | PK |
| practiceId | String | FK -> Practice |
| clinicianId | String | FK -> ClinicianProfile |
| participantId | String | FK -> ParticipantProfile |
| serviceCodeId | String | FK -> ServiceCode |
| locationId | String | FK -> Location |
| appointmentType | AppointmentType | default INDIVIDUAL |
| internalNote | String? | max 500, copied to generated appointments |
| recurrenceRule | RecurrenceRule | WEEKLY/BIWEEKLY/MONTHLY |
| dayOfWeek | Int | 0-6 (0=Sunday) |
| startTime | String | HH:mm format |
| endTime | String | HH:mm format |
| seriesStartDate | DateTime | first occurrence |
| seriesEndDate | DateTime? | nullable = indefinite |
| isActive | Boolean | default true |
| createdById | String | FK -> User |
| createdAt | DateTime | |
| updatedAt | DateTime | |

**Indexes:**
- `@@index([practiceId, clinicianId, isActive])` — list queries
- `@@index([practiceId, participantId])` — per-client queries

**Relations:**
- `practice Practice`
- `clinician ClinicianProfile`
- `participant ParticipantProfile`
- `serviceCode ServiceCode`
- `location Location`
- `createdBy User`
- `appointments Appointment[]` — generated occurrences

### Modification: `Appointment`

Add nullable FK:
```prisma
recurringSeriesId  String?
recurringSeries    RecurringSeries? @relation(fields: [recurringSeriesId], references: [id], onDelete: SetNull)
```
Add index: `@@index([recurringSeriesId])`

### Relation additions

Models that gain a `recurringSeries RecurringSeries[]` relation:
- Practice
- ClinicianProfile
- ParticipantProfile
- ServiceCode
- Location
- User (as createdBy)

## Generation Algorithm

```
function generateAppointmentsForSeries(series, weeksAhead = 4):
  today = startOfDay(now)
  effectiveStart = max(series.seriesStartDate, today)
  windowEnd = today + (weeksAhead * 7 days)
  if series.seriesEndDate and series.seriesEndDate < windowEnd:
    windowEnd = series.seriesEndDate

  dates = computeOccurrenceDates(series.recurrenceRule, series.dayOfWeek, effectiveStart, windowEnd)

  for each date in dates:
    if date < today: skip  // never generate past appointments
    startAt = combine(date, series.startTime)  // UTC
    endAt = combine(date, series.endTime)

    existing = findAppointment where recurringSeriesId = series.id
      AND startAt between (startAt - 1hr) and (startAt + 1hr)
    if existing: skip

    create Appointment {
      practiceId, clinicianId, participantId, serviceCodeId, locationId,
      startAt, endAt, appointmentType, internalNote,
      recurringSeriesId: series.id,
      createdById: series.createdById,
      status: SCHEDULED
    }

    conflicts = detectConflicts(ctx, clinicianId, startAt, endAt)
    if conflicts.length > 0: logger.warn("Conflict detected for series", seriesId, date)
```

### Occurrence date computation

- **WEEKLY:** every 7 days on `dayOfWeek` from `effectiveStart`
- **BIWEEKLY:** every 14 days on `dayOfWeek` from `seriesStartDate` (anchored to original start)
- **MONTHLY:** same day-of-week in same week-of-month (e.g., "2nd Tuesday") from `effectiveStart`

## Service Layer

### `packages/api/src/services/recurring-series.ts`

```typescript
export async function createSeries(ctx: ServiceCtx, input: CreateSeriesInput): Promise<...>
export async function listSeries(ctx: ServiceCtx, query: ListSeriesQuery): Promise<...>
export async function getSeries(ctx: ServiceCtx, id: string): Promise<...>
export async function updateSeries(ctx: ServiceCtx, id: string, patch: UpdateSeriesInput): Promise<...>
export async function pauseSeries(ctx: ServiceCtx, id: string): Promise<...>
export async function resumeSeries(ctx: ServiceCtx, id: string): Promise<...>
export async function deleteSeries(ctx: ServiceCtx, id: string): Promise<...>
export async function generateAppointmentsForSeries(series: RecurringSeries, ctx: ServiceCtx): Promise<number>
export async function generateAllSeriesAppointments(): Promise<void>
```

## Routes

### `packages/api/src/routes/recurring-series.ts`

Middleware stack: `authenticate` -> `requireRole('CLINICIAN', 'ADMIN')` -> `requirePracticeCtx`

| Method | Path | Handler |
|---|---|---|
| POST | `/` | validate(CreateSeriesSchema) -> createSeries |
| GET | `/` | listSeries |
| GET | `/:id` | getSeries |
| PATCH | `/:id` | validate(UpdateSeriesSchema) -> updateSeries |
| POST | `/:id/pause` | pauseSeries |
| POST | `/:id/resume` | resumeSeries |
| DELETE | `/:id` | deleteSeries |

## Queue Integration

In `services/queue.ts`, register a new cron:
```typescript
await boss.schedule("recurring-series-generate", "0 1 * * *");  // 1 AM UTC daily
await boss.work("recurring-series-generate", async () => {
  await generateAllSeriesAppointments();
});
```

## Shared Schemas

### `packages/shared/src/schemas/recurring.ts`

```typescript
export const RecurrenceRuleEnum = z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]);

export const CreateSeriesSchema = z.object({
  participantId, serviceCodeId, locationId,
  recurrenceRule: RecurrenceRuleEnum,
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  seriesStartDate: z.string().datetime(),
  seriesEndDate: z.string().datetime().optional(),
  appointmentType: AppointmentTypeEnum.optional().default("INDIVIDUAL"),
  internalNote: z.string().max(500).optional(),
}).superRefine(...)

export const UpdateSeriesSchema = z.object({
  startTime, endTime, locationId, serviceCodeId,
  seriesEndDate, appointmentType, internalNote,
  recurrenceRule, dayOfWeek
}).partial().superRefine(...)

export const ListSeriesQuerySchema = z.object({
  participantId, isActive, cursor, limit
})
```

## Edit-One-vs-All Flow

When the web UI detects a recurring appointment (has `recurringSeriesId`):

1. User clicks edit on an occurrence
2. Dialog asks: "Edit just this appointment" or "Edit all future appointments"
3. "Just this" -> normal `PATCH /api/appointments/:id`
4. "All future" -> `PATCH /api/recurring-series/:seriesId` with the new values

The series PATCH handler:
1. Updates the series fields
2. Finds all future SCHEDULED appointments linked to the series (startAt > now)
3. Deletes them
4. Regenerates using the updated series values

## Web UI Changes

1. **AppointmentModal** (create mode): "Repeat" toggle. When on, shows recurrence rule dropdown + optional end date. Submit calls `POST /api/recurring-series` instead of `POST /api/appointments`.
2. **AppointmentCard**: shows a small repeat icon when `recurringSeriesId` is set.
3. **Recurring tab/section**: accessible from calendar page, shows series list with pause/resume/delete.
4. **EditChoiceDialog**: shown when editing an appointment that has `recurringSeriesId`.
5. **Hooks**: `useRecurringSeries`, `useCreateSeries`, `useUpdateSeries`, `usePauseSeries`, `useResumeSeries`, `useDeleteSeries` in `apps/web/src/hooks/use-recurring-series.ts`.

## Appointment View Update

`toClinicianView` in `services/appointments.ts` is updated to include `recurringSeriesId` in the response so the web UI can detect recurring appointments.
