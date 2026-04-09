# Billing & Invoicing — Technical Architecture

## Overview

Adds three new Prisma models (Invoice, InvoiceLineItem, Payment), two enums (InvoiceStatus, PaymentMethod), three service modules, two route modules, and a web billing page. Follows existing patterns: Zod schemas in `@steady/shared`, Express routes with practice-context middleware, service-layer business logic, Prisma singleton.

## System Diagram

```
+------------------------------------------------------------------+
| Next.js Web (apps/web)                                            |
|   /billing route (dashboard group)                                |
|   +-- <BillingPage> -- summary cards + invoice list               |
|   +-- <InvoiceDetail> -- /billing/[invoiceId]                     |
|   +-- <CreateInvoiceModal>                                        |
|   +-- <RecordPaymentModal>                                        |
|   +-- TanStack Query: useInvoices, useBillingSummary, etc.        |
+----------------------------+-------------------------------------+
                             | HTTPS + JWT
+----------------------------v-------------------------------------+
| Express API (packages/api)                                        |
|                                                                   |
|  routes/invoices.ts          routes/billing.ts                    |
|        |                           |                              |
|        v                           v                              |
|  services/billing.ts         services/billing.ts (summary)        |
|  services/payments.ts                                             |
|        |                                                          |
|  +------------------------------------------------------------+  |
|  | @steady/db -- Prisma singleton + audit middleware           |  |
|  +------------------------------------------------------------+  |
+----------------------------+-------------------------------------+
                             v
                   +------------------+
                   | PostgreSQL       |
                   |  invoices        |
                   |  invoice_items   |
                   |  payments        |
                   |  audit_logs      |
                   +------------------+

Shared:
  @steady/shared/src/schemas/billing.ts
```

## Data Models

### Invoice

```prisma
enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  PARTIALLY_PAID
  OVERDUE
  VOID
}

model Invoice {
  id              String        @id @default(cuid())
  practiceId      String
  practice        Practice      @relation(fields: [practiceId], references: [id])
  clinicianId     String
  clinician       ClinicianProfile @relation(fields: [clinicianId], references: [id])
  participantId   String
  participant     ParticipantProfile @relation(fields: [participantId], references: [id])
  invoiceNumber   String
  status          InvoiceStatus @default(DRAFT)
  issuedAt        DateTime?
  dueAt           DateTime?
  subtotalCents   Int
  taxCents        Int           @default(0)
  totalCents      Int
  paidCents       Int           @default(0)
  notes           String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  lineItems       InvoiceLineItem[]
  payments        Payment[]

  @@unique([practiceId, invoiceNumber])
  @@index([practiceId, participantId])
  @@index([practiceId, status])
  @@map("invoices")
}
```

### InvoiceLineItem

```prisma
model InvoiceLineItem {
  id              String       @id @default(cuid())
  invoiceId       String
  invoice         Invoice      @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  appointmentId   String?
  appointment     Appointment? @relation(fields: [appointmentId], references: [id], onDelete: SetNull)
  serviceCodeId   String
  serviceCode     ServiceCode  @relation(fields: [serviceCodeId], references: [id])
  description     String
  unitPriceCents  Int
  quantity        Int          @default(1)
  totalCents      Int
  createdAt       DateTime     @default(now())

  @@index([invoiceId])
  @@map("invoice_line_items")
}
```

### Payment

```prisma
enum PaymentMethod {
  CASH
  CHECK
  CREDIT_CARD
  INSURANCE
  OTHER
}

model Payment {
  id           String        @id @default(cuid())
  invoiceId    String
  invoice      Invoice       @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  amountCents  Int
  method       PaymentMethod
  reference    String?
  receivedAt   DateTime
  createdAt    DateTime      @default(now())

  @@index([invoiceId])
  @@map("payments")
}
```

## Invoice Number Generation

Invoice numbers are per-practice, auto-incremented atomically:

```typescript
async function generateInvoiceNumber(practiceId: string, tx: PrismaTransaction): Promise<string> {
  const last = await tx.invoice.findFirst({
    where: { practiceId },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });
  const nextNum = last
    ? parseInt(last.invoiceNumber.replace("INV-", ""), 10) + 1
    : 1;
  return `INV-${String(nextNum).padStart(3, "0")}`;
}
```

This runs inside a `prisma.$transaction` with the invoice creation to prevent gaps/duplicates.

## Service Layer

### services/billing.ts

