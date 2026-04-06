# Sprint 14: Steady Work Review + Session Prep + Per-Participant Customization — Technical Architecture

## Overview

Sprint 14 introduces three new Prisma models (`ReviewTemplate`, `SessionReview`, `EnrollmentOverride`), one new enum (`OverrideType`), nine REST endpoints, a pg-boss job for 24h review notifications, a new web page at `/sessions/prep/[appointmentId]`, a "Customize" tab on the participant detail page, and a mobile review screen. The design follows Steady's existing layered architecture: Zod schemas in `@steady/shared` -> Express routes -> service functions -> Prisma singleton. All mutations flow through the existing Prisma audit middleware within `runWithAuditUser` context.

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Expo Mobile (apps/mobile)                                               │
│   Review screen: /appointments/[id]/review                              │
│   Part renderers merge overrides transparently                          │
└──────────────────┬──────────────────────────────────────────────────────┘
                   │ HTTPS + JWT
┌──────────────────┼──────────────────────────────────────────────────────┐
│ Next.js Web      │ (apps/web)                                           │
│   /sessions/prep/[appointmentId] — 3-panel prep view                    │
│   /participants/[id]/customize — override management tab                │
└──────────────────┬──────────────────────────────────────────────────────┘
                   │ HTTPS + JWT
┌──────────────────▼──────────────────────────────────────────────────────┐
│ Express API (packages/api)                                              │
│                                                                         │
│  routes/review-templates.ts    routes/session-reviews.ts                │
│  routes/enrollment-overrides.ts   (+ additions to routes/appointments)  │
│         │                              │                                │
│         ▼                              ▼                                │
│  services/review-templates.ts  services/session-reviews.ts              │
│  services/enrollment-overrides.ts  services/session-prep.ts             │
│         │                              │                                │
│         │  pg-boss: review-notification worker                          │
│         ▼                              ▼                                │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ @steady/db — Prisma singleton + audit middleware               │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                             │                                           │
└─────────────────────────────┼───────────────────────────────────────────┘
                              ▼
                    ┌──────────────────┐
                    │ PostgreSQL       │
                    │  review_templates│
                    │  session_reviews │
                    │  enrollment_     │
                    │    overrides     │
                    │  audit_logs      │
                    └──────────────────┘
```

## Data Model

### New enum

```prisma
enum OverrideType {
  HIDE_HOMEWORK_ITEM
  ADD_HOMEWORK_ITEM
  ADD_RESOURCE
  CLINICIAN_NOTE
}
```

### New model: `ReviewTemplate`

```prisma
model ReviewTemplate {
  id        String   @id @default(cuid())
  programId String   @unique
  program   Program  @relation(fields: [programId], references: [id], onDelete: Cascade)
  questions Json     // Array<{ id: string, text: string, enabled: boolean }>
  barriers  Json     // Array<{ id: string, label: string, enabled: boolean }>
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("review_templates")
}
```

**Indexes:** `programId` is `@unique` (implicit unique index).

### New model: `SessionReview`

```prisma
model SessionReview {
  id            String             @id @default(cuid())
  appointmentId String
  appointment   Appointment        @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  enrollmentId  String
  enrollment    Enrollment         @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
  participantId String
  participant   ParticipantProfile @relation(fields: [participantId], references: [id])
  responses     Json               // Array<{ questionId: string, question: string, answer: string }>
  barriers      String[]
  submittedAt   DateTime
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  @@unique([appointmentId, enrollmentId])
  @@index([appointmentId])
  @@index([participantId])
  @@map("session_reviews")
}
```

### New model: `EnrollmentOverride`

```prisma
model EnrollmentOverride {
  id           String       @id @default(cuid())
  enrollmentId String
  enrollment   Enrollment   @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
  overrideType OverrideType
  moduleId     String?
  module       Module?      @relation(fields: [moduleId], references: [id])
  targetPartId String?
  targetPart   Part?        @relation(fields: [targetPartId], references: [id])
  payload      Json         // Type-specific: { title, url, description } | { content } | { title, description, itemType }
  createdById  String
  createdAt    DateTime     @default(now())

  @@index([enrollmentId, moduleId])
  @@index([enrollmentId])
  @@map("enrollment_overrides")
}
```

### Relation additions to existing models

```prisma
// In Program model:
reviewTemplate ReviewTemplate?

// In Appointment model:
sessionReviews SessionReview[]

// In Enrollment model:
sessionReviews      SessionReview[]
enrollmentOverrides EnrollmentOverride[]

