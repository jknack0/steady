# HIPAA Code Audit: API Routes & Middleware Layer

**Date:** 2026-03-31
**Scope:** All route files in packages/api/src/routes/, middleware in packages/api/src/middleware/, and packages/api/src/app.ts
**Auditor:** Claude Code (automated HIPAA compliance review)
**Disclaimer:** This is technical guidance, not legal advice. Final compliance decisions should involve qualified legal counsel and a designated Privacy Officer.

---

## Executive Summary

The codebase demonstrates a strong security posture overall. Authentication is consistently applied, role-based access control is enforced across route groups, and the logger is purpose-built to avoid PHI leakage. However, the audit identified **4 critical**, **6 high**, **7 medium**, and **5 low** severity findings, primarily around missing ownership verification in several service-layer calls, missing input validation on mutation endpoints, and a few authorization gaps.

---

## Critical Findings (Must Fix)

| ID | File:Line | Issue | HIPAA Rule | Remediation |
|----|-----------|-------|------------|-------------|
| C-001 | routes/sessions.ts:21-33 | **createSession lacks clinician ownership verification of enrollment.** POST /api/sessions passes enrollmentId directly to createSession() without verifying the enrollment belongs to a program owned by the authenticated clinician. Any clinician can create sessions for any enrollment. | Security Rule 164.312(a)(1) - Access Control | Before calling createSession(), verify that the enrollment program belongs to req.user.clinicianProfileId. |
| C-002 | routes/sessions.ts:105-118 | **updateSession lacks clinician ownership verification.** PUT /api/sessions/:id passes the session ID directly to updateSession() without verifying the session belongs to the clinician. The service function (sessions.ts:263) does not check clinician ownership either. Any clinician can modify any session. | Security Rule 164.312(a)(1) - Access Control | Add ownership check: verify session.enrollment.program.clinicianId matches req.user.clinicianProfileId in the service or route. |
| C-003 | routes/sessions.ts:122-142 | **completeSession lacks clinician ownership verification.** Same pattern as C-002. PUT /api/sessions/:id/complete does not verify the clinician owns the enrollment. completeSession() service function also has no ownership check. | Security Rule 164.312(a)(1) - Access Control | Same remediation as C-002. |
| C-004 | routes/sessions.ts:145-158 | **getSessionPrepData lacks clinician ownership verification.** GET /api/sessions/:id/prepare returns sensitive participant data (tasks, journal entries, homework, tracker data) for any session ID without verifying the clinician owns it. The service (sessions.ts:474) returns PHI including participant name, tasks, shared journal entries, and homework responses. | Security Rule 164.312(a)(1), Privacy Rule 164.502(b) - Minimum Necessary | Add clinicianProfileId parameter to getSessionPrepData() and verify the session enrollment program belongs to the clinician. |

---

## High Findings (Should Fix Soon)

