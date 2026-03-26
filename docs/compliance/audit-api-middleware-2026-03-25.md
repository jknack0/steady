# HIPAA Code Audit Report: API Routes & Middleware

**Date:** 2026-03-25
**Scope:** `packages/api/src/routes/` (20 route modules), `packages/api/src/middleware/` (3 files), `packages/api/src/index.ts`, `packages/api/src/app.ts`
**Auditor:** Automated HIPAA compliance scan (Claude Code)

**DISCLAIMER:** This is technical guidance for the engineering team, not legal advice. Final compliance decisions should involve qualified legal counsel and a designated Privacy Officer.

---

## Executive Summary

The codebase demonstrates strong foundational HIPAA practices: dedicated HIPAA-safe logger, automatic audit middleware on all Prisma mutations, role-based access control on every route group, ownership verification on most resource operations, and environment-aware error messages. However, several critical and high-severity issues were identified that require remediation.

**Findings Summary:**
- **Critical:** 4
- **High:** 10
- **Medium:** 9
- **Low:** 5
- **Positive findings:** 12

---

## Critical Findings (Must Fix)

### C-001: Hardcoded JWT Fallback Secrets in Production Code

**Files:**
- `packages/api/src/middleware/auth.ts:20`
- `packages/api/src/routes/auth.ts:12-13`

**Issue:** Both `JWT_SECRET` and `REFRESH_SECRET` fall back to hardcoded values if environment variables are not set. If a deployment misconfiguration omits these env vars, the server runs with publicly known secrets, allowing any attacker to forge JWTs and access all PHI.

**HIPAA Rule:** SS 164.312(d) -- Person or Entity Authentication; SS 164.312(a)(1) -- Access Control.

**Remediation:** Fail fast on startup if `JWT_SECRET` or `REFRESH_SECRET` is not set in production.

### C-002: No Refresh Token Rotation or Revocation

**File:** `packages/api/src/routes/auth.ts:144-180`

**Issue:** The `/api/auth/refresh` endpoint issues new token pairs without invalidating the old refresh token. Refresh tokens are stateless JWTs with no server-side storage or revocation mechanism. If a refresh token is stolen, an attacker has persistent 7-day access with no way to revoke it.

**HIPAA Rule:** SS 164.312(a)(1) -- Access Control; SS 164.312(d) -- Person or Entity Authentication.

**Remediation:** Store refresh tokens in database with rotation. Implement logout revocation. Detect token reuse.

### C-003: No Rate Limiting on Authentication Endpoints

**File:** `packages/api/src/routes/auth.ts` (lines 22, 81, 144)

**Issue:** `/api/auth/login`, `/api/auth/register`, and `/api/auth/refresh` have no rate limiting.

**HIPAA Rule:** SS 164.312(a)(1) -- Access Control; SS 164.308(a)(5)(ii)(C) -- Log-in Monitoring.

**Remediation:** Add `express-rate-limit` with appropriate limits per endpoint.

### C-004: CORS Allows All Origins When Not Configured

**File:** `packages/api/src/app.ts:31-34`

**Issue:** When `CORS_ORIGINS` is not set, `origin: true` reflects any origin, combined with `credentials: true`.

**HIPAA Rule:** SS 164.312(e)(1) -- Transmission Security; SS 164.312(a)(1) -- Access Control.

**Remediation:** Fail with a restrictive default in production.

---

## High Findings (Should Fix Soon)

### H-001: Missing Ownership Verification on Stats Endpoint -- IDOR
**File:** `packages/api/src/routes/stats.ts:31-68`
**Issue:** Any authenticated clinician can view stats for any participant by guessing IDs.

### H-002: Missing Ownership Verification on Daily Tracker CRUD
**File:** `packages/api/src/routes/daily-trackers.ts:232-330`
**Issue:** Any clinician can read, modify, or delete any other clinician's trackers by ID.

### H-003: Missing Ownership Verification on Daily Tracker Entries and Trends
**File:** `packages/api/src/routes/daily-trackers.ts:333-478`
**Issue:** Any clinician can read any participant's daily tracker health data.

### H-004: Missing Ownership Verification on Session Operations
**File:** `packages/api/src/routes/sessions.ts:105-159`
**Issue:** Any clinician can modify or view any other clinician's session data.

### H-005: Missing Ownership Verification on Clinician Participant Actions
**File:** `packages/api/src/routes/clinician.ts:437-496`
**Issue:** Push tasks, unlock modules, manage enrollments without ownership check.

### H-006: No Request Body Size Limit
**File:** `packages/api/src/app.ts:35`

### H-007: No Account Lockout or Failed Login Audit Trail
**File:** `packages/api/src/routes/auth.ts:81-141`

### H-008: Participant Tracker "Today" Endpoint Missing Ownership Check
**File:** `packages/api/src/routes/participant.ts:218-248`

### H-009: No Input Validation on Multiple Mutation Endpoints
**Files:** `tasks.ts`, `calendar.ts`, `journal.ts`, `clinician.ts`, `sessions.ts`

### H-010: Uploads Endpoint Does Not Verify Resource Ownership for Downloads
**File:** `packages/api/src/routes/uploads.ts:84-100`

---

## Medium Findings

- M-001: No Audit Logging for PHI Read Operations
- M-002: No IP Address in Audit Logs
- M-003: Health Check Exposes Database Status
- M-004: Enrollment Hard Delete Loses Audit Trail
- M-005: Module Hard Delete Cascades to Parts
- M-006: AI Endpoints Send PHI to Third-Party Service
- M-007: Validation Error Details May Leak Schema Information
- M-008: Duplicate JWT_SECRET Definition
- M-009: Console.error Used Directly in Audit Middleware

## Low Findings

- L-001: No `Cache-Control: no-store` Headers on PHI Responses
- L-002: No Security Headers (HSTS, X-Content-Type-Options, etc.)
- L-003: No Request ID / Correlation ID for Audit Trail
- L-004: Practice Templates Endpoint Missing `take` Limit
- L-005: Clinician Dashboard Unbounded Enrollment Query

---

## Positive Findings

1. HIPAA-safe logger with sanitizeError()
2. Automatic audit middleware on all CREATE/UPDATE/DELETE
3. Consistent role-based access control on all routes
4. Ownership verification on core routes (programs, modules, parts, enrollments)
5. Environment-aware error messages (generic in production)
6. Soft delete for Parts
7. bcrypt with cost factor 12
8. S3 presigned URLs (API never touches file bytes)
9. 30-minute JWT access token expiry
10. Consistent error response shape
11. Cursor-based pagination on list endpoints
12. Zod validation on sensitive endpoints