// In Module model:
enrollmentOverrides EnrollmentOverride[]

// In Part model:
enrollmentOverrides EnrollmentOverride[]

// In ParticipantProfile model:
sessionReviews SessionReview[]
```

## Service Layer

### `services/review-templates.ts` (new)

```ts
export async function getOrDefaultTemplate(programId: string): Promise<ReviewTemplateData>
export async function upsertTemplate(
  clinicianProfileId: string, programId: string, input: UpsertTemplateInput
): Promise<ReviewTemplate | null>  // null = program not owned
```

`getOrDefaultTemplate` returns the custom template if one exists, otherwise returns `DEFAULT_REVIEW_TEMPLATE` from `@steady/shared`. The default has 4 questions and 9 barriers.

### `services/session-reviews.ts` (new)

```ts
export async function submitReview(
  participantProfileId: string, appointmentId: string, input: SubmitReviewInput
): Promise<SessionReview | { error: 'not_found' }>
export async function getReviewForAppointment(
  appointmentId: string
): Promise<SessionReview | null>
export async function getReviewWithTemplate(
  participantProfileId: string, appointmentId: string
): Promise<{ review: SessionReview | null, template: ReviewTemplateData } | { error: 'not_found' }>
```

`submitReview` uses `prisma.sessionReview.upsert` keyed on `@@unique([appointmentId, enrollmentId])` (COND-10). It resolves the enrollment by finding the participant's active enrollment linked to the appointment's program.

### `services/session-prep.ts` (new)

```ts
export async function getSessionPrep(
  ctx: ServiceCtx, appointmentId: string
): Promise<SessionPrepData | { error: 'not_found' }>
```

Returns an aggregated object:
```ts
interface SessionPrepData {
  appointment: { id, startAt, status, participantName };
  review: SessionReview | null;
  homeworkStatus: Array<{ moduleId, moduleTitle, items: Array<{ partId, title, completed }> }>;
  quickStats: { tasksCompleted, tasksTotal, journalEntries, taskCompletionRate };
  trackerSummaries: TrackerSummary[];  // reuses existing getSessionPrepData pattern
  lastSessionNotes: { notes: string | null, date: DateTime, moduleCompletedId: string | null } | null;
}
```

Implementation uses `Promise.all` to parallelize sub-queries:
1. Load appointment + verify ownership (practice-scoped)
2. Load SessionReview for this appointment
3. Load enrollment + homework status (reuses pattern from existing `getSessionPrepData` in `services/sessions.ts`)
4. Load quick stats (tasks, journal counts since last session)
5. Load tracker summaries (last 14 days)
6. Load last completed session notes

### `services/enrollment-overrides.ts` (new)

```ts
export async function createOverride(
  clinicianProfileId: string, enrollmentId: string, input: CreateOverrideInput
): Promise<EnrollmentOverride | { error: 'not_found' | 'validation', message?: string }>
export async function listOverrides(
  clinicianProfileId: string, enrollmentId: string
): Promise<EnrollmentOverride[] | { error: 'not_found' }>
export async function deleteOverride(
  clinicianProfileId: string, enrollmentId: string, overrideId: string
): Promise<void | { error: 'not_found' }>
```

Ownership verification: the service checks that `enrollment.program.clinicianId === clinicianProfileId`. For `HIDE_HOMEWORK_ITEM`, validates `targetPartId` exists and belongs to a module in the enrollment's program.

### Override merge function (in `services/participant.ts` — modification)

```ts
export function applyOverrides(
  moduleParts: PartWithProgress[],
  overrides: EnrollmentOverride[]
): MergedPart[] {
  const hiddenPartIds = new Set(
    overrides
      .filter(o => o.overrideType === 'HIDE_HOMEWORK_ITEM')
      .map(o => o.targetPartId!)
  );

  // 1. Filter out hidden parts
  let merged = moduleParts.filter(p => !hiddenPartIds.has(p.id));

  // 2. Append added homework items (as virtual parts with source: 'override')
  const addedHomework = overrides
    .filter(o => o.overrideType === 'ADD_HOMEWORK_ITEM')
    .map(o => ({
      ...virtualPartFromOverride(o),
      source: 'override' as const,
    }));
  merged = [...merged, ...addedHomework];

  // 3. Append added resources (as virtual parts with source: 'override')
  const addedResources = overrides
    .filter(o => o.overrideType === 'ADD_RESOURCE')
    .map(o => ({
      ...virtualResourceFromOverride(o),
      source: 'override' as const,
    }));
  merged = [...merged, ...addedResources];

  // 4. Attach clinician notes to module-level metadata
  const notes = overrides
    .filter(o => o.overrideType === 'CLINICIAN_NOTE')
    .map(o => ({ content: (o.payload as any).content, source: 'override' as const }));

  return { parts: merged, clinicianNotes: notes };
}
```

The merge function prefetches ALL overrides for the enrollment in a single query (COND-9, avoids N+1):
```ts
const overrides = await prisma.enrollmentOverride.findMany({
  where: { enrollmentId, moduleId },
  orderBy: { createdAt: 'asc' },
  take: 200,
});
```

## Route Design

### Review template routes (added to `routes/programs.ts` or new file)

```
POST /api/programs/:id/review-template
  middleware: authenticate → requireRole('CLINICIAN','ADMIN') → validate(UpsertReviewTemplateSchema)
  handler: calls upsertTemplate(clinicianProfileId, programId, body)

