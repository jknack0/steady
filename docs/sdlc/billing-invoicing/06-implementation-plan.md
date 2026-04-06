# Billing & Invoicing — Implementation Plan

## Delivered Components

### Database (packages/db)
- `Invoice` model with practice-scoped invoicing, auto-incrementing invoice number, status lifecycle
- `InvoiceLineItem` model with optional appointment FK, service code FK, editable price/description
- `Payment` model with method enum, reference, received date
- `InvoiceStatus` enum: DRAFT, SENT, PAID, PARTIALLY_PAID, OVERDUE, VOID
- `PaymentMethod` enum: CASH, CHECK, CREDIT_CARD, INSURANCE, OTHER
- Relations added to Practice, ClinicianProfile, ParticipantProfile, Appointment, ServiceCode

### Shared Validation (packages/shared)
- `billing.ts` — InvoiceStatusEnum, PaymentMethodEnum, CreateInvoiceSchema, UpdateInvoiceSchema, CreatePaymentSchema, ListInvoicesQuerySchema
- Exported via schemas/index.ts

### API Services (packages/api)
- `services/billing.ts` — createInvoice (atomic number generation), listInvoices (cursor-paginated, owner/clinician scoped), getInvoice, updateInvoice (DRAFT only), sendInvoice (DRAFT->SENT), voidInvoice, deleteInvoice (DRAFT only), createInvoiceFromAppointment (ATTENDED only), getBillingSummary
- `services/payments.ts` — recordPayment (with balance recalculation), listPayments, deletePayment (with balance recalculation)

### API Routes (packages/api)
- `routes/invoices.ts` — POST /, GET /, GET /:id, PATCH /:id, POST /:id/send, POST /:id/void, DELETE /:id, POST /from-appointment/:appointmentId, POST /:id/payments, GET /:id/payments, DELETE /:id/payments/:paymentId
- `routes/billing.ts` — GET /summary
- Mounted at /api/invoices and /api/billing in app.ts

### Web UI (apps/web)
- `/billing` page — summary cards (outstanding, received, overdue, total), invoice list with status filters, empty state
- `/billing/[invoiceId]` page — line items table, payment history, record payment form, send/void/delete actions
- Hooks: use-invoices.ts, use-payments.ts, use-billing-summary.ts
- Sidebar: "Billing" nav item with DollarSign icon in Billing section

## Key Design Decisions

1. **Invoice number generation**: Atomic within `prisma.$transaction` — query max + increment pattern. Format: INV-001, INV-002, etc.
2. **Balance recalculation**: Runs after every payment create/delete, inside the same transaction. Automatically transitions status (SENT <-> PARTIALLY_PAID <-> PAID).
3. **DRAFT mutability**: Only DRAFT invoices can be edited or deleted. Non-DRAFT requires void.
4. **Auto-invoice**: Creates a DRAFT invoice from an ATTENDED appointment's service code. Prevents duplicate invoicing by checking existing line items.
5. **Owner visibility**: Practice owners see all invoices; standard clinicians see only their own.
6. **Test isolation**: Used vi.hoisted() pattern for Prisma mock to work with vitest 4.x ESM module loading.
