# HIPAA Infrastructure and Configuration Audit

**Date:** 2026-03-31
**Scope:** Docker, deployment, CI/CD, environment configuration, Express app security, entrypoint script
**Auditor:** Claude Code (automated technical guidance, not legal advice)

---

## Critical Findings

### C-001: No Security Headers on API Responses
**File:** packages/api/src/app.ts (entire file)
**HIPAA Rule:** Security Rule 164.312(e)(1) -- Transmission Security

The Express API sets no security headers. There is no helmet middleware, and no manual headers for:
- Strict-Transport-Security (HSTS)
- X-Content-Type-Options
- X-Frame-Options
- Content-Security-Policy
- X-XSS-Protection
- Referrer-Policy

**Risk:** Without HSTS, browsers may not enforce HTTPS. Without X-Frame-Options, the API could be embedded in malicious iframes. Missing CSP increases XSS risk.

**Remediation:**
1. Install helmet and add it before routes in app.ts.
2. Configure HSTS with maxAge of 1 year, includeSubDomains, and preload.
3. Set frameguard to DENY and configure a restrictive CSP.

---

### C-002: No Cache-Control Headers on PHI Responses
**File:** packages/api/src/app.ts -- no global or per-route cache headers
**HIPAA Rule:** Security Rule 164.312(a)(1) -- Access Control; 164.312(c)(1) -- Integrity

No API endpoint sets Cache-Control: no-store on responses containing PHI. Browsers, proxies, and CDNs may cache patient data (names, diagnoses, treatment plans, session notes).

**Remediation:**
Add middleware for all /api/ routes (except /health) that sets:
- Cache-Control: no-store, no-cache, must-revalidate, private
- Pragma: no-cache
- Expires: 0

---

### C-003: No Security Headers in Next.js Web App
**File:** apps/web/next.config.js
**HIPAA Rule:** Security Rule 164.312(e)(1) -- Transmission Security

The Next.js configuration has zero security headers. No headers() function is configured, meaning the clinician dashboard (which displays extensive PHI including patient names, diagnoses, treatment programs, session notes, and billing data) has no HSTS, CSP, X-Frame-Options, or other protections.

**Remediation:**
Add an async headers() function to next.config.js returning HSTS, X-Frame-Options (DENY), X-Content-Type-Options (nosniff), Referrer-Policy, Content-Security-Policy, and Permissions-Policy for all routes.

---

### C-004: Docker Container Runs as Root
**File:** Dockerfile.api (no USER directive in runner stage, lines 27-42)
**HIPAA Rule:** Security Rule 164.312(a)(1) -- Access Control

The production container has no USER directive and runs as root. If an attacker exploits the Node.js process, they have full root privileges inside the container, increasing the blast radius of any breach.

**Remediation:**
Add a non-root user in the runner stage using addgroup/adduser, then set USER appuser before the CMD instruction.

---

## High Findings

### H-001: --accept-data-loss in Production Entrypoint
**File:** scripts/docker-entrypoint.sh:5
**HIPAA Rule:** Security Rule 164.312(c)(1) -- Integrity Controls

The entrypoint runs prisma db push --accept-data-loss on every deployment. This flag allows Prisma to drop columns or tables if the schema diverges. In production, this could silently destroy PHI (patient records, clinical notes, billing data).

**Risk:** A schema change could cause irreversible data loss of protected health information.

**Remediation:**
1. Remove --accept-data-loss from the production entrypoint.
2. Switch to prisma migrate deploy for production (runs only pre-approved, reviewed migrations).
3. If db push must be used temporarily, remove --accept-data-loss and let the deployment fail if destructive changes are detected.

---

### H-002: Server Starts Even When Schema Push Fails
**File:** scripts/docker-entrypoint.sh:7-8
**HIPAA Rule:** Security Rule 164.306(a) -- General Security Standards

When prisma db push fails, the script logs an error but starts the server anyway. The API may serve requests against an out-of-sync schema, causing data corruption, missing columns, or runtime errors that could expose PHI in error responses.

**Remediation:**
Remove the error-tolerant if/else block. If prisma db push fails, exit with a non-zero code to prevent the server from starting.

---

### H-003: No Explicit Request Body Size Limit
**File:** packages/api/src/app.ts:44
**HIPAA Rule:** Security Rule 164.312(a)(1) -- Access Control (Availability)

express.json() is called without an explicit limit option. While the Express default is 100KB, this should be explicitly configured and documented.

**Remediation:**
Set the limit explicitly: express.json({ limit: "100kb" }).

---

