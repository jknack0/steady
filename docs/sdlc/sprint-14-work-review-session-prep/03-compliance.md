# Sprint 14: Steady Work Review + Session Prep + Per-Participant Customization — Compliance Assessment

## Verdict: PASS_WITH_CONDITIONS

The feature is compliant with HIPAA Privacy Rule, Security Rule, and HITECH **provided** the 10 mandatory conditions below are implemented and verified. Sprint 14 introduces new PHI surface area (free-text review responses, barrier selections, clinician notes on overrides) but does not introduce novel compliance challenges beyond what Steady's existing infrastructure handles. The primary risk is free-text PHI in `SessionReview.responses` and `EnrollmentOverride.payload` — both require strict access controls and audit coverage.

---

## Regulatory Scope

| Framework | Applicability | Reasoning |
|---|---|---|
| **HIPAA Privacy Rule** (45 CFR 164.500-534) | Applies | Review responses are patient-authored clinical content. Barrier selections reveal treatment challenges. Override clinician notes contain clinical judgments. All are PHI. |
| **HIPAA Security Rule** (45 CFR 164.302-318) | Applies | ePHI stored, transmitted, and processed electronically. All Technical, Administrative, and Physical safeguards apply. |
| **HITECH** (42 USC 17932) | Applies | Breach notification requirements apply to unauthorized disclosure of review responses or override notes. |
| **42 CFR Part 2** | Conditionally | Only if clinicians treat SUD. Existing controls meet Part 2 requirements. |
| **GDPR** | Conditionally | If EU participants are served. No EU-specific controls in sprint 14. |
| **PCI DSS** | Not applicable | No payment data. |

---

## PHI Classification

| Data Element | Classification | Rationale |
|---|---|---|
| `SessionReview.responses` | **PHI (high risk)** | Free-text patient-authored content about treatment progress and struggles |
| `SessionReview.barriers` | **PHI** | Reveals specific treatment obstacles — clinically meaningful |
| `SessionReview.submittedAt` | PHI | Treatment timeline data |
| `SessionReview.appointmentId` | PHI (FK) | Links patient to appointment |
| `SessionReview.enrollmentId` | PHI (FK) | Links patient to treatment program |
| `ReviewTemplate.questions` | Not PHI | Program-level configuration, not patient-specific |
| `ReviewTemplate.barriers` | Not PHI | Program-level configuration |
| `EnrollmentOverride.payload` (CLINICIAN_NOTE) | **PHI (high risk)** | Free-text clinician clinical judgment about specific patient |
| `EnrollmentOverride.payload` (ADD_RESOURCE) | PHI when linked | Resource recommendation linked to specific patient treatment |
| `EnrollmentOverride.payload` (ADD_HOMEWORK_ITEM) | PHI when linked | Personalized treatment modification |
| `EnrollmentOverride.overrideType` | PHI when linked | Reveals treatment customization decisions |
| `EnrollmentOverride.targetPartId` | PHI when linked | Reveals which content was deemed inappropriate for patient |
| Session prep aggregated data | **PHI** | Combines homework status, stats, tracker data, notes — all patient-specific |
| pg-boss notification job payload | PHI-adjacent | Contains appointment ID + user ID only; no clinical content |

**Minimum Necessary Determination:** The spec respects HIPAA's minimum necessary standard by:
- Review responses are only accessible to the authoring participant and the owning clinician
- Override notes visible only to the creating clinician and the target participant
- Session prep data aggregates existing data — no new PHI is created, only surfaced to authorized clinicians
- Notification job payload contains only IDs, never clinical content
- Audit logs record field names only, never response text or note content

---

## HIPAA Technical Safeguards Assessment (164.312)

