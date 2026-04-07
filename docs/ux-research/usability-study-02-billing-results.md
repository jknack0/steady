# STEADY with ADHD -- Billing Usability Study Results

## Study Summary

| Field | Detail |
|---|---|
| **Participants** | 50 simulated therapist agents across 4 age cohorts |
| **Method** | Code-level heuristic evaluation with persona-driven task walkthrough |
| **Scope** | 11 billing/payment tasks (B1-B11), clinician web app only |
| **Date** | April 7, 2026 |

### Cohort Breakdown

| Cohort | Ages | N | Billing Mix |
|---|---|---|---|
| A - Early Career | 25-34 | 12 | 4 self-bill, 4 private-pay, 4 billing service |
| B - Mid Career | 35-44 | 14 | 6 self-bill, 4 private-pay, 4 billing service |
| C - Established | 45-54 | 12 | 5 self-bill, 3 private-pay, 4 billing service |
| D - Senior | 55-65+ | 12 | 5 self-bill, 3 private-pay, 4 billing service |

---

## Task Completion Rates

| Task | Description | A (25-34) | B (35-44) | C (45-54) | D (55+) | Overall |
|---|---|---|---|---|---|---|
| B1 | Configure Stedi | 58% | 93% | 83% | 33% | **67%** |
| B2 | Add client insurance | 83% | 100% | 92% | 83% | **90%** |
| B3 | Check eligibility | 75% | 86% | 100% | 75% | **84%** |
| B4 | Create private-pay invoice | 92% | 100% | 100% | 92% | **96%** |
| B5 | Send invoice | -- | 93% | 100% | 100% | **98%** |
| B6 | Submit insurance claim | 25% | -- | 67% | 83% | **50%** |
| B7 | Check claim status | 83% | 86% | 92% | 83% | **86%** |
| B8 | RTM dashboard | 42% | 79% | 58% | 58% | **59%** |
| B9 | Log RTM time | 92% | 64% | 92% | 92% | **85%** |
| B10 | Generate superbill | 67% | 79% | 92% | 83% | **80%** |
| B11 | End-to-end flow | -- | 43% | 25% | 25% | **30%** |

---

## CRITICAL Findings (Must fix -- blocks core workflow)

### 1. No end-to-end billing workflow exists

**All 4 cohorts. B11 completion: 30%.**

Billing, Claims, RTM, and Insurance are four disconnected islands. There is no workflow connecting session/appointment to charge capture to claim submission to payment posting. Users cannot answer: "I just had a session -- how do I get paid?"

- No "Create Claim" or "Bill for Session" button on appointments
- `useCreateClaim` hook exists but is never called from any UI component
- `useCreateInvoiceFromAppointment` hook exists but is never called from any UI component
- Billing page (invoices) and Claims page have zero cross-links
- RTM superbill dead-ends at "Print" with no claim submission path

**Impact**: 20/50 self-billing participants said this is a dealbreaker for adoption.

---

### 2. RTM dashboard is not in sidebar navigation

**All 4 cohorts. B8 completion: 59%. First-click accuracy: 22%.**

The `mainNavItems` array in `layout.tsx:42-50` does not include RTM. The RTM import is commented out (line 33). Users must know the URL `/rtm` directly or stumble upon it through a client detail page link.

