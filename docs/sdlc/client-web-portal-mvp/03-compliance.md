# Client Web Portal MVP — Compliance Assessment

## Verdict: **PASS_WITH_CONDITIONS**

The spec is compliant with HIPAA, GDPR (to the extent EU users exist), and SOC 2 **IF** all conditions below are implemented. No requirement must be removed or altered. Several conditions are already captured in the spec's NFRs (notably NFR-2 Security and NFR-4 HIPAA Compliance) and are re-enumerated here as formal conditions tracked through the pipeline.

The single open risk that compliance explicitly **accepts rather than blocks** is the single Cognito user pool topology (NFR-4.7). With the cross-role guard enforced at both middleware and API layers (NFR-2.12) and documented risk acceptance, the single-pool approach is acceptable for v1. This decision is revisited annually or on the next significant auth change.

---

## Data Classification

| Data Element | Category | Sensitivity | Source |
|---|---|---|---|
| Recipient email (invitation) | PII + quasi-identifier linked to PHI | **High** | PortalInvitation |
| Recipient first/last name (invitation stub) | PII | Medium | User, PortalInvitation |
| Opaque invite token (plaintext) | Authentication secret | **Critical** | Email body, URL, worker memory |
| Token SHA-256 hash | Low-sensitivity derivative | Low | DB column |
| Recipient email SHA-256 hash | Low-sensitivity derivative | Low | DB column |
| Cognito password | Authentication secret | **Critical** | Never stored in STEADY DB |
| Access token / refresh token (cookies) | Authentication secret | **Critical** | Browser cookies |
| Appointment record (time, clinician, type) | **PHI** (linkage implies treatment relationship) | **High** | Appointment |
| Clinician name (displayed to participant) | PHI in linkage context | High | User → ClinicianProfile |
| Participant timezone | Personal data (weak quasi-identifier) | Low-Medium | ParticipantProfile |
| LiveKit room content (audio/video) | **PHI** (clinical encounter) | **Critical** | LiveKit |
| Recording consent decision | PHI metadata | Medium | Existing recording-control service |
| AuditLog entries (user id, action, resource) | Access log of PHI operations | High | AuditLog |
| SES bounce / complaint events (recipient email) | PII + delivery metadata | Medium | SNS, EmailSuppression |
| Cross-role error / audit log entry | Authentication attempt metadata | Low | AuditLog |

All High/Critical data elements are already covered by the spec's encryption-at-rest requirement (NFR-4.5 via `encryption-middleware`), TLS-in-transit, and audit logging (NFR-4.1).

---

## Framework Assessments

### HIPAA

**Status:** Conditionally Compliant

This feature introduces PHI access via a new authentication surface (the client web portal). HIPAA's Technical, Administrative, and Physical safeguards under 45 CFR §164.308–312 apply. Most required controls are already in the spec; a few need explicit formalization.

