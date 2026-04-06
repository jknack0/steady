# Insurance Billing & Claims via Stedi — Compliance Assessment

## Verdict: PASS_WITH_CONDITIONS

The feature introduces significant new PHI surface area (patient insurance data, diagnosis codes, claim payloads) and a new third-party data processor (Stedi). The spec's NFRs address many concerns, but several mandatory controls are missing or underspecified and must be incorporated into the architecture.

## Data Classification

| Data Element | Category | Sensitivity | Notes |
|-------------|----------|-------------|-------|
| Subscriber/Member ID | PHI + PII | High | Insurance identifier linked to patient identity |
| Group Number | PHI | High | Insurance plan identifier |
| Payer ID | Business Data | Low | Public payer directory identifier |
| Policy Holder Name, DOB, Gender | PHI + PII | High | Demographics for non-self subscribers |
| Relationship to Subscriber | PHI | Medium | Family relationship disclosure |
| ICD-10 Diagnosis Codes (per patient) | PHI | High | Mental health diagnoses — stigma-sensitive |
| Eligibility Response (copay, deductible, coverage) | PHI | High | Insurance benefit details tied to patient |
| Claim Payload (837P) | PHI | High | Full clinical + insurance + billing record |
| Claim Status & Payer Response | PHI | Medium | Contains rejection reasons, adjustment codes |
| Stedi Transaction ID | Business Data | Low | External reference ID |
| Stedi API Key | Secret | Critical | Grants access to clearinghouse on behalf of practice |
| Claim Status History | PHI | Medium | Audit trail of claim lifecycle |

## Framework Assessments

### HIPAA
**Status:** Conditionally Compliant

| Requirement | Assessment | Notes |
|------------|------------|-------|
| FR-1: Patient Insurance Data | ⚠️ Needs Control | Collects high-sensitivity PHI (subscriber ID, diagnosis history). Spec says "encrypted at rest" but does not specify encryption standard or key management. Soft-delete is correct (retention requirements). |
| FR-2: Payer Directory Search | ✅ Compliant | Payer directory is public data. Manual fallback entry does not introduce PHI risk. |
| FR-3: Eligibility Verification | ⚠️ Needs Control | Sends PHI to Stedi (subscriber ID, DOB, provider NPI). Requires BAA with Stedi. 24-hour cache stores PHI — must be encrypted and access-logged. |
| FR-4: Claim Submission | ⚠️ Needs Control | 837P payload contains full PHI bundle (patient demographics, diagnosis codes, insurance IDs, provider info). Stedi receives and processes this — BAA mandatory. pg-boss retry queue stores PHI in DRAFT claims — must be encrypted. |
| FR-5: ICD-10 Search | ✅ Compliant | Code table itself is public reference data. Per-patient "Recent" codes are PHI — covered by existing audit middleware. |
| FR-6: Claims Dashboard | ⚠️ Needs Control | Displays PHI (patient names, diagnosis codes, payer info) in list view. Must enforce clinician-owns-patient access control. |
| FR-7: Rejected Claim Edit | ⚠️ Needs Control | Payer rejection reasons may contain PHI. Edit history must be audit-logged. |
| FR-8: Stedi API Key Config | ⚠️ Needs Control | API key is not PHI but grants access to PHI-processing system. Must be encrypted with application-level encryption (not just database TDE). Must not appear in application logs, error messages, or client-side code. |
| FR-9: Remove RTM Nav | ✅ Compliant | UI change only. No PHI impact. |

**Required Controls:**

1. **Business Associate Agreement (BAA) with Stedi** — Must be executed before any PHI is transmitted. Stedi must be listed as a Business Associate in the organization's HIPAA documentation. This is a legal prerequisite, not a technical one.
2. **Encryption specification** — PHI at rest must use AES-256 encryption. Stedi API key must use application-level encryption (not solely database-level TDE). Encryption keys must be managed via a dedicated key management approach (environment variable or KMS), not stored alongside the encrypted data.
3. **Minimum Necessary standard on claim payloads** — Only include data elements required by the 837P transaction standard. Do not send optional fields "just in case." The service layer must explicitly construct the minimum payload.
4. **Access control on Claims dashboard** — Claims must be scoped to the authenticated clinician's patients (via ClinicianClient relationship). A clinician must never see claims for patients they don't own.
5. **Audit logging for all PHI access** — Every eligibility check, claim submission, claim view, claim edit, and insurance record access must be audit-logged with user ID, action, and resource ID. The spec mentions this but it must be verified as a hard requirement, not just inherited from existing middleware.
6. **Diagnosis code privacy** — Mental health ICD-10 codes (F-category) are stigma-sensitive under 42 CFR Part 2 considerations. The "Recent" diagnosis codes feature ties specific mental health diagnoses to specific patients — this association is PHI and must be access-controlled and audit-logged.

### SOC 2
**Status:** Conditionally Compliant

