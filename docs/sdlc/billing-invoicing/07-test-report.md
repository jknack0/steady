# Billing & Invoicing — Test Plan

## Test Strategy

Tests follow TDD: write failing tests first, then implement. All API tests use supertest against the Express app with mocked Prisma. Schema tests validate Zod parsing for valid and invalid payloads.

## Test Files

### packages/api/src/__tests__/invoices.test.ts (~30 tests)

**Invoice CRUD:**
1. POST /api/invoices — creates draft invoice with line items
2. POST /api/invoices — auto-generates sequential invoice number
3. POST /api/invoices — returns 400 for empty line items
4. POST /api/invoices — returns 400 for missing participantId
5. POST /api/invoices — returns 404 for cross-practice service code
6. POST /api/invoices — returns 404 for cross-practice participant
7. POST /api/invoices — calculates subtotalCents and totalCents correctly
8. GET /api/invoices — lists invoices with cursor pagination
9. GET /api/invoices — non-owner sees only own invoices
10. GET /api/invoices — owner sees all practice invoices
11. GET /api/invoices — filters by status
12. GET /api/invoices — filters by participantId
13. GET /api/invoices — filters by date range
14. GET /api/invoices/:id — returns invoice with line items and payments
15. GET /api/invoices/:id — returns 404 for cross-practice invoice
16. GET /api/invoices/:id — returns 404 for other clinician's invoice (non-owner)
17. PATCH /api/invoices/:id — updates draft invoice notes
18. PATCH /api/invoices/:id — updates draft invoice line items and recalculates totals
19. PATCH /api/invoices/:id — returns 409 for non-draft invoice
20. DELETE /api/invoices/:id — deletes draft invoice
21. DELETE /api/invoices/:id — returns 409 for non-draft invoice

**Status transitions:**
22. POST /api/invoices/:id/send — transitions DRAFT to SENT, sets issuedAt and dueAt
23. POST /api/invoices/:id/send — returns 409 for non-draft invoice
24. POST /api/invoices/:id/void — transitions SENT to VOID
25. POST /api/invoices/:id/void — transitions PAID to VOID
26. POST /api/invoices/:id/void — returns 409 for already-void invoice

**Auto-invoice:**
27. POST /api/appointments/:id/invoice — creates invoice from attended appointment
28. POST /api/appointments/:id/invoice — returns 409 for non-attended appointment
29. POST /api/appointments/:id/invoice — returns 404 for cross-practice appointment

**Auth:**
30. All endpoints return 401 without auth token

### packages/api/src/__tests__/payments.test.ts (~15 tests)

1. POST /api/invoices/:id/payments — records payment and updates paidCents
2. POST /api/invoices/:id/payments — transitions to PAID when fully paid
3. POST /api/invoices/:id/payments — transitions to PARTIALLY_PAID when partially paid
4. POST /api/invoices/:id/payments — returns 409 for draft invoice
5. POST /api/invoices/:id/payments — returns 409 for void invoice
6. POST /api/invoices/:id/payments — returns 400 for zero amount
7. POST /api/invoices/:id/payments — returns 400 for missing method
8. POST /api/invoices/:id/payments — defaults receivedAt to now
9. GET /api/invoices/:id/payments — lists payments for invoice
10. GET /api/invoices/:id/payments — returns 404 for cross-practice invoice
11. DELETE /api/invoices/:id/payments/:paymentId — removes payment
12. DELETE /api/invoices/:id/payments/:paymentId — recalculates balance after deletion
13. DELETE /api/invoices/:id/payments/:paymentId — transitions from PAID to SENT after last payment deleted
14. DELETE /api/invoices/:id/payments/:paymentId — returns 404 for non-existent payment
15. All endpoints return 401 without auth token

### packages/api/src/__tests__/billing-summary.test.ts (~5 tests)

1. GET /api/billing/summary — returns summary with all fields
2. GET /api/billing/summary — scopes to clinician for non-owner
3. GET /api/billing/summary — includes all clinicians for owner
4. GET /api/billing/summary — returns zeros for new practice
5. GET /api/billing/summary — returns 401 without auth

### packages/shared/src/__tests__/billing.schema.test.ts (~10 tests)

1. CreateInvoiceSchema — accepts valid payload
2. CreateInvoiceSchema — rejects empty lineItems
3. CreateInvoiceSchema — rejects missing participantId
4. CreateInvoiceSchema — applies default taxCents = 0
5. CreateInvoiceSchema — applies default quantity = 1
6. UpdateInvoiceSchema — accepts partial update
7. CreatePaymentSchema — accepts valid payment
8. CreatePaymentSchema — rejects zero amountCents
9. CreatePaymentSchema — rejects invalid method
10. ListInvoicesQuerySchema — applies default limit = 50

## Coverage Target

- packages/api: maintain >80% line coverage
- packages/shared: maintain >80% line coverage
- ~60 total new tests across 4 test files

## Test Infrastructure

- Vitest with node environment (API)
- Mocked Prisma via packages/api/src/__tests__/setup.ts
- Test helpers from packages/api/src/__tests__/helpers.ts
- JWT test tokens via createTestToken/authHeader
