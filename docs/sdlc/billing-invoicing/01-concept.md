# Billing & Invoicing — Concept (Ideator Deliverable)

## Problem Statement

Clinicians using Steady for scheduling and clinical management must leave the platform to bill clients. Service codes already carry `defaultPriceCents`, appointments track `ATTENDED` status, and RTM superbill generation exists — but there is no way to create an invoice, track payments, or see an outstanding-balance summary. This gap forces manual spreadsheet work and delays collections.

## Opportunity

Extend the existing appointment + service-code foundation into a lightweight invoicing workflow:

1. **Invoice creation** — one-click from an attended appointment or manual build from service codes
2. **Payment recording** — cash, check, card, insurance, other — with automatic balance recalculation
3. **Status lifecycle** — DRAFT -> SENT -> PAID / PARTIALLY_PAID / OVERDUE / VOID
4. **Billing dashboard** — outstanding totals, received this month, overdue count, per-status breakdown

## Core User Stories

| ID | As a ... | I want to ... | So that ... |
|----|----------|---------------|-------------|
| US-1 | Solo clinician | Generate an invoice from an attended appointment | I can bill the client without re-entering data |
| US-2 | Clinician | Manually create an invoice with multiple line items | I can bill for services not tied to a single appointment |
| US-3 | Clinician | Record partial and full payments | I can track what has been collected |
| US-4 | Clinician | See a billing summary dashboard | I know my outstanding balance and overdue invoices at a glance |
| US-5 | Practice owner | See invoices from all clinicians in my practice | I can oversee revenue across the practice |
| US-6 | Clinician | Void an invoice | I can correct billing mistakes without deleting audit trail |

## Key Constraints

- All amounts in integer cents (no floating-point money)
- Invoice number auto-incremented per practice (atomic, gap-free within a transaction)
- Financial data linked to patients is PHI under HIPAA — audit all mutations
- Invoice notes may contain PHI — never log content
- Cross-practice isolation: every query filters by practiceId
- DRAFT invoices are mutable; SENT/PAID/etc are immutable (except void or record payment)

## What Already Exists

- `ServiceCode` with `defaultPriceCents`
- `Appointment` with `ATTENDED` status and service code FK
- `ClinicianBillingProfile` (NPI, tax ID, billing address)
- RTM superbill PDF generation service (pattern to follow)
- Practice model with owner role

## Out of Scope

- PDF invoice generation / email delivery
- Recurring invoices / subscription billing
- Insurance claim submission (ERA/835)
- Late fees / interest calculation
- Multi-currency support
- Mobile app billing UI
- Integration with external accounting systems (QuickBooks, Stripe)
