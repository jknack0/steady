# Automated Appointment Reminders + Client Portal — Implementation Plan

## Completed Work

### Schema (packages/db/prisma/schema.prisma)
- Added `ReminderType` enum (EMAIL, PUSH, SMS)
- Added `ReminderStatus` enum (PENDING, SENT, FAILED, CANCELED)
- Added `AppointmentReminder` model with indexes on (status, scheduledFor) and (appointmentId)
- Added `reminders` relation on Appointment model
- Added `reminderSettings Json?` field on ClinicianConfig

### Zod Schemas (packages/shared/src/schemas/reminder.ts)
- ReminderTypeEnum, ReminderStatusEnum
- ReminderSettingsSchema with bounds validation (5-10080 min, max 5 entries)
- DEFAULT_REMINDER_SETTINGS constant
- ParticipantCancelAppointmentSchema
- ParticipantInvoiceListQuerySchema

### Services
- `packages/api/src/services/appointment-reminders.ts`: Full reminder lifecycle (create, cancel, reschedule, process cron, settings CRUD)
- `packages/api/src/services/participant-portal.ts`: Invoice list/detail with PHI stripping, appointment cancellation, outstanding count

### Routes
- `packages/api/src/routes/appointment-reminders.ts`: GET /api/appointments/:id/reminders
- Integrated into `packages/api/src/routes/config.ts`: GET/PUT /api/config/reminders
- `packages/api/src/routes/participant-portal.ts`: Participant invoice + cancellation endpoints

### Appointment Service Integration
- createAppointment: auto-creates reminders after appointment creation
- updateAppointment: reschedules reminders when startAt changes
- changeStatus: cancels PENDING reminders when appointment reaches terminal status

### Queue (packages/api/src/services/queue.ts)
- Registered `process-appointment-reminders` cron job (every 5 minutes)

### Mobile (apps/mobile)
- New invoices list screen and detail screen
- Updated appointments screen with cancel button + reminder indicator
- Updated Today screen with Outstanding Invoices card
- New use-invoices hook, updated use-appointments hook with cancel mutation
- Updated API client with new endpoints

### Tests
- 19 appointment-reminder tests (route + service unit)
- 17 participant-portal tests (invoice + cancellation)
- 21 schema validation tests
