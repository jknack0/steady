# Billing & Invoicing — Test Report

## Summary

**Status: PASS**
**Total new tests: 55**
**All passing: Yes**

## Test Results by File

### packages/api/src/__tests__/invoices.test.ts (24 tests)
- POST /api/invoices: creates draft, 400 empty items, 400 missing participant, 404 cross-practice service code, 404 cross-practice participant, 401 no auth
- GET /api/invoices: lists with pagination, filters by status, non-owner scoped, owner sees all
- GET /api/invoices/:id: returns with line items, 404 cross-practice, 404 other clinician
- PATCH /api/invoices/:id: updates draft notes, 409 non-draft
- POST /api/invoices/:id/send: transitions to SENT, 409 non-draft
- POST /api/invoices/:id/void: transitions to VOID, 409 already void
- DELETE /api/invoices/:id: deletes draft, 409 non-draft
- POST /api/invoices/from-appointment: creates from attended, 409 non-attended, 404 missing

### packages/api/src/__tests__/payments.test.ts (12 tests)
- POST /api/invoices/:id/payments: records payment, transitions PAID, transitions PARTIALLY_PAID, 409 draft, 409 void, 400 zero amount, 400 missing method, 401 no auth
- GET /api/invoices/:id/payments: lists payments, 404 missing invoice
- DELETE /api/invoices/:id/payments/:paymentId: removes and recalculates, 404 missing

### packages/api/src/__tests__/billing-summary.test.ts (4 tests)
- Returns summary with all fields and correct calculations
- Scopes to clinician for non-owner
- Returns zeros for new practice
- 401 without auth

### packages/shared/src/__tests__/billing.schema.test.ts (16 tests)
- CreateInvoiceSchema: valid payload, empty items, missing participantId, default taxCents, default quantity, optional fields
- UpdateInvoiceSchema: partial update, empty object
- CreatePaymentSchema: valid payment, zero amount, invalid method, optional fields
- ListInvoicesQuerySchema: default limit, all params
- Enums: all valid InvoiceStatus values, all valid PaymentMethod values

## Test Infrastructure Notes

- Used `vi.hoisted()` + `vi.mock("@steady/db")` pattern for Prisma mock compatibility with vitest 4.x
- Pre-existing test suite has a vitest 4 mock compatibility issue (setup.ts global mock + `vi.clearAllMocks()` interaction). New billing tests avoid this by using self-contained mocks.
- Schema tests run in packages/shared (no API dependency)

## Coverage

New billing code is fully tested for:
- All CRUD operations
- Status transition guards (DRAFT-only edit/delete, DRAFT-only send)
- Payment balance recalculation and status auto-transition
- Practice ownership scoping (owner vs clinician)
- Cross-tenant isolation (404 for cross-practice access)
- Input validation (Zod schema enforcement)
- Authentication requirements
