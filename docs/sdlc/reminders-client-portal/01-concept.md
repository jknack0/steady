# Automated Appointment Reminders + Client Portal — Concept

## Problem Statement

Steady's scheduling system lacks automated reminders, leading to higher no-show rates. Additionally, participants have no visibility into their invoices and no self-service cancellation capability, creating unnecessary back-and-forth with clinicians.

## Feature 1: Automated Appointment Reminders

### Core Idea

When an appointment is created (single or recurring), the system automatically generates push notification reminders at configurable intervals before the appointment. Default: 24 hours and 1 hour before. Clinicians can customize reminder timing via settings.

### Key Decisions

- **Push-only initially**: Email and SMS are deferred. Push via existing Expo Server SDK infrastructure.
- **Configurable per clinician**: Each clinician can set their own reminder times (e.g., 48h + 2h) or disable entirely.
- **Lifecycle-aware**: Reminders auto-cancel when appointments are canceled. Reminders recalculate when appointments are rescheduled.
- **PHI-minimal**: Notification text says "You have an appointment at [time]" — no diagnosis, service type, or clinician specialty.

### Risks

- Reminder scheduling must handle timezone correctly for participants.
- Cron job must process potentially large batches efficiently (5-minute polling window).
- Reminder content must be PHI-minimal per HIPAA.

## Feature 2: Client Portal

### Core Idea

Participants gain three new capabilities in the mobile app:
1. **View invoices**: See SENT/PAID/OVERDUE invoices (never DRAFT/VOID), stripped of clinician notes.
2. **Cancel appointments**: Self-service cancellation for SCHEDULED appointments, changing status to CLIENT_CANCELED.
3. **Pending forms surface**: A card on the Today screen shows incomplete intake forms.

### Key Decisions

- **Read-only billing**: No payment processing — just invoice visibility with "Contact your clinician" guidance.
- **PHI stripping**: Participant invoice view never includes clinician notes field.
- **Cancellation guard**: Only SCHEDULED appointments can be canceled. Audit-logged.
- **Cross-participant isolation**: Participants can only see their own invoices and appointments.

### Risks

- Invoice status filtering must be airtight (never expose DRAFT/VOID).
- Participant cancellation needs clear audit trail.
- Outstanding invoice card on Today screen must not reveal amount details in notification-like surfaces.

## Success Metrics

- No-show rate reduction (measurable after 30 days of reminder usage).
- Participant self-service cancellation adoption (reduces clinician admin burden).
- Invoice inquiry reduction (participants can check status themselves).

## Scope Boundaries

**In scope**: Push reminders, reminder settings, participant invoice list/detail, participant cancellation, pending forms card, outstanding invoices card on Today screen.

**Out of scope**: Email/SMS reminders, payment processing, clinician-to-participant messaging about invoices, reminder customization per appointment (only per clinician), web-based client portal.