| ID | File:Line | Issue | HIPAA Rule | Remediation |
|----|-----------|-------|------------|-------------|
| H-001 | routes/clinician.ts:437-452 | **pushTaskToParticipant has no ownership verification at route or service level.** POST /api/clinician/participants/:id/push-task passes the participant ID directly to pushTaskToParticipant(). The service (clinician.ts:593) creates a task for any participant without verifying the clinician has a relationship. Any clinician can push tasks to any participant. | Security Rule 164.312(a)(1) | Call getParticipantDetail() first to verify ownership, or add a clinicianId parameter to the service. |
| H-002 | routes/clinician.ts:456-470 | **unlockModuleForParticipant has no ownership verification.** POST /api/clinician/participants/:id/unlock-module passes enrollmentId and moduleId directly to the service. The service (clinician.ts:619) performs a raw upsert without verifying the enrollment belongs to the clinician program. | Security Rule 164.312(a)(1) | Verify the enrollment program is owned by the clinician before unlocking. |
| H-003 | routes/clinician.ts:474-495 | **manageEnrollment has no ownership verification.** PUT /api/clinician/participants/:id/enrollment/:enrollmentId passes enrollmentId directly to manageEnrollment(). The service (clinician.ts:653) looks up the enrollment by ID alone. Any clinician can pause/drop/reset any enrollment. | Security Rule 164.312(a)(1) | Pass clinicianProfileId to the service and verify enrollment.program.clinicianId matches. |
| H-004 | routes/stats.ts:31-68 | **Clinician stats endpoint lacks ownership verification.** GET /api/stats/participant/:participantId lets any clinician view any participant stats without verifying a clinician-participant relationship. | Privacy Rule 164.502(b) - Minimum Necessary | Add a check that the clinician has an enrollment relationship with the participant. |
| H-005 | routes/daily-trackers.ts:235-252 | **GET /api/daily-trackers/:id has no ownership check.** Any authenticated clinician can retrieve any tracker by ID, including trackers created by other clinicians. | Security Rule 164.312(a)(1) | Verify the tracker program or participant belongs to the requesting clinician. |
| H-006 | routes/daily-trackers.ts:255-332 | **PUT and DELETE /api/daily-trackers/:id have no ownership checks.** Any clinician can modify or delete any tracker. The endpoints only check that the tracker exists. | Security Rule 164.312(a)(1) | Add ownership verification before allowing update or delete. |

---

## Medium Findings (Fix in Next Sprint)

| ID | File:Line | Issue | HIPAA Rule | Remediation |
|----|-----------|-------|------------|-------------|
| M-001 | routes/clinician.ts:398-433 | **POST homework - missing Zod validation on request body.** Title, content, and dueDate validated manually. No length limits or structured validation. | Security Rule 164.312(e)(1) - Integrity | Create a Zod schema for standalone homework creation and use validate() middleware. |
| M-002 | routes/sessions.ts:21-33 | **POST /api/sessions - no Zod validation on body.** enrollmentId, scheduledAt, etc. validated manually without length/type constraints. | Security Rule 164.312(e)(1) - Integrity | Create a Zod schema and apply validate() middleware. |
| M-003 | routes/sessions.ts:105-118 | **PUT /api/sessions/:id - no Zod validation on body.** Body passed directly to updateSession() without schema validation. | Security Rule 164.312(e)(1) - Integrity | Create and apply Zod schema. |
| M-004 | routes/sessions.ts:122-142 | **PUT /api/sessions/:id/complete - no Zod validation on body.** Clinician notes and other data passed without schema validation. | Security Rule 164.312(e)(1) - Integrity | Create and apply Zod schema. |
| M-005 | routes/journal.ts:75-134 | **POST /api/participant/journal - manual validation instead of Zod.** Fields like freeformContent and responses have no bounds. | Security Rule 164.312(e)(1) - Integrity | Create a Zod schema for journal entry creation/update. |
| M-006 | routes/daily-trackers.ts:336-376 | **GET entries passes userId from query param without cross-referencing ownership.** Any clinician can query entries for any userId. | Privacy Rule 164.502(b) - Minimum Necessary | Verify clinician-participant relationship before returning entries. |
| M-007 | routes/daily-trackers.ts:379-537 | **GET trends - same issue as M-006.** The userId query parameter is trusted without verifying the clinician-participant relationship. | Privacy Rule 164.502(b) - Minimum Necessary | Same remediation as M-006. |

---

## Low Findings (Backlog)

