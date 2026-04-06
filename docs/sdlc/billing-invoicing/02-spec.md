# Billing & Invoicing — Feature Specification

## Overview

Adds invoice creation, payment tracking, and billing summary to Steady. Clinicians can generate invoices from attended appointments or build them manually, record payments, and view practice-wide billing metrics. Builds on the existing appointment, service-code, and practice-ownership infrastructure.

## Glossary

| Term | Definition |
|------|-----------|
| **Invoice** | A bill sent to a participant for one or more clinical services. Practice-scoped. |
| **Line Item** | A single service entry on an invoice, optionally linked to an appointment. |
| **Payment** | A recorded payment against an invoice. Multiple payments per invoice allowed. |
| **Invoice Number** | Auto-incrementing identifier per practice, format "INV-001". |

---

## Functional Requirements

### FR-1: Invoice creation

**GIVEN** an authenticated clinician with practice context
**WHEN** they POST /api/invoices with participantId and at least one line item
**THEN** a new Invoice is created in DRAFT status with auto-generated invoiceNumber

**GIVEN** a create request with a line item referencing a serviceCodeId
**WHEN** the service code belongs to a different practice
**THEN** the API responds 404

**GIVEN** a create request with a line item referencing an appointmentId
**WHEN** the appointment belongs to a different practice
**THEN** the API responds 404

**GIVEN** a create request with no line items
**WHEN** submitted
**THEN** the API responds 400 with "At least one line item is required"

**GIVEN** a valid create request
**WHEN** the invoice is created
**THEN** subtotalCents = sum of all lineItem totalCents, totalCents = subtotalCents + taxCents

### FR-2: Invoice listing

**GIVEN** an authenticated clinician
**WHEN** they GET /api/invoices
**THEN** invoices are returned, scoped to their practice, with cursor pagination (max 100)

**GIVEN** a non-owner clinician
**WHEN** they list invoices
**THEN** only their own invoices are returned

**GIVEN** a practice owner
**WHEN** they list invoices
**THEN** all practice invoices are returned

**GIVEN** query params status, participantId, from, to
**WHEN** provided
**THEN** results are filtered accordingly

### FR-3: Invoice detail

**GIVEN** a valid invoice ID within the clinician's practice
**WHEN** they GET /api/invoices/:id
**THEN** the full invoice is returned with line items and payments

**GIVEN** an invoice ID from another practice
**WHEN** requested
**THEN** the API responds 404

### FR-4: Invoice update (DRAFT only)

**GIVEN** a DRAFT invoice
**WHEN** the clinician PATCHes notes or line items
**THEN** the invoice updates and totals are recalculated

**GIVEN** a non-DRAFT invoice
**WHEN** an update is attempted
**THEN** the API responds 409 with "Only draft invoices can be edited"

### FR-5: Send invoice (DRAFT -> SENT)

**GIVEN** a DRAFT invoice
**WHEN** the clinician POSTs to /api/invoices/:id/send
**THEN** status transitions to SENT, issuedAt = now, dueAt = now + 30 days

**GIVEN** a non-DRAFT invoice
**WHEN** send is attempted
**THEN** the API responds 409 with "Only draft invoices can be sent"

### FR-6: Void invoice

**GIVEN** any non-VOID invoice
**WHEN** the clinician POSTs to /api/invoices/:id/void
**THEN** status transitions to VOID

**GIVEN** a VOID invoice
**WHEN** void is attempted again
**THEN** the API responds 409 with "Invoice is already void"

### FR-7: Delete invoice (DRAFT only)

**GIVEN** a DRAFT invoice
**WHEN** the clinician DELETEs /api/invoices/:id
**THEN** the invoice and its line items are hard-deleted

**GIVEN** a non-DRAFT invoice
**WHEN** deletion is attempted
**THEN** the API responds 409 with "Only draft invoices can be deleted"

### FR-8: Record payment

**GIVEN** a SENT or PARTIALLY_PAID invoice
**WHEN** the clinician POSTs to /api/invoices/:id/payments with amountCents and method
**THEN** a Payment is created, invoice.paidCents is updated

**GIVEN** paidCents >= totalCents after recording
**WHEN** the payment is saved
**THEN** invoice status transitions to PAID

**GIVEN** 0 < paidCents < totalCents after recording
**WHEN** the payment is saved
**THEN** invoice status transitions to PARTIALLY_PAID

**GIVEN** a DRAFT or VOID invoice
**WHEN** a payment is attempted
**THEN** the API responds 409 with "Cannot record payment on a draft or void invoice"

### FR-9: Delete payment

**GIVEN** an existing payment
**WHEN** the clinician DELETEs /api/invoices/:id/payments/:paymentId
**THEN** the payment is removed and invoice.paidCents + status are recalculated

### FR-10: Auto-invoice from appointment

**GIVEN** an ATTENDED appointment without an existing invoice line item
**WHEN** the clinician POSTs to /api/appointments/:id/invoice
**THEN** a DRAFT invoice is created with one line item from the appointment's service code

**GIVEN** an appointment that is not ATTENDED
**WHEN** auto-invoice is attempted
**THEN** the API responds 409 with "Only attended appointments can be invoiced"

### FR-11: Billing summary

**GIVEN** an authenticated clinician
**WHEN** they GET /api/billing/summary
**THEN** the response includes: totalOutstandingCents, totalReceivedThisMonthCents, overdueCount, invoiceCountsByStatus

**GIVEN** a practice owner
**WHEN** they request the summary
**THEN** totals include all clinicians in the practice

**GIVEN** a non-owner clinician
**WHEN** they request the summary
**THEN** totals include only their own invoices

---

## Permissions & Multi-tenancy

| Actor | Can do |
|-------|--------|
| Clinician (standard) | Full CRUD on own invoices/payments; view own billing summary |
| Practice owner | All above + view all practice invoices/payments/summary |
| Participant | No access (future: view own invoices) |

**Tenant isolation:** Every query filters by practiceId. Cross-practice = 404.

---

## API Surface

| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/invoices | Create invoice |
| GET | /api/invoices | List invoices (cursor-paginated) |
| GET | /api/invoices/:id | Get invoice with line items + payments |
| PATCH | /api/invoices/:id | Update draft invoice |
| POST | /api/invoices/:id/send | Transition DRAFT -> SENT |
| POST | /api/invoices/:id/void | Transition to VOID |
| DELETE | /api/invoices/:id | Delete draft invoice |
| POST | /api/invoices/:id/payments | Record payment |
| GET | /api/invoices/:id/payments | List payments |
| DELETE | /api/invoices/:id/payments/:paymentId | Delete payment |
| POST | /api/appointments/:id/invoice | Create invoice from appointment |
| GET | /api/billing/summary | Billing summary |

---

## Non-Functional Requirements

- All amounts in integer cents — no floats
- Invoice number generation is atomic (Prisma $transaction)
- All mutations audit-logged (field names only, never amounts)
- Invoice notes may contain PHI — never logged
- Cursor-based pagination, max 100 per page
- >80% test coverage on API and shared packages
