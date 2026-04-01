# HIPAA Code Audit: Logging, Error Handling & Observability

**Date:** 2026-03-31  
**Scope:** packages/api/src/, packages/db/src/audit-middleware.ts  
**Auditor:** Claude Code (automated scan -- not legal advice)  
**Status: FINDINGS_READY**

> **Disclaimer:** This is technical guidance for the engineering team. Final compliance
> decisions must involve qualified legal counsel and your designated Privacy Officer.

---

## Critical Findings (Must Fix)

| ID | File:Line | Issue | HIPAA Rule | Remediation |
|----|-----------|-------|------------|-------------|
| C-001 | packages/db/src/audit-middleware.ts:142 | **Raw console.error bypasses the HIPAA-safe logger.** The audit middleware catches audit-write failures with console.error("Audit log write failed:", err). The err object is a Prisma error that may contain the full SQL statement including PHI values (patient names, IDs, health data) in its message or meta properties. This is the only console.error call outside of logger.ts in the API package. | Security Rule 164.312(b) -- Audit controls; 164.312(e)(1) -- Integrity | Replace with the HIPAA-safe logger which runs through sanitizeError() and only outputs err.name: err.message. Prisma errors can embed full query text in .message, so also consider logging only a generic "audit write failed for [model]" message with no error details. |
| C-002 | packages/api/src/routes/auth.ts:181 | **logger.warn() receives an Error object but signature expects string.** The call logger.warn("Admin sync failed", e) passes an error object as the detail parameter. Since logger.warn uses template literal interpolation, this will invoke .toString() on the error, which on Prisma errors may produce output containing query text with PHI. Unlike logger.error, the warn method has no sanitizeError() path. | Security Rule 164.312(b) | Either (a) change the call to logger.error("Admin sync failed", e) so it goes through sanitizeError(), or (b) update logger.warn to accept an unknown second parameter and sanitize it the same way logger.error does. Audit all other logger.warn call sites for the same pattern. |

## High Findings (Should Fix Soon)

| ID | File:Line | Issue | HIPAA Rule | Remediation |
|----|-----------|-------|------------|-------------|
| H-001 | packages/api/src/middleware/errorHandler.ts:8 | **err.message exposed to clients in non-production.** In non-production environments, the global error handler returns the raw err.message in the JSON response. Prisma errors embed full SQL queries (including PHI values) in their message. A developer testing against a staging database with real patient data would see PHI in API error responses. | Security Rule 164.312(a)(1) -- Access control | Always return a generic error message to clients regardless of environment. Log the detailed error server-side only. If developer debugging is needed, use request IDs that correlate to server logs. |
| H-002 | packages/api/src/routes/ai.ts:110,181,340-408 | **Clinical content sent to third-party AI (Anthropic) without documented BAA.** Three AI endpoints send clinician-authored content and uploaded PDFs to the Anthropic API. While the content may be program templates (not patient-specific), PDF homework worksheets could contain patient names or clinical content that qualifies as PHI. | Privacy Rule 164.502(e) -- Business associates; Security Rule 164.314 | (1) Confirm a BAA is in place with Anthropic for API usage. (2) If no BAA exists, ensure all content sent to the AI is scrubbed of PHI before transmission, or restrict the feature to template content only. (3) Document this data flow in your system security plan. |
| H-003 | packages/api/src/routes/ai.ts:194,256,422 | **AI response content logged at ERROR level.** Lines like logger.error("AI generate-tracker returned invalid JSON", new Error(rawJson.slice(0, 200))) log up to 200 characters of AI-generated output. If the AI echoes back clinical content from the input, this could contain PHI. Note that line 422 passes rawJson.slice(0, 200) as the context string parameter -- it will NOT be sanitized. | Security Rule 164.312(b) | Replace with a generic message like "AI returned invalid JSON (length=N)". Do not log any portion of the AI response payload. |
| H-004 | packages/api/src/app.ts | **No Cache-Control: no-store header on API responses.** There is no middleware setting Cache-Control: no-store on responses that contain PHI. Browsers and intermediate proxies could cache API responses containing patient data. | Security Rule 164.312(e)(1) -- Transmission security | Add middleware that sets Cache-Control: no-store, no-cache, must-revalidate, private and Pragma: no-cache on all authenticated API responses. |
| H-005 | packages/api/src/app.ts | **No Helmet middleware for security headers.** The Express app does not use helmet or equivalent to set security headers (X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, X-XSS-Protection). | Security Rule 164.312(e)(1) | Add helmet() middleware. At minimum, configure hsts, noSniff, frameguard, and contentSecurityPolicy. |


