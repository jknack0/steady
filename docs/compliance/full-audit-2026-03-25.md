# Full Application HIPAA Audit
## Date: 2026-03-25
## Audited By: hipaa-spec subagent (automated)

> **Disclaimer:** This is technical guidance for engineering teams, not legal advice. Final compliance decisions should involve qualified legal counsel and a designated Privacy Officer.

---

## Executive Summary

- **Total findings: 85** (before deduplication across audit areas)
- **Unique deduplicated findings: ~68**
- **Critical: 16**
- **High: 29**
- **Medium: 16**
- **Low: 7**
- **Positive findings: 25+**

Six parallel audits were conducted covering: API & Middleware, Database & Data Layer, Frontend & Client-Side, Logging & Error Handling, Third-Party Integrations & Data Flow, and Infrastructure & Configuration.

---

## Critical Findings (Must Fix Immediately)


### DONE 1. Hardcoded JWT/Refresh Secret Fallbacks
- **Files:** `packages/api/src/middleware/auth.ts:20`, `packages/api/src/routes/auth.ts:12-13`
- **Issue:** `JWT_SECRET` and `REFRESH_SECRET` fall back to hardcoded strings (`"dev-secret-change-in-production"`) if env vars are missing. In production, this allows any attacker to forge JWTs and access all PHI.
- **HIPAA:** SS 164.312(d) -- Person or Entity Authentication
- **Fix:** Remove fallbacks. Fail fast at startup if secrets are unset in production.

### DONE 2. No Refresh Token Rotation or Revocation
- **File:** `packages/api/src/routes/auth.ts:144-180`
- **Issue:** Refresh tokens are stateless JWTs with no server-side storage, rotation, or revocation. Stolen tokens grant 7-day persistent access. No logout invalidation.
- **HIPAA:** SS 164.312(a)(1) -- Access Control; SS 164.312(d)
- **Fix:** Database-backed refresh tokens with rotation. Revoke on logout. Detect token reuse.

### DONE 3. No Rate Limiting on Authentication Endpoints
- **File:** `packages/api/src/routes/auth.ts`
- **Issue:** Unlimited brute-force login attempts, credential stuffing, and token-grinding attacks possible.
- **HIPAA:** SS 164.312(a)(1); SS 164.308(a)(5)(ii)(C) -- Log-in Monitoring
- **Fix:** Add `express-rate-limit` (5 attempts/15min on login, 3/hour on register).

### DONE 4. CORS Allows All Origins When Not Configured
- **File:** `packages/api/src/app.ts:31-34`
- **Issue:** `origin: true` when `CORS_ORIGINS` unset = any website can make authenticated API requests. Combined with `credentials: true`, enables cross-site PHI exfiltration.
- **HIPAA:** SS 164.312(e)(1) -- Transmission Security
- **Fix:** Fail fast in production if `CORS_ORIGINS` is unset.

### DONE 5. Sensitive Identifiers Stored in Plaintext (No Field-Level Encryption)
- **File:** `packages/db/prisma/schema.prisma` (multiple models)
- **Issue:** NPI numbers, Tax IDs (SSNs/EINs), insurance Subscriber IDs, Group Numbers stored as plain `String` fields.
- **HIPAA:** SS 164.312(a)(2)(iv) -- Encryption and Decryption
- **Fix:** Implement AES-256-GCM field-level encryption with keys managed via KMS/Vault.

### 6. Hard Deletion of PHI Records (No Soft Delete)
- **Files:** `enrollments.ts:308`, `modules.ts:177`, `daily-trackers.ts:324`, `calendar.ts:179`
- **Issue:** Enrollments, Modules (with CASCADE to Parts/Progress), DailyTrackers (with CASCADE to entries), and CalendarEvents are permanently deleted. Destroys audit trail and violates 6-year retention requirement.
- **HIPAA:** SS 164.530(j) -- Retention Requirements (6 years)
- **Fix:** Add `deletedAt DateTime?` to all PHI models. Convert deletes to soft deletes.

