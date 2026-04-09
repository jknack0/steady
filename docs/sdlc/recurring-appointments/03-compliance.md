# Recurring Appointments — Compliance Assessment

## Summary

**Risk level: LOW** — This feature extends the existing appointment system with no new PHI categories. RecurringSeries links the same entities already protected (clinician, participant, schedule). Existing controls (tenant isolation, audit logging, HIPAA-compliant logging) apply unchanged.

## PHI Analysis

| Data Element | PHI? | Controls |
|---|---|---|
| RecurringSeries.participantId | Yes — links to patient | Practice-scoped queries, 404 on cross-tenant |
| RecurringSeries.clinicianId | Yes — links to provider | Practice-scoped queries |
| RecurringSeries.internalNote | Yes — clinical context | Not exposed to participants; stripped in participant views |
| RecurringSeries.dayOfWeek/startTime/endTime | Yes — schedule PHI | Practice-scoped access only |
| Generated appointments | Same as existing | All existing appointment controls apply |

## Audit Requirements

- Series CREATE, UPDATE, DELETE logged via existing Prisma audit middleware.
- Pause/resume logged as UPDATE with changedFields: ["isActive"].
- Daily generation job runs inside `runWithAuditUser` context so each created appointment gets an audit row attributed to a system user.
- Series hard-delete: audit row written before deletion.

## Tenant Isolation

- All series queries filter by `practiceId` from `requirePracticeCtx` middleware.
- Cross-practice access returns 404 (no existence leakage).
- Generation job scopes per-series by practice — no cross-tenant data access.

## Logging

- Logger usage only — no `console.log`.
- Generation job logs: series count processed, appointments created, errors (by ID only, no PII).
- Never log participant names, times, or note content.

## Data Retention

- Series deletion is hard delete (no PII retained after clinician removes it).
- Generated appointments follow existing appointment retention rules.
- Past appointments (ATTENDED, canceled) survive series deletion — they are historical clinical records.

## Conclusion

**PASS** — No new compliance controls needed. Existing appointment protections cover this feature completely.