### H-004: JWT Tokens Stored in localStorage (Web)
**File:** apps/web/src/lib/api-client.ts:4,15-16,22-24,35
**HIPAA Rule:** Security Rule 164.312(d) -- Person or Entity Authentication

JWT access and refresh tokens are stored in localStorage, which is accessible to any JavaScript running on the page. An XSS vulnerability (from a compromised dependency, CSP bypass, or injected script) could steal tokens and impersonate a clinician with full access to patient records.

**Risk:** Token theft leads to unauthorized access to all PHI the clinician can view.

**Remediation:**
1. Migrate to httpOnly cookies set by the API server (not accessible to JavaScript).
2. If localStorage must be used short-term, implement strict CSP (see C-003) and consider token binding.
3. This is an architectural change -- prioritize for next major security sprint.

---

### H-005: Single JWT Secret with No Runtime Validation
**File:** packages/api/src/lib/env.ts:12
**HIPAA Rule:** Security Rule 164.312(d) -- Person or Entity Authentication

Only one secret (JWT_SECRET) is configured. The dev fallback value could leak into staging if NODE_ENV is misconfigured. While the code throws in production if the env var is missing, there is no check that the production value is not the dev fallback.

**Remediation:**
1. Add a startup check that rejects the dev fallback value when NODE_ENV is production.
2. Ensure the production JWT_SECRET is at least 256 bits of cryptographic randomness.
3. Document minimum secret strength requirements.

---

### H-006: Missing .env.example Entries for Security-Critical Variables
**File:** .env.example
**HIPAA Rule:** Security Rule 164.312(a)(1) -- Access Control

The .env.example is missing several security-critical variables:
- JWT_SECRET -- not listed (required by packages/api/src/lib/env.ts)
- CORS_ORIGINS -- not listed (required in production per app.ts:38)
- Database SSL configuration (e.g., ?sslmode=require)
- EXPO_ACCESS_TOKEN (if push notifications are used)

**Remediation:**
Add all required environment variables to .env.example with placeholder values and comments indicating which are required for production.

---

## Medium Findings

### M-001: CI Pipeline Has No Security Scanning
**File:** .github/workflows/ci.yml
**HIPAA Rule:** Security Rule 164.308(a)(1) -- Risk Analysis

The CI pipeline runs typecheck, lint, and tests but has no:
- Dependency vulnerability scanning (npm audit, Snyk, Dependabot)
- Static Application Security Testing (SAST)
- Secret scanning
- Docker image scanning

**Remediation:**
Add a security scanning job with npm audit and a container scanning step (e.g., Trivy). Enable GitHub Dependabot alerts and secret scanning on the repository.

---

### M-002: CI Uses Hardcoded Credentials in Workflow File
**File:** .github/workflows/ci.yml:51-52,62-63
**HIPAA Rule:** Security Rule 164.312(d) -- Person or Entity Authentication

CI uses hardcoded PostgreSQL credentials (steady/steady_password) and JWT secret (test-secret-for-ci) in the workflow YAML. While these are for ephemeral test databases, the pattern normalizes hardcoded secrets in version-controlled files.

**Remediation:**
Move test credentials to GitHub repository secrets.

---

### M-003: docker-compose.yml Exposes PostgreSQL on All Interfaces
**File:** docker-compose.yml:8
**HIPAA Rule:** Security Rule 164.312(e)(1) -- Transmission Security

Port 5432 is mapped binding to all network interfaces. If a developer runs this on a shared or public network, the database is accessible externally.

**Remediation:**
Bind to localhost only: 127.0.0.1:5432:5432.

---

### M-004: No Rate Limiting on PHI-Serving Endpoints
**File:** packages/api/src/app.ts (global middleware section)
**HIPAA Rule:** Security Rule 164.312(a)(1) -- Access Control

Rate limiting exists only on auth endpoints (login: 5/15min, register: 3/hr, refresh: 30/15min). PHI-serving endpoints (programs, enrollments, participants, sessions, RTM, journal, calendar) have no rate limiting, enabling bulk data exfiltration by a compromised account or enumeration attacks.

**Remediation:**
Add a global rate limiter for authenticated API routes (e.g., 1000 requests per 15 minutes per IP/user).

---

### M-005: CI Does Not Run on dev Branch
**File:** .github/workflows/ci.yml:3-6
**HIPAA Rule:** Security Rule 164.308(a)(1) -- Risk Analysis

CI triggers only on PRs/pushes to main. Per CLAUDE.md, the web app deploys from the dev branch to Vercel. Code merged to dev and deployed to production may bypass CI entirely -- no typecheck, no tests, no lint.

