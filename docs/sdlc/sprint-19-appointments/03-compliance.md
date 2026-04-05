# Sprint 19: Appointment Entity + Clinician Calendar — Compliance Assessment

## Verdict: ✅ PASS_WITH_CONDITIONS

The feature is compliant with HIPAA Privacy Rule, Security Rule, and HITECH **provided** the 14 mandatory conditions below are implemented and verified. Steady's existing HIPAA infrastructure (audit middleware, AsyncLocalStorage audit context, PII-stripped logger, tenant-scoped auth) covers the majority of technical safeguards. Sprint 19 extends the PHI surface area but does not introduce any novel compliance challenges. No blocking issues identified.

---

## Regulatory Scope

| Framework | Applicability | Reasoning |
|---|---|---|
| **HIPAA Privacy Rule** (45 CFR §164.500-534) | Applies | Appointment data, including date/time, service code, and client association, is PHI because it reveals a treatment relationship. |
| **HIPAA Security Rule** (45 CFR §164.302-318) | Applies | ePHI is stored, transmitted, and processed electronically. All Technical, Administrative, and Physical safeguards apply. |
| **HITECH** (42 USC §17932) | Applies | Breach notification requirements apply to any unauthorized disclosure of this data. |
| **42 CFR Part 2** (SUD confidentiality) | Conditionally | Only applies IF Steady clinicians treat substance use disorders. Defer to administrative determination; technical controls already meet Part 2's stricter requirements. |
| **GDPR** | Conditionally | Applies if Steady serves EU-based participants. No EU-specific controls added in sprint 19; defer to legal review. |
| **SOC 2** | Deferred | Phase 11 (sprint 59) per roadmap. Not a sprint 19 gate. |
| **HITRUST CSF** | Deferred | Phase 11 (sprint 60) per roadmap. Not a sprint 19 gate. |
| **PCI DSS** | Not applicable | No payment card data in sprint 19. |
| **State laws** | Noted | Some states (CA, NY, TX, IL) have augmented health privacy laws. No new state-specific controls in sprint 19. Existing Steady posture covers baseline. |

---

## PHI Classification

| Data Element | Classification | Rationale | Storage Encryption | Transmission Encryption |
|---|---|---|---|---|
| `Appointment.id` | Indirect PHI identifier | Links to PHI records | At rest (Postgres) | TLS 1.2+ |
| `Appointment.participantId` | PHI identifier | Client identifier | At rest | TLS |
| `Appointment.clinicianId` | Not PHI alone | Workforce identifier | At rest | TLS |
| `Appointment.startAt` / `endAt` | **PHI** | Treatment date/time reveals care episode | At rest | TLS |
| `Appointment.status` | **PHI** | Attendance record is part of medical history | At rest | TLS |
| `Appointment.serviceCodeId` | **PHI when linked** | CPT code + patient = treatment type | At rest | TLS |
| `Appointment.locationId` | **PHI when linked** | Reveals in-person vs. telehealth care pattern | At rest | TLS |
| `Appointment.internalNote` | **PHI (high risk)** | Free text; clinician may write PHI | At rest | TLS |
| `Appointment.cancelReason` | **PHI (high risk)** | Free text; may contain PHI | At rest | TLS |
| `Appointment.statusChangedAt` | PHI | Reveals care timeline | At rest | TLS |
| `Location.*` (name, address) | Not PHI alone | Becomes PHI when linked to specific appointment | At rest | TLS |
| `ServiceCode.*` (code, description, price) | Not PHI alone | Becomes PHI when linked to specific appointment | At rest | TLS |
| `Session.appointmentId` | PHI (FK) | Links clinical note to appointment | At rest | TLS |
| `ParticipantProfile.*` | **PHI** | Individual identifier + treatment relationship | At rest | TLS |
| Audit log entries | PHI-adjacent | Contain resource IDs but no values (minimum necessary respected) | At rest | TLS |