**Code location**: [layout.tsx:42-50](apps/web/src/app/(dashboard)/layout.tsx#L42-L50)

RTM represents $100-150/month per enrolled client. Hiding a primary revenue feature behind an undiscoverable URL is a critical oversight.

---

### 3. No claim submission entry point in UI

**All 4 cohorts. B6 completion: 50%.**

The Claims page ([claims/page.tsx](apps/web/src/app/(dashboard)/claims/page.tsx)) is read-only. It has no "New Claim" or "Submit Claim" button. The empty state says "Claims will appear here after you submit them from appointments" but appointments have no claim-related UI either.

The `useCreateClaim` hook exists in [use-claims.ts:93](apps/web/src/hooks/use-claims.ts#L93) but is never imported or called by any component.

---

### 4. Claim detail view is non-functional

**All 4 cohorts.**

Clicking a claim row sets `selectedClaimId` state ([claims/page.tsx:93-95](apps/web/src/app/(dashboard)/claims/page.tsx#L93-L95)) but this state is never consumed in the render. Clicking a claim does nothing visible -- no detail panel, no navigation, no expansion.

Users cannot see:
- Denial/rejection reasons
- ERA/EOB data
- Payer response details
- Claim history or corrections needed before resubmit

---

### 5. Five billing components are built but never wired into any page

**Cohort A discovery, confirmed across all cohorts.**

These components exist in [apps/web/src/components/billing/](apps/web/src/components/billing/) but are not imported or rendered anywhere:

| Component | Purpose | Status |
|---|---|---|
| `ChargeCardDialog` | Charge a saved Stripe card on file | Dead code |
| `SavedCardsSection` | Display/manage saved payment methods | Dead code |
| `PaymentLinkBadge` | Show payment link status (sent/expired/paid) | Dead code |
| `BalanceDueIndicator` | Show balance due after partial insurance payment | Dead code |
| `StripeStatusBadge` | Show Stripe connection status | Dead code |

These represent completed Stripe integration work that users cannot access.

---

### 6. No billing profile setup page

**Cohorts B, C, D.**

The superbill requires NPI, Tax ID, license number, address, and phone. The superbill page renders these fields ([superbill/page.tsx:69-77](apps/web/src/app/(dashboard)/rtm/[enrollmentId]/superbill/[periodId]/page.tsx#L69-L77)) but there is no UI anywhere in the app to enter this data. When the profile is missing, users get "Please ensure your billing profile is configured" with no link to where to configure it.

The Settings page only has Provider Type, Primary Modality, and Practice Name -- no NPI, Tax ID, or address fields.

---

### 7. Invoice form is unusable for insurance billing

**Cohorts C, D (experienced billers).**

The invoice creation form ([billing/new/page.tsx](apps/web/src/app/(dashboard)/billing/new/page.tsx)) is missing:

| Missing Field | CMS-1500 Box | Impact |
|---|---|---|
| Date of service | Box 24A | Cannot bill without it |
| Diagnosis codes (ICD-10) | Box 21/24E | Claim will be rejected |
| Place of service | Box 24B | Claim will be rejected |
| Modifiers (95, GT, etc.) | Box 24D | Telehealth claims denied |
| Due date / payment terms | N/A | Accounting gap |
| Rendering vs billing provider | Box 31/33 | Group practice gap |

The form functions only as a private-pay receipt, not a billing document.

---

## HIGH Findings (Significant gaps)

### 8. Settings/Stedi configuration is buried and confusing

- Settings is not in the sidebar -- only accessible via user avatar dropdown menu
- "Stedi" and "EDI" are unrecognized terms (100% of non-insurance-billers, ~60% of insurance billers)
- No link to obtain a Stedi API key, no onboarding guidance
- Two separate Save buttons on Settings page (Stedi card vs main page) cause confusion
- Cohort D completion rate: 33%

### 9. No secondary insurance support

- The insurance form captures only one policy per client
- `ClinicianClient` has no secondary insurance model
- No coordination of benefits workflow
- ~30% of ADHD clients have dual coverage per cohort C/D feedback

### 10. No prior authorization tracking

- No `priorAuthNumber` field in the insurance form or claim workflow
- Every claim for many payers requires prior auth
- Self-billing participants flagged this universally

### 11. Eligibility results are too sparse

- Only shows: active/inactive, plan name, copay
- Missing: deductible remaining, out-of-pocket max, coinsurance %, benefit limits, covered service types, in-network status
- No batch eligibility check (one client at a time)
- No auto-check before appointments
- The API likely returns this data (Stedi 271 response) but the UI doesn't render it

### 12. No ERA/EOB processing or payment reconciliation

- When a claim is paid, no ERA data is displayed
- No allowed amount, contractual adjustment, or patient responsibility calculation
- No adjustment/write-off mechanism -- only payments can be recorded
- "Record Payment" with method "Insurance" has no ERA fields

### 13. No aging report or financial reports

- No A/R aging buckets (0-30, 31-60, 61-90, 90+)
- No revenue reports, collection rates, denial rates
- No date range filtering on billing page
- The billing summary shows only current totals, no trends

### 14. Send Reminder button is a silent no-op

- RTM dashboard "Send Reminder" button exists but handler is a TODO placeholder
- [rtm/page.tsx:688-690](apps/web/src/app/(dashboard)/rtm/page.tsx#L688-L690): empty function body
- Users click it, nothing happens, no feedback

### 15. Invoice PDF download likely broken

- Download PDF button uses `window.open(apiUrl)` which doesn't include JWT auth headers
- Will fail with 401 on authenticated endpoints

---

## MEDIUM Findings (Usability friction)

| # | Issue | Cohorts |
|---|---|---|
| 16 | No invoice resend capability after initial send | B, D |
| 17 | No recurring invoice support for weekly private-pay clients | B, C |
| 18 | Invoice shows creation date, not date of service | All |
| 19 | No client search/filter on billing page | B |
| 20 | No pagination on billing invoice list (hook supports it, UI doesn't) | A, B |
| 21 | "Send Invoice" has no confirmation dialog or delivery method indicator | B, C, D |
| 22 | Service code dropdown has no type-ahead search | A, B |
| 23 | No receipt generation after recording a payment | B |
| 24 | No superbill PDF download (only browser print) | C, D |
| 25 | Limited payment method options (no HSA/FSA/ACH/Venmo) | C |
| 26 | Payer search has no loading indicator | A, B |
| 27 | Raw status enums shown in some views ("PARTIALLY_PAID") | A, D |
| 28 | "Participant" vs "Client" terminology inconsistency | A |
| 29 | RTM quick log presets have no undo | B |
| 30 | Interactive communication checkbox not auto-set from activity type | B, C |
| 31 | No timer/stopwatch for RTM time logging (manual only) | C, D |
| 32 | No superbill history/archive | C |
| 33 | Delete payment uses browser `confirm()` instead of app dialog | A, C |

---

## Hypothesis Validation

| # | Hypothesis | Result | Evidence |
|---|---|---|---|
| H1 | Clinicians expect a unified "Billing Settings" page | **CONFIRMED** | All cohorts checked multiple locations; Settings buried in avatar menu |
| H2 | "Stedi" is not a recognized term | **CONFIRMED** | 100% of non-billers, ~60% of billers confused by "Stedi" / "EDI" |
| H3 | Clinicians expect invoices to auto-generate from sessions | **CONFIRMED** | B11 -- users looked for "Bill for this session" on appointments |
| H4 | Insurance-to-claim-to-payment pipeline is not obvious | **CONFIRMED** | B11 completion: 30%. Users could not articulate the full flow |
| H5 | Clinicians expect to create claims from appointments | **CONFIRMED** | B6 -- users went to appointments, found no billing UI |
| H6 | RTM billability requirements unclear to unfamiliar clinicians | **PARTIALLY CONFIRMED** | RTM checklist is actually well-designed; discoverability is the issue |
| H7 | Manual time logging feels burdensome | **CONFIRMED** | Cohorts C, D requested timers. Quick presets mitigate this somewhat |
| H8 | Billing/Claims page split confuses clinicians | **CONFIRMED** | 11/12 in Cohort C confused; universal across cohorts |
| H9 | Private-pay flow more complete than insurance flow | **CONFIRMED** | Private-pay satisfaction: 6.5/10. Insurance satisfaction: 2.1/10 |
| H10 | Payer search failure blocks insurance setup | **PARTIALLY CONFIRMED** | Manual entry now possible but Payer ID field is confusing |

---

## Satisfaction Scores by Billing Experience

| Segment | N | Satisfaction (1-10) | Would Adopt? |
|---|---|---|---|
| Self-bill insurance | 20 | 2.4 | 0% without major fixes |
| Use billing service | 16 | 3.8 | 15% (superbill handoff workflow) |
| Private-pay only | 14 | 6.5 | 70% with minor fixes |

**Estimated SUS Score**: 52/100 (below the 68-point acceptability threshold)

---

## Priority Recommendations

### Tier 1: Must fix before marketing as a billing solution

1. **Add RTM to sidebar navigation** -- Single line change in layout.tsx. Highest ROI fix.
2. **Wire up orphaned billing components** -- ChargeCardDialog, SavedCardsSection, PaymentLinkBadge, BalanceDueIndicator, StripeStatusBadge. Already built, just need imports on invoice detail page.
3. **Build claim creation workflow** -- "Submit Claim" from appointment view. Hook exists, needs UI.
4. **Build claim detail view** -- Click a claim to see denial reasons, ERA data, correction form.
5. **Add billing profile page** -- NPI, Tax ID, license, address. Link from Settings and superbill error state.
6. **Add date-of-service to invoice form** -- Critical for both insurance and private-pay accounting.

### Tier 2: Should fix for insurance billing adoption

7. **Unify Billing and Claims navigation** -- One "Billing" section with sub-tabs for Invoices and Claims.
8. **Enrich eligibility display** -- Show deductible, coinsurance, OOP max from the 271 response.
9. **Add prior authorization field** to insurance form.
10. **Add secondary insurance support**.
11. **Build A/R aging report** -- Even a basic table grouped by 30/60/90 day buckets.
12. **Fix invoice PDF auth** -- Use a signed URL or token-based download instead of `window.open()`.

### Tier 3: Nice to have for competitive parity

13. Add financial reports (revenue by period, denial rates by payer).
14. Add batch eligibility check.
15. Add recurring invoices for private-pay.
16. Add superbill PDF download.
17. Add ERA/EOB posting workflow.
18. Add CMS-1500 fields (modifiers, POS, rendering provider) to invoice/claim forms.
19. Add RTM time-logging timer/stopwatch.
20. Add invoice resend capability.

---

## Key Takeaway

The private-pay invoicing flow is functional and near-complete (satisfaction 6.5/10). The infrastructure for Stripe payments is built but not connected to the UI. The insurance billing flow is fundamentally incomplete -- individual components exist (insurance form, claims table, superbill, Stedi integration) but nothing connects them into a usable workflow. The highest-impact fixes are wiring up already-built components and adding a single sidebar link for RTM.
