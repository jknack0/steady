# STEADY with ADHD -- Billing Usability Study Results (v2, Post-Fix)

## Study Summary

| Field | Detail |
|---|---|
| **Participants** | 100 simulated therapist agents across 4 age cohorts |
| **Method** | Code-level heuristic evaluation with persona-driven task walkthrough |
| **Scope** | 11 billing/payment tasks (B1-B11), clinician web app only |
| **Date** | April 7, 2026 |
| **Context** | Run AFTER implementing 5 critical fixes from v1 study |

### What Was Fixed Between v1 and v2

| Fix | Status |
|---|---|
| End-to-end billing workflow (post-session prompt, unbilled queue) | Shipped |
| Claim submission UI (New Claim button, submit to Stedi) | Shipped |
| Claim detail panel (fix dead click, status timeline, resubmit) | Shipped |
| Wire 5 orphaned Stripe components to UI | Shipped |
| Billing profile settings card (NPI, Tax ID, license, address) | Shipped |
| Invoice form critical fields (DOS, POS, modifiers, ICD-10, due date) | Shipped |

### Cohort Breakdown

| Cohort | Ages | N | Billing Mix |
|---|---|---|---|
| A - Early Career | 25-34 | 25 | 8 self-bill, 9 private-pay, 8 billing service |
| B - Mid Career | 35-44 | 25 | 10 self-bill, 8 private-pay, 7 billing service |
| C - Established | 45-54 | 25 | 10 self-bill, 7 private-pay, 8 billing service |
| D - Senior | 55-65+ | 25 | 10 self-bill, 7 private-pay, 8 billing service |

---

## SUS Score Comparison (v1 vs v2)

| Metric | v1 (50 participants) | v2 (100 participants) | Delta |
|---|---|---|---|
| Overall SUS | 52 | **57** | +5 |
| Private-pay satisfaction | 6.5/10 | **7.1/10** | +0.6 |
| Insurance biller satisfaction | 2.4/10 | **3.5/10** | +1.1 |

### SUS by Cohort (v2)

| Cohort | Overall | Self-billers | Private-pay | Billing service |
|---|---|---|---|---|
| A (25-34) | 62 | -- | -- | -- |
| B (35-44) | 58.8 | 52.5 | 67.0 | 58.5 |
| C (45-54) | 53 | 42 | 68 | 55 |
| D (55-65+) | 53.4 | 41.5 | 72.5 | 54 |

**Key insight**: Private-pay users rate the system acceptable (67-72.5 SUS). Insurance billers rate it unacceptable (41.5-52.5 SUS). The gap is the post-adjudication workflow.

---

## Task Completion Rates (v2)

| Task | Description | A | B | C | D | v2 Overall | v1 Overall | Delta |
|---|---|---|---|---|---|---|---|---|
| B1 | Configure billing profile | 88% | 100% | 96% | 92% | **94%** | 67% | +27 |
| B2 | Add client insurance | 96% | 100% | 100% | 96% | **98%** | 90% | +8 |
| B3 | Check eligibility | -- | -- | 100% | -- | **100%** | 84% | +16 |
| B4 | Create invoice | 100% | 100% | 100% | 96% | **99%** | 96% | +3 |
| B5 | Send invoice / collect payment | 92% | 92% | 96% | 100% | **95%** | 98% | -3 |
| B6 | Post-session billing prompt | 84% | 96% | 100% | 92% | **93%** | N/A | NEW |
| B7 | File insurance claim | 80% | 88% | 92% | 84% | **86%** | 50% | +36 |
| B8 | Check claim status / resubmit | 88% | 100% | 100% | 88% | **94%** | 86% | +8 |
| B9 | RTM dashboard + time logging | -- | 84% | 100% | 80% | **88%** | 59% | +29 |
| B10 | Generate superbill | 84% | 84% | 96% | -- | **88%** | 80% | +8 |
| B11 | End-to-end flow | -- | -- | 80% | 64% | **72%** | 30% | +42 |

**Biggest improvements**: End-to-end flow (+42), claim submission (+36), RTM (+29), billing profile (+27).

