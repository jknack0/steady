# Automated Appointment Reminders + Client Portal — Feature Specification

## Overview

Two features completing Steady's practice management story: automated push notification reminders for appointments and a participant-facing portal for viewing invoices, self-canceling appointments, and surfacing pending intake forms.

## Glossary

| Term | Definition |
|---|---|
| **AppointmentReminder** | A scheduled notification record linked to an appointment. Sent at a configured time before the appointment. |
| **ReminderSettings** | Clinician-level configuration for reminder behavior (enabled, timing intervals). Stored as JSON on ClinicianConfig. |
| **Client Portal** | Participant-facing views for invoices, appointment management, and intake forms. |

---

## Feature 1: Automated Appointment Reminders

### FR-1: Reminder auto-creation

Reminders are automatically created when an appointment is created.

**Acceptance Criteria:**
- **GIVEN** an appointment is created (single or from recurring series)
  **WHEN** the appointment is persisted
  **THEN** AppointmentReminder rows are created for each configured reminder time (default: 24h and 1h before startAt)
- **GIVEN** a clinician has disabled reminders in their settings
  **WHEN** an appointment is created
  **THEN** no AppointmentReminder rows are created
- **GIVEN** a reminder's scheduledFor time is in the past
  **WHEN** the appointment is created
  **THEN** that specific reminder is NOT created (skip past reminders)
- **GIVEN** an appointment is created
  **WHEN** reminders are generated
  **THEN** each reminder has status PENDING, type PUSH, and scheduledFor = startAt minus configured minutes

### FR-2: Reminder processing (cron)

A pg-boss cron job processes pending reminders.

**Acceptance Criteria:**
- **GIVEN** the cron job runs every 5 minutes
  **WHEN** there are PENDING reminders with scheduledFor <= now
  **THEN** each reminder triggers a push notification to the participant and status changes to SENT
- **GIVEN** a reminder for a participant without a push token
  **WHEN** processed
  **THEN** the reminder status changes to FAILED
- **GIVEN** a reminder send fails (Expo SDK error)
  **WHEN** the error occurs
  **THEN** the reminder status changes to FAILED and the error is logged (no PII)
- **GIVEN** the cron job processes reminders
  **WHEN** it queries
  **THEN** it processes at most 100 reminders per batch to avoid timeouts

### FR-3: Reminder cancellation on appointment cancel/delete

**Acceptance Criteria:**
- **GIVEN** an appointment status changes to any cancellation status (CLIENT_CANCELED, CLINICIAN_CANCELED, LATE_CANCELED)
  **WHEN** the status change commits
  **THEN** all PENDING reminders for that appointment are set to CANCELED
- **GIVEN** an appointment is deleted
  **WHEN** the delete commits
  **THEN** all reminders for that appointment are cascade-deleted
- **GIVEN** an appointment status changes to ATTENDED or NO_SHOW
  **WHEN** the status change commits
  **THEN** all PENDING reminders for that appointment are set to CANCELED

### FR-4: Reminder recalculation on reschedule

**Acceptance Criteria:**
- **GIVEN** an appointment's startAt or endAt is updated
  **WHEN** the update commits
  **THEN** all PENDING reminders are deleted and new reminders are created based on the new startAt
- **GIVEN** a reschedule that moves startAt to less than 1 hour from now
  **WHEN** reminders are recalculated
  **THEN** only future reminders are created (e.g., if 24h reminder is past but 1h is future, only 1h is created)

### FR-5: Reminder settings (clinician configuration)

**Acceptance Criteria:**
- **GIVEN** a clinician
  **WHEN** they `GET /api/config/reminders`
  **THEN** their current reminder settings are returned (or defaults if not configured)
- **GIVEN** a clinician
  **WHEN** they `PUT /api/config/reminders` with `{ enableReminders: true, reminderTimes: [1440, 60] }`
  **THEN** the settings are saved to ClinicianConfig.reminderSettings
- **GIVEN** a PUT with reminderTimes containing values < 5 or > 10080 (7 days)
  **WHEN** submitted
  **THEN** the API responds 400 Bad Request
- **GIVEN** a PUT with more than 5 reminder times
  **WHEN** submitted
  **THEN** the API responds 400 Bad Request

### FR-6: View reminders for an appointment (clinician)

**Acceptance Criteria:**
- **GIVEN** a clinician who owns an appointment
  **WHEN** they `GET /api/appointments/:id/reminders`
  **THEN** all reminders for that appointment are returned with id, type, scheduledFor, sentAt, status
- **GIVEN** a clinician who does not own the appointment
  **WHEN** they request reminders
  **THEN** the API responds 404

### FR-7: Reminder notification content

**Acceptance Criteria:**
- **GIVEN** a 24h reminder is sent
  **WHEN** the notification reaches the participant
  **THEN** the title is "Appointment Tomorrow" and body is "You have an appointment tomorrow at [formatted time]"