| Requirement | Assessment | Notes |
|---|---|---|
| FR-1 Invite create | Compliant | No PHI in response, audit logged, ownership checked |
| FR-2 SES email | Needs Control | Invite email is PHI-free by spec (AC-2.6). COND-1 makes the compliance test mandatory and enforced in CI. COND-2 requires SES BAA verification before deploy. |
| FR-3 Redeem invitation | Needs Control | Token binding + single-use burn already required. COND-3 requires rate limiting to be non-in-memory (per CLAUDE.md stateless rule and already in NFR-2.8). |
| FR-4 Portal login | Compliant | Existing Cognito flow, rate-limited, audit-logged |
| FR-5 Password reset | Needs Control | COND-4: Cognito `ForgotPasswordCommand` email delivery channel must be on the SES BAA-covered domain. Existing Cognito default email is NOT BAA-covered. |
| FR-6 Calendar view | Needs Control | Appointment data is PHI. COND-5 formalizes minimum-necessary Prisma `select` blocks (already in NFR-4.6 as principle, now mandated as PR gate). |
| FR-7 Telehealth join | Needs Control | LiveKit content is PHI. COND-6 requires participant-role token grants to be LEAST-privilege (no recording, no room admin — already in AC-7.4 but re-asserted as a compliance hard requirement). COND-7 requires an audit entry on every participant `room.connected` and `room.disconnected` event. |
| FR-8 Logout + idle | Compliant | 30-min idle timeout meets §164.312(a)(2)(iii) automatic logoff. Pause during active LiveKit is acceptable because the user is actively engaged. |
| FR-9 Cross-role guard | Needs Control | COND-8: Cross-role guard must be enforced at BOTH middleware AND API (already in NFR-2.12), AND a security test suite must prove clinician JWT cannot read any participant-scoped PHI endpoint and vice versa. |
| FR-10 Manage invites | Compliant | Audit-logged, soft-deleted, owner-scoped |
| FR-11 Mobile register deletion | Compliant | No PHI impact |
| FR-12 Legacy deletion | Needs Control | COND-9: The NFR-5.4 prod SQL verification gate must be run and screenshot attached to the ship PR. Non-negotiable. |
| NFR-2 Security | Needs Control | Cookie scoping (NFR-2.2) is load-bearing. COND-10 pins the principle: the chosen mechanism MUST prevent XSS on one subdomain from stealing the other subdomain's cookies. |
| NFR-4 HIPAA | Needs Control | Single Cognito pool risk (NFR-4.7) is ACCEPTED per COND-11 with documented risk acceptance. |

**Required Controls:** Enumerated below in the consolidated Conditions section.

---

### GDPR

**Status:** Conditionally Compliant

STEADY is US-based but the portal is internet-accessible, so EU participants are plausible. GDPR Article 6 (lawful basis), Article 9 (special category — health data), and the data-subject rights apply to any EU resident who becomes a client.

| Requirement | Assessment | Notes |
|---|---|---|
| Lawful basis | Needs Control | COND-12: The clinical relationship provides the contractual basis (Art. 6(1)(b)) and the client's acceptance of the invite, combined with the clinician's treatment relationship, covers Art. 9(2)(h) (healthcare provision). This must be documented in the privacy policy linked from the portal login page. |
| Data minimization | Compliant via COND-5 (minimum-necessary Prisma selects) |
| Right of access | Needs Control | COND-13: The spec doesn't explicitly provide a portal-side data-access mechanism. Compliance accepts deferral to a later feature IF the existing clinician-side data-export tooling can fulfill a data subject access request for a portal user on the clinician's behalf within 30 days. Add a runbook note. |
| Right of erasure | Needs Control | COND-14: Soft-delete-for-audit (per CLAUDE.md) conflicts with Art. 17 literal erasure. Accept the conflict as HIPAA-supersedes-GDPR for clinical records, but the privacy policy MUST explain that erasure requests result in account deactivation and identifier pseudonymization, not row deletion, and that audit logs are retained per HIPAA. |
| Cross-border transfer | Needs Control | COND-15: Infrastructure is us-east-2. If EU participants are served, a Standard Contractual Clause (SCC) + supplementary measures (which the existing encryption-at-rest covers) must be referenced in the privacy policy. STEADY's data controller relationship (clinician) and processor relationship (STEADY) must also be clarified. |
| Consent for profiling / analytics | Compliant | No client-side analytics in v1 (explicitly out-of-scope). No profiling. No consent banner needed. |
| DPIA requirement | Needs Control | COND-16: A Data Protection Impact Assessment IS required because the feature processes health data at scale. Accept deferral to a pre-launch DPIA authored by the privacy officer. The DPIA output is a launch blocker separate from engineering completion. |

---

### SOC 2

**Status:** Conditionally Compliant

SOC 2 Trust Services Criteria apply: Security, Availability, Processing Integrity, Confidentiality, Privacy.

