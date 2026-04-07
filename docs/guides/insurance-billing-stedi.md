# Insurance Billing via Stedi — User Guide

## Overview

Steady integrates with [Stedi](https://www.stedi.com/) to provide real-time insurance eligibility verification and electronic claim submission (837P) directly in the clinician workflow. This eliminates manual CMS-1500 forms and payer phone calls.

**What's included:**
- Patient insurance data management
- Real-time eligibility checks (270/271)
- Electronic claim submission after sessions
- Claim status tracking and resubmission
- ICD-10 diagnosis code search

**What's not included (v1):**
- ERA/835 auto-processing — record insurance payments manually via the existing Payment model (method = INSURANCE)

---

## Setup

### 1. Get a Stedi Account

1. Sign up at [stedi.com](https://www.stedi.com/)
2. Complete the onboarding process and get your API key from the Stedi dashboard
3. **Important:** Execute a Business Associate Agreement (BAA) with Stedi before processing any real patient data — this is a HIPAA requirement

### 2. Configure Your Billing Profile

Before submitting claims, your billing profile must be complete. Go to **Practice → Billing Profile** and fill in:

- **Provider Name** and **Credentials** (e.g., "PhD", "LCSW")
- **NPI Number** — your individual National Provider Identifier
- **Tax ID** — your practice EIN or SSN
- **Practice Address** — full street address, city, state, zip
- **Practice Phone**
- **License Number** and **License State**

These fields are included in every claim submission. Missing or incorrect data will cause claim rejections.

### 3. Add Your Stedi API Key

1. Go to **Practice Settings** (sidebar → Practice)
2. Find the **Insurance Billing** section
3. Paste your Stedi API key
4. Click **Test Connection** — you should see "Connected to Stedi"
5. Click **Save**

Only the practice owner can add or update the API key. All clinicians in the practice can use insurance features once the key is configured.

### 4. Push Prisma Schema Changes

If you're running a fresh deployment, push the new database models:

```bash
npm run db:push
```

This adds the `PatientInsurance`, `InsuranceClaim`, `ClaimStatusHistory`, and `DiagnosisCode` tables.

---

## Adding Patient Insurance

1. Navigate to a client's detail page (sidebar → **Clients** → select client)
2. Click the **Insurance** tab
3. Click **Add Insurance**
4. Fill in:
   - **Payer** — start typing to search the Stedi payer directory (e.g., "Aetna", "Blue Cross"). If payer search is unavailable, you can enter a payer ID manually.
   - **Subscriber/Member ID** — from the client's insurance card
   - **Group Number** (optional) — if listed on the card
   - **Relationship to Subscriber** — Self (default), Spouse, Child, or Other
   - If relationship is not "Self", fill in the **policy holder's** first name, last name, and date of birth
5. Click **Save**

Each participant can have one primary insurance record. To update, click the edit icon on the insurance card. To remove, click the trash icon (this is a soft-delete — data is retained for compliance).

---

## Checking Eligibility

1. On the client's **Insurance** tab, click **Check Eligibility**
2. The system calls Stedi's eligibility API and displays:
   - **Coverage Status** — Active or Inactive
   - **Copay** — dollar amount
   - **Deductible Remaining** — how much the client still owes toward their deductible
   - **Coinsurance** — percentage the client pays after deductible
   - **Plan Description** — the plan name

Results are cached for 24 hours. You'll see the timestamp of the last check. Click **Re-check** to force a fresh eligibility query.

**If Stedi is not configured:** The Check Eligibility button will be disabled with a tooltip explaining that the practice admin needs to add a Stedi API key.

---

## Submitting Claims

### Auto-Prompt After Sessions

1. Mark an appointment as **ATTENDED** (Calendar → click appointment → change status)
2. If the client has active insurance, a **"Submit Insurance Claim?"** dialog appears automatically
3. The dialog shows pre-populated fields (read-only):
   - CPT code (from the appointment's service code)
   - Date of service
   - Charge amount
   - Provider (your name + NPI)
   - Payer (from patient insurance)
4. **Add diagnosis codes** — search ICD-10 codes (e.g., "F90" for ADHD, "F41" for anxiety). You can add 1-4 codes. Recent codes used for this client appear first.
5. Click **Submit Claim**
6. The claim is created and queued for submission to Stedi

If you dismiss the dialog ("Skip for Now"), no claim is created. You can submit a claim later from the Claims dashboard.

### What Happens After Submission

1. **DRAFT** — Claim created locally, queued for Stedi submission
2. **SUBMITTED** — Sent to Stedi, awaiting payer response
3. **ACCEPTED** — Payer accepted the claim for processing
4. **PAID** — Payer processed payment (record the payment on the invoice manually)
5. **REJECTED** — Payer rejected the claim (you can fix and resubmit)
6. **DENIED** — Payer denied the claim (terminal — cannot resubmit the same claim)

The system automatically polls Stedi for status updates every 2 hours. You can also manually check status from the Claims dashboard.

If submission fails (Stedi unavailable), the system retries up to 3 times with exponential backoff. The claim stays as DRAFT if all retries fail.

---

## Claims Dashboard

Navigate to **Claims** in the sidebar to see all your claims.

### Filtering

Use the status tabs at the top to filter: All | Draft | Submitted | Accepted | Rejected | Denied | Paid

### Columns

| Column | Description |
|--------|-------------|
| Participant | Client name |
| Date of Service | Appointment date |
| CPT | Service code (e.g., 90834) |
| Payer | Insurance company name |
| Amount | Charge amount |
| Status | Current claim status (color-coded badge) |

### Actions

- **Check** (on Submitted/Accepted claims) — Manually refresh the claim status from Stedi
- **Resubmit** (on Rejected claims) — Edit diagnosis codes or service code and resubmit

### Practice Owner View

If you're the practice owner, you see claims from **all clinicians** in the practice. Non-owner clinicians only see their own clients' claims.

---

## Handling Rejections

When a claim is rejected:

1. Go to the **Claims** dashboard
2. Find the rejected claim (use the "Rejected" filter tab)
3. The rejection reason from the payer is displayed (e.g., "Invalid diagnosis code for service")
4. Click **Edit & Resubmit**
5. Correct the issue — update diagnosis codes or service code
6. Click **Resubmit**
7. The claim resets to DRAFT and is re-queued for submission

Common rejection reasons:
- **Invalid diagnosis code** — the ICD-10 code doesn't match the CPT service code
- **Invalid NPI** — check your billing profile
- **Subscriber not found** — verify the member ID on the insurance card
- **Authorization required** — some services need prior authorization from the payer

---

## Recording Insurance Payments

When you receive an Explanation of Benefits (EOB) from the payer:

1. Go to the client's **invoice** for that appointment
2. Click **Record Payment**
3. Set method to **Insurance**
4. Enter the payment amount from the EOB
5. Add the check/EFT reference number (optional)
6. Save

The claim status in the Claims dashboard will update to PAID automatically when Stedi reports it (or you can verify manually with the "Check" button).

---

## Data Security & Compliance

- All insurance PHI (subscriber ID, group number, policy holder details) is **encrypted at rest** using AES-256-GCM
- The Stedi API key is encrypted before storage and never returned in full — only the last 4 characters are shown
- All insurance data access is **audit-logged** automatically (who accessed what, when)
- Claims are retained for **7 years** from the date of service per healthcare record retention requirements
- Insurance data is **soft-deleted** (never permanently removed) to maintain audit trails
- Claim payloads sent to Stedi contain only the **minimum necessary** data required for processing

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Insurance billing not configured" | Practice owner needs to add Stedi API key in Practice Settings |
| "Payer search unavailable" | Stedi may be down — enter payer ID manually or try again later |
| "Unable to verify eligibility" | Check that the subscriber ID and payer are correct, then retry |
| Claim stuck in DRAFT | Stedi may be unreachable — the system retries automatically (up to 3 times). Check the Claims dashboard later. |
| Claim rejected repeatedly | Verify: correct NPI, valid ICD-10 codes for the CPT code, correct subscriber ID, and that the payer accepts electronic claims via Stedi |
| Can't update API key | Only the practice owner can update the Stedi API key |

---

## API Endpoints (for developers)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/insurance/:participantId` | GET | Get patient insurance |
| `/api/insurance/:participantId` | PUT | Add/update insurance |
| `/api/insurance/:participantId` | DELETE | Soft-delete insurance |
| `/api/insurance/:participantId/eligibility` | POST | Check eligibility |
| `/api/claims` | POST | Create claim |
| `/api/claims` | GET | List claims (paginated, filterable) |
| `/api/claims/:id` | GET | Get claim detail + status history |
| `/api/claims/:id/refresh-status` | POST | Refresh status from Stedi |
| `/api/claims/:id/resubmit` | PUT | Resubmit rejected claim |
| `/api/payers?q=` | GET | Search payer directory |
| `/api/diagnosis-codes?q=` | GET | Search ICD-10 codes |
| `/api/config/stedi` | GET | Check Stedi config status |
| `/api/config/stedi` | PUT | Save API key (owner only) |
| `/api/config/stedi/test` | POST | Test Stedi connection |