### 7. No SSL/TLS Enforcement on Database Connections
- **File:** `docker-compose.yml`, Prisma config
- **Issue:** No `sslmode=require` in DATABASE_URL. Database traffic may transit unencrypted.
- **HIPAA:** SS 164.312(e)(1) -- Transmission Security
- **Fix:** Enforce `?sslmode=require` in production DATABASE_URL.

### 8. JWT Tokens Stored in localStorage (Web)
- **Files:** `apps/web/src/hooks/use-auth.ts:70-71`, `apps/web/src/lib/api-client.ts:4`
- **Issue:** localStorage accessible to any JS on the page. XSS = full PHI access via stolen tokens.
- **HIPAA:** SS 164.312(a)(1) -- Access Control
- **Fix:** Migrate to `httpOnly`, `Secure`, `SameSite=Strict` cookies.

### 9. No Inactivity Timeout / Automatic Logoff
- **Files:** No implementation exists in web or mobile
- **Issue:** CLAUDE.md states "Session timeout: 30 minutes" but no client-side inactivity timer exists. Clinician walkaway = indefinite PHI access.
- **HIPAA:** SS 164.312(a)(2)(iii) -- Automatic Logoff
- **Fix:** Implement idle timer (mouse/keyboard/touch monitoring) on web and `AppState` listener on mobile. Logout after 15-30 minutes.

### 10. PHI Sent to Anthropic AI Without BAA
- **File:** `packages/api/src/routes/ai.ts` (4 endpoints)
- **Issue:** `/style-content`, `/generate-tracker`, `/generate-part`, `/parse-homework-pdf` send clinician-authored clinical content and entire PDF documents to Anthropic. No BAA confirmed.
- **HIPAA:** SS 164.502(e) -- Business Associate Requirements; SS 164.314(a)
- **Fix:** Obtain BAA from Anthropic or disable AI endpoints in production. Implement PHI-stripping before external API calls.

### 11. PHI in Push Notification Payloads
- **Files:** `services/rtm-notifications.ts:362-392`, `services/notifications.ts:384,557`, `notification-copy.ts:24-25`
- **Issue:** Patient first names, task titles, and tracker names embedded in notification bodies sent through Expo push service. Visible on lock screens. No BAA with Expo confirmed.
- **HIPAA:** SS 164.502(a) -- Minimum Necessary; SS 164.312(e)(1)
- **Fix:** Remove all PHI from push payloads. Use generic messages. Pass only IDs in data payload.

### 12. S3 Uploads Lack Server-Side Encryption Specification
- **File:** `packages/api/src/services/s3.ts:27-31`
- **Issue:** `PutObjectCommand` does not set `ServerSideEncryption`. Clinical files may be stored unencrypted.
- **HIPAA:** SS 164.312(a)(2)(iv) -- Encryption at Rest
- **Fix:** Add `ServerSideEncryption: "aws:kms"` to all PutObjectCommands.

### 13. `--accept-data-loss` on Production Database Migrations
- **File:** `scripts/docker-entrypoint.sh:5`
- **Issue:** `prisma db push --accept-data-loss` allows silent column/table drops. Server also starts even if migrations fail.
- **HIPAA:** SS 164.312(c)(1) -- Integrity
- **Fix:** Remove `--accept-data-loss`. Let migration failures prevent server start.

### 14. Prisma Error Messages Can Leak PHI Through Logger
- **File:** `packages/api/src/lib/logger.ts:10`
- **Issue:** `sanitizeError()` logs `err.message`, but Prisma errors embed query details and field values in messages (e.g., unique constraint violations log the email).
- **HIPAA:** SS 164.312(b) -- Audit Controls
- **Fix:** Detect Prisma errors and log only error code + model name, not the full message.