| Principle | Assessment | Notes |
|-----------|------------|-------|
| **Security** | ⚠️ Needs Control | New external API integration (Stedi) introduces attack surface. API key storage, transmission security, and input validation on Stedi responses must be specified. |
| **Availability** | ✅ Compliant | Spec correctly makes Stedi failures non-blocking. pg-boss retry handles transient failures. Graceful degradation is well-specified. |
| **Processing Integrity** | ⚠️ Needs Control | Claim status transitions need a defined state machine to prevent invalid transitions. Spec mentions this but must be enforced at the service layer, not just validated. |
| **Confidentiality** | ⚠️ Needs Control | Stedi API responses (eligibility, claim status) may contain data beyond what Steady requested. Response data must be filtered to only persist what's needed. Raw API responses must not be stored unless encrypted and access-controlled. |
| **Privacy** | ⚠️ Needs Control | New PHI collection (insurance data, diagnosis codes) must be reflected in the platform's privacy notice / Notice of Privacy Practices. Participants should be informed that their insurance data is being transmitted to a clearinghouse. |

**Required Controls:**

1. **Input validation on Stedi API responses** — Validate and sanitize all data received from Stedi before storing or displaying. Do not trust external API responses as safe.
2. **Claim state machine enforcement** — Valid transitions must be enforced at the service layer: DRAFT → SUBMITTED → ACCEPTED/REJECTED/DENIED → PAID (and REJECTED → SUBMITTED for resubmission). Invalid transitions must throw errors.
3. **Stedi response data minimization** — Only persist the specific fields needed from eligibility and claim status responses. Do not store raw/full API response payloads unless required for dispute resolution, in which case they must be encrypted at rest.
4. **API key rotation support** — The Practice Settings UI must support updating the Stedi API key without downtime (no cached/stale keys used after rotation).

### GDPR
**Status:** Conditionally Compliant

| Requirement | Assessment | Notes |
|------------|------------|-------|
| Lawful Basis | ✅ Compliant | Processing is necessary for healthcare provision (Art. 9(2)(h)) and contractual obligation. No additional consent needed beyond existing treatment relationship. |
| Data Minimization | ⚠️ Needs Control | See HIPAA minimum necessary controls above. Same principle applies. |
| Right to Erasure | ⚠️ Needs Control | Insurance claims may have legal retention requirements (typically 6-7 years for billing records). Soft-delete on insurance records is correct. Claims must be retained per applicable retention schedule but excluded from participant data exports after retention period. |
| Data Portability | ✅ Compliant | Claims data can be exported as part of existing participant data export (if one exists). |
| Cross-Border Transfer | ⚠️ Needs Control | Stedi's infrastructure location must be confirmed as US-based. If Stedi processes or stores data outside the EEA, Standard Contractual Clauses or equivalent transfer mechanism needed for any EU-based participants. |
| DPIA | ⚠️ Needs Control | This feature processes health data at scale via a new third-party processor. A Data Protection Impact Assessment is recommended (not strictly required if all participants are US-based, but required if any EU participants exist). |

**Required Controls:**

1. **Data retention policy for claims** — Define retention period for claims data (recommend: 7 years per standard medical billing retention). After retention period, claims must be anonymized or deleted.
2. **Confirm Stedi data residency** — Verify Stedi processes and stores data within the United States. Document this in the vendor assessment.

## Conditions for Approval

All conditions below are **MANDATORY**. They must be incorporated into the Architecture phase and verified in QA.

1. **[COND-1]: BAA with Stedi** — A signed Business Associate Agreement with Stedi must be confirmed before the feature is deployed to production. This can proceed in parallel with development but must be complete before go-live. _Must be verified before deployment._

2. **[COND-2]: PHI encryption at rest using AES-256** — Patient insurance data (subscriber ID, group number, policy holder demographics), cached eligibility results, and claim payloads must be encrypted at rest using AES-256. Stedi API key must use application-level encryption with key stored separately from data. _Must be in architecture._

3. **[COND-3]: Minimum Necessary claim payloads** — The claim submission service must explicitly construct 837P payloads with only the fields required by the transaction standard. No "pass-through" of full patient records. _Must be in architecture and verified in QA._

4. **[COND-4]: Claims scoped to clinician's patients** — All claim queries must filter by clinician ownership via ClinicianClient. The Claims dashboard, claim detail, and claim edit endpoints must verify the authenticated clinician owns the patient. _Must be in architecture and verified in QA._

5. **[COND-5]: Claim state machine enforcement** — Valid status transitions enforced at the service layer with explicit transition map. Invalid transitions must throw and be logged. _Must be in architecture and verified in QA._

6. **[COND-6]: Stedi response data minimization** — Only persist required fields from Stedi API responses. Do not store raw response payloads unless encrypted and justified. _Must be in architecture._

7. **[COND-7]: Audit logging coverage** — Verify that all new PHI operations (insurance CRUD, eligibility checks, claim submissions, claim views, claim edits) are captured by the audit middleware. Add explicit audit log calls for any operations not covered by the existing Prisma middleware (e.g., Stedi API calls that don't touch the database). _Must be verified in QA._

8. **[COND-8]: Privacy notice update** — The platform's Notice of Privacy Practices must be updated to reflect that patient insurance data may be transmitted to a clearinghouse (Stedi) for eligibility verification and claim submission. _Must be complete before go-live._

9. **[COND-9]: Data retention policy for claims** — Claims data must have a defined retention period (recommend 7 years). Implement retention metadata on claim records. _Must be in architecture._

10. **[COND-10]: API key rotation without downtime** — Practice Settings must support updating the Stedi API key. Active API calls must use the current key (no stale cache). _Must be verified in QA._

## Blocking Issues

None. The spec is well-structured and its NFRs already address many compliance concerns. The conditions above close the remaining gaps.
