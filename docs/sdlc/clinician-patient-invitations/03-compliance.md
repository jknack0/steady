# Clinician Patient Invitations — Compliance Assessment

## Verdict: PASS_WITH_CONDITIONS

## Data Classification

| Data Element | Category | Sensitivity |
|-------------|----------|-------------|
| Patient name | PII | Medium |
| Patient email | PII | Medium |
| Invite code | System token | Low |
| Clinician-patient linkage | Relationship metadata | Medium |
| Program assignment | Treatment context (indirect PHI) | Medium |
| Invite status/timestamps | System metadata | Low |
| Email send count | System metadata | Low |

**Key finding:** The invite code itself contains zero PHI. The patient name and email stored in the invitation record are PII but do not constitute PHI on their own — they become PHI only when linked to treatment data (which happens after signup, not during invitation). The email nudge is explicitly PHI-free by spec design. This is a well-designed boundary.

## Framework Assessments

### HIPAA
**Status:** Conditionally Compliant

| Requirement | Assessment | Notes |
|------------|------------|-------|
| FR-1: Create Invitation | ⚠️ Needs Control | Patient name + email stored in invite record. Not PHI alone, but clinician-patient linkage implies treatment relationship. Audit logging required for invite creation. |
| FR-2: Redeem Code | ⚠️ Needs Control | Account creation creates a patient record. Password must meet complexity requirements and be hashed (bcrypt exists). Rate limiting specified — good. |
| FR-3: Status on Patients Page | ✅ Compliant | Displays only to authenticated clinician who owns the invite. No new PHI exposure beyond what patients page already shows. |
| FR-4: Invite Widget | ✅ Compliant | Scoped to the owning clinician's view. Same access controls as existing patient view. |
| FR-5: Resend Email | ⚠️ Needs Control | Email service must have a signed BAA. Email content must be verified PHI-free at the code level (not just by convention). |
| FR-6: Revoke Invitation | ✅ Compliant | Data invalidation, not deletion. Audit-logged by existing middleware. |
| NFR-2: Security | ✅ Compliant | Cryptographic randomness, rate limiting, single-use — all appropriate controls. |

**Required Controls:**
1. Email service provider (SendGrid/SES) MUST have a signed Business Associate Agreement (BAA) before sending any emails, even PHI-free ones, because the service will process patient email addresses (which become PHI through the treatment relationship context).
2. Invite creation, redemption, revocation, and email sends MUST be captured in the existing audit log (the Prisma audit middleware will auto-capture CREATE/UPDATE/DELETE on the new model — verify this includes all invite state transitions).
3. Email template MUST be hardcoded server-side — clinicians cannot customize email content (prevents accidental PHI inclusion).
4. Invite records containing patient name/email MUST be encrypted at rest using the existing AES-256-GCM field-level encryption middleware (extend the ENCRYPTED_FIELDS map to cover the new model's name and email fields).

### GDPR
**Status:** Conditionally Compliant

| Requirement | Assessment | Notes |
|------------|------------|-------|
| FR-1: Create Invitation | ⚠️ Needs Control | Lawful basis: legitimate interest (clinician-patient treatment relationship). Data minimization respected — only name and email collected. |
| FR-2: Redeem Code | ✅ Compliant | User provides their own data voluntarily during signup. Consent is implicit in the act of entering the code and creating an account. |
| FR-3–FR-6 | ✅ Compliant | Standard processing within existing treatment relationship. |

**Required Controls:**
1. Expired/revoked invite records with patient PII (name, email) MUST have a retention policy — auto-purge PII from unredeemed invites after 90 days (30-day expiry + 60-day grace period for audit trail, then scrub name/email).
2. If patient exercises right to erasure, invite records linked to their email MUST be included in the deletion scope.

### SOC 2
**Status:** Conditionally Compliant

| Principle | Assessment | Notes |
|-----------|------------|-------|
| Security | ⚠️ Needs Control | New attack surface: invite code brute-force. Rate limiting specified (10/hr/IP) — adequate. Code entropy with 4 alphanumeric chars = 36^4 = ~1.68M combinations. With rate limiting, this is sufficient for a 30-day window, but consider logging failed attempts for anomaly detection. |
| Availability | ✅ Compliant | Email is async via pg-boss. Invite creation is lightweight. No availability concerns. |
| Processing Integrity | ✅ Compliant | Single-use codes, unique constraints, atomic operations — data integrity is well-specified. |
| Confidentiality | ⚠️ Needs Control | Invite codes displayed on screen — ensure they are not logged at INFO level. Clinician must be the only viewer. |
| Privacy | ✅ Compliant | Minimal data collection, clear purpose, clinician-controlled sharing. |

**Required Controls:**
1. Failed invite code redemption attempts MUST be logged (IP, timestamp, code attempted) for security monitoring — but MUST NOT log the full code in plaintext (log a hash or partial match only).
2. Invite codes MUST NOT appear in application logs at INFO level. Debug-level only, and only in non-production environments.

## Conditions for Approval

1. **[COND-1]: BAA with email provider** — Must have a signed BAA with the chosen email service (SendGrid, AWS SES, etc.) before the email nudge feature goes live. If BAA is not in place at launch, the email nudge must be feature-flagged off (invite codes alone can ship without it).
2. **[COND-2]: Field-level encryption on invite PII** — Patient name and email in the invite record must be encrypted at rest using the existing AES-256-GCM encryption middleware. Must be in architecture.
3. **[COND-3]: Hardcoded email template** — Email content must be a server-side template with no clinician-customizable fields. Must be in implementation.
4. **[COND-4]: Audit trail coverage** — Invite creation, code redemption, email sends, resends, and revocation must all produce audit log entries. Must be verified in QA.
5. **[COND-5]: PII retention policy** — Unredeemed invite records must have PII (name, email) scrubbed after 90 days. Must be in architecture (pg-boss scheduled job or similar).
6. **[COND-6]: Invite code not logged** — Invite codes must not appear in INFO-level logs. Must be verified in QA.

## Blocking Issues

None. The spec is well-designed with PHI-free boundaries in the right places. The conditions above are implementation-level controls that the Architect and Engineer can incorporate without changing the requirements.