---

## What Works Well (Validated by 100 Participants)

These features received positive feedback across all cohorts:

1. **Post-session billing prompt** -- contextual, clean, competitive with SimplePractice
2. **Unbilled sessions queue** with dual Invoice/Claim buttons per row
3. **Claim detail slide-over panel** with status timeline and color-coded nodes
4. **RTM billability checklist** with engagement heatmap -- "best-in-class"
5. **ICD-10 diagnosis code search** with recent codes
6. **Billing profile** with Tax ID masking
7. **Invoice line items** with DOS, POS, modifiers -- professional-grade
8. **BillingStatusIndicator** on appointment cards
9. **Stripe card-on-file charging** (ChargeCardDialog)
10. **Stedi test connection** -- transparent status

---

## Remaining Issues by Severity

### BUG (Fix immediately)

| ID | Issue | Location | Impact |
|---|---|---|---|
| BUG-1 | UnbilledSessionsSection passes `insuranceData={null}` always | `UnbilledSessionsSection.tsx:184` | Claim button from billing page always fails. All 4 cohorts flagged this. |

### CRITICAL (Blocks insurance billing)

| ID | Issue | Frequency | Description |
|---|---|---|---|
| C1 | No ERA/EOB processing | 38/38 insurance billers | After claim is PAID, no ERA data (what payer paid, adjustments, patient responsibility). Cannot reconcile. |
| C2 | Missing patient DOB/sex/address | 38/38 insurance billers | CMS-1500 Box 3/5 required for every 837P. Not collected in participant model. |
| C3 | No modifiers on claims | 30/38 insurance billers | CMS-1500 Box 24D. Telehealth modifier 95 missing = auto-denial. Available on invoices but NOT on claims. |
| C4 | No diagnosis pointer per line item | 28/38 insurance billers | CMS-1500 Box 24E. Each service line must reference which ICD-10 code applies. Currently invoice-level only. |
| C5 | No claim-to-invoice coordination | 30/38 insurance billers | Insurance pays, but no auto-creation of patient balance-due invoice. Two systems don't talk. |

### HIGH (Significant gaps)

| ID | Issue | Frequency | Description |
|---|---|---|---|
| H1 | No secondary insurance | 26/38 insurance billers | ~30% of therapy clients have dual coverage. No COB workflow. |
| H2 | No prior authorization field | 24/38 insurance billers | CMS-1500 Box 23. Required by managed care plans. |
| H3 | No rendering vs billing NPI | 22/38 insurance billers | CMS-1500 Box 24J vs 33a. Blocks group practices. |
| H4 | No contractual adjustment/write-off | 25/38 insurance billers | Can only record payments, not adjustments. A/R ledger will be incorrect. |
| H5 | No taxonomy code field | 23/38 insurance billers | CMS-1500 Box 33b. Many payers reject without it. |
| H6 | No private-pay superbill generation | 22/31 private-pay + billing service | Out-of-network clients need superbills for self-filing. Only RTM superbills exist. |
| H7 | No financial reports | 55/100 overall | No aging, revenue, collections, denial rate, or tax reports. |
| H8 | ResubmitForm limited to CPT + ICD-10 | 21/38 insurance billers | Cannot correct modifiers, POS, demographics. Most rejections are for these. |
| H9 | No appeal workflow for denied claims | 18/38 insurance billers | DENIED is terminal with no actions. Distinct from resubmission. |
| H10 | No eligibility depth | 30/38 insurance billers | Only active/inactive. No deductible, coinsurance, OOP max, prior auth requirements, session limits. |
| H11 | Insurance effective/termination dates | 20/38 insurance billers | Cannot track coverage periods for retroactive claims. |

### MEDIUM (Usability friction)