**Minimum Necessary Determination:** The spec respects HIPAA's minimum necessary standard by:
- Never exposing `internalNote` or `cancelReason` to participants
- Logging only field names (not values) in audit trails (except status from/to, which is necessary for integrity audits)
- Filtering all list queries by practice membership
- Requiring explicit date range on list queries (prevents whole-database scraping)

---

## HIPAA Technical Safeguards Assessment (§164.312)

| Standard | Requirement | Spec Assessment | Status |
|---|---|---|---|
| **§164.312(a)(1) Access Control** | Unique user identification | Existing JWT auth with userId claim | Compliant |
| §164.312(a)(2)(i) | Emergency access procedure | Existing admin role can access all practice data | Compliant |
| §164.312(a)(2)(iii) | Automatic logoff | Existing 30-min session timeout | Compliant |
| §164.312(a)(2)(iv) | Encryption/decryption | All ePHI encrypted at rest and in transit (TLS) | Verify in architecture |
| **§164.312(b) Audit Controls** | Hardware/software audit mechanisms | Existing Prisma audit middleware + AsyncLocalStorage context | Compliant — extended in spec (FR-18) |
| **§164.312(c) Integrity** | Protect ePHI from improper alteration/destruction | Audit trail + hard-delete restrictions (24h window, SCHEDULED only) + ON DELETE SET NULL for Session FK | Compliant with conditions |
| **§164.312(d) Person/Entity Authentication** | Verify user identity before access | Existing JWT + role checks | Compliant |
| **§164.312(e)(1) Transmission Security** | Guard against unauthorized access during transmission | TLS for all API traffic, HTTPS enforcement | Verify in architecture |

---

## HIPAA Administrative Safeguards Assessment (§164.308)

| Standard | Scope for Sprint 19 | Status |
|---|---|---|
| §164.308(a)(1)(ii)(A) Risk Analysis | This document | In progress |
| §164.308(a)(3)(i) Workforce Security | Existing RBAC (CLINICIAN, PARTICIPANT, ADMIN) + new practice-owner distinction | Compliant |
| §164.308(a)(4) Information Access Management | Practice-scoped access rules enforced at service layer | Condition: verify at every endpoint |
| §164.308(a)(5) Security Awareness & Training | Out of scope for code; administrative responsibility | N/A |
| §164.308(a)(6) Security Incident Procedures | Existing logging + monitoring | Compliant |
| §164.308(a)(7) Contingency Plan | Existing backup/DR posture (not feature-specific) | N/A |
| §164.308(b) Business Associate Contracts | Existing BAAs with infrastructure providers | Compliant |

---

## HIPAA Physical Safeguards Assessment (§164.310)

Out of scope for feature code. Steady's infrastructure provider (Railway) maintains physical safeguards under existing BAA. No new physical surface introduced by sprint 19.

---

## Risk Analysis (Feature-Specific Threats)

