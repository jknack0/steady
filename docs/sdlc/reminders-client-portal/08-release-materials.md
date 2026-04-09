# Automated Appointment Reminders + Client Portal — Release Materials

## Feature Summary

Two features completing Steady's practice management story:

1. **Automated Appointment Reminders**: Push notifications automatically sent before appointments (default: 24h and 1h). Configurable per clinician. Auto-cancel on appointment cancellation, auto-recalculate on reschedule.

2. **Client Portal**: Participants can view their invoices (with PHI-sensitive clinician notes stripped), self-cancel scheduled appointments, and see outstanding invoice counts on their Today screen.

## What's New for Clinicians

### Appointment Reminders
- Reminders are **automatically created** when appointments are scheduled (single or recurring)
- **Configurable**: Settings > Appointment Reminders to toggle on/off, adjust timing (24h, 1h, custom)
- **Smart lifecycle**: Reminders auto-cancel when appointments are canceled, auto-recalculate when rescheduled
- **View reminder status** on any appointment: see which reminders are pending, sent, or failed

### Client Portal Visibility
- Participants can now view their sent invoices and outstanding balances
- Participants can self-cancel scheduled appointments (status: CLIENT_CANCELED)
- All participant actions are audit-logged for compliance

## What's New for Participants

### My Invoices
- View all sent, paid, and overdue invoices from the app
- See invoice details: line items, totals, balance due, payment history
- "Contact your clinician to arrange payment" guidance

### Appointment Management
- "Reminder set" indicator on upcoming appointments
- "Cancel Appointment" button on scheduled appointments (with confirmation dialog)
- Outstanding Invoices card on the Today screen

## Technical Highlights

- **AppointmentReminder** model with pg-boss cron worker (every 5 min, max 100/batch)
- PHI-minimal push notifications: "You have an appointment at [time]" (no diagnosis/service details)
- Invoice PHI stripping: clinician notes never exposed to participants, DRAFT/VOID never shown
- 57 new tests, 1381 total tests passing
- Fully audit-logged via existing HIPAA middleware

## FAQ

**Q: Can participants see draft invoices?**
A: No. Only SENT, PAID, PARTIALLY_PAID, and OVERDUE invoices are visible.

**Q: Can participants see clinician notes on invoices?**
A: No. The `notes` field is stripped from all participant-facing invoice views.

**Q: What happens to reminders when an appointment is canceled?**
A: All PENDING reminders are automatically set to CANCELED status.

**Q: Can clinicians customize reminder timing?**
A: Yes. Settings > Appointment Reminders. Default is 24h and 1h before. Up to 5 reminder times between 5 minutes and 7 days.

**Q: Can participants cancel attended/completed appointments?**
A: No. Only SCHEDULED appointments can be canceled by participants. Other status changes require clinician action.