| ID | File:Line | Issue | HIPAA Rule | Remediation |
|----|-----------|-------|------------|-------------|
| L-001 | routes/uploads.ts:84-100 | **presign-download does not verify requester has access to the file.** Any authenticated user can generate a download URL for any S3 key. While keys include UUIDs, this violates least privilege. | Security Rule 164.312(a)(1) | Verify file key prefix matches user ID or user has relationship with the resource. |
| L-002 | routes/participant.ts:218-248 | **daily-trackers/:id/today does not verify participant is assigned this tracker.** IDOR risk if participants learn other tracker IDs. | Security Rule 164.312(a)(1) | Verify the tracker is assigned to the participant. |
| L-003 | app.ts:42 | **CORS is fully permissive in development.** Ensure CORS_ORIGINS is always set for non-local environments. | Security Rule 164.312(e)(1) | Consider requiring CORS_ORIGINS for staging too. |
| L-004 | app.ts:44 | **No explicit request body size limit.** express.json() defaults to 100KB but not explicitly configured. | Security Rule 164.312(e)(1) | Set explicit limit: express.json({ limit: "1mb" }). |
| L-005 | routes/enrollments.ts:291-315 | **DELETE enrollment performs a hard delete.** Records permanently deleted. HIPAA requires 6-year minimum retention. | Privacy Rule 164.530(j) - Retention | Convert to soft delete. |

---

## Positive Findings (Things Done Right)

1. **Consistent authentication middleware.** Every route group applies authenticate at the router level. No PHI-serving endpoints are unprotected. The /health endpoint returns no PHI.

2. **Role-based access control is properly segmented.** Clinician, participant, and admin routes all enforce appropriate role checks.

3. **HIPAA-safe logger.** Custom logger strips error objects to name: message only, never logging full objects that may contain PHI. Stack traces suppressed in production.

4. **Error handler suppresses details in production.** Returns generic "Internal server error" in production.

5. **Audit middleware in place.** All Prisma mutations automatically logged with AsyncLocalStorage audit context.

6. **Refresh token rotation with reuse detection.** Detects token reuse and revokes entire token family.

7. **Rate limiting on auth endpoints.** Login (5/15min), registration (3/hour), refresh (30/15min).

8. **Program ownership consistently verified.** All program/module/part routes verify clinicianId via verifyProgramOwnership() or inline findFirst.

9. **Enrollment routes verify program ownership.** All enrollment endpoints check parent program belongs to clinician.

10. **Participant routes scope to own data.** Tasks, calendar, journal, enrollments all filter by participantProfileId from auth token.

11. **Validation middleware strips unknown fields.** schema.parse() prevents mass assignment attacks.

12. **Soft deletes for programs and content.** ARCHIVED status and deletedAt timestamps preserve data for retention.

13. **S3 presigned URLs with file type/size restrictions.** Context-specific validation on uploads.

14. **Cursor-based pagination everywhere.** Take limits capped at 100, preventing bulk data extraction.

15. **No PHI in error messages.** All error responses use generic messages.

---

## Summary of Remediation Priorities

### Immediate (This Sprint)
- **C-001 through C-004:** Add ownership verification to all session endpoints. Any clinician can currently read/write PHI for other clinician patients.
- **H-001 through H-003:** Add ownership verification to push-task, unlock-module, and manage-enrollment.

### Next Sprint
- **H-004 through H-006:** Add ownership checks to stats and daily-tracker endpoints.
- **M-001 through M-005:** Add Zod validation schemas for all unvalidated mutation endpoints.
- **M-006 through M-007:** Verify clinician-participant relationship on tracker entry/trend queries.

### Backlog
- **L-001 through L-005:** File download authorization, explicit body limits, soft delete for enrollments, tracker assignment verification.

---

## Recommendations for Legal/Compliance Review

1. The enrollment hard delete (L-005) should be reviewed against your HIPAA retention policy.
2. The session endpoints (C-001 through C-004) represent a cross-clinician PHI exposure risk. If deployed in a multi-clinician environment, a breach risk assessment may be warranted.
3. The AI endpoints (routes/ai.ts) send clinician-authored content to the Anthropic API. Verify a BAA is in place if this content could contain PHI.
4. The practice.ts routes expose clinician email addresses to other practice members (line 79). Verify this is acceptable.

---

**Status: FINDINGS_READY**