## Medium Findings (Fix in Next Sprint)

| ID | File:Line | Issue | HIPAA Rule | Remediation |
|----|-----------|-------|------------|-------------|
| M-001 | packages/api/src/scripts/merge-trackers.ts:19,38,61,84,157 | **Migration script logs participant IDs and tracker names at INFO level.** Lines like logger.info("Processing participant", participantId) log participant profile IDs and tracker metadata. Participant IDs combined with tracker names and field labels could be considered identifiable health information in context. | Security Rule 164.312(b) | Since this is a one-time migration script, the risk is lower. For future scripts, log only counts and status, not individual IDs or names. |
| M-002 | packages/db/src/audit-middleware.ts:40-48 | **Dead ACTION_MAP constant with incorrect mapping.** Line 43 maps update to "CREATE" instead of "UPDATE". While unused (the correct PRISMA_TO_AUDIT is used), dead code with incorrect mappings is a maintenance hazard that could corrupt audit integrity if accidentally used. | Security Rule 164.312(b) -- Audit controls | Remove the dead ACTION_MAP constant entirely. Only PRISMA_TO_AUDIT should exist. |
| M-003 | Multiple route files | **Service error messages returned directly to clients.** Across invitations, auth, config, clinician, participant, RTM, and programs routes, err.message from NotFoundError, ConflictError, ExpiredError, and AssignmentError is returned in the API response. While current messages are generic, there is no guardrail preventing a future developer from including PHI in error messages. | Security Rule 164.312(a)(1) | Establish a pattern where service errors use message codes/constants instead of freeform strings. Document in CLAUDE.md that error messages must never contain PHI. |
| M-004 | packages/api/src/lib/logger.ts | **No structured logging format.** The logger outputs plain text strings. Structured logging (JSON) enables automated PII scanning, reliable log aggregation, tamper-evident storage, and query-based audit trail review. | Security Rule 164.312(b) -- Audit controls | Migrate to a structured logger (e.g., pino or winston with JSON transport). Each log entry should include: timestamp, level, message, requestId, userId, and no PHI fields. |
| M-005 | packages/api/src/lib/logger.ts | **No log retention or rotation policy.** The logger writes to stdout/stderr with no documented retention policy. HIPAA requires audit logs be retained for a minimum of 6 years. | Security Rule 164.312(b) -- Audit controls | Document your log retention architecture. Ensure Railway logs or a log aggregation service retains logs for at minimum 6 years. |
| M-006 | packages/api/src/routes/programs.ts:419-423,444-448 | **AssignmentError.data spread directly into API response.** The pattern ...(err.data) spreads arbitrary data from the error into the client response. Currently only contains a UUID, but this pattern has no guardrail against future PHI leakage. | Security Rule 164.312(a)(1) | Explicitly allowlist which fields from err.data are included in the response. |

## Low Findings (Backlog)

| ID | File:Line | Issue | HIPAA Rule | Remediation |
|----|-----------|-------|------------|-------------|
| L-001 | packages/api/src/lib/logger.ts:10 | **err.message may contain PHI for certain error types.** Prisma PrismaClientKnownRequestError embeds the full query in message. While sanitizeError() avoids logging the full error object, err.message alone may still contain PHI embedded in SQL. | Security Rule 164.312(b) | For Prisma errors, consider logging only err.name and err.code (e.g., "P2002") rather than the full message via a special case in sanitizeError(). |
| L-002 | packages/api/src/routes/auth.ts:23 | **Rate limiter keys on email address.** keyGenerator uses the raw email as a rate limit key. If the rate limiter stores this in memory, email addresses (PHI under HIPAA) are held in server memory. | Security Rule 164.312(a)(1) | Consider hashing the email before using it as a rate limiter key with crypto.createHash("sha256"). |
| L-003 | packages/api/src/middleware/errorHandler.ts | **No request/correlation ID in error responses.** When a 500 error occurs, there is no way for the client to report a correlation ID that maps to the server-side log entry. This slows incident response for potential breach investigations. | Security Rule 164.308(a)(6) -- Incident procedures | Generate a request ID in middleware, attach it to all log entries, and return it in error responses. |


