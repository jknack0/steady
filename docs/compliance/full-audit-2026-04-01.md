# HIPAA Compliance Audit -- Consolidated Master Report

**Date:** 2026-04-01
**Application:** Steady with ADHD -- Clinical ADHD Treatment Platform
**Scope:** Full codebase audit across 6 focused areas: API routes/middleware, database/data layer, frontend/client-side, logging/error handling, third-party integrations, and infrastructure/configuration
**Auditor:** Claude Code (automated technical guidance)

> **Disclaimer:** This is technical guidance for the engineering team, not legal advice. Final compliance decisions must involve qualified legal counsel and a designated Privacy Officer.

---

## 1. Executive Summary

This audit examined the Steady with ADHD codebase across all layers -- API, database, frontend, logging, third-party integrations, and deployment infrastructure. The platform demonstrates strong HIPAA awareness with well-designed audit logging, a purpose-built HIPAA-safe logger, consistent authentication enforcement, role-based access control, and field-level encryption foundations.

However, the audit identified significant gaps that must be addressed before the platform can be considered HIPAA-compliant in a multi-clinician production environment.

### Deduplicated Finding Counts by Severity

| Severity | Unique Findings |
|----------|----------------|
| **Critical** | 14 |
| **High** | 20 |
| **Medium** | 22 |
| **Low** | 14 |
| **TOTAL** | 70 |

### Top Risk Themes

1. **Missing ownership/authorization checks** on session, clinician-action, stats, and daily-tracker endpoints -- any clinician can access other clinicians' patient data (4 critical, 6 high from API audit)
2. **Inadequate field-level encryption coverage** -- psychotherapy notes, journal content, assessment responses, and diagnosis codes stored in plaintext (2 critical, 2 high from DB audit)
3. **No security headers** on API or web responses -- no HSTS, CSP, Cache-Control, or X-Frame-Options (consolidated across 3 audits)
4. **PHI sent to third parties without confirmed BAAs** -- Anthropic AI, Expo push notifications, AWS S3, Railway (critical from third-party audit)
5. **JWT tokens in localStorage** vulnerable to XSS (critical from frontend and infrastructure audits)
6. **Hard-delete cascades destroy PHI** in violation of 6-year retention requirement (critical from DB audit)
7. **Destructive database migration flag** (--accept-data-loss) in production entrypoint (critical from DB and infrastructure audits)

---

## 2. Critical Findings

| # | ID | Source Audit(s) | File:Line | Description |
|---|-----|----------------|-----------|-------------|
| 1 | API-C-001 | API Routes | routes/sessions.ts:21-33 | **createSession lacks clinician ownership verification.** Any clinician can create sessions for any enrollment. |
| 2 | API-C-002 | API Routes | routes/sessions.ts:105-118 | **updateSession lacks clinician ownership verification.** Any clinician can modify any session. |
| 3 | API-C-003 | API Routes | routes/sessions.ts:122-142 | **completeSession lacks clinician ownership verification.** |
| 4 | API-C-004 | API Routes | routes/sessions.ts:145-158 | **getSessionPrepData lacks ownership verification.** Returns sensitive PHI for any session ID. |
| 5 | DB-C-001/C-002 | Database | encryption-middleware.ts:8 | **Clinical notes, journal content, and health data not encrypted at field level.** Psychotherapy notes are the highest-sensitivity PHI category. |
| 6 | DB-C-003 | Database | schema.prisma (multiple) | **14 onDelete:Cascade relationships permanently destroy PHI.** HIPAA requires 6-year minimum retention. |
| 7 | DB-C-004 | Database | audit-middleware.ts:117 | **READ operations not audited.** Breach investigation cannot determine exposure scope. |
| 8 | DB-C-005 | Database, Infrastructure | docker-entrypoint.sh:5 | **--accept-data-loss flag in production database migration.** |
| 9 | FE-C-001 | Frontend, Infrastructure | use-auth.ts:70-71 | **JWT tokens stored in localStorage.** XSS vulnerability allows token exfiltration. |
| 10 | FE-C-002 | Frontend | Not implemented | **No session inactivity timeout or automatic logoff.** |
| 11 | 3P-C-001/C-002 | Third-Party | routes/ai.ts:103-113 | **PHI sent to Anthropic API without confirmed BAA.** |
| 12 | 3P-C-003 | Third-Party | rtm-notifications.ts:362-391 | **Patient first name in push notification body.** |
| 13 | Infra-C-001/C-002/C-003 | Infrastructure | app.ts, next.config.js | **No security headers on API or web responses.** |
| 14 | Infra-C-004 | Infrastructure | Dockerfile.api | **Docker container runs as root.** |