### 15. console.error in Audit Middleware Bypasses Safe Logger
- **File:** `packages/db/src/audit-middleware.ts:142`
- **Issue:** `console.error("Audit log write failed:", err)` passes raw Prisma error object which may contain PHI from the original operation.
- **HIPAA:** SS 164.312(b)
- **Fix:** Replace with HIPAA-safe logger call.

### 16. AI Response Content Logged (May Contain PHI)
- **File:** `packages/api/src/routes/ai.ts:194,256,410`
- **Issue:** Raw AI responses (which may echo/transform PHI from input) logged on parse failures.
- **HIPAA:** SS 164.312(b)
- **Fix:** Log only error context (no response content). Use correlation IDs.

---

## High Findings (Fix This Sprint)

### Access Control / IDOR Vulnerabilities (7 findings)
| Endpoint | File | Issue |
|----------|------|-------|
| `GET /stats/participant/:id` | `stats.ts:31-68` | Any clinician can view any participant's stats |
| `GET/PUT/DELETE /daily-trackers/:id` | `daily-trackers.ts:232-330` | Any clinician can CRUD any tracker |
| `GET /daily-trackers/:id/entries,trends` | `daily-trackers.ts:333-478` | Any clinician can read any participant's health data |
| `PUT/POST /sessions/:id/*` | `sessions.ts:105-159` | Any clinician can modify any session/notes |
| `POST /clinician/participants/:id/*` | `clinician.ts:437-496` | Push tasks/unlock modules for any participant |
| `GET /participant/daily-trackers/:id/today` | `participant.ts:218-248` | Participant can access other participant's tracker |
| `GET /uploads/presign-download` | `uploads.ts:84-100` | Any authenticated user can download any S3 file |

**Fix:** Add ownership verification to each endpoint before returning data.

### Data Encryption Gaps (4 findings)
| Data | File | Issue |
|------|------|-------|
| Journal entries (responses, freeformContent) | `schema.prisma:449-450` | Mental health data in plaintext |
| Assessment/intake responses (responseData) | `schema.prisma:389` | ADHD diagnostic info in plaintext |
| Session notes (clinicianNotes) | `schema.prisma:469` | Therapist observations in plaintext |
| Insurance data (diagnosisCodes, subscriberId) | `schema.prisma:660-663` | Financial PHI in plaintext |

**Fix:** Implement field-level encryption for all sensitive PHI fields.

### Missing Security Controls (8 findings)
| Issue | File | Fix |
|-------|------|-----|
| No security headers (helmet) | `app.ts` | Install `helmet` middleware |
| No Cache-Control: no-store on PHI responses | `app.ts` | Add global no-store middleware |
| No failed login audit trail | `auth.ts` | Log failed attempts to audit table |
| No READ audit logging for PHI | `audit-middleware.ts` | Add route-level read audit for sensitive models |
| No data retention policy mechanism | `schema.prisma` | Add `retentionExpiresAt` fields + scheduled cleanup |
| Error messages exposed in non-production | `errorHandler.ts:8` | Always return generic errors + correlation ID |
| Container runs as root | `Dockerfile.api` | Add non-root user |
| No CI/CD pipeline | N/A | Set up automated security scanning + tests |

### Frontend XSS Vectors (2 findings)
| Issue | File |
|-------|------|
| `dangerouslySetInnerHTML` without DOMPurify | `RNPartRenderers.tsx:26,1337` |
| `contentEditable` sets innerHTML from external data | `styled-content-editor.tsx:34,44` |

**Fix:** Sanitize all HTML through DOMPurify before rendering.