- **GIVEN** a 1h reminder is sent
  **WHEN** the notification reaches the participant
  **THEN** the title is "Appointment Soon" and body is "Your appointment is in 1 hour"
- **GIVEN** any reminder
  **WHEN** sent
  **THEN** the notification NEVER includes diagnosis, service code, clinician specialty, or treatment details

---

## Feature 2: Client Portal

### FR-8: Participant invoice list

**Acceptance Criteria:**
- **GIVEN** an authenticated participant
  **WHEN** they `GET /api/participant/invoices`
  **THEN** only their invoices with status SENT, PAID, PARTIALLY_PAID, or OVERDUE are returned
- **GIVEN** the participant has DRAFT or VOID invoices
  **WHEN** they request the list
  **THEN** those invoices are NOT included
- **GIVEN** the response
  **WHEN** invoices are serialized
  **THEN** the clinician `notes` field is NEVER included
- **GIVEN** more than 50 invoices match
  **WHEN** the request has no cursor
  **THEN** the first 50 are returned with a cursor for pagination

### FR-9: Participant invoice detail

**Acceptance Criteria:**
- **GIVEN** an authenticated participant
  **WHEN** they `GET /api/participant/invoices/:id`
  **THEN** the invoice is returned with line items (description, quantity, unit price, total) but NO clinician notes
- **GIVEN** a participant requesting an invoice they do not own
  **WHEN** submitted
  **THEN** the API responds 404
- **GIVEN** a participant requesting a DRAFT or VOID invoice
  **WHEN** submitted
  **THEN** the API responds 404

### FR-10: Participant appointment cancellation

**Acceptance Criteria:**
- **GIVEN** an authenticated participant with a SCHEDULED appointment
  **WHEN** they `POST /api/participant/appointments/:id/cancel`
  **THEN** the appointment status changes to CLIENT_CANCELED and an audit log is written
- **GIVEN** a participant trying to cancel an appointment they do not own
  **WHEN** submitted
  **THEN** the API responds 404
- **GIVEN** a participant trying to cancel an appointment not in SCHEDULED status
  **WHEN** submitted
  **THEN** the API responds 409 Conflict
- **GIVEN** a successful cancellation
  **WHEN** committed
  **THEN** all PENDING reminders for that appointment are set to CANCELED

### FR-11: Appointment card reminder indicator (mobile)

**Acceptance Criteria:**
- **GIVEN** the participant appointment list screen
  **WHEN** an appointment has PENDING reminders
  **THEN** the card shows a "Reminder set" indicator
- **GIVEN** an appointment card for a SCHEDULED appointment
  **WHEN** rendered
  **THEN** a "Cancel Appointment" button is displayed

### FR-12: Invoices screen (mobile)

**Acceptance Criteria:**
- **GIVEN** the participant navigates to the invoices screen
  **WHEN** the screen loads
  **THEN** a list of their SENT/PAID/OVERDUE invoices is shown
- **GIVEN** a participant taps an invoice
  **WHEN** the detail screen loads
  **THEN** line items, total, balance due, and payment history are displayed
- **GIVEN** the invoice detail screen
  **WHEN** rendered
  **THEN** a message "Contact your clinician to arrange payment" is shown

### FR-13: Today screen enhancements (mobile)

**Acceptance Criteria:**
- **GIVEN** the participant has incomplete intake form parts
  **WHEN** the Today screen loads
  **THEN** a "Pending Forms" card is shown with a count
- **GIVEN** the participant has SENT or OVERDUE invoices
  **WHEN** the Today screen loads
  **THEN** an "Outstanding Invoices" card is shown with a count

---

## Permissions

| Actor | Can do |
|---|---|
| **Clinician** | Configure reminder settings, view reminders for own appointments |
| **Account owner** | Same as clinician (practice-wide) |
| **Participant** | View own invoices (SENT/PAID/OVERDUE only), cancel own SCHEDULED appointments, see reminder indicators |

## API Surface

| Method | Path | Purpose | Role |
|---|---|---|---|
| GET | `/api/appointments/:id/reminders` | List reminders for appointment | CLINICIAN |
| GET | `/api/config/reminders` | Get reminder settings | CLINICIAN |
| PUT | `/api/config/reminders` | Update reminder settings | CLINICIAN |
| GET | `/api/participant/invoices` | List participant invoices | PARTICIPANT |
| GET | `/api/participant/invoices/:id` | Get invoice detail | PARTICIPANT |
| POST | `/api/participant/appointments/:id/cancel` | Cancel appointment | PARTICIPANT |

## Non-Functional Requirements

- Reminder cron runs every 5 minutes, processes max 100 per batch.
- Participant invoice endpoint never returns DRAFT/VOID.
- All mutations audit-logged.
- Push notification text is PHI-minimal.
- Cross-participant isolation enforced.