---

## 3. High Findings

| # | ID | Source | File:Line | Description |
|---|-----|--------|-----------|-------------|
| 1 | API-H-001 | API | routes/clinician.ts:437-452 | pushTaskToParticipant has no ownership verification |
| 2 | API-H-002 | API | routes/clinician.ts:456-470 | unlockModuleForParticipant has no ownership verification |
| 3 | API-H-003 | API | routes/clinician.ts:474-495 | manageEnrollment has no ownership verification |
| 4 | API-H-004 | API | routes/stats.ts:31-68 | Clinician stats endpoint lacks ownership verification |
| 5 | API-H-005 | API | routes/daily-trackers.ts:235-252 | GET daily tracker has no ownership check |
| 6 | API-H-006 | API | routes/daily-trackers.ts:255-332 | PUT/DELETE daily tracker has no ownership check |
| 7 | DB-H-001 | Database | .env.dev, .env.prod | Production credentials in plaintext on dev machines |
| 8 | DB-H-002 | Database | .env.dev, .env.prod | No SSL enforcement in DB connection strings |
| 9 | DB-H-003 | Database | encryption-middleware.ts:8 | User.email and names not encrypted |
| 10 | DB-H-004 | Database | encryption-middleware.ts:8 | RtmEnrollment.diagnosisCodes not encrypted |
| 11 | DB-H-005 | Database | crypto.ts:17-24 | Dev encryption key is deterministic and shared |
| 12 | DB-H-006 | Database, Logging | audit-middleware.ts:142 | console.error bypasses HIPAA-safe logger |
| 13 | DB-H-007 | Database | crypto.ts | No encryption key rotation mechanism |
| 14 | Log-C-002 | Logging | routes/auth.ts:181 | logger.warn() receives unsanitized Error object |
| 15 | Log-H-001 | Logging | errorHandler.ts:8 | err.message exposed to clients in non-production |
| 16 | Log-H-003 | Logging | routes/ai.ts:194,256,422 | AI response content logged at ERROR level |
| 17 | 3P-H-001 | Third-Party | notifications.ts:384 | Task title in push notification body |
| 18 | 3P-H-002 | Third-Party | notifications.ts:556 | Tracker name as push notification title |
| 19 | 3P-H-003 | Third-Party | s3.ts:36-38 | S3 publicUrl is direct, unauthenticated |
| 20 | Infra-H-002 | Infrastructure | docker-entrypoint.sh:7-8 | Server starts when schema push fails |

---

## 4. Remediation Priority Order

### Tier 1: Quick Wins (< 1 day each, high impact)

| # | Finding | Effort | Impact |
|---|---------|--------|--------|
| 1 | Fix audit middleware console.error → use logger | 15 min | Eliminates PHI leak path |
| 2 | Fix logger.warn() to sanitize Error objects | 15 min | Eliminates PHI leak path |
| 3 | Stop logging AI response content | 15 min | Prevents PHI in logs |
| 4 | Always return generic error messages | 15 min | Prevents PHI in responses |
| 5 | Clear React Query cache on logout | 30 min | Clears PHI from memory |
| 6 | Remove --accept-data-loss from entrypoint | 15 min | Prevents PHI destruction |
| 7 | Make server exit on schema push failure | 15 min | Prevents data corruption |
| 8 | Set explicit request body size limit | 5 min | Defense in depth |
| 9 | Remove patient names from push notifications | 1 hour | Stops PHI on lock screens |
| 10 | Remove dead ACTION_MAP constant | 5 min | Code quality |