### Other High Findings (8 findings)
- **publicUrl returns permanent S3 URL** (`s3.ts:36-38`) -- use presigned URLs only
- **No server-side file size enforcement** (`uploads.ts:20-26`)
- **pg-boss job payloads contain PHI** (`queue.ts:14`) -- pass IDs, resolve at execution
- **Missing Zod validation on 8+ mutation endpoints** (`tasks.ts`, `calendar.ts`, `journal.ts`, `sessions.ts`, `clinician.ts`)
- **AuditLog.userId nullable** (`schema.prisma:838`) -- weakens accountability
- **Weak seed passwords + no production guard** (`seed.ts`)
- **Production API URL committed to repo** (`apps/mobile/.env`)
- **No Next.js security headers** (`next.config.js`)

---

## Medium Findings (Fix Next Sprint)

1. **No database row-level security (RLS)** -- all access control is application-layer only
2. **No composite audit log indexes** for compliance queries (`resourceType + resourceId`)
3. **Logout does not clear TanStack Query cache** (web + mobile) -- stale PHI persists in memory
4. **No server-side route protection in Next.js** -- client-side `ProtectedRoute` only
5. **Command palette shows participant names + emails** on 2-char search
6. **Mobile web fallback stores tokens in localStorage** (`storage.web.ts`)
7. **No `trust proxy` configuration** -- `req.ip` always shows proxy IP, not client
8. **Health check exposes database status** to unauthenticated users
9. **Validation error details leak schema information** in production
10. **Duplicate JWT_SECRET definitions** across files (drift risk)
11. **Standalone PrismaClient instances bypass audit middleware** (seed/migration scripts)
12. **No backup encryption configuration documented**
13. **No IP address in audit logs**
14. **Push notification content risk** -- task titles may contain PHI
15. **No dependency vulnerability scanning** (no npm audit, Snyk, or Dependabot)
16. **Enrollment hard delete loses audit trail** for treatment relationships

---

## Low Findings (Backlog)

1. No request correlation IDs for audit trail linking
2. Practice templates endpoint missing `take` limit
3. Clinician dashboard unbounded enrollment query
4. Participant name in browser page title (screen sharing risk)
5. PostgreSQL port exposed on all interfaces in docker-compose (`0.0.0.0:5432`)
6. Node engine requirement includes EOL Node 18
7. Non-deterministic `npm install -g npm@latest` in Dockerfile

---

## Positive Findings (Things Done Right)

1. **HIPAA-safe logger** -- sanitizes errors to name+message, suppresses stack traces in production
2. **Automatic audit middleware** -- all CREATE/UPDATE/DELETE logged with AsyncLocalStorage user context; logs field names only, never values
3. **Consistent role-based access control** -- `authenticate` + `requireRole()` on all route groups
4. **Ownership verification on core routes** -- programs, modules, parts, enrollments verify clinician owns parent
5. **Environment-aware error handler** -- generic "Internal server error" in production
6. **Soft delete for Parts** -- `deletedAt` pattern (needs extension to other models)
7. **bcrypt with cost factor 12** for password hashing
8. **S3 presigned URLs** -- API never touches file bytes
9. **30-minute JWT access token expiry**
10. **Consistent error response shape** -- `{ success, data, error }`
11. **Cursor-based pagination** on most list endpoints
12. **Zod validation** on sensitive endpoints via `validate()` middleware
13. **Expo Secure Store** for mobile token storage (hardware-backed encryption)
14. **No console.log in web app source**
15. **No PHI in URL paths** -- opaque UUIDs only
16. **No indexedDB/Service Worker/clipboard** operations with PHI
17. **Multi-stage Docker build** -- source code not in production image
18. **NODE_ENV=production** set in Docker runner stage
19. **Environment-based secrets** (despite fallback issue)
20. **Root .gitignore covers .env files**
21. **Prisma singleton pattern** prevents connection pool exhaustion
22. **Seed data uses fictional names only**
23. **Push token cleanup on logout**
24. **Notification preference checking** before sending
25. **`exec` in entrypoint scripts** for proper signal handling

---

## Remediation Priority Order