| Standard | Requirement | Sprint 14 Assessment | Status |
|---|---|---|---|
| **164.312(a)(1) Access Control** | Unique user identification | Existing JWT auth | Compliant |
| 164.312(a)(2)(iii) | Automatic logoff | Existing 30-min timeout | Compliant |
| 164.312(a)(2)(iv) | Encryption | At-rest (Postgres) + TLS in transit | Compliant |
| **164.312(b) Audit Controls** | Audit mechanisms | Existing Prisma audit middleware covers new models | Compliant with COND-3 |
| **164.312(c) Integrity** | Protect from improper alteration | Ownership checks + audit trail | Compliant with COND-1 |
| **164.312(d) Authentication** | Verify identity | Existing JWT + role checks | Compliant |
| **164.312(e)(1) Transmission** | Guard during transmission | TLS for all API traffic | Compliant |

---

## Risk Analysis

| Threat | Likelihood | Impact | Residual Risk | Mitigation |
|---|---|---|---|---|
| **Cross-participant review disclosure** (clinician A sees participant B's review meant for clinician C) | Medium | Critical | Low | Ownership verification on all review queries + COND-1 |
| **PHI leak in logs** (review response text or override note content logged) | Medium | Critical | Low | Existing PII-stripping logger + COND-5 |
| **Override note exposed to wrong participant** | Medium | Critical | Low | Override queries filter by enrollmentId; participant delivery merges only their own overrides + COND-6 |
| **Notification job contains PHI** | Low | High | Very Low | Job payload restricted to IDs only + COND-8 |
| **Audit log omission on review/override mutations** | Low | High | Low | Existing Prisma audit middleware is global + COND-3 |
| **Barrier selection enumeration** (inferring available barriers reveals program design) | Low | Low | Very Low | Barriers are program-level config, not PHI alone |
| **Session prep data aggregation exposes more PHI than individual endpoints** | Low | Medium | Low | Same authorization as individual endpoints; prep is a convenience aggregation, not a new data source + COND-2 |
| **Stale notification job fires after appointment cancelled** | Medium | Low | Low | Cancel job on appointment status change + COND-8 |
| **Override merge logic silently drops content** | Low | Medium | Low | Unit tests verify round-trip integrity + COND-9 |

---

## Mandatory Conditions for Approval

### Access Control & Ownership

**COND-1: Ownership verification on all review and override endpoints**
Every `SessionReview` query MUST verify that the requesting clinician owns the appointment (via practice membership + clinician on appointment), OR that the requesting participant is the review author. Every `EnrollmentOverride` query MUST verify the requesting clinician owns the enrollment's program. Cross-ownership access MUST return 404, never 403.

*Verification:* Integration test per endpoint with cross-ownership attempts asserting 404.

**COND-2: Session prep authorization matches appointment ownership**
`GET /api/appointments/:id/prep` MUST verify the clinician owns the appointment via practice context (same pattern as existing appointment endpoints). The prep view aggregates data from multiple sources — each sub-query MUST be scoped to the same enrollment/participant, never leaking data from other enrollments.

*Verification:* Integration test creates two practices with appointments; clinician from practice A requests prep for practice B's appointment; asserts 404.

### Audit

**COND-3: Audit coverage on all new mutations**
Every CREATE, UPDATE, DELETE on `ReviewTemplate`, `SessionReview`, and `EnrollmentOverride` MUST trigger an audit log entry via the existing Prisma audit middleware. Audit entries MUST contain `userId`, `action`, `resourceType`, `resourceId`, and `changedFields` (field names only).

*Verification:* Integration test per mutation asserts exactly one matching AuditLog row.

**COND-4: Audit context propagation**
All new route handlers MUST execute within `runWithAuditUser(userId, fn)` context (inherited from the existing `authenticate` middleware). Any mutation discovered outside audit context is a blocking bug.

*Verification:* Assert `userId` present on every audit row from new routes.

### PHI Protection

**COND-5: Logs contain no review/override PHI**
All `logger.info/error/warn` calls in new routes and services MUST pass only operation names and resource IDs. Never pass `req.body`, review response text, barrier selections, or override note content to the logger.

*Verification:* Code review + smoke test that greps log output for known PHI strings after exercising each endpoint.

**COND-6: Override notes never exposed to wrong participant**
The override merge function in the module delivery service MUST filter overrides by `enrollmentId` matching the requesting participant's active enrollment. A participant MUST never see overrides for another participant's enrollment, even within the same program.

*Verification:* Integration test enrolls two participants in the same program, adds overrides to each, and verifies each participant sees only their own overrides in module delivery.

**COND-7: Review responses never exposed to unauthorized parties**
`SessionReview` data MUST only be returned to: (a) the authoring participant, or (b) a clinician who owns the linked appointment. The session prep endpoint MUST NOT include review responses in any response shape accessible to participants.

*Verification:* Test asserts participant cannot read another participant's review; test asserts unauthenticated request returns 401.

### Job Queue Security

**COND-8: Notification job payload contains no PHI**
The pg-boss job enqueued for the 24h review notification MUST contain only: `appointmentId`, `participantUserId`, and `jobType`. The worker resolves participant push token and notification text at execution time from the database. If the appointment has been cancelled by execution time, the worker MUST skip sending.

*Verification:* Unit test on job enqueue function asserts payload contains only allowed fields. Integration test cancels appointment then runs worker; asserts no notification sent.

### Data Integrity

**COND-9: Override merge preserves content integrity**
The merge function MUST NOT alter, reorder, or drop any original program content except for parts targeted by `HIDE_HOMEWORK_ITEM` overrides. Added resources and notes MUST be clearly distinguishable in the merged output (via a `source: 'override'` marker) so the mobile renderer can style them appropriately without confusing them with program-authored content.

*Verification:* Unit test with realistic module data + multiple override types; assert original parts (minus hidden) are preserved with identical field values; assert added items carry `source: 'override'`.

**COND-10: SessionReview uniqueness enforced**
The `@@unique([appointmentId, enrollmentId])` constraint on `SessionReview` MUST be present in the Prisma schema. The API MUST use `upsert` to handle re-submissions gracefully rather than failing on duplicate key.

*Verification:* Integration test submits review twice for the same appointment; asserts exactly one SessionReview row exists with the latest responses.

---

## Conditions Traceability Matrix

| Condition | Architect 04 | Engineer 06 | QA 07 |
|---|---|---|---|
| COND-1 Ownership verification | Ownership check patterns per endpoint | Service layer ownership queries | Cross-ownership 404 tests |
| COND-2 Prep authorization | Prep service scoping diagram | Sub-query enrollment filters | Cross-practice prep test |
| COND-3 Audit coverage | Audit middleware integration notes | Trust existing middleware | AuditLog assertion per mutation |
| COND-4 Audit context propagation | Context propagation pattern | Inherited from authenticate | userId assertion in audit rows |
| COND-5 No PHI in logs | Logging discipline notes | logger calls with IDs only | Smoke test greps log output |
| COND-6 Override isolation | Merge function enrollment filter | enrollmentId filter in merge | Two-participant override isolation test |
| COND-7 Review access control | Review endpoint authorization flow | Ownership checks in service | Cross-participant review test |
| COND-8 Job payload PHI-free | Job payload schema | Minimal job data + worker re-resolve | Job payload assertion + cancel-skip test |
| COND-9 Override merge integrity | Merge algorithm specification | Merge implementation + source marker | Round-trip merge unit tests |
| COND-10 Review uniqueness | Unique constraint in schema | Upsert in review service | Double-submit test |

---

## Open Risks to Accept

| Risk | Acceptance Rationale |
|---|---|
| **Clinician writes PHI in override notes that shouldn't be in the platform** | Administrative/training responsibility. Override notes are treated as PHI and protected accordingly. |
| **24h notification timing drift due to pg-boss queue delay** | Clinically acceptable; a few minutes of drift does not impact care. Documented in spec. |
| **Override notes visible only to creating clinician (sprint 14 scope)** | Practice-wide visibility deferred. No compliance issue — restricting access is more conservative. |

---

## Final Assessment

**Verdict: PASS_WITH_CONDITIONS**

Sprint 14 is approved to proceed to Architecture. All 10 conditions above are mandatory. The primary PHI risks (free-text review responses and clinician override notes) are well-mitigated by Steady's existing ownership-based access control and audit middleware, provided the conditions are implemented.

**Next phase:** Architecture (Phase 4).
