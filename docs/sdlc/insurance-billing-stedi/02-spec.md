# Insurance Billing & Claims via Stedi — Feature Specification

## Overview

Clinicians using Steady currently bill insurance manually — printing CMS-1500 forms, calling payers, and manually posting payments. By integrating Stedi's clearinghouse API, Steady adds real-time eligibility verification and electronic claim submission directly into the clinical workflow, eliminating 5-10 hours/week of manual billing work. This feature covers eligibility checks (270/271) and professional claim submission (837P), deferring ERA/835 auto-processing.

## Functional Requirements

### FR-1: Patient Insurance Data Management

Clinicians can add, edit, and remove insurance information for participants. Each participant can have one primary insurance record. Insurance data is accessible via a dedicated Insurance tab on the participant detail page, and clinicians are prompted inline to add it when attempting eligibility checks without it.

**Acceptance Criteria:**

- GIVEN a clinician viewing a participant's detail page
  WHEN they click the "Insurance" tab
  THEN they see the participant's insurance info (or an empty state prompting them to add it)

- GIVEN a clinician on the Insurance tab with no insurance on file
  WHEN they click "Add Insurance"
  THEN they see a form with: payer (searchable dropdown via Stedi payer directory), subscriber/member ID, group number, relationship to subscriber (Self/Spouse/Child/Other), and policy holder demographics (name, DOB, gender) if relationship is not Self

- GIVEN a clinician with a participant's insurance on file
  WHEN they click "Edit"
  THEN they can update any field and save

- GIVEN a clinician with a participant's insurance on file
  WHEN they click "Remove"
  THEN the insurance record is soft-deleted after confirmation

### FR-2: Payer Directory Search

Clinicians can search for insurance payers when adding patient insurance.

**Acceptance Criteria:**

- GIVEN a clinician adding/editing patient insurance
  WHEN they type in the payer search field (minimum 2 characters)
  THEN they see matching payers from the Stedi payer directory with payer name and payer ID

- GIVEN the Stedi API is unreachable
  WHEN they attempt to search payers
  THEN they see "Payer search unavailable — try again later" and can manually enter a payer ID

### FR-3: Real-Time Eligibility Verification

Clinicians can check a participant's insurance eligibility from the Insurance tab (ad-hoc) or from a session detail page (appointment-specific).

**Acceptance Criteria:**

- GIVEN a participant with insurance on file
  WHEN the clinician clicks "Check Eligibility" on the Insurance tab
  THEN the system calls Stedi eligibility API (270/271) and displays: coverage status (active/inactive), copay amount, deductible (met/remaining), coinsurance percentage, and plan description

- GIVEN a clinician viewing a session detail page for an upcoming session with a participant who has insurance on file
  WHEN they click "Check Eligibility"
  THEN the eligibility check runs for the session's CPT code specifically and results display inline on the session page

- GIVEN a participant with NO insurance on file
  WHEN the clinician clicks "Check Eligibility" on either entry point
  THEN they are prompted to add insurance information first (inline form or link to Insurance tab)

- GIVEN a successful eligibility check performed within the last 24 hours
  WHEN the clinician views the Insurance tab or session detail
  THEN the cached result is displayed with timestamp and a "Re-check" button

- GIVEN a cached eligibility result older than 24 hours
  WHEN the clinician views the Insurance tab or session detail
  THEN the stale result is hidden and they must re-check

- GIVEN the Stedi API returns an error during eligibility check
  WHEN the clinician attempts to check eligibility
  THEN they see "Unable to verify eligibility — try again later" with no disruption to other workflows

### FR-4: Claim Submission (Auto-Prompt After Session)

After marking a session as ATTENDED, clinicians are prompted to submit an insurance claim if the participant has insurance on file.

**Acceptance Criteria:**

- GIVEN a clinician marking a session as ATTENDED for a participant WITH insurance on file
  WHEN the status is saved
  THEN a "Submit Insurance Claim?" dialog appears with pre-populated fields: CPT code (from session), diagnosis codes (searchable ICD-10 picker), date of service, place of service, provider NPI + taxonomy (from ClinicianBillingProfile), patient insurance info, and charge amount

- GIVEN the claim submission dialog is open
  WHEN the clinician reviews and clicks "Submit Claim"
  THEN the claim is sent to Stedi (837P), assigned status SUBMITTED, and the clinician sees a confirmation with Stedi transaction ID