GET /api/programs/:id/review-template
  middleware: authenticate → requireRole('CLINICIAN','ADMIN')
  handler: calls getOrDefaultTemplate(programId) after verifying program ownership
```

### Session review routes (added to `routes/appointments.ts`)

```
POST /api/appointments/:id/review
  middleware: authenticate → requireRole('PARTICIPANT') → validate(SubmitReviewSchema)
  handler: calls submitReview(participantProfileId, appointmentId, body)

GET /api/appointments/:id/review
  middleware: authenticate → requireRole('CLINICIAN','ADMIN') → requirePracticeCtx
  handler: calls getReviewForAppointment(appointmentId) after verifying appointment ownership

GET /api/appointments/:id/prep
  middleware: authenticate → requireRole('CLINICIAN','ADMIN') → requirePracticeCtx
  handler: calls getSessionPrep(ctx, appointmentId)
```

### Participant review route

```
GET /api/participant/appointments/:id/review
  middleware: authenticate → requireRole('PARTICIPANT')
  handler: calls getReviewWithTemplate(participantProfileId, appointmentId)
```

### Enrollment override routes (new `routes/enrollment-overrides.ts`)

```
POST /api/enrollments/:id/overrides
  middleware: authenticate → requireRole('CLINICIAN','ADMIN') → validate(CreateOverrideSchema)
  handler: calls createOverride(clinicianProfileId, enrollmentId, body)

GET /api/enrollments/:id/overrides
  middleware: authenticate → requireRole('CLINICIAN','ADMIN')
  handler: calls listOverrides(clinicianProfileId, enrollmentId)

DELETE /api/enrollments/:id/overrides/:overrideId
  middleware: authenticate → requireRole('CLINICIAN','ADMIN')
  handler: calls deleteOverride(clinicianProfileId, enrollmentId, overrideId)