- `createInvoice(ctx, input)` — $transaction: generate number + create invoice + line items
- `listInvoices(ctx, query)` — cursor-paginated, practice-scoped, owner sees all
- `getInvoice(ctx, id)` — with line items + payments
- `updateInvoice(ctx, id, patch)` — DRAFT only; recalculate totals
- `sendInvoice(ctx, id)` — DRAFT -> SENT transition
- `voidInvoice(ctx, id)` — any non-VOID -> VOID
- `deleteInvoice(ctx, id)` — DRAFT only hard delete
- `createInvoiceFromAppointment(ctx, appointmentId)` — ATTENDED only
- `getBillingSummary(ctx)` — aggregate queries

### services/payments.ts

- `recordPayment(ctx, invoiceId, input)` — create payment + recalculate balance/status
- `listPayments(ctx, invoiceId)` — bounded list
- `deletePayment(ctx, invoiceId, paymentId)` — remove + recalculate

### Balance Recalculation

After every payment create/delete:

```typescript
async function recalculateInvoice(invoiceId: string, tx: PrismaTransaction) {
  const payments = await tx.payment.findMany({ where: { invoiceId } });
  const paidCents = payments.reduce((sum, p) => sum + p.amountCents, 0);

  let status: InvoiceStatus;
  const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });

  if (invoice.status === "VOID" || invoice.status === "DRAFT") {
    status = invoice.status; // don't change
  } else if (paidCents >= invoice.totalCents) {
    status = "PAID";
  } else if (paidCents > 0) {
    status = "PARTIALLY_PAID";
  } else {
    status = "SENT";
  }

  await tx.invoice.update({
    where: { id: invoiceId },
    data: { paidCents, status },
  });
}
```

## Route Layer

### routes/invoices.ts

Middleware stack: `authenticate` -> `requireRole('CLINICIAN','ADMIN')` -> `requirePracticeCtx`

All invoice and payment endpoints mounted here.

### routes/billing.ts

Same middleware stack. Single endpoint: `GET /api/billing/summary`.

### Auto-invoice route

`POST /api/appointments/:id/invoice` is mounted on the invoices router, not appointments, to keep appointment routes clean.

## Zod Schemas

### packages/shared/src/schemas/billing.ts

```typescript
// Enums
InvoiceStatusEnum = z.enum(["DRAFT","SENT","PAID","PARTIALLY_PAID","OVERDUE","VOID"])
PaymentMethodEnum = z.enum(["CASH","CHECK","CREDIT_CARD","INSURANCE","OTHER"])

// Create
CreateInvoiceLineItemSchema = z.object({
  appointmentId: z.string().optional(),
  serviceCodeId: z.string(),
  description: z.string().max(200).optional(),
  unitPriceCents: z.number().int().min(0).optional(),
  quantity: z.number().int().min(1).default(1),
})

CreateInvoiceSchema = z.object({
  participantId: z.string(),
  lineItems: z.array(CreateInvoiceLineItemSchema).min(1),
  notes: z.string().max(2000).optional(),
  taxCents: z.number().int().min(0).default(0),
})

// Update (DRAFT only)
UpdateInvoiceSchema = z.object({
  notes: z.string().max(2000).optional(),
  taxCents: z.number().int().min(0).optional(),
  lineItems: z.array(CreateInvoiceLineItemSchema).min(1).optional(),
})

// Payment
CreatePaymentSchema = z.object({
  amountCents: z.number().int().min(1),
  method: PaymentMethodEnum,
  reference: z.string().max(200).optional(),
  receivedAt: z.string().datetime().optional(),
})

// Query
ListInvoicesQuerySchema = z.object({
  status: z.string().optional(),
  participantId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})
```

## Web UI Architecture

### New pages

- `/billing` — invoice list + summary cards
- `/billing/[invoiceId]` — invoice detail

### New hooks

- `use-invoices.ts` — CRUD hooks for invoices
- `use-payments.ts` — payment CRUD hooks
- `use-billing-summary.ts` — summary data hook

### Sidebar change

Add "Billing" with DollarSign icon to `billingNavItems` in dashboard layout.

## Security Invariants

1. Every query filters by `practiceId` from `res.locals.practiceCtx`
2. Non-owner clinicians see only their own invoices (`clinicianId` filter)
3. Audit middleware captures all mutations automatically
4. Invoice notes never appear in logs or audit metadata
5. All amounts are integers — no floating-point arithmetic
6. Invoice number generation is atomic within a transaction