### Tier 2: Short-Term Engineering (1-5 days each)

| # | Finding | Effort |
|---|---------|--------|
| 11 | Add security headers (helmet + Next.js headers) | 0.5 day |
| 12 | Add Cache-Control: no-store on PHI responses | 0.5 day |
| 13 | Add ownership checks to all 4 session endpoints | 1 day |
| 14 | Add ownership checks to clinician action endpoints | 1 day |
| 15 | Add ownership checks to stats, daily-tracker endpoints | 1 day |
| 16 | Implement session inactivity timeout | 1-2 days |
| 17 | Add Zod validation to unvalidated mutation endpoints | 1-2 days |
| 18 | Add non-root user to Docker container | 0.5 day |
| 19 | Encrypt Session.clinicianNotes and participantSummary | 1 day |
| 20 | Encrypt remaining JSON health data fields | 2-3 days |

### Tier 3: Medium-Term Architecture (1-4 weeks)

| # | Finding | Effort |
|---|---------|--------|
| 21 | Migrate JWT from localStorage to httpOnly cookies | 3-5 days |
| 22 | Replace hard-delete cascades with soft deletes | 1-2 weeks |
| 23 | Implement READ audit logging | 1 week |
| 24 | Implement encryption key rotation | 3-5 days |
| 25 | Add SSL enforcement to DB connections | 0.5 day |
| 26 | Add security scanning to CI pipeline | 1 day |

---

## 5. BAA Status Checklist

| Vendor | Data Transmitted | BAA Required | Status | Priority |
|--------|-----------------|-------------|--------|----------|
| **Anthropic** | Clinician content, PDFs | **Yes** | UNKNOWN | **CRITICAL** |
| **Expo Push** | Notification bodies with names | **Yes** | UNKNOWN | **CRITICAL** |
| **AWS S3** | Clinical documents, files | **Yes** | UNKNOWN | **HIGH** |
| **Railway** | All PHI in DB, API, logs | **Yes** | UNKNOWN | **HIGH** |
| **Vercel** | No PHI at rest, but request logs | **Evaluate** | UNKNOWN | **MEDIUM** |

---

## 6. Positive Findings

- Consistent auth middleware on every route group
- Role-based access control properly segments clinician/participant/admin
- Refresh token rotation with replay detection
- HIPAA-safe logger strips error objects to name:message only
- Audit middleware logs field names only, never values
- AES-256-GCM field-level encryption with transparent middleware
- Insurance identifiers and billing PII encrypted
- Zero console.log in production route/service code
- No PHI in localStorage (beyond tokens), no IndexedDB, no cookies
- No PHI in URLs -- UUIDs only
- Cursor-based pagination with take limits
- Program/module/part ownership consistently verified
- Error responses use generic messages
- S3 presigned URLs with file type/size restrictions
- Multi-stage Docker build

---

## 7. Recommendations for Legal/Compliance Review

1. **Verify BAA status** for Anthropic, Expo, AWS, Railway immediately
2. **Define data retention periods** per PHI category (6-year HIPAA minimum)
3. **Assess cascade delete legality** under state medical record laws
4. **Confirm encryption scope** -- field-level vs database-level at rest
5. **Restrict developer access** to production data
6. **Establish push notification content policy** -- no patient identifiers
7. **Formalize error message policy** -- no PHI in service errors
8. **Confirm inactivity timeout duration** (15 vs 30 minutes)

---

**Next Audit Recommended:** 2026-07-01 (quarterly)
