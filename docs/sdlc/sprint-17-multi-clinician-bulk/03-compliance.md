# Sprint 17: Multi-Clinician Practice Management + Bulk Actions — Compliance Assessment

## Verdict: PASS_WITH_CONDITIONS

The feature is compliant with HIPAA Privacy Rule, Security Rule, and HITECH provided the 6 mandatory conditions below are implemented and verified. Practice-wide participant visibility is a permitted disclosure under 45 CFR 164.506 (treatment, payment, healthcare operations). Bulk actions introduce higher audit surface area but no novel compliance risks.

---

## Regulatory Scope

| Framework | Applicability | Reasoning |
|-----------|--------------|-----------|
| **HIPAA Privacy Rule** (45 CFR 164.500-534) | Applies | Practice owner viewing all participant data across clinicians constitutes access to PHI by a covered entity workforce member |
| **HIPAA Security Rule** (45 CFR 164.302-318) | Applies | ePHI is accessed, transmitted, and processed. Access controls must enforce role-based visibility |
| **HITECH** (42 USC 17932) | Applies | Breach notification applies if unauthorized cross-practice access occurs |
| **42 CFR Part 2** | Conditionally | If SUD patients are in the practice, Part 2's stricter consent rules apply to cross-clinician visibility |
| **GDPR** | Deferred | No EU-specific controls in sprint 17 |
| **SOC 2** | Deferred | Not a sprint 17 gate |

---

## PHI Classification

| Data Element | Classification | Rationale |
|-------------|---------------|-----------|
| Practice-wide participant list | **PHI** | Reveals treatment relationships across multiple providers |
| Practice aggregate stats | **PHI-adjacent** | Counts are not individually identifiable but combined with small practice size may be |
| Bulk action participant IDs | **PHI identifiers** | Link specific patients to specific operations |
| Nudge message content | **PHI (high risk)** | Free text may contain clinical information |
| PracticeMembership | Not PHI | Workforce directory information |

---

## Conditions

### COND-1: Practice-Wide Access Authorization

Practice owner access to all participants is authorized under 45 CFR 164.506 (treatment, payment, healthcare operations). The system MUST verify practice ownership (PracticeMembership.role = OWNER) before returning cross-clinician participant data. Non-owners MUST receive 403.

**Verification:** Test that non-owner clinicians cannot access /api/practices/:id/stats or /api/practices/:id/participants.

### COND-2: Bulk Action Audit Logging

Every bulk action MUST generate one audit log entry per affected participant. The audit entry MUST contain: userId (acting clinician), action ("CREATE"), resourceType ("Task" or "ModuleProgress"), resourceId (the created resource ID). The audit entry MUST NOT contain message content, task descriptions, or any free-text PHI.

**Verification:** Test that bulk action on 3 participants creates 3 audit log entries with no message content.

### COND-3: Cross-Practice Isolation

All new endpoints MUST verify the requesting clinician's PracticeMembership. Requests from clinicians in a different practice MUST receive 404 (not 403, to prevent existence leakage).

**Verification:** Test cross-practice access returns 404.

### COND-4: Bulk Action Size Cap

Bulk actions MUST enforce a maximum of 50 participants per request to prevent abuse and ensure audit trail integrity.

**Verification:** Test that 51 participant IDs returns 400.

### COND-5: Invite Email Content

Invite emails (when eventually implemented) MUST NOT reveal practice name, member names, or patient information. The email should contain only a generic "You've been invited to collaborate on Steady" message with a sign-in link.

**Verification:** Deferred to email service integration sprint. Document the constraint for future implementation.

### COND-6: Minimum Necessary Standard

The practice-wide participant list MUST return only the minimum necessary information: participant name, email, program title, enrollment status, assigned clinician name. It MUST NOT return clinical notes, journal entries, assessment scores, or detailed progress data.

**Verification:** Test that response shape contains only the specified fields.

---

## Existing Safeguards (Already Verified)

- Prisma audit middleware logs all CREATE/UPDATE/DELETE mutations
- AsyncLocalStorage audit context is set by authenticate middleware
- Logger strips PII from error objects
- JWT authentication with 30-minute session timeout
- TLS 1.2+ in transit, Postgres encryption at rest
- Role-based access control via requireRole middleware

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|-----------|
| Practice owner sees participants of departed clinician | Low | Medium | Acceptable — owner retains oversight responsibility |
| Bulk nudge message contains PHI | Medium | Medium | COND-2 ensures message content is never audit-logged |
| Cross-practice data leakage via bulk action | High | Low | COND-3 + COND-4 enforce isolation and caps |