- GIVEN the claim submission dialog is open
  WHEN the clinician clicks "Dismiss" or closes the dialog
  THEN no claim is created and they can submit manually later from the session detail page

- GIVEN a clinician marking a session as ATTENDED for a participant WITHOUT insurance on file
  WHEN the status is saved
  THEN no claim dialog appears

- GIVEN a session that already has a claim (any status)
  WHEN the clinician views the session detail
  THEN they see the claim status instead of a "Submit Claim" button

- GIVEN the Stedi API is unreachable during claim submission
  WHEN the clinician clicks "Submit Claim"
  THEN the claim is saved locally as DRAFT with an error message "Claim saved as draft — submission will retry automatically" and queued for retry via pg-boss

### FR-5: ICD-10 Diagnosis Code Search

Clinicians can search and select diagnosis codes when submitting claims.

**Acceptance Criteria:**

- GIVEN a clinician in the claim submission dialog
  WHEN they click the diagnosis code field and begin typing
  THEN they see autocomplete results from the full ICD-10-CM table, with mental health codes (F-category) ranked first

- GIVEN a clinician searching for "ADHD"
  WHEN results appear
  THEN they see matching codes with code + short description (e.g., "F90.0 — Attention-deficit hyperactivity disorder, predominantly inattentive type")

- GIVEN a clinician has previously used diagnosis codes for this participant
  WHEN they open the diagnosis code picker
  THEN previously used codes for this participant appear at the top as "Recent"

### FR-6: Claims Dashboard

A top-level "Claims" page in the sidebar showing all claims with filtering and status tracking.

**Acceptance Criteria:**

- GIVEN a clinician navigating to the Claims page
  WHEN the page loads
  THEN they see a list of all claims sorted by submission date (newest first), showing: participant name, date of service, CPT code, payer, charge amount, and status badge

- GIVEN claims in various statuses
  WHEN the clinician uses the status filter
  THEN they can filter by: All, Draft, Submitted, Accepted, Rejected, Denied, Paid

- GIVEN a clinician clicking on a claim row
  WHEN the claim detail opens
  THEN they see full claim data, status history with timestamps, and payer response details (if any)

- GIVEN a clinician on the Claims page
  WHEN they click "Check Status" on a SUBMITTED claim
  THEN the system queries Stedi claim status API and updates the local status

- GIVEN the claims list grows beyond 50 items
  WHEN the clinician scrolls
  THEN cursor-based pagination loads more results

### FR-7: Rejected Claim Editing & Resubmission

Clinicians can edit and resubmit rejected claims.

**Acceptance Criteria:**

- GIVEN a claim with status REJECTED
  WHEN the clinician views the claim detail
  THEN they see the rejection reason from the payer and an "Edit & Resubmit" button

- GIVEN a clinician clicking "Edit & Resubmit" on a rejected claim
  WHEN the edit form opens
  THEN all claim fields are editable and pre-populated with the original submission data

- GIVEN a clinician submitting an edited rejected claim
  WHEN they click "Resubmit"
  THEN the claim status resets to SUBMITTED, a new Stedi transaction is created, and the status history logs the resubmission

### FR-8: Practice-Level Stedi API Key Configuration

Practice admins can configure their Stedi API key in Practice Settings.

**Acceptance Criteria:**

- GIVEN a clinician on the Practice Settings page
  WHEN they navigate to the "Insurance Billing" section
  THEN they see a field for Stedi API Key (masked after save) with a "Test Connection" button

- GIVEN a clinician entering a Stedi API key and clicking "Test Connection"
  WHEN the key is valid
  THEN they see a green "Connected" confirmation

- GIVEN a clinician entering an invalid API key and clicking "Test Connection"
  WHEN the key is invalid
  THEN they see "Invalid API key — check your Stedi dashboard"

- GIVEN no Stedi API key is configured for the practice
  WHEN a clinician attempts any Stedi action (eligibility check, claim submission)
  THEN they see "Insurance billing not configured — ask your practice admin to add a Stedi API key in Practice Settings"

### FR-9: Remove RTM from Navigation

The RTM page is removed from the sidebar navigation.

**Acceptance Criteria:**

