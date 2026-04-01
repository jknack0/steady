# HIPAA Code Audit: Frontend / Client-Side - 2026-03-31

> **Disclaimer:** This report is technical guidance for the engineering team, not legal advice. Final compliance decisions should involve qualified legal counsel and a designated Privacy Officer.

## Scope

Audited the `apps/web/src/` directory of the Next.js clinician dashboard, focusing on:

- Authentication and token storage (`use-auth.ts`, `api-client.ts`, `auth-provider.tsx`)
- Session timeout / automatic logoff
- PHI in browser storage (localStorage, sessionStorage, IndexedDB, cookies)
- PHI in URLs and browser history
- Caching headers for PHI responses
- Console logging of PHI
- React Query cache persistence
- Security headers
- Part editors and assignment components

---

## Critical Findings (Must Fix)

| ID | File:Line | Issue | HIPAA Rule | Remediation |
|----|-----------|-------|------------|-------------|
| C-001 | `apps/web/src/hooks/use-auth.ts:70-71`, `apps/web/src/lib/api-client.ts:22-24` | **JWT tokens stored in localStorage.** Both the access token and refresh token are persisted in `localStorage`, which is accessible to any JavaScript running on the page. An XSS vulnerability would allow an attacker to exfiltrate both tokens and gain full access to PHI. The refresh token (7-day lifetime) is especially dangerous -- it provides prolonged access even after the access token expires. | Security Rule 164.312(a)(1) -- Access Control; 164.312(d) -- Person or Entity Authentication | **Move tokens to `httpOnly`, `Secure`, `SameSite=Strict` cookies** set by the API server. This makes tokens inaccessible to client-side JavaScript. If cookies are not feasible short-term, at minimum move the refresh token to an httpOnly cookie and keep only the short-lived access token in memory (not localStorage). |
| C-002 | _Not present in codebase_ | **No session inactivity timeout or automatic logoff.** There is no mechanism to detect user inactivity and terminate the session. CLAUDE.md specifies a 30-minute inactivity timeout, but the frontend does not implement it. A clinician who walks away from an unlocked workstation leaves PHI accessible indefinitely. | Security Rule 164.312(a)(2)(iii) -- Automatic Logoff | Implement an inactivity timer that monitors mouse, keyboard, and touch events. After 15-30 minutes of inactivity, clear tokens and redirect to `/login`. Consider showing a warning dialog at the 25-minute mark. Wire it into the `ProtectedRoute` or dashboard layout component. |

## High Findings (Should Fix Soon)

