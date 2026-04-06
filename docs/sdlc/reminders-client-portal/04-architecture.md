# Automated Appointment Reminders + Client Portal — Architecture

## System Overview

Two features are layered onto the existing appointment + billing infrastructure:

1. **Reminders**: New `AppointmentReminder` model, service layer with lifecycle hooks into appointment CRUD, pg-boss cron worker.
2. **Client Portal**: New participant-facing API routes for invoices and cancellation, mobile screens consuming them.

---

## Data Model

### New Model: AppointmentReminder

```prisma
enum ReminderType {
  EMAIL
  PUSH
  SMS
}

enum ReminderStatus {
  PENDING
  SENT
  FAILED
  CANCELED
}

model AppointmentReminder {
  id            String         @id @default(cuid())
  appointmentId String
  appointment   Appointment    @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  type          ReminderType   @default(PUSH)
  scheduledFor  DateTime
  sentAt        DateTime?
  status        ReminderStatus @default(PENDING)
  createdAt     DateTime       @default(now())

  @@index([status, scheduledFor])
  @@index([appointmentId])
  @@map("appointment_reminders")
}
```

### Modified Model: ClinicianConfig

Add `reminderSettings Json?` field to store:
```json
{
  "enableReminders": true,
  "reminderTimes": [1440, 60]
}
```

### Modified Model: Appointment

Add relation:
```prisma
reminders AppointmentReminder[]
```

---

## API Design

### Reminder Endpoints (Clinician)

**GET /api/appointments/:id/reminders**
- Auth: CLINICIAN role + practice context
- Returns: `{ success: true, data: AppointmentReminder[] }`
- Validates appointment ownership

**GET /api/config/reminders**
- Auth: CLINICIAN role
- Returns: `{ success: true, data: { enableReminders: boolean, reminderTimes: number[] } }`
- Defaults: `{ enableReminders: true, reminderTimes: [1440, 60] }`

**PUT /api/config/reminders**
- Auth: CLINICIAN role
- Body: `{ enableReminders: boolean, reminderTimes: number[] }`
- Validation: times between 5-10080, max 5 entries
- Persists to ClinicianConfig.reminderSettings

### Participant Endpoints

**GET /api/participant/invoices**
- Auth: PARTICIPANT role
- Query: `{ cursor?, limit? }`
- Returns: Paginated invoices (SENT/PAID/PARTIALLY_PAID/OVERDUE only), no `notes` field
- Filter: `participantId = authenticated user's participant profile`

**GET /api/participant/invoices/:id**
- Auth: PARTICIPANT role
- Returns: Invoice with line items, no `notes` field
- Validates ownership + status is not DRAFT/VOID

**POST /api/participant/appointments/:id/cancel**
- Auth: PARTICIPANT role
- Body: `{ cancelReason?: string }`
- Validates: appointment belongs to participant, status is SCHEDULED
- Sets status to CLIENT_CANCELED, cancels PENDING reminders
- Audit-logged

---

## Service Layer

### appointment-reminders.ts

```
createRemindersForAppointment(appointmentId, clinicianId, startAt)
  - Reads clinician's reminder settings
  - Creates AppointmentReminder rows for each configured time that is in the future
  - Skips if enableReminders is false

cancelRemindersForAppointment(appointmentId)
  - Updates all PENDING reminders to CANCELED

rescheduleReminders(appointmentId, clinicianId, newStartAt)
  - Deletes all PENDING reminders
  - Creates new reminders for the new startAt

processReminders()
  - Queries PENDING reminders where scheduledFor <= now, limit 100
  - For each: look up participant user, send push, update status
  - Returns count of sent/failed

getRemindersForAppointment(appointmentId)
  - Returns all reminders for the appointment
```

### participant-portal.ts