---

## Positive Findings (Things Done Right)

1. **HIPAA-safe logger design (logger.ts).** The sanitizeError() function correctly strips error objects down to name: message, avoiding logging of full error objects that may contain Prisma query results with PHI. The docstring explicitly warns against logging full objects.

2. **Stack traces gated to non-production (logger.ts:23).** Stack traces are only logged when NODE_ENV !== "production", preventing information leakage in production logs.

3. **Production error handler returns generic message (errorHandler.ts:8).** The global error handler correctly returns "Internal server error" in production, hiding implementation details from clients.

4. **Audit middleware logs field names, never values (audit-middleware.ts:95).** The buildMetadata() function explicitly extracts only Object.keys(data) for update operations, ensuring PHI values are never written to audit logs.

5. **Audit middleware uses AsyncLocalStorage for user context (audit-middleware.ts:15).** This avoids threading user IDs through every function call, reducing the risk of accidentally dropping audit context.

6. **Audit middleware is fire-and-forget (audit-middleware.ts:132).** Audit logging does not block the response path. The trade-off (potential lost audit entries) is acceptable given the .catch() handler.

7. **No console.log/error/warn calls in API route/service files.** All logging in packages/api/src/routes/ and packages/api/src/services/ goes through the centralized logger utility. The only exception is the audit middleware in packages/db/ (see C-001).

8. **Rate limiting on authentication endpoints (auth.ts:17-30).** Login and registration endpoints have rate limiters with reasonable limits (5 attempts/15 min for login, 3/hour for registration).

9. **Validation middleware returns generic error (validate.ts:23).** The Zod validation middleware returns "Validation failed" with field paths and Zod messages, but does not echo back the submitted values (which could contain PHI).

10. **Service error messages are currently PHI-free.** All reviewed NotFoundError, ConflictError, and ExpiredError messages use generic language without embedding patient identifiers or health data.

11. **Invitation system hashes emails (invitations.ts:55).** Patient emails are stored as hashes for deduplication rather than in plaintext, reducing PHI exposure.

12. **PII scrub worker exists (scrub-expired-invites.ts).** An active scheduled worker scrubs PII from expired invitations, demonstrating awareness of data minimization principles.

---

## Summary

| Severity | Count | Key Theme |
|----------|-------|-----------|
| CRITICAL | 2 | Logger bypass in audit middleware; unsanitized error object in warn() |
| HIGH | 5 | Dev error leakage to clients; AI/BAA gap; AI response logged; missing Cache-Control; missing Helmet |
| MEDIUM | 6 | Migration script logging; dead code; error message guardrails; unstructured logs; no retention policy; response data spread |
| LOW | 3 | Prisma message PHI; email in rate limiter; no correlation IDs |

The codebase demonstrates strong HIPAA awareness overall -- the centralized logger, audit middleware design, and error handling patterns are well-thought-out. The critical findings are narrow in scope and straightforward to fix. The highest-impact improvements would be:

1. Fix C-001 and C-002 (30 minutes of work, eliminates the two critical findings)
2. Add Cache-Control and helmet headers (H-004, H-005 -- 30 minutes)
3. Confirm Anthropic BAA status (H-002 -- legal/compliance task)
4. Stop logging AI response content (H-003 -- 15 minutes)
5. Always return generic errors to clients regardless of environment (H-001 -- 15 minutes)

## Recommendations for Legal/Compliance Review

- **AI/Anthropic BAA:** Confirm whether a Business Associate Agreement is in place with Anthropic covering API usage. If not, assess whether content sent to AI endpoints could contain PHI and whether this constitutes an unauthorized disclosure.
- **Log retention architecture:** Document how Railway logs are retained, for how long, and whether the 6-year HIPAA minimum is met. If not, implement a log aggregation solution.
- **Incident response correlation:** Evaluate whether the current logging infrastructure supports the breach investigation requirements under the Breach Notification Rule (164.408).
- **Error message policy:** Add to the project CLAUDE.md or contributing guidelines a rule that service error messages must never contain PHI (names, emails, dates of birth, diagnosis codes, etc.).
