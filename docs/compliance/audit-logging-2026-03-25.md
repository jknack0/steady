# HIPAA Code Audit: Logging, Error Handling & Observability

**Date:** 2026-03-25
**Scope:** All logging, error handling, and observability patterns across the STEADY monorepo
**Auditor:** Automated HIPAA compliance scan (technical guidance, not legal advice)

---

## Findings Summary
- **Critical:** 4
- **High:** 6
- **Medium:** 5
- **Low:** 3
- **Positive findings:** 10

## Critical Findings

| ID | File:Line | Issue |
|----|-----------|-------|
| C-001 | `audit-middleware.ts:142` | Raw console.error bypasses HIPAA-safe logger -- Prisma errors can contain PHI |
| C-002 | `ai.ts:84-423` | PHI transmitted to Anthropic API without documented BAA |
| C-003 | `ai.ts:194,256,410` | AI response content logged -- may contain echoed/transformed PHI |
| C-004 | `logger.ts:10` | sanitizeError logs err.message, but Prisma errors embed query details with PHI in messages |

## High Findings

| ID | File:Line | Issue |
|----|-----------|-------|
| H-001 | `errorHandler.ts:8` | Error messages exposed to client in non-production (Prisma errors may contain PHI) |
| H-002 | `seed.ts:3184-3233` | Seed script logs credentials and user data to console |
| H-003 | `use-auth.ts:70-71`, `api-client.ts:4` | JWT tokens stored in localStorage (XSS risk) |
| H-004 | All API routes | No Cache-Control: no-store header on PHI API responses |
| H-005 | `notifications.ts:58` | Full error object logged to console on mobile client |
| H-006 | `merge-trackers.ts` | Migration script logs tracker names and participant IDs |

## Medium Findings

- M-001: Hardcoded fallback JWT secret in source code
- M-002: Admin script (promote-jo.ts) logs full error objects
- M-003: No log retention policy or encryption documented
- M-004: No request/response audit logging for API read endpoints
- M-005: Push notification content could contain PHI (task titles)

## Low Findings

- L-001: Unused/dead ACTION_MAP constant with bug in audit middleware
- L-002: CORS origin:true fallback allows any origin
- L-003: Service error messages returned directly to clients

## Positive Findings

1. HIPAA-safe logger with sanitizeError() strips errors to name+message
2. Consistent logger usage across all 20 routes and 14 services
3. Audit middleware logs field names only, never values
4. Fire-and-forget audit logging (non-blocking)
5. Generic error messages in production
6. No request body logging (no morgan/winston/pino)
7. No third-party error tracking services (no Sentry/Datadog/LogRocket)
8. Mobile uses Expo Secure Store for tokens
9. Auth middleware integrates with audit context via AsyncLocalStorage
10. Role-based access control consistently applied on all routes
