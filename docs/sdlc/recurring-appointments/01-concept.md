# Recurring Appointments — Concept

## Problem

Clinicians schedule weekly or biweekly standing appointments with most clients. Today they must manually create each appointment one at a time. A clinician with 20 weekly clients creates 80+ appointments per month by hand. This is tedious, error-prone, and a top-requested feature from early adopters.

## Proposed Solution

Allow clinicians to define a **recurring series** — a template that automatically generates individual appointments on a rolling 4-week window. Each generated appointment is a normal `Appointment` row that the clinician can edit, cancel, or mark attended independently.

## Key Behaviors

- **Series definition:** clinician picks a client, service code, location, day of week, time, and recurrence rule (weekly / biweekly / monthly).
- **Rolling generation:** a pg-boss cron job runs daily and fills in the next 4 weeks of appointments for every active series. On series creation, the first 4 weeks are generated immediately.
- **Independence:** each generated appointment is fully independent. Canceling one occurrence does not affect the series. Editing one does not change others.
- **Edit-all-future:** clinicians can update the series itself (time, location, service code). This regenerates future SCHEDULED appointments while leaving past/attended/canceled ones untouched.
- **Pause / resume:** clinicians can pause a series to stop generation (e.g., client on vacation) and resume later.
- **Delete:** deleting a series removes all future SCHEDULED linked appointments. Historical appointments are kept.

## User Impact

- Saves 5-10 minutes per client per month for clinicians with standing appointments.
- Reduces scheduling errors (forgotten appointments, wrong times).
- Calendar shows recurring appointments with a visual indicator for easy identification.

## Risks

- Generation must not create duplicates (idempotency check on series + date).
- Series data is PHI (links clinician + participant + schedule) — same tenant isolation as appointments.
- Must not generate appointments in the past.

## Out of Scope

- Availability blocks / client-initiated booking.
- Reminders for recurring appointments (handled by existing notification system).
- Drag-to-reschedule entire series.
- Recurring appointments for group sessions.
