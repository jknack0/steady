# Insurance Billing & Claims via Stedi — Concept

## Problem Statement

Mental health clinicians using Steady currently bill insurance manually — printing CMS-1500 forms, calling payers to verify coverage, and manually posting ERA payments. This is the #1 reason practices still need a second tool alongside Steady. By integrating Stedi's healthcare clearinghouse API, Steady becomes the single system of record for clinical care AND insurance billing — eliminating the tool-switching tax that costs solo practitioners 5-10 hours/week.

## Why Now

Steady already has 90% of the data needed for insurance claims: CPT service codes with pricing, appointment records with attendance status, clinician NPI/tax ID via ClinicianBillingProfile, and a full invoicing system. The gap is the "last mile" — translating that data into EDI transactions and communicating with payers. Stedi's JSON API eliminates the need to build raw X12 EDI handling, which would otherwise be a 3-month project.

## Alternatives Considered

### Approach A: Full Stedi Integration (Eligibility + Claims + ERA)
- **How:** Integrate all three Stedi workflows — real-time eligibility (270/271), professional claim submission (837P), and ERA processing (835). Add patient insurance info model, payer management, claim lifecycle tracking.
- **Pros:** Complete insurance billing solution. Clinicians never leave Steady. ERA auto-posts payments to invoices.
- **Cons:** Large scope (~3-4 week sprint). Requires patient insurance data collection (new PHI surface). ERA processing has complex edge cases (partial payments, denials, adjustments).
- **Effort:** Large

### Approach B: Eligibility + Claims Only (No ERA) — RECOMMENDED
- **How:** Real-time eligibility checks + claim submission. Skip ERA processing — clinicians manually record insurance payments when EOBs arrive (they already do this via the Payment model with method=INSURANCE).
- **Pros:** 60% of the value at 40% of the effort. Eligibility + claim submission are the highest-value flows. Manual payment recording already works.
- **Cons:** Doesn't close the loop on payment posting. Clinicians still check mail/portals for EOBs.
- **Effort:** Medium

### Approach C: Eligibility Only (Phase 1 quick win)
- **How:** Just the real-time eligibility check. Clinician clicks "Verify Insurance" before an appointment, sees copay/deductible/coverage. No claims, no ERA.
- **Pros:** Small scope, high value (eligibility checks are the most frequent pain point), low risk. Validates the Stedi integration pattern before going deeper.
- **Cons:** Doesn't solve billing — just verification. Clinicians still need to submit claims elsewhere.
- **Effort:** Small

## Recommended Approach

**Approach B: Eligibility + Claims, defer ERA.** ERA processing is the most complex piece (partial payments, adjustments, coordination of benefits, denial management) and clinicians already have a working manual flow for recording insurance payments. Shipping eligibility + claims covers the two most painful manual processes and validates the Stedi integration. ERA can be a fast-follow once the foundation is proven.

## Key Scenarios

1. **Verify insurance before appointment:** Clinician opens an upcoming appointment, clicks "Check Eligibility", sees real-time copay ($25), deductible status ($500 remaining), and coverage confirmation for CPT 90834. Decides whether to proceed or discuss payment with client.

2. **Submit claim after session:** After marking an appointment ATTENDED, clinician clicks "Submit Claim". System auto-populates the 837P from appointment data (CPT code, diagnosis codes, provider NPI, patient insurance info, place of service). Clinician reviews, adds diagnosis code if missing, submits. Claim is sent to payer via Stedi. Claim status is tracked.

3. **Track claim status:** Clinician views the Claims tab, sees claims by status (Submitted, Accepted, Rejected, Denied, Paid). Can click to check real-time status via Stedi. Rejected claims show the reason and can be corrected and resubmitted.

## New Data Requirements

- **PatientInsurance** — subscriber ID, payer ID (Stedi payer ID), group number, relationship to subscriber, policy holder demographics. Linked to ParticipantProfile. A patient can have primary + secondary insurance.
- **InsuranceClaim** — links appointment to Stedi transaction. Tracks lifecycle: DRAFT → SUBMITTED → ACCEPTED → REJECTED → DENIED → PAID. Stores diagnosis codes (ICD-10), Stedi transactionId, submission/response payloads (encrypted at rest).
- **Payer cache** — local cache of Stedi payer directory for dropdown search.
- **DiagnosisCode reference** — searchable table of common mental health ICD-10 codes (~50 codes seeded).

## Out of Scope (explicitly deferred)

- ERA/835 auto-processing (manual payment recording via existing Payment model)
- Institutional claims (837I) — Steady is outpatient only
- Dental claims (837D)
- Secondary insurance claim submission (coordination of benefits)
- Batch claim submission (one-at-a-time is fine for solo/small practices)
- Provider enrollment via Stedi API (manual setup in Stedi portal)
- Real-time adjudication (claims take 5-30 days)
- Client-facing insurance portal
- Superbill replacement (existing superbill works for RTM)

## Open Questions

- Does the existing `ClinicianBillingProfile` have all fields needed for 837P (taxonomy code, place of service default, rendering vs billing provider distinction)?
- Should eligibility results be cached (for how long?) or always live?
- What's the Stedi pricing model — per-transaction? Need to understand cost implications.
- Do clinicians need Stedi provider enrollment as a prerequisite?
- Should we seed a curated ICD-10 mental health code list or provide full ICD-10 search?

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Stedi API downtime blocks billing | High | Queue claims locally, retry. Eligibility gracefully degrades to "unable to verify". |
| Payer rejection rates | Medium | Pre-validate claim data before submission. Show clear error messages with correction guidance. |
| Insurance data is high-sensitivity PHI | High | Encrypt subscriber IDs at rest. Audit all access. Never log insurance details. |
| Diagnosis codes are complex (ICD-10) | Medium | Start with searchable lookup of common mental health ICD-10 codes (~50). Don't try full catalog. |
| Stedi test mode limitations | Low | Use test keys for development. Integration tests mock Stedi responses. |
| Provider enrollment prerequisite | Medium | Document the Stedi portal enrollment steps. Don't block the feature on automating enrollment. |

## Stedi API Surface (from research)

| Capability | Endpoint | Format |
|---|---|---|
| Eligibility verification | POST /change/medicalnetwork/eligibility/v3 | JSON |
| Professional claims | POST /change/medicalnetwork/professionalclaims/v3/submission | JSON |
| Claim status | POST /change/medicalnetwork/claimstatus/v2 | JSON |
| ERA reports | GET /change/medicalnetwork/reports/v2/{txnId}/835 | JSON |
| CMS-1500 PDF | GET /export/{txnId}/1500/pdf | PDF |
| Payer search | GET /payers/search | JSON |
| Transaction polling | GET /polling/transactions | JSON |
| Auth | API key in Authorization header | — |
| Idempotency | Idempotency-Key header (24h) | — |
| Test mode | Test API keys for sandbox | — |
