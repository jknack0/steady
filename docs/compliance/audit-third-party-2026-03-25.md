# HIPAA Code Audit: Third-Party Integrations & Data Flow

**Date:** 2026-03-25
**Scope:** S3, push notifications (Expo), AI (Anthropic), superbill/billing, file uploads, pg-boss queue
**Auditor:** Automated HIPAA compliance scan (technical guidance, not legal advice)

---

## Findings Summary
- **Critical:** 5
- **High:** 6
- **Medium:** 6
- **Low:** 4
- **Positive findings:** 9

## Critical Findings

| ID | File:Line | Issue |
|----|-----------|-------|
| C-001 | `ai.ts:103-423` | PHI sent to Anthropic API without BAA (4 endpoints including full PDF documents) |
| C-002 | `rtm-notifications.ts:362-392` | Patient first names in push notification payloads sent via Expo |
| C-003 | `notifications.ts:384`, `notification-copy.ts:24-25` | Task titles (potentially PHI) in push notification payloads |
| C-004 | `notifications.ts:557` | Tracker names (potentially PHI) used as push notification titles |
| C-005 | `s3.ts:27-31` | S3 uploads lack ServerSideEncryption specification |

## High Findings

| ID | File:Line | Issue |
|----|-----------|-------|
| H-001 | `s3.ts:36-38` | publicUrl returns permanent non-expiring direct S3 URL |
| H-002 | `uploads.ts:84-100` | Download presign endpoint lacks authorization check on S3 key |
| H-003 | `uploads.ts:20-26` | No server-side file size enforcement |
| H-004 | `ai.ts:330-396` | Entire clinical PDF documents sent to Anthropic API |
| H-005 | `queue.ts:14` | pg-boss job payloads containing PHI persist in database |
| H-006 | `auth.ts:20` | Hardcoded fallback JWT secret |

## Data Flow Map: PHI Exit Points

| Exit Point | Third Party | PHI Transmitted | BAA Status |
|------------|-------------|----------------|------------|
| Anthropic Claude API | Anthropic | Clinical content, PDF documents | **UNKNOWN** |
| Expo Push Service | Expo | Patient names, task titles, tracker names | **UNKNOWN** |
| AWS S3 | Amazon Web Services | Clinical PDFs, handouts, images | **VERIFY** |
| PostgreSQL (Railway) | Railway | All application data | **VERIFY** |

## Medium Findings

- M-001: Mobile console.error with error objects
- M-002: Superbill generation not audit-logged (read-only aggregation)
- M-003: scheduleHomeworkRemindersForAll loads broad enrollment data
- M-004: No Cache-Control: no-store on API responses
- M-005: JWT tokens in localStorage
- M-006: Download URL expiry of 1 hour may be excessive

## Low Findings

- L-001: No malware/virus scanning on uploaded files
- L-002: File type validation is MIME-type based only (spoofable)
- L-003: No explicit SSL/TLS enforcement on pg-boss connection
- L-004: Raw SQL query against pgboss schema bypasses audit trail

## Positive Findings

1. HIPAA-safe logger
2. Automatic audit middleware
3. Authentication on all routes
4. Presigned URLs for file access
5. Notification preference checking before sending
6. Clinician ownership verification on superbills
7. Generic notification copy templates (base templates have no PHI)
8. Push token cleanup on logout
9. Generic error responses