```

## Data Flow Scenarios

### Scenario 1: Participant submits review

1. Participant opens review screen in mobile app (triggered by push notification or manual navigation).
2. Mobile app `GET /api/participant/appointments/:id/review` — returns template + existing review data (or null).
3. Participant fills out questions and checks barriers, taps Submit.
4. Mobile app `POST /api/appointments/:id/review` with `{ responses: [...], barriers: [...] }`.
5. `authenticate` verifies JWT, `requireRole('PARTICIPANT')` checks role.
6. `validate(SubmitReviewSchema)` parses body — validates answer lengths (max 2000), barrier count.
7. `submitReview` resolves enrollment: finds participant's active enrollment where `enrollment.program` matches the appointment's linked enrollment program. If no enrollment found -> 404.
8. `prisma.sessionReview.upsert({ where: { appointmentId_enrollmentId }, create: {...}, update: {...} })`. Audit middleware fires.
9. Returns created/updated review. Mobile shows success state.

### Scenario 2: Clinician opens session prep

1. Clinician clicks "Prepare" on an appointment card in the calendar.
2. Browser navigates to `/sessions/prep/[appointmentId]`.
3. Web app `GET /api/appointments/:id/prep`.
4. Middleware chain: `authenticate` -> `requireRole('CLINICIAN','ADMIN')` -> `requirePracticeCtx`.
5. `getSessionPrep(ctx, appointmentId)`:
   - Loads appointment filtered by `ctx.practiceId`. Not found -> 404.
   - Verifies `appointment.clinicianId === ctx.clinicianProfileId || ctx.isAccountOwner`.
   - Resolves enrollment from `appointment.participantId` (finds active enrollment in a program owned by the practice).
   - Runs parallel queries: review, homework status, stats, trackers, last session.
6. Returns aggregated `SessionPrepData`. Web renders 3-panel layout.

### Scenario 3: Override merge at module delivery

1. Participant `GET /api/participant/modules/:id` (existing endpoint).
2. Existing service loads module parts + part progress.
3. **New step**: service loads `EnrollmentOverride.findMany({ where: { enrollmentId, moduleId } })` — single query, bounded by `take: 200`.
4. Calls `applyOverrides(parts, overrides)`.
5. Hidden parts are filtered out. Added resources/homework injected with `source: 'override'`. Clinician notes attached.
6. Returns merged result. Participant sees customized view transparently.

### Scenario 4: 24h notification trigger

1. Appointment is created or updated via existing appointment endpoints.
2. **New hook** in `services/appointments.ts` `createAppointment`/`updateAppointment`: after successful save, check if `startAt > now + 24h`.
3. If yes, enqueue pg-boss job: `queue.send('review-notification', { appointmentId, participantUserId }, { startAfter: startAt - 24h })`.
4. If appointment was rescheduled, cancel previous job: `queue.cancel('review-notification', previousJobId)`.
5. Worker (in `services/queue.ts`): loads appointment, checks status is still SCHEDULED. If cancelled, skip. Otherwise, sends push notification via Expo Server SDK: "Your session is tomorrow. Take 5 minutes to complete your Steady Work Review."
6. Job ID stored on appointment metadata or tracked via pg-boss's built-in job management.

## Zod Schemas

### `packages/shared/src/schemas/review.ts` (new)

```ts
export const ReviewQuestionSchema = z.object({
  id: z.string().max(50),
  text: z.string().min(1).max(500),
  enabled: z.boolean().default(true),
});

export const ReviewBarrierSchema = z.object({
  id: z.string().max(50),
  label: z.string().min(1).max(200),
  enabled: z.boolean().default(true),
});

export const UpsertReviewTemplateSchema = z.object({
  questions: z.array(ReviewQuestionSchema).min(1).max(10),
  barriers: z.array(ReviewBarrierSchema).min(1).max(20),
});

export const SubmitReviewSchema = z.object({
  responses: z.array(z.object({
    questionId: z.string().max(50),
    question: z.string().max(500),
    answer: z.string().max(2000),
  })).min(1).max(10),
  barriers: z.array(z.string().max(200)).max(20),
});

export const DEFAULT_REVIEW_TEMPLATE = { questions: [...], barriers: [...] };
// 4 default questions, 9 default barriers — defined as constants
```

### `packages/shared/src/schemas/enrollment-override.ts` (new)

```ts
export const OverrideTypeEnum = z.enum([
  'HIDE_HOMEWORK_ITEM', 'ADD_HOMEWORK_ITEM', 'ADD_RESOURCE', 'CLINICIAN_NOTE'
]);

export const CreateOverrideSchema = z.object({
  overrideType: OverrideTypeEnum,
  moduleId: z.string().cuid().optional(),
  targetPartId: z.string().cuid().optional(),
  payload: z.record(z.unknown()),
}).superRefine((data, ctx) => {
  if (data.overrideType === 'HIDE_HOMEWORK_ITEM' && !data.targetPartId) {
    ctx.addIssue({ code: 'custom', path: ['targetPartId'], message: 'targetPartId required for HIDE_HOMEWORK_ITEM' });
  }
  if (['ADD_RESOURCE', 'CLINICIAN_NOTE', 'ADD_HOMEWORK_ITEM'].includes(data.overrideType) && !data.moduleId) {
    ctx.addIssue({ code: 'custom', path: ['moduleId'], message: 'moduleId required for this override type' });
  }
});
```

## Compliance Traceability

| Condition | Implementation |
|---|---|
| **COND-1** Ownership verification | Review service checks appointment ownership via practice; override service checks `enrollment.program.clinicianId`. Cross-ownership -> 404. |
| **COND-2** Prep authorization | `getSessionPrep` filters appointment by `ctx.practiceId` and verifies clinician ownership. Sub-queries scoped to resolved enrollment. |
| **COND-3** Audit on mutations | Existing Prisma audit middleware covers new models automatically. No additional audit code needed. |
| **COND-4** Audit context | All routes use `authenticate` which wraps in `runWithAuditUser`. Inherited. |
| **COND-5** No PHI in logs | Route handlers use `logger.error("<op>", err)` — never pass body/responses. |
| **COND-6** Override isolation | `applyOverrides` receives overrides pre-filtered by `enrollmentId`. Participant module delivery endpoint resolves enrollment from JWT `participantProfileId`. |
| **COND-7** Review access control | `submitReview` verifies `participantProfileId` matches enrollment. `getReviewForAppointment` verifies clinician owns appointment. |
| **COND-8** Job payload PHI-free | Job data: `{ appointmentId, participantUserId }` only. Worker resolves push token and text at execution time. |
| **COND-9** Override merge integrity | Single prefetch query. `applyOverrides` is a pure function with unit tests. `source: 'override'` marker on injected items. |
| **COND-10** Review uniqueness | `@@unique([appointmentId, enrollmentId])` in schema. Service uses `upsert`. |

## File Structure

### New files

```
packages/db/prisma/migrations/20260405_sprint14_review_overrides/
  └── migration.sql

