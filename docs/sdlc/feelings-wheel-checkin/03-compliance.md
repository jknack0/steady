# Feelings Wheel Check-in — Compliance Assessment

## Overall Verdict: PASS

## Frameworks Assessed
- HIPAA (Privacy Rule, Security Rule)
- SOC2 (Trust Services Criteria — Security, Availability, Confidentiality)
- State mental health data regulations (42 CFR Part 2 consideration)

## Data Classification

The emotion selections (e.g., "sad-lonely-isolated") constitute **Protected Health Information (PHI)** under HIPAA. They are health-related data tied to an identifiable individual (the participant) within a clinical treatment context. Sensitivity is **moderate** — emotion check-ins are not substance abuse records (42 CFR Part 2 does not apply) nor psychotherapy notes (which have heightened HIPAA protections under 45 CFR 164.508(a)(2)), but they are clinical observations used in ADHD treatment monitoring.

The data is stored as string identifiers rather than free-text narrative, which inherently limits the granularity of information captured. This is a favorable design choice from a data minimization standpoint.

## Assessment by Area

### Authentication & Authorization
**Status:** PASS

The feature operates entirely within the existing Daily Tracker system, which already requires JWT authentication on all endpoints. Mutations go through `authenticate` + `requireRole()` middleware. No new endpoints are introduced — only existing POST/PUT/GET tracker routes are extended. The 30-minute access token lifetime and auto-refresh flow apply without modification.

### Data Storage & Encryption
**Status:** PASS

Emotion selections are stored in the existing `DailyTrackerEntry.responses` JSON column in PostgreSQL. This column already exists and is used for all tracker field types. The database runs on PostgreSQL with existing encryption controls. No new tables, columns, or storage mechanisms are introduced. The `DailyTrackerField.options` JSON column storing `{ maxSelections: number }` contains only configuration data, not PHI.

S3 is not involved (no file uploads). No new external services are called.

### Audit Logging
**Status:** PASS

The Prisma audit middleware in `packages/db/src/audit-middleware.ts` automatically logs all CREATE/UPDATE/DELETE operations on `DailyTrackerEntry` records. Since emotion data is written to an existing model via existing code paths, audit coverage is automatic. The audit system logs user ID, action, resource type, and resource ID — never field values — so emotion selections will not leak into audit logs. This is the correct behavior: the audit trail proves *who* submitted *when*, without duplicating PHI in the audit table.

### Data Minimization
**Status:** PASS

This is a strong point of the design:
- Emotions are stored as compact string IDs (e.g., "fearful-anxious-overwhelmed"), not verbose descriptions or free text.
- The taxonomy is a static constant shipped in the client app — no server-side storage of the full emotion tree.
- `maxSelections` (capped at 3) limits the volume of data collected per entry.
- No new PII fields are introduced. No demographic, diagnostic, or identifying data is added beyond what the existing tracker system already captures.
- The feature collects only what is clinically necessary for ADHD treatment monitoring.

### Access Control
**Status:** PASS

The feature relies on existing ownership verification: only the participant's assigned clinician can view their tracker data. The spec explicitly confirms this. The existing pattern — where route handlers verify that the requesting clinician owns the program/enrollment associated with the participant — applies without modification. Participants can only submit entries for their own enrollments.

The trends endpoint extension returns emotion frequency data through the same access-controlled path. No new roles or permission levels are required.

### Data Transmission
**Status:** PASS

All API communication uses HTTPS in production (enforced at the infrastructure level via Railway). Emotion data travels in the same request/response bodies as existing tracker responses. No new transmission channels, webhooks, or third-party integrations are introduced.

## Conditions (if PASS_WITH_CONDITIONS)

None. The feature is a narrow extension of an existing, already-compliant system. It introduces no new data flows, storage mechanisms, access patterns, or external integrations.

## Recommendations (non-blocking)

1. **Validate emotion IDs server-side against the canonical taxonomy.** The spec mentions service-layer validation for emotion IDs. Ensure this checks against a whitelist of valid emotion strings rather than just checking format. This prevents injection of arbitrary strings into the responses JSON column and keeps the data clean for trend analysis.

2. **Consider a retention policy note.** While not a blocker (the existing tracker system presumably has a retention approach), emotion trend data accumulated over months/years could become a detailed psychological profile. Document in the data retention policy how long daily tracker entries (including emotion data) are retained and under what conditions they are purged.

3. **Trends endpoint: enforce reasonable time range bounds.** The spec mentions "configurable time ranges" for the clinician dashboard widget. Ensure the API enforces a maximum lookback window (e.g., 12 months) to prevent unbounded queries and to align with data minimization principles — clinicians should view clinically relevant windows, not unlimited history.

4. **Document the clinical purpose.** For SOC2 and HIPAA policy documentation, briefly note that emotion tracking serves a specific clinical function in ADHD treatment (emotional dysregulation monitoring) rather than being a general wellness feature. This strengthens the "minimum necessary" justification under the HIPAA Privacy Rule.
