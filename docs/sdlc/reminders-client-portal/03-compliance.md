# Automated Appointment Reminders + Client Portal — Compliance Assessment

## HIPAA Compliance Review

### COND-1: Reminder Content as PHI

**Risk**: Push notification text reveals appointment timing, which is Protected Health Information (PHI) — it confirms the individual has a healthcare relationship and scheduled visit.

**Mitigation**:
- Notification text is minimized: "You have an appointment at [time]" or "Your appointment is in 1 hour."
- No diagnosis codes, service types, clinician specialties, or treatment details in notifications.
- Push notifications appear on device lock screens — content must be generic enough for incidental viewing.
- Category is "APPOINTMENT" — allows participants to disable via notification preferences.

**Verdict**: PASS with stated mitigations.

### COND-2: Reminder Scheduling Reveals Appointment Existence

**Risk**: The AppointmentReminder table stores scheduledFor timestamps that indirectly reveal when a patient has an appointment.

**Mitigation**:
- AppointmentReminder is accessed only through authenticated endpoints.
- Clinician access requires appointment ownership (same practice-context isolation as appointments).
- Participants never directly access the reminder table — they only see indicators ("Reminder set") on their own appointments.
- Audit middleware covers all CRUD on the new model.

**Verdict**: PASS.

### COND-3: Participant Invoice View — PHI Stripping

**Risk**: Clinician invoice notes may contain clinical observations, treatment plans, or insurance details that should not be visible to the participant.

**Mitigation**:
- The `toParticipantInvoiceView` serializer explicitly excludes the `notes` field.
- Only invoices in SENT, PAID, PARTIALLY_PAID, or OVERDUE status are returned — DRAFT (may have incomplete/sensitive notes) and VOID (may have void reasons) are excluded.
- Line item descriptions come from service code descriptions (e.g., "Psychotherapy, 45 min"), which are non-sensitive.
- Unit prices and totals are shown (participants have a right to see charges).

**Verdict**: PASS with stated mitigations.

### COND-4: Participant Appointment Cancellation — Audit Trail

**Risk**: Self-service cancellation is a status mutation on PHI (appointment records).

**Mitigation**:
- Cancellation creates an audit log entry with action UPDATE, resourceType "Appointment", changed fields ["status"], and from/to values (non-PII).
- The participant can only cancel their own SCHEDULED appointments (ownership enforced by participantProfileId match).
- Status is set to CLIENT_CANCELED (distinct from CLINICIAN_CANCELED) for clear audit attribution.

**Verdict**: PASS.

### COND-5: Cross-Participant Isolation

**Risk**: A participant could attempt to view another participant's invoices or cancel another participant's appointment.

**Mitigation**:
- Invoice list query filters by participantId matching the authenticated user's participant profile.
- Invoice detail endpoint verifies invoice.participantId matches the requesting user.
- Cancellation endpoint verifies appointment.participantId matches the requesting user.
- Mismatches return 404 (no existence leakage).

**Verdict**: PASS.

### COND-6: Reminder Worker — Batch Processing Privacy

**Risk**: The cron worker processes reminders across multiple patients in a single batch.

**Mitigation**:
- Worker logs only reminder IDs and counts, never patient names, appointment details, or times.
- Each reminder is processed independently — no cross-patient data mixing.
- Failed reminders are logged with reminder ID only.

**Verdict**: PASS.

### COND-7: Data Minimization in Mobile UI

**Risk**: Mobile screens cache data locally and may persist PHI.

**Mitigation**:
- TanStack Query caching follows existing patterns — staleTime is 60 seconds, no persistent cache.
- Invoice amounts shown on screen are derived from API response, not stored locally.
- Today screen cards show counts only ("2 outstanding invoices"), not amounts or details.

**Verdict**: PASS.

## SOC 2 Considerations

- All new endpoints require authentication (JWT).
- Role-based access enforced (CLINICIAN for reminder config, PARTICIPANT for portal endpoints).
- Audit logging covers all mutations via existing Prisma middleware.
- No new external integrations (push notifications use existing Expo SDK pipeline).

## GDPR Considerations

- No new data categories collected. Reminders are derived from existing appointment data.
- Participant can disable appointment reminders via existing notification preferences.
- No data is shared with third parties (push via Expo SDK uses device tokens already consented).

## Overall Verdict: PASS

All identified risks have adequate mitigations in the proposed design.