```
getParticipantInvoices(participantProfileId, { cursor, limit })
  - Queries invoices where participantId matches and status in [SENT, PAID, PARTIALLY_PAID, OVERDUE]
  - Returns paginated results with toParticipantInvoiceView serializer

getParticipantInvoice(participantProfileId, invoiceId)
  - Single invoice with line items
  - Validates ownership and status
  - Returns with toParticipantInvoiceView serializer

participantCancelAppointment(participantProfileId, userId, appointmentId, cancelReason?)
  - Validates appointment ownership and SCHEDULED status
  - Updates to CLIENT_CANCELED
  - Cancels pending reminders
  - Creates audit log
```

---

## Integration Points

### Appointment Service Hooks

1. **createAppointment** (appointments.ts): After successful create, call `createRemindersForAppointment`
2. **changeStatus** (appointments.ts): When status becomes terminal, call `cancelRemindersForAppointment`
3. **updateAppointment** (appointments.ts): When startAt changes, call `rescheduleReminders`
4. **deleteAppointment** (appointments.ts): Cascade delete handles reminders (ON DELETE CASCADE)
5. **generateSeriesAppointments** (recurring-series.ts): After creating each appointment, call `createRemindersForAppointment`

### Queue Integration

Register in queue.ts:
- New queue: `process-appointment-reminders`
- Cron schedule: `*/5 * * * *` (every 5 minutes)
- Worker calls `processReminders()` from appointment-reminders service

### Notification Integration

Reminder processing uses the existing `queueNotification` function from notifications.ts for actual push delivery, with category "APPOINTMENT".

---

## Serialization

### toParticipantInvoiceView(invoice)

Returns:
```typescript
{
  id, invoiceNumber, status, issuedAt, dueAt,
  subtotalCents, taxCents, totalCents, paidCents,
  lineItems: [{ description, unitPriceCents, quantity, totalCents }],
  payments: [{ amountCents, method, receivedAt }],
  clinician: { firstName, lastName }
}
```

Explicitly excludes: `notes`, `practiceId`, `clinicianId` (raw ID), `createdAt`, `updatedAt`.

### toParticipantInvoiceListView(invoice)

Returns:
```typescript
{
  id, invoiceNumber, status, issuedAt, dueAt,
  totalCents, paidCents,
  clinician: { firstName, lastName }
}
```

---

## Mobile Architecture

### New Screens

- `/invoices` — Invoice list (accessible from Settings or Today card)
- `/invoices/[id]` — Invoice detail

### Updated Screens

- `/appointments` — Add cancel button + reminder indicator
- `/(tabs)/today` — Add "Pending Forms" and "Outstanding Invoices" cards

### New Hooks

- `use-invoices.ts` — `useMyInvoices()`, `useMyInvoice(id)`
- Update `use-appointments.ts` — Add `useCancelAppointment()`

### API Client Additions

Add to `apps/mobile/lib/api.ts`:
- `getMyInvoices(params?)` — GET /api/participant/invoices
- `getMyInvoice(id)` — GET /api/participant/invoices/:id
- `cancelMyAppointment(id, reason?)` — POST /api/participant/appointments/:id/cancel

---

## Error Handling

| Scenario | Response |
|---|---|
| Participant requests DRAFT/VOID invoice | 404 |
| Participant requests other user's invoice | 404 |
| Participant cancels non-SCHEDULED appointment | 409 |
| Participant cancels other user's appointment | 404 |
| Reminder cron fails | Logged, individual reminder marked FAILED |
| Invalid reminder times in PUT | 400 |

---

## Database Indexes

New indexes on AppointmentReminder:
- `(status, scheduledFor)` — for cron job queries
- `(appointmentId)` — for lifecycle operations

---

## Performance Considerations

- Reminder cron processes max 100 per batch to stay under timeout.
- Invoice list is cursor-paginated, max 50 per page.
- Reminder creation is fire-and-forget (non-blocking after appointment create).
- Participant invoice query uses existing indexes on `(practiceId, participantId)` and `(practiceId, status)`.