| Priority | Finding | Effort | Impact |
|----------|---------|--------|--------|
| **P0 (This Week)** | 1. Remove hardcoded JWT/refresh secret fallbacks | Low | Prevents full system compromise |
| **P0** | 2. Fix CORS wildcard default | Low | Prevents cross-site PHI exfiltration |
| **P0** | 3. Remove `--accept-data-loss` from production entrypoint | Low | Prevents silent PHI destruction |
| **P0** | 4. Add rate limiting on auth endpoints | Medium | Prevents brute-force attacks |
| **P0** | 5. Remove PHI from push notification payloads | Medium | Stops active PHI disclosure |
| **P0** | 6. Fix Prisma error PHI leakage in logger | Medium | Stops PHI leaking to logs |
| **P1 (Next 2 Weeks)** | 7. Fix IDOR vulnerabilities (7 endpoints) | Medium | Prevents unauthorized PHI access |
| **P1** | 8. Verify/obtain BAAs (Anthropic, Expo, AWS, Railway) | Legal | Contractual compliance |
| **P1** | 9. Add S3 server-side encryption | Low | Encryption at rest |
| **P1** | 10. Implement inactivity timeout (web + mobile) | Medium | Automatic logoff compliance |
| **P1** | 11. Remove publicUrl from S3 uploads | Low | Prevents permanent file URLs |
| **P1** | 12. Install helmet + Cache-Control middleware | Low | Defense in depth |
| **P2 (This Sprint)** | 13. Migrate web tokens to httpOnly cookies | High | Eliminates XSS token theft |
| **P2** | 14. Implement refresh token rotation | High | Limits stolen token impact |
| **P2** | 15. Convert hard deletes to soft deletes | High | 6-year retention compliance |
| **P2** | 16. Add DOMPurify for HTML rendering | Low | XSS prevention |
| **P2** | 17. Add failed login auditing | Medium | Login monitoring compliance |
| **P3 (Next Sprint)** | 18. Field-level encryption for sensitive PHI | High | Encryption at rest best practice |
| **P3** | 19. Add READ audit logging | High | Complete audit trail |
| **P3** | 20. Enforce database SSL | Low | Encryption in transit |
| **P3** | 21. Set up CI/CD with security scanning | Medium | Automated compliance checks |
| **P3** | 22. Add Zod validation to remaining endpoints | Medium | Input integrity |
| **P3** | 23. Implement data retention policy | High | Retention compliance |
| **P4 (Backlog)** | All remaining medium/low findings | Various | Defense in depth |

---

## Recommendations for Legal/Compliance Review

1. **BAA Status Verification (URGENT):** Confirm signed BAAs with Anthropic (AI), Expo (push notifications), AWS (S3 storage), and Railway (hosting/database). If Anthropic does not offer a BAA, AI features must be disabled or all PHI stripped before transmission.

2. **Data Retention Policy:** The 6-year HIPAA minimum is not enforced. Hard deletes on Enrollments, Modules, Sessions, Trackers, and Calendar Events actively destroy PHI. Legal should assess if any records have already been lost and whether a breach assessment is needed.

3. **`--accept-data-loss` Flag:** The production entrypoint has allowed silent data loss during migrations. Legal should assess whether any PHI has been destroyed through past deployments.

4. **Breach Notification Readiness:** The audit trail has gaps (no read logging, nullable userId, no IP addresses). Legal should assess whether the current trail is sufficient for breach investigation within the 60-day notification window.

5. **42 CFR Part 2:** Review whether journal entries or tracker data could fall under substance abuse protections (heightened consent requirements).

6. **De-identification Standard:** If analytics features are planned, confirm de-identification meets Safe Harbor (SS 164.514(b)) or Expert Determination standards.

7. **Mobile Web Deployment:** The Expo web build uses localStorage for tokens. Legal should determine if the mobile web version is in-scope for HIPAA or should be restricted.

## Next Audit Recommended: 2026-06-25 (quarterly)

---

*Individual audit reports are available in `docs/compliance/audit-{area}-2026-03-25.md`.*