| Criterion | Assessment | Notes |
|---|---|---|
| CC6.1 Logical access | Needs Control | COND-17: The cross-role guard + server-side role re-verification meets CC6.1. A formal access control matrix must be documented (who can access what PHI) and included in the architecture deliverable. |
| CC6.2 User provisioning | Compliant | Clinician-gated invitations + single-use token + Cognito-managed accounts |
| CC6.6 Restricting unauthorized access | Needs Control | COND-18: Cookie scoping (NFR-2.2) and CSP header (NFR-2.11) both required. Missing either reopens the gap. |
| CC6.7 Transmission of confidential info | Needs Control | COND-19: All portal traffic must be HTTPS-only with HSTS `max-age≥31536000; includeSubDomains; preload` (already in NFR-2.11). COND-20: SES sending connection to the API is over TLS (AWS SDK default). |
| CC7.2 System monitoring | Needs Control | COND-21: CloudWatch alarms (NFR-6.2) must be wired before GA. SEND_FAILED and 5xx redeem rate are paging alarms per the spec. |
| CC7.3 Incident response | Needs Control | COND-22: The runbook for invitation-delivery incidents (bounce spike, SES suspension, suppression list corruption) must exist before launch. Incident severity mapping included. |
| CC7.4 Incident detection | Needs Control | COND-23: Bounce rate > 5% and complaint rate > 0.1% paging thresholds (NFR-6.2) are non-negotiable for SES reputation protection. |
| A1.1 Availability — capacity | Compliant | Performance SLOs in NFR-1 are explicit |
| A1.2 Availability — backup | Needs Control | COND-24: The `EmailSuppression` table is Priority-1 for recovery (NFR-7.1). Documented in the DR runbook. |
| PI1.1 Processing integrity — completeness | Needs Control | COND-25: Redeem transaction must be atomic (SELECT FOR UPDATE + single COMMIT — already in AC-3.2). Cognito user creation is outside the Prisma tx; reconciliation path required (already in AC-3.3). |
| PI1.4 Processing integrity — authorization | Compliant via FR-9 |
| C1.1 Confidentiality — classification | Needs Control | COND-26: The data classification table in this assessment is authoritative for the feature and must be referenced from the architecture deliverable. |
| C1.2 Confidentiality — data disposal | Needs Control | COND-27: Soft-deleted tokens must have their `tokenHash` cleared or a `tokenBurnedAt` timestamp set (already in AC-3.2 step 8). The chosen mechanism must actually prevent token re-use (test hook required). |
| P1.1 Privacy — notice | Needs Control | COND-28: Portal login and signup pages must link to the privacy policy. Copy authored in UX phase. |

---

## Conditions for Approval

All conditions below are **mandatory**. They must appear in the Architecture deliverable (where applicable), be verified in QA/SDET, and be implemented by Engineering. The Orchestrator tracks them through the pipeline.

### Infrastructure and BAA