- GIVEN a clinician using the web dashboard
  WHEN they view the sidebar
  THEN there is no "RTM" navigation item

- GIVEN a user navigating directly to `/rtm` via URL
  WHEN the page loads
  THEN the page still renders (not deleted), but is no longer discoverable from the UI

## Non-Functional Requirements

### NFR-1: Performance

- Eligibility checks must return results within 10 seconds (Stedi API dependent) with a loading spinner
- ICD-10 code search must return autocomplete results within 200ms (local database query)
- Claims dashboard must load the first page within 1 second
- Claim submission (API call to Stedi) must timeout after 30 seconds with graceful fallback to DRAFT status

### NFR-2: Security & HIPAA

- Stedi API keys stored encrypted at rest in the database (never in plaintext)
- Patient insurance data (subscriber ID, group number) encrypted at rest
- All Stedi API calls over HTTPS
- Audit logging on all insurance data access, eligibility checks, and claim submissions (via existing audit middleware)
- Never log insurance details (subscriber IDs, group numbers, payer responses) — log only operation name + resource IDs
- Stedi API key never sent to the frontend — all Stedi calls proxied through the API server

### NFR-3: Reliability

- Failed claim submissions automatically retry via pg-boss (3 attempts, exponential backoff)
- Eligibility check failures are non-blocking — clinician can proceed with session regardless
- Stedi API downtime does not prevent session management or other Steady workflows

### NFR-4: Data Integrity

- ICD-10-CM code table seeded from official CMS data file, updated annually
- Claim status transitions are validated (e.g., cannot go from PAID back to DRAFT)
- All claim mutations use Prisma transactions

## Scope

### In Scope

- Patient insurance data collection (Insurance tab + inline prompts)
- Real-time eligibility verification (270/271) from session detail + insurance tab
- Claim submission (837P) via auto-prompt after marking session ATTENDED
- Claim status tracking and top-level Claims dashboard
- Rejected claim editing and resubmission
- Full ICD-10-CM code table with mental health prioritized search
- Practice-level Stedi API key configuration
- Eligibility result caching (24 hours)
- Payer directory search (via Stedi API)
- Remove RTM from sidebar navigation (routes/code remain, nav entry removed)

### Out of Scope

- ERA/835 auto-processing (manual payment recording via existing Payment model)
- Full RTM code removal (just hiding nav entry for now)
- Institutional (837I) and dental (837D) claims
- Secondary insurance / coordination of benefits
- Batch claim submission
- Provider enrollment automation (manual via Stedi portal)
- Client-facing insurance portal
- CMS-1500 PDF generation

## Dependencies

- **Stedi API** — eligibility (270/271), professional claims (837P), claim status, payer search endpoints
- **Stedi account** — practice must have an active Stedi account with provider enrollment completed in Stedi's portal
- **CMS ICD-10-CM data file** — annual release for seeding diagnosis codes
- **Existing models** — ClinicianBillingProfile (NPI, taxonomy code, tax ID), Session, ParticipantProfile, Practice
- **pg-boss** — existing job queue for claim submission retries

## Assumptions

- ClinicianBillingProfile already has the fields needed for 837P claims (NPI, taxonomy code, tax ID). If not, fields will be added as part of this feature.
- Clinicians have completed provider enrollment in Stedi's portal before using this feature — Steady does not automate enrollment.
- One insurance record per participant is sufficient for v1 (no primary/secondary).
- Stedi's test mode API keys work identically to production for development/testing.
- Practice-level API key means all clinicians in a practice bill through the same Stedi account / clearinghouse setup.

## Glossary

| Term | Definition |
|------|-----------|
| **837P** | HIPAA professional claim transaction (outpatient services) |
| **270/271** | HIPAA eligibility inquiry (270) and response (271) |
| **ERA / 835** | Electronic remittance advice — payer payment explanation (out of scope) |
| **CPT** | Current Procedural Terminology — service billing codes (e.g., 90834 for psychotherapy) |
| **ICD-10-CM** | International Classification of Diseases, 10th revision, Clinical Modification — diagnosis codes |
| **NPI** | National Provider Identifier — unique 10-digit provider number |
| **Payer** | Insurance company / health plan |
| **EDI** | Electronic Data Interchange — the underlying format Stedi abstracts |