| ID | File:Line | Issue | HIPAA Rule | Remediation |
|----|-----------|-------|------------|-------------|
| H-001 | `apps/web/next.config.js` (entire file), `apps/web/vercel.json` (entire file) | **No security headers configured.** Missing: `Cache-Control: no-store` for PHI pages, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy`, `Referrer-Policy`. Without `Cache-Control: no-store`, browser disk cache may persist PHI-containing HTML/JSON responses. Without CSP, XSS risk is elevated (compounding C-001). | Security Rule 164.312(a)(1) -- Access Control; 164.312(e)(1) -- Transmission Security | Add a `headers()` function in `next.config.js` that applies security headers to all dashboard routes. Add a Content Security Policy. Alternatively, add `middleware.ts`. |
| H-002 | `apps/web/src/app/(dashboard)/participants/[id]/page.tsx:122` | **Patient name and email displayed in page header.** `PageHeader` renders `title=name` and `subtitle=participant.email`. The concern is that (a) this PHI may appear in the browser tab title if PageHeader sets `document.title`, and (b) combined with the lack of `Cache-Control: no-store` (H-001), this HTML could be cached. | Security Rule 164.312(a)(1) -- Access Control | Verify `PageHeader` does not set `document.title` with PHI. Ensure this page includes `Cache-Control: no-store`. |
| H-003 | `apps/web/src/components/command-palette.tsx:92-103` | **Command palette displays client names and emails.** The command palette searches participants and renders names and emails as search results. Combined with no inactivity timeout (C-002), an unattended workstation could expose client PII. | Privacy Rule 164.502(b) -- Minimum Necessary | Acceptable for authorized clinician use. Resolving C-002 (inactivity timeout) mitigates the unattended workstation risk. |
| H-004 | _Not present in codebase_ | **No `middleware.ts` for route protection.** Authentication is enforced purely on the client side via `ProtectedRoute`. No Next.js middleware intercepts requests server-side. A brief flash of PHI could render before redirect; server-rendered pages would not be protected; crawlers could index dashboard routes. | Security Rule 164.312(a)(1) -- Access Control | Add `apps/web/src/middleware.ts` that checks for an auth cookie and redirects unauthenticated requests for all `/(dashboard)` routes. |

## Medium Findings (Fix in Next Sprint)

| ID | File:Line | Issue | HIPAA Rule | Remediation |
|----|-----------|-------|------------|-------------|
| M-001 | `apps/web/src/app/(dashboard)/participants/[id]/page.tsx:117-119` | **Client name visible in breadcrumb navigation.** The breadcrumb renders the client full name. While appropriate for the authorized clinician, it persists in browser history. | Privacy Rule 164.502(b) -- Minimum Necessary | Acceptable for authorized use. Low risk once C-002 is resolved. |
| M-002 | `apps/web/src/app/(dashboard)/sessions/[id]/prepare/page.tsx:88` | **Client name in session preparation subtitle.** The subtitle includes participant name, program title, and date. | Privacy Rule 164.502(b) -- Minimum Necessary | Same as M-001. Ensure cache headers are set (H-001). |
| M-003 | `apps/web/src/app/(dashboard)/rtm/[enrollmentId]/superbill/[periodId]/page.tsx:44` | **Client name in superbill page subtitle.** Superbills contain billing PHI (CPT codes, diagnosis codes, patient identity). This page should have the strictest cache and timeout controls. | Security Rule 164.312(a)(1); Privacy Rule 164.502(b) | Ensure this route has `Cache-Control: no-store`. Consider print-specific CSS that clears PHI after printing. |
| M-004 | `apps/web/src/lib/query-provider.tsx:11-12` | **React Query cache not cleared on logout.** PHI fetched via React Query is cached in memory (staleTime 30s, default gcTime 5min). No disk persistence is configured (good), but on logout the query cache is NOT cleared. The logout function in `use-auth.ts:88-100` clears tokens but does not call `queryClient.clear()`. | Security Rule 164.312(a)(1) -- Access Control | On logout, call `queryClient.clear()` to immediately purge all cached PHI from memory. |
| M-005 | `apps/web/src/app/(dashboard)/programs/page.tsx:18-31` | **Tab state in URL search params.** Uses `?tab=client-programs` etc. Audit confirmed search params contain only tab values and non-PHI flags. UUIDs in route segments are not PHI. | N/A | No action needed. Acceptable. |

## Low Findings (Backlog)

| ID | File:Line | Issue | HIPAA Rule | Remediation |
|----|-----------|-------|------------|-------------|
| L-001 | `apps/web/src/hooks/use-auth.ts:6-12` | **Clinician user object (email, firstName, lastName) held in React state.** This is the clinician data (not patient PHI). Low risk. | N/A | Acceptable. |
| L-002 | `apps/web/src/components/client-picker.tsx:37-41` | **Client list filtered client-side.** All clients loaded into memory. HIPAA-acceptable since the clinician is authorized to see all their own clients. | Privacy Rule 164.502(b) | Acceptable. Intentional design per CLAUDE.md. |
| L-003 | `apps/web/src/app/login/page.tsx:39`, `apps/web/src/app/register/page.tsx:43` | **Error messages from server displayed directly.** If the API returns detailed errors containing PHI or system internals, they would be displayed. | Security Rule 164.312(b) | Verify the API returns generic error messages for auth endpoints. |

---

## Positive Findings (Things Done Well)

1. **Zero `console.log` statements in production code.** Grep across all `app/`, `components/`, `hooks/`, and `lib/` directories returned zero matches. Excellent -- no risk of PHI leaking to browser dev tools in production.

2. **No PHI in localStorage or sessionStorage (beyond tokens).** Only `token` and `refreshToken` are stored. No patient data or health information is persisted to browser storage.

3. **No IndexedDB or Web SQL usage.** Confirmed: zero matches.

4. **No cookies used for data storage.** Zero matches for `document.cookie` or cookie manipulation.

5. **No React Query disk persistence.** `persistQueryClient` is not imported or configured. All PHI in the query cache is in-memory only and cleared on page refresh.

6. **No PHI in URL path segments.** Routes use UUIDs rather than patient names, emails, or MRNs.

7. **No PHI in URL query parameters.** Search params contain only tab selectors and non-PHI flags.

8. **Protected route pattern.** All dashboard pages are wrapped in `ProtectedRoute` which checks authentication before rendering.

9. **Server-side refresh token revocation.** The `logout` function calls `POST /api/auth/logout` to revoke the refresh token server-side before clearing local state.

10. **Proper autocomplete attributes.** Login and register forms use appropriate `autoComplete` values that do not create HIPAA risk.

11. **Part editors handle template structure only.** Assessment and intake form editors work with question/field definitions, not patient responses. Good separation of concerns.

12. **No `beforeunload` handlers leaking data.** No event listeners that might expose PHI in prompts.

---

## Remediation Priority

| Priority | ID | Effort | Risk Reduction |
|----------|----|--------|----------------|
| 1 (Immediate) | C-002 | Medium (1-2 days) | High -- closes the automatic logoff gap |
| 2 (Immediate) | C-001 | High (3-5 days) | High -- eliminates XSS token theft vector |
| 3 (This sprint) | H-001 | Low (0.5 day) | Medium -- prevents browser/proxy caching of PHI |
| 4 (This sprint) | M-004 | Low (1 hour) | Medium -- clears PHI from memory on logout |
| 5 (Next sprint) | H-004 | Medium (1-2 days) | Medium -- server-side route protection |
| 6 (Backlog) | H-002, M-001-M-003 | Low | Low -- cosmetic once C-002 and H-001 are resolved |

### Quick Win: Clear Query Cache on Logout

In `use-auth.ts`, the `logout` function should clear the React Query cache. Options:

1. Import `useQueryClient` and pass it into the logout callback.
2. Create a shared `queryClient` instance (singleton) accessible outside React components.
3. Add a logout event listener in `QueryProvider` that calls `queryClient.clear()`.

### Quick Win: Add Security Headers

Add to `next.config.js` an `async headers()` function returning an array with security headers for all non-static routes:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Cache-Control: no-store, no-cache, must-revalidate`
- `Pragma: no-cache`

---

## Recommendations for Legal/Compliance Review

- **Token storage strategy (C-001):** The decision to move to httpOnly cookies vs. in-memory tokens has architectural implications. Legal/compliance should weigh in on acceptable risk for the current localStorage approach during the transition period.
- **Inactivity timeout duration (C-002):** HIPAA does not specify an exact timeout. 15 minutes is a common standard for clinical systems; 30 minutes (per CLAUDE.md) may be acceptable depending on the deployment environment. Privacy Officer should confirm the appropriate value.
- **Superbill/billing data (M-003):** Superbills contain insurance and diagnosis data. Confirm whether additional controls are needed for viewing/printing/exporting superbills beyond standard dashboard protections.
- **Command palette search (H-003):** The search queries the API for participant data by name. Confirm this is acceptable under the Minimum Necessary standard, given that the clinician has access to all their own clients.

---

Status: FINDINGS_READY