1. **COND-1 (CI gate) — Email PHI denylist test.** A unit test scans rendered invite email templates against a denylist (first name regex, DOB patterns, diagnosis code patterns, clinician full name except the existing-user variant's last-name-only) and fails the build on any match. Must run in CI on every PR touching email templates or the email worker. Also runs as a release gate.

2. **COND-2 (Infra gate) — SES production-mode + BAA verification.** Before any deploy to an environment that sends real invite emails, verify via `aws sesv2 get-account` that the account is in production mode (out of sandbox). Separately, compliance officer confirms in writing that the AWS BAA covers SES in the deployed region (us-east-2). Both artifacts attached to the launch checklist.

3. **COND-3 (Implementation) — Non-in-memory rate limiting.** Rate limits on invite creation, token redemption, login, forgot/reset password, and SNS webhooks use DB-backed or Redis-backed storage. No in-memory rate limit state (violates CLAUDE.md stateless rule and prevents horizontal scaling). Already in NFR-2.8; re-asserted as a compliance hard requirement.

4. **COND-4 (Architecture + Impl) — Cognito password reset email must flow through SES BAA-covered domain.** Cognito's default email delivery uses a different infrastructure that is not covered by the SES BAA. The Cognito User Pool must be configured to use SES as its email sending service (`EmailConfiguration.SourceArn` set to a verified SES identity in the BAA-covered region). Architect verifies current pool config and reconfigures if needed. QA test confirms a forgot-password flow delivers via the expected SES domain.

### Data Access and Isolation

5. **COND-5 (PR review gate) — Minimum-necessary Prisma selects.** All participant-scoped queries use explicit Prisma `select` blocks. No unbounded `include` chains. PR review rejects any new participant-scoped query that fetches more fields than the UI displays. A checklist item on the PR template.

6. **COND-6 (Architecture) — Least-privilege LiveKit tokens.** Participant role telehealth tokens grant ONLY `canPublish`, `canSubscribe`, `canPublishData`, `canUpdateOwnMetadata`. NO `roomAdmin`, NO `roomRecord`, NO `canEndRoom`, NO `canUpdateOthersMetadata`. Architect codifies the grant set in a single shared constant. QA test instantiates a token, decodes the JWT grants, and asserts the absence of each forbidden grant.

7. **COND-7 (Implementation) — LiveKit join/leave audit logging.** Every participant `room.connected` event writes an AuditLog with `action=READ, resourceType=Appointment, resourceId={appointmentId}, metadata.event=telehealth_connected`. Every `room.disconnected` writes a companion entry. These are separate from the normal API audit trail and satisfy HIPAA §164.312(b) audit controls for PHI access events.

8. **COND-8 (QA gate) — Cross-role PHI isolation test suite.** A dedicated integration test file `__tests__/cross-role-authorization.test.ts` iterates every PHI-accessing endpoint (calendar, appointments, invoices, telehealth token, etc.) with both clinician and participant JWTs and asserts correct role enforcement at the API layer. This is independent of middleware/layout checks.

9. **COND-10 (Architecture) — Cookie isolation between subdomains.** NFR-2.2's principle is non-negotiable: no shared parent-domain cookie scope. Architect picks a mechanism and documents the choice, the threat model it addresses, and the specific Cognito / Express / Next.js configuration that enforces it. Security review gate (NFR-2.15) verifies the chosen mechanism before GA.

10. **COND-11 (Risk acceptance) — Single Cognito pool accepted with compensating controls.** A formal risk acceptance memo is written and signed by the privacy officer (or equivalent). The memo documents: the single-pool architecture, the compensating cross-role guard (COND-8), the access control matrix (COND-17), and the plan to revisit this decision annually or on the next significant auth change. Memo stored in `docs/sdlc/client-web-portal-mvp/risk-acceptances/single-cognito-pool.md`.

### Privacy and Data Subject Rights

11. **COND-12 (Documentation) — Privacy policy update.** Before the portal is accessible to any client, the public privacy policy must be updated to reflect: the portal data processing activities, the lawful basis under GDPR Art. 6(1)(b) and Art. 9(2)(h), the data controller (clinician) / processor (STEADY) relationship, data subject rights contact, retention policy (with the HIPAA-vs-erasure reconciliation from COND-14), and a reference to SCCs for cross-border transfer if applicable.

12. **COND-13 (Runbook) — DSAR fulfillment path.** The existing clinician-side data export tooling must be extendable to fulfill a Data Subject Access Request for a portal user. A runbook entry documents the exact steps (query-by-participantProfileId, export format, 30-day SLA per GDPR Art. 12(3)). If no clinician-side tooling exists, a gap ticket is created for a follow-up feature.

13. **COND-14 (Documentation) — Erasure reconciliation.** Because HIPAA requires audit trail retention and PHI records are subject to state-level retention laws, Art. 17 literal erasure cannot be honored for clinical records. The privacy policy and runbook explain that "erasure" means: account deactivation, identifier pseudonymization, and exclusion from active data access. Audit logs are retained per HIPAA. This reconciliation is signed off by the privacy officer.

14. **COND-15 (Documentation) — Cross-border transfer basis.** If EU residents can reach the portal, the privacy policy references Standard Contractual Clauses (SCCs) and relies on the existing AWS DPA + encryption-at-rest as supplementary measures under Schrems II. If the business intent is to serve US-only, the portal signup flow rejects EU-originating IPs (adds friction but clarifies scope). Compliance accepts either approach; decision documented before GA.

15. **COND-16 (Launch gate) — DPIA.** A Data Protection Impact Assessment is required under GDPR Art. 35 because the feature involves large-scale processing of Art. 9 special category data (health). The DPIA is authored by the privacy officer (not engineering) and stored at `docs/sdlc/client-web-portal-mvp/dpia.md`. DPIA completion is a launch gate separate from engineering sign-off. Engineering can proceed in parallel with DPIA drafting.

### Monitoring and Operations

16. **COND-17 (Architecture) — Access control matrix.** The architecture deliverable includes an access control matrix mapping (Role × Endpoint × PHI accessed) with the expected result (ALLOW / DENY). The matrix is the source of truth for COND-8's test generation.

17. **COND-18 (Architecture + Impl) — CSP and security headers enforced.** NFR-2.11's CSP + HSTS + X-Frame-Options + Referrer-Policy headers are set on every portal response. An integration test asserts presence via a HEAD request to each portal route.

18. **COND-19 (Infra) — HTTPS-only + HSTS preload.** CloudFront is configured to redirect HTTP to HTTPS. HSTS preload submission is tracked as a post-launch task (not a launch blocker, but a follow-up).

19. **COND-20 (Verification) — AWS SDK TLS defaults.** AWS SDK v3 enforces TLS by default. No additional config needed; verified by PR review of the SES client instantiation.

20. **COND-21 (Launch gate) — CloudWatch alarms wired.** All NFR-6.2 alarms (bounce rate, complaint rate, SEND_FAILED, 5xx redeem rate) are created in CloudWatch before GA. Alarm SNS target is the existing on-call paging topic.

21. **COND-22 (Documentation) — Incident response runbook.** A runbook exists at `docs/sdlc/client-web-portal-mvp/runbooks/email-incidents.md` covering: bounce rate spike, SES account suspension, suppression list corruption, invite mass-send misfire. Runbook includes on-call escalation path and rollback steps.

22. **COND-23 (Compliance gate) — Bounce/complaint thresholds non-negotiable.** The 5% bounce rate and 0.1% complaint rate thresholds in NFR-6.2 are set in stone. Exceeding either triggers on-call paging AND automated pausing of outbound invite sends (circuit breaker) until investigated. The circuit breaker is part of this feature's scope.

23. **COND-24 (DR runbook) — EmailSuppression priority-1 recovery.** The DR runbook marks `EmailSuppression` as priority-1 for restore during RDS recovery. Loss would re-enable sends to bounced addresses, causing SES reputation damage.

### Processing Integrity and Disposal

24. **COND-25 (Verified by test) — Redeem transaction atomicity.** AC-3.2 prescribes the SELECT FOR UPDATE + single-commit flow. A test injects a concurrent revoke between the SELECT and the COMMIT and asserts the revoke wins and the client sees the revoked error. A second test simulates mid-transaction browser death (kill the connection after Cognito user creation but before Prisma COMMIT) and verifies the next retry is idempotent per AC-3.3.

25. **COND-27 (Verified by test) — Token burn is permanent.** After a successful redemption, the same token URL MUST return the "already used" error on retry. A test asserts this explicitly, including with different source IPs and different email submissions.

### Privacy UX

26. **COND-28 (UX phase) — Privacy policy link on portal login/signup.** Every portal login, signup, forgot-password, and reset-password page links to the privacy policy. Link target is the public privacy URL, not a separate portal-specific copy. UX phase authors the final placement and copy.

### Additional Operational

27. **COND-29 (Launch checklist) — Security review gate.** NFR-2.15 makes security review a launch blocker. The checklist confirms: (a) redeem flow reviewed, (b) cross-role middleware reviewed, (c) SNS signature verification reviewed, (d) cookie scoping reviewed, (e) open-redirect guards reviewed. Sign-off by a named reviewer attached to the launch PR.

---

## Conditions Summary Table

| ID | Condition | Phase that enforces |
|---|---|---|
| COND-1 | Email PHI denylist CI test | QA + Engineer |
| COND-2 | SES production mode + BAA verification | Compliance + Architect |
| COND-3 | Non-in-memory rate limiting | Architect + Engineer |
| COND-4 | Cognito password reset via SES BAA domain | Architect + Engineer |
| COND-5 | Minimum-necessary Prisma selects + PR gate | Engineer + PR review |
| COND-6 | Least-privilege LiveKit tokens | Architect + Engineer + QA |
| COND-7 | Telehealth connect/disconnect audit logging | Engineer |
| COND-8 | Cross-role PHI isolation test suite | QA/SDET |
| COND-9 | Pre-implementation prod SQL verification | Engineer (gate) |
| COND-10 | Cookie isolation principle enforced | Architect + Security review |
| COND-11 | Single Cognito pool risk acceptance memo | Compliance (document) |
| COND-12 | Privacy policy update | Compliance + UX |
| COND-13 | DSAR fulfillment runbook | Compliance |
| COND-14 | Erasure reconciliation documentation | Compliance |
| COND-15 | Cross-border transfer basis documented | Compliance |
| COND-16 | DPIA authored (launch gate) | Compliance |
| COND-17 | Access control matrix | Architect |
| COND-18 | CSP + security headers enforced + tested | Architect + Engineer + QA |
| COND-19 | HTTPS-only + HSTS | Architect (infra) |
| COND-20 | AWS SDK TLS verified | Engineer (PR review) |
| COND-21 | CloudWatch alarms wired before GA | Engineer |
| COND-22 | Incident response runbook | Compliance + Engineer |
| COND-23 | Bounce/complaint thresholds + circuit breaker | Architect + Engineer |
| COND-24 | EmailSuppression priority-1 DR entry | Engineer (runbook) |
| COND-25 | Redeem transaction atomicity tests | QA/SDET |
| COND-26 | Data classification referenced by architecture | Architect |
| COND-27 | Token burn permanence test | QA/SDET |
| COND-28 | Privacy policy link on portal auth pages | UX |
| COND-29 | Security review launch gate | Security review |

---

## Risk Acceptances

- **RA-1: Single Cognito user pool for both roles.** Accepted with compensating cross-role guard (FR-9 + NFR-2.12 + COND-8). Documented via COND-11. Revisited annually or on next significant auth change.
- **RA-2: Soft-delete-over-literal-erasure for clinical records.** Accepted because HIPAA and state retention laws supersede GDPR Art. 17 literal erasure for PHI. Documented via COND-14.
- **RA-3: "Foundation for future features" justification without committed follow-up.** Accepted from the concept phase. Engineering carrying cost is real but the user has explicitly committed to this being long-term foundation work.
- **RA-4: EC2-hosted rate limit state in dev environments.** Accepted for dev; production MUST use DB or Redis per COND-3.

---

## Blocking Issues

None. No spec requirement needs to be removed or altered for the feature to be compliance-eligible. All gaps are addressable via the conditions above, which are formally tracked through the remaining pipeline phases.

---

## Notes for Downstream Phases

- **Architect:** COND-2, COND-3, COND-4, COND-6, COND-10, COND-17, COND-18, COND-19, COND-23, COND-26 land in the architecture deliverable as explicit design decisions or infrastructure tasks. COND-10 (cookie scoping) is the #1 blocker — the architect MUST pick a mechanism.
- **UX:** COND-12, COND-28 land in the UX deliverable. Portal auth pages MUST link to the privacy policy; UX writes the placement.
- **QA/SDET:** COND-1, COND-6, COND-8, COND-25, COND-27 land in the test plan as mandatory test cases. These are explicit test gates — no softening allowed.
- **Engineer:** COND-3, COND-5, COND-7, COND-9, COND-18, COND-20, COND-21, COND-22, COND-24 land in the implementation plan. COND-9 (SQL verification gate) must be run before any deletion commit.
- **Compliance (post-launch):** COND-11, COND-12, COND-13, COND-14, COND-15, COND-16, COND-29 are compliance-owned deliverables. Some are runbooks, some are documents, one is a launch gate (COND-16 DPIA).

---

## Verdict Restated

**PASS_WITH_CONDITIONS** — proceed to Architecture. All 29 conditions tracked. No blocking issues.