packages/shared/src/schemas/
  ├── review.ts                             # NEW — review template + submit schemas
  └── enrollment-override.ts                # NEW — override schemas

packages/api/src/services/
  ├── review-templates.ts                   # NEW
  ├── session-reviews.ts                    # NEW
  ├── session-prep.ts                       # NEW
  └── enrollment-overrides.ts               # NEW

packages/api/src/routes/
  └── enrollment-overrides.ts               # NEW

packages/api/src/__tests__/
  ├── session-review.test.ts                # NEW (integration)
  ├── enrollment-overrides.test.ts          # NEW (integration)
  ├── session-prep.test.ts                  # NEW (integration)
  └── override-merge.test.ts               # NEW (unit — applyOverrides)

packages/shared/src/__tests__/
  ├── review.schema.test.ts                 # NEW
  └── enrollment-override.schema.test.ts    # NEW

apps/web/src/app/(dashboard)/sessions/prep/[appointmentId]/
  └── page.tsx                              # NEW — session prep view

apps/web/src/components/session-prep/
  ├── ReviewPanel.tsx                       # NEW
  ├── HomeworkPanel.tsx                     # NEW
  └── StatsNotesPanel.tsx                   # NEW

apps/web/src/components/enrollment/
  └── CustomizeTab.tsx                      # NEW

apps/web/src/hooks/
  ├── useSessionPrep.ts                     # NEW
  ├── useReviewTemplate.ts                  # NEW
  └── useEnrollmentOverrides.ts             # NEW

apps/mobile/app/(app)/appointments/[id]/
  └── review.tsx                            # NEW — review submission screen

apps/mobile/components/
  └── ReviewForm.tsx                        # NEW
```

### Modified files

```
packages/db/prisma/schema.prisma            # add enum + 3 models + relations
packages/shared/src/schemas/index.ts        # re-export new schemas
packages/api/src/index.ts                   # mount enrollment-overrides router
packages/api/src/routes/appointments.ts     # add review + prep endpoints
packages/api/src/routes/programs.ts         # add review-template endpoints
packages/api/src/services/participant.ts    # integrate applyOverrides into module delivery
packages/api/src/services/appointments.ts   # add notification job hook on create/update
packages/api/src/services/queue.ts          # add review-notification worker
packages/api/src/__tests__/helpers.ts       # add mockReviewTemplate, mockSessionReview, mockOverride
apps/web/src/components/layout/Sidebar.tsx  # no change (prep is linked from calendar, not sidebar)
```

## Migration Plan

1. **Single forward-only Prisma migration**: creates `OverrideType` enum, `review_templates`, `session_reviews`, `enrollment_overrides` tables with all indexes, FKs, and unique constraints.
2. **No data backfill**: all new tables start empty. Existing appointments have no reviews. Programs use default template until configured.
3. **No destructive changes**: existing tables untouched except adding relations to `Program`, `Appointment`, `Enrollment`, `Module`, `Part`, `ParticipantProfile`.

## Technology Choices

| Decision | Choice | Rationale |
|---|---|---|
| Review template storage | JSON columns on ReviewTemplate | Flexible question/barrier schema; avoids join tables for a naturally small, program-owned config |
| Override payload storage | JSON column with type-discriminated validation | Each override type has different payload shape; JSON + Zod validation at API boundary is clean |
| Session prep aggregation | Parallel Prisma queries in service | Matches existing `getSessionPrepData` pattern; no new query patterns needed |
| Notification scheduling | pg-boss `startAfter` | Already used for RTM and notification workers; no new infrastructure |
| Override merge | Pure function in service layer | Testable, no side effects, single prefetch avoids N+1 |