| Threat | Likelihood | Impact | Residual Risk | Mitigation |
|---|---|---|---|---|
| **Cross-tenant PHI disclosure** (clinician from Practice A sees Practice B appointments) | Medium | Critical | Low | Tenant-scoped queries + 404 on cross-tenant + COND-1 |
| **PHI leak in logs** (internalNote or cancelReason accidentally logged) | Medium | Critical | Low | Existing PII-stripping logger + COND-8 (explicit test coverage) |
| **Audit log omission** (a mutation path bypasses middleware) | Low | High | Low | Existing Prisma middleware is global + COND-4 (test all endpoints) |
| **Mass appointment scraping** (malicious clinician queries whole calendar of another clinician) | Medium | High | Medium | Date range cap 62 days + audit logging + COND-14 |
| **Participant enumeration via client search** (typing "a", "b", "c" to enumerate client IDs) | Medium | Medium | Medium | Rate limit + min query length 2 chars + audit (COND-9) |
| **Timing attack on resource existence** (probing whether appointment ID exists via latency) | Low | Low | Low | Accept; not a priority for sprint 19 |
| **Clinical note loss via cascade delete** (deleting appointment removes session note) | Low | Critical | Very Low | ON DELETE SET NULL on Session.appointmentId + COND-12 |
| **Invalid Zod schema bypass** (request body with extra fields reaching Prisma) | Low | High | Very Low | Existing `validate` middleware uses `schema.parse()` + COND-13 |
| **Screen-visible PHI in shared calendar view** (practice owner sees all clinicians' appointments with client names) | Low | Medium | Low (permitted disclosure) | Permitted treatment disclosure under §164.506; audit access |
| **Hard delete used to cover up data** (clinician deletes mistakes before audit) | Low | Medium | Low | 24h window + SCHEDULED-only + audit log of DELETE action + COND-11 |
| **Status transition history forged** (clinician backdates statusChangedAt) | Low | Low | Very Low | statusChangedAt set server-side only + COND-10 |
| **Unauthorized participant "create new client" flow misuse** | Low | Medium | Low | Auth required + tenant-scoped + COND-9 |
| **Cancel reason containing PHI exposed in aggregated reports** | Medium | Medium | Low | Never exposed to participants + audit access (COND-7) |

---

## Mandatory Conditions for Approval

The following 14 conditions MUST be implemented and verified before ship. They are numbered for Architect and QA traceability.

### Access Control & Tenant Isolation

**COND-1: Tenant isolation enforcement at service layer**
Every appointment, location, and service code query in `packages/api/src/services/` MUST filter by `practiceId` derived from the authenticated user's `PracticeMembership`. The filter MUST be in the service function signature, NOT in the route handler. Route handlers calling services MUST pass the authenticated user's practice ID explicitly, never accept it from the request body or query params.

*Verification:* Test suite includes a "cross-tenant access" test for every endpoint that attempts to read/write a resource belonging to a different practice and asserts HTTP 404.

**COND-2: Cross-tenant 404 semantics**
Cross-practice access MUST return HTTP 404 Not Found, never 403 Forbidden. 403 leaks resource existence to unauthorized parties.

*Verification:* Explicit integration test per endpoint confirming 404 on cross-tenant access attempts.

**COND-3: Authentication required on every new endpoint**
All 11 new endpoints listed in the spec (`/api/appointments/*`, `/api/locations/*`, `/api/service-codes`) MUST mount `authenticate` + `requireRole('CLINICIAN')` or `requireRole('ADMIN')` middleware. No endpoint may be publicly accessible.

*Verification:* Integration test per endpoint confirming 401 on unauthenticated request and 403 on wrong-role request.

### Audit Integrity

**COND-4: Audit coverage on every mutation**
Every CREATE, UPDATE, DELETE on `Appointment`, `Location`, `ServiceCode`, and `Session.appointmentId` MUST trigger an audit log entry via the existing Prisma audit middleware. Status transitions MUST additionally log `{ from, to }` as metadata (the spec's approved value-level exception).

*Verification:* Integration test per mutation endpoint asserts exactly one matching `AuditLog` row after the operation.

**COND-5: Audit log never contains PHI values**
`AuditLog.changedFields` MUST be an array of field names only (strings like `"startAt"`, `"internalNote"`). It MUST NOT contain values. The status transition metadata `{ from, to }` is the ONLY allowed value-level entry, and both values are HIPAA-neutral enum strings.

*Verification:* Test inspects `AuditLog` rows after UPDATE operations and asserts no value strings appear. Specific test for `internalNote` and `cancelReason` changes — only `['internalNote']` or `['cancelReason']` appears, never the actual text.

**COND-6: Audit context propagation**
All appointment, location, and service code mutations MUST execute within `runWithAuditUser(userId, fn)` context so the middleware captures the acting user. Any mutation discovered to run outside this context is a blocking bug.

*Verification:* Audit middleware test asserts `userId` is present on every audit row from these routes. Route-level test asserts calling the route with a missing/invalid JWT produces zero audit rows (request rejected before reaching Prisma).

### PHI Protection

**COND-7: `internalNote` and `cancelReason` never exposed to participants**
Any response serialization (current or future) that includes appointment data for a PARTICIPANT role MUST strip `internalNote` and `cancelReason`. Even though sprint 19 has no participant-facing appointment endpoints, a shared response serializer in `packages/api/src/services/appointments.ts` MUST have two output shapes: `toClinicianView(appt)` and `toParticipantView(appt)`. The participant view omits internal note, cancel reason, and audit metadata. Sprint 19 only calls the clinician view, but the participant view exists for future use and is unit-tested.

*Verification:* Unit test on `toParticipantView` asserts `internalNote` and `cancelReason` are absent from output regardless of input.

**COND-8: Logs contain no PHI body content**
All `logger.info` / `logger.error` / `logger.warn` calls in the new routes MUST pass only operation names and resource IDs. Never pass `req.body`, `req.query`, or full Prisma result objects. The existing logger is PII-safe, but new code must be disciplined about what is passed in.

*Verification:* Code review checklist + a smoke test that invokes each route with known-PHI in the payload and greps the test log output for the PHI values. Expect zero matches.

**COND-9: Participant search endpoint must rate-limit and require min query length**
If sprint 19 includes a participant search endpoint for the "Add new client" flow (it does — referenced in FR-15), it MUST:
- Require minimum 2 characters in the query
- Rate-limit to 30 queries/minute per user
- Audit-log every search with the query string hash (not the plaintext)
- Return max 20 results

*Verification:* Integration tests assert min-length rejection, rate-limit trigger at 31 requests/min, and audit log row per query.

### Integrity

**COND-10: `statusChangedAt` server-only**
`statusChangedAt` MUST be set server-side to `new Date()` on every status transition. The API MUST reject any attempt to set it via request body (strip via Zod). Same for `createdAt`, `updatedAt`, `createdById`, `practiceId`, `clinicianId` on mutations.

*Verification:* Test sends a PATCH with `statusChangedAt` in the body; assert the field in DB matches server-side now, not the input.

**COND-11: Hard delete restricted and audited**
`DELETE /api/appointments/:id` MUST enforce: (a) status is `SCHEDULED`, (b) `createdAt` is within the last 24 hours, (c) `createdById` matches the requesting user OR the requesting user is an account owner, (d) no linked `Session` exists (belt and suspenders — even though the schema is SET NULL, a linked session means the appointment has clinical relevance and should be canceled, not deleted). Every successful delete MUST produce an audit log entry with action `DELETE`.

*Verification:* Four integration tests: delete allowed in happy path, delete blocked by wrong status, delete blocked by >24h age, delete blocked by linked Session. Plus audit log assertion on the happy-path test.

**COND-12: Session FK integrity on appointment delete**
The Prisma migration adding `Session.appointmentId` MUST declare `onDelete: SetNull`. No cascade delete. A test against the migrated schema MUST create an appointment, link a session, delete the appointment, and assert the session still exists with `appointmentId = null`.

*Verification:* Migration integration test in `packages/db` or `packages/api`.

### Input Validation & Scope

**COND-13: Zod strict parsing on all inputs**
All route handlers MUST call `schema.parse(req.body)` (or equivalent via validate middleware) before invoking services. Schemas MUST use `.strict()` or explicit field lists to strip unknown properties. Raw request objects MUST NEVER be passed to Prisma.

*Verification:* Test per route sends a payload with an extra unknown field and asserts either 400 rejection (if `.strict()`) or the field is silently stripped (if default `.parse()` behavior). Spec prefers silent stripping for forward-compatibility — acceptable.

**COND-14: Date range cap on list endpoints enforced**
`GET /api/appointments` MUST enforce a 62-day maximum date range (NFR-2b). Requests exceeding the cap return 400. This prevents mass PHI scraping disguised as a "legitimate" calendar query.

*Verification:* Test asserts 400 when `endAt - startAt > 62 days`.

---

## Open Risks to Accept (Documented)

These risks are accepted for sprint 19 with documentation. They are NOT blockers.

| Risk | Acceptance Rationale |
|---|---|
| **Clinicians inadvertently entering PHI into screenshots, shared with support, etc.** | Administrative/training responsibility; no technical control possible. Addressed in separate workforce training materials. |
| **Timing-based existence probing** (latency differences between 404 for nonexistent vs. unauthorized) | Low impact; exploit requires large sample sizes; residual risk acceptable for sprint 19. Revisit in Phase 11 (HITRUST sprint 60). |
| **Log aggregator retention windows** | Covered by existing BAAs with infrastructure providers; retention policies align with HIPAA requirements. |
| **Per-state privacy law variation (CA CMIA, NY SHIELD, TX HB300, IL PIPA)** | Existing HIPAA baseline meets or exceeds state requirements in most cases. Defer detailed state-by-state review until Steady targets insurance-heavy practices (sprint 36+). |
| **Backup restoration procedures and time-to-restore** | Covered by existing Railway contingency planning; not feature-specific. |
| **PHI in error messages returned to clients** | Existing logger strips PII from error objects; new code must maintain discipline (partially covered by COND-8). |
| **Clinician password strength / 2FA** | Defer to sprint 57 (2FA hardening). Current JWT flow is compliant baseline. |

---

## Conditions Traceability Matrix

For Architect + Engineer + QA reference — each condition maps to specific deliverable locations.

| Condition | Architect must cover in §04 | Engineer must implement in §06 | QA must verify in §07 |
|---|---|---|---|
| COND-1 Tenant isolation at service layer | Service layer boundary diagram | `services/appointments.ts` filter params | Cross-tenant test per endpoint |
| COND-2 Cross-tenant 404 | Error handling contract | Error mapping in route handlers | 404 assertion in cross-tenant tests |
| COND-3 Auth on every endpoint | Middleware chain diagram | Router definitions | 401/403 test per endpoint |
| COND-4 Audit coverage on mutations | Audit middleware integration | Service calls via Prisma singleton | AuditLog assertion per mutation |
| COND-5 No PHI values in audit | Audit schema notes | Trust existing middleware behavior | Assert no value strings in changedFields |
| COND-6 Audit context propagation | Context propagation pattern | All services run within runWithAuditUser | Assert userId in audit rows |
| COND-7 Participant view strips PHI | Response DTO shapes | `toClinicianView` + `toParticipantView` serializers | Unit test both shapes |
| COND-8 No PHI in logs | Logging guidelines | Discipline in logger calls | Smoke test greps log output |
| COND-9 Client search rate limiting | Rate limit middleware placement | Per-user rate limiter + min-length check | Rate-limit and min-length tests |
| COND-10 Server-only fields | DTO field stripping rules | Zod schema .omit() or strict field lists | Test rejects client-supplied server fields |
| COND-11 Hard delete restrictions | Delete business rule | Service delete function guards | 4 delete-blocked tests |
| COND-12 SET NULL on Session FK | Migration plan | Prisma schema + migration file | Migration integration test |
| COND-13 Zod parsing before Prisma | Validation middleware pattern | validate() middleware usage | Extra-field tests |
| COND-14 Date range cap | List endpoint validation | Zod refinement on list schema | 400 test on 63-day range |

---

## Final Assessment

**Verdict: PASS_WITH_CONDITIONS**

Sprint 19 is approved to proceed to Architecture. All 14 conditions above are mandatory. The Architect MUST incorporate them into the technical design. The Engineer MUST implement them. QA MUST verify every one in the test plan.

No open issues require PO to revise the spec. The spec as written is compliance-ready.

**Next phase:** Architecture (Phase 4).