| ID | Issue | Frequency |
|---|---|---|
| M1 | Settings not in sidebar nav | 33/100 mis-navigated |
| M2 | No Stripe self-service setup (only "contact support" text) | 30/100 |
| M3 | No email preview before invoice send | 38/100 |
| M4 | No batch operations (invoicing, claims) | 35/100 |
| M5 | No recurring invoices | 20/100 |
| M6 | No sliding scale / client-specific rates | 15/100 |
| M7 | No CSV export for billing data | 22/100 |
| M8 | No payment receipt generation | 20/100 |
| M9 | Send Reminder button is no-op placeholder | 15/100 |
| M10 | No client portal / statement view | 18/100 |
| M11 | No Stedi onboarding guidance | 22/100 |
| M12 | No claim status auto-polling | 15/100 |
| M13 | RTM enrollment duplicates insurance fields | 10/100 |
| M14 | "Bill Later" has no reminder mechanism | 15/100 |
| M15 | No CARC/RARC code display for rejections | 16/100 |
| M16 | POS default inconsistency (2 options in profile, 6 in invoice) | 12/100 |
| M17 | NewClaimFlow POS not editable | 10/100 |
| M18 | No insurance card image upload | 10/100 |

### LOW (Polish)

| ID | Issue | Frequency |
|---|---|---|
| L1 | "Estimated Total" label confusing | 10/100 |
| L2 | BillingStatusIndicator icon-only with tiny text | 12/100 |
| L3 | Claim row click toggles instead of always opening | 6/100 |
| L4 | "Participant" vs "Patient" vs "Client" terminology | 8/100 |
| L5 | Delete payment uses browser confirm() | 5/100 |
| L6 | Void button visible on PAID invoices | 4/100 |

---

## Satisfaction by Billing Segment (v2)

| Segment | N | Satisfaction (1-10) | Would Adopt? | vs v1 |
|---|---|---|---|---|
| Self-bill insurance | 38 | 3.5 | 5% without ERA/EOB | +1.1 |
| Use billing service | 31 | 5.2 | 25% for superbill handoff | +1.4 |
| Private-pay only | 31 | 7.1 | 75% with minor fixes | +0.6 |

---

## Priority Recommendations (v2)

### Tier 1: Must fix now

1. **Fix BUG-1**: Pass actual insurance data in UnbilledSessionsSection instead of `null`. One-line fix.
2. **Add patient demographics** (DOB, sex, address) to participant model and insurance form. Blocks all 837P claims.
3. **Add modifiers to claims** (not just invoices). Telehealth claims auto-denied without modifier 95.

### Tier 2: Required for insurance billing adoption

4. **Build ERA/EOB processing** -- Import 835 remittance data, display allowed amount/adjustments/patient responsibility.
5. **Add prior authorization field** to insurance form and claim creation.
6. **Add diagnosis pointer per line item** (Box 24E mapping).
7. **Add rendering vs billing NPI** for group practices.
8. **Add contractual adjustment/write-off** mechanism to invoices.
9. **Expand ResubmitForm** to allow editing modifiers, POS, demographics.
10. **Build private-pay superbill** generation from individual sessions.

### Tier 3: Competitive parity

11. Add secondary insurance support.
12. Add financial reports (aging, revenue, collections, tax summary).
13. Add batch operations (invoicing, claims).
14. Add eligibility depth (deductible, coinsurance, OOP max, prior auth requirements).
15. Add Stripe self-service onboarding.
16. Add CSV export.
17. Add recurring invoices.
18. Add taxonomy code to billing profile.

---

## Progress Summary

| Metric | v1 (Before) | v2 (After) | Target |
|---|---|---|---|
| Overall SUS | 52 | **57** | 68+ |
| Critical issues | 7 | **5** | 0 |
| Task completion (avg) | 74% | **91%** | 90%+ |
| E2E flow completion | 30% | **72%** | 80%+ |
| Private-pay satisfaction | 6.5 | **7.1** | 8+ |
| Insurance satisfaction | 2.4 | **3.5** | 6+ |

The fixes shipped between v1 and v2 had significant impact: +42 points on E2E flow completion, +36 on claim submission, +27 on billing profile setup. The private-pay flow is now near-production-ready. The insurance billing flow has the right structure but needs CMS-1500 field completeness and post-adjudication workflow (ERA/adjustments) to be viable.
