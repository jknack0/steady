# HIPAA Code Audit: Frontend & Client-Side Applications

**Date:** 2026-03-25
**Scope:** Web app (Next.js) at `apps/web/src/`, Mobile app (Expo) at `apps/mobile/`
**Auditor:** Automated HIPAA compliance scan (technical guidance, not legal advice)

---

## Findings Summary
- **Critical:** 4
- **High:** 7
- **Medium:** 7
- **Low:** 4
- **Positive findings:** 12

## Critical Findings

| ID | File:Line | Issue |
|----|-----------|-------|
| C-001 | `use-auth.ts:70-71`, `api-client.ts:4` | JWT tokens stored in localStorage on web (XSS = full PHI access) |
| C-002 | No implementation | No inactivity timeout / automatic logoff (CLAUDE.md says 30min but not implemented) |
| C-003 | No implementation | No Cache-Control headers on API responses containing PHI |
| C-004 | No implementation | No helmet or security headers on API server |

## High Findings

| ID | File:Line | Issue |
|----|-----------|-------|
| H-001 | `RNPartRenderers.tsx:26,1337` | `dangerouslySetInnerHTML` renders clinician HTML without DOMPurify sanitization |
| H-002 | `styled-content-editor.tsx:34,44` | `contentEditable` sets innerHTML directly from external data |
| H-003 | `command-palette.tsx:93-101` | Command palette displays participant names + emails on 2-char search |
| H-004 | `storage.web.ts:1-11` | Mobile web fallback stores tokens in localStorage |
| H-005 | `notifications.ts:58` | console.error logs full error object on mobile |
| H-006 | `app.ts:31-33` | CORS allows all origins when CORS_ORIGINS unset |
| H-007 | No implementation | No inactivity timeout on mobile app |

## Medium Findings

- M-001: TanStack Query caches PHI in memory (default gcTime 5min)
- M-002: Web logout does not clear TanStack Query cache
- M-003: Mobile logout does not clear TanStack Query cache
- M-004: Participant email displayed in client list table
- M-005: Add-client form has no autocomplete="off" on name/email fields
- M-006: Login form autoComplete may persist clinician email
- M-007: No Next.js middleware for server-side route protection

## Low Findings

- L-001: console.log used for notification permission messages on mobile
- L-002: Participant full name displayed as page title (screen sharing risk)
- L-003: User's own name/email displayed in settings (acceptable)
- L-004: window.open opens S3 presigned URLs in new tabs (history exposure)

## Positive Findings

1. Mobile native token storage uses Expo SecureStore (hardware-backed)
2. No console.log in web app source
3. No console.log in mobile screens/components
4. No PHI in URL paths -- opaque UUIDs only
5. No AsyncStorage usage
6. No indexedDB/Service Worker/clipboard operations with PHI
7. API error handler sanitizes messages in production
8. 30-minute JWT access token expiry
9. Protected route component redirects unauthenticated users
10. Auth context clears tokens on failed refresh
11. CORS configurable via environment variable
12. Short JWT expiry aligns with HIPAA session timeout