**Remediation:**
Add dev to both pull_request and push branch triggers in the CI workflow.

---

## Low Findings

### L-001: Health Check Exposes Database Connectivity Status
**File:** packages/api/src/app.ts:48-57
**HIPAA Rule:** Security Rule 164.312(e)(1) -- Transmission Security

The unauthenticated /health endpoint returns database connectivity status, leaking infrastructure state to unauthenticated users.

**Remediation:**
In production, return only { status: "ok" }. Expose detailed status only behind authentication or on an internal-only endpoint.

---

### L-002: No Database SSL Configuration Documented
**File:** .env.example:2
**HIPAA Rule:** Security Rule 164.312(a)(2)(iv) -- Encryption and Decryption

The example DATABASE_URL does not include ?sslmode=require. Railway PostgreSQL may enforce TLS by default, but this should be explicit in the connection string for production.

**Remediation:**
Document that production DATABASE_URL must include ?sslmode=require or ?ssl=true.

---

### L-003: docker-compose Uses Weak Default Password
**File:** docker-compose.yml:11
**HIPAA Rule:** Security Rule 164.312(d) -- Person or Entity Authentication

Local dev PostgreSQL uses a weak password. Acceptable for local dev, but add a comment noting it is for local development only.

---

## Positive Findings

| Item | File Reference | Details |
|------|---------------|--------|
| CORS enforcement in production | app.ts:37-42 | CORS_ORIGINS is required in production. App throws on startup without it. Dev-only permissive CORS is gated on NODE_ENV. |
| Error message sanitization | errorHandler.ts:8 | Production error responses return generic message. No stack traces or error details leak to clients. |
| HIPAA-safe logger | logger.ts:1-38 | Custom logger sanitizes errors to name+message only. Never logs full objects (which may contain PHI from Prisma queries). Stack traces suppressed in production. |
| Proxy trust configured correctly | app.ts:34 | trust proxy set to 1 (trusts only immediate reverse proxy). Prevents IP spoofing through proxy chains. |
| Multi-stage Docker build | Dockerfile.api | Build artifacts separated from production image. Source code not included in runner stage. |
| Dockerignore excludes secrets | .dockerignore:4 | env files excluded from Docker build context. |
| Gitignore excludes env files | .gitignore:8-12 | All .env variants excluded from version control. |
| Refresh token rotation with replay detection | auth.ts:225-234 | Refresh tokens are single-use, stored in DB, with family-based revocation on replay detection. |
| Auth endpoint rate limiting | auth.ts:17-34 | Login (5/15min), register (3/hr), refresh (30/15min), invite registration (10/hr). |
| Production JWT_SECRET enforcement | env.ts:6-8 | Throws on startup in production if JWT_SECRET env var is missing. |
| Minimal base image | Dockerfile.api:1 | Uses node:20-slim (Debian slim variant), reducing attack surface. |
| CI concurrency control | ci.yml:9-11 | Cancels in-progress CI runs on same git ref. |
| Opaque refresh tokens | auth.ts:56 | Refresh tokens are crypto.randomBytes(48), not JWTs. Cannot be decoded client-side. |
| Audit logging middleware | Per CLAUDE.md | Prisma middleware auto-logs all CREATE/UPDATE/DELETE mutations. Logs only IDs and field names, never values or PII. |

---

## Summary by Severity

| Severity | Count | Key Themes |
|----------|-------|------------|
| CRITICAL | 4 | Missing security headers (API and web), no cache control on PHI responses, container runs as root |
| HIGH | 6 | Destructive DB migration flag in prod, server starts on schema failure, no body size limit, localStorage tokens, single JWT secret, missing env documentation |
| MEDIUM | 5 | No security scanning in CI, hardcoded CI credentials, exposed DB port, no API rate limiting, CI skips dev branch |
| LOW | 3 | Health check info leak, no DB SSL config documented, weak dev password |

## Recommended Priority

1. **Immediate (this sprint):** C-001, C-002, C-003, C-004, H-001, H-002
2. **Next sprint:** H-003, H-004, H-005, H-006, M-001, M-004, M-005
3. **Backlog:** M-002, M-003, L-001, L-002, L-003

## Disclaimer

This audit is automated technical guidance produced by an AI system, not legal advice. All findings should be reviewed by a qualified HIPAA Privacy Officer and legal counsel before finalizing remediation plans. Final compliance decisions must involve your designated compliance team.

---

**Status: FINDINGS_READY**
