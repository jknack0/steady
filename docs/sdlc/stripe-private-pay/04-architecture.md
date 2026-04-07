# Stripe Private Pay (Phase 1) — Technical Architecture

## Overview

This feature integrates Stripe Connect with Steady's existing billing system to enable online invoice payments, card-on-file charges, and automatic payment recording via webhooks. The architecture introduces three new database models (StripeCustomer, SavedPaymentMethod, CheckoutSession), extends the Practice, Invoice, and Payment models with Stripe-specific fields, adds a Stripe SDK client service layer, a webhook ingestion endpoint with raw body parsing, and pg-boss workers for async webhook event processing. Steady operates as a Stripe Connect platform; each practice is a connected account provisioned by the Steady admin. All card data stays in Stripe (PCI SAQ-A) — Steady only stores tokenized references and truncated display info.

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  Web Frontend (Next.js)                                             │
│  ┌──────────────┐ ┌───────────────┐ ┌─────────────┐ ┌────────────┐ │
│  │Invoice Detail│ │Charge Card    │ │Saved Cards  │ │Practice    │ │
│  │"Send" / "Pay"│ │on File Dialog │ │(Client Page)│ │Settings    │ │
│  └──────┬───────┘ └──────┬────────┘ └──────┬──────┘ └─────┬──────┘ │
└─────────┼────────────────┼─────────────────┼───────────────┼────────┘
          │                │                 │               │
          ▼                ▼                 ▼               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  API Server (Express)                                               │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  /api/stripe/webhooks  ← express.raw() — NO auth middleware  │   │
│  │  (registered BEFORE express.json())                          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────┐ ┌───────────────┐ ┌────────────┐ ┌────────────┐  │
│  │/api/invoices │ │/api/stripe/   │ │/api/stripe/│ │/api/admin/ │  │
│  │/:id/send     │ │payments       │ │customers   │ │stripe      │  │
│  │(extended)    │ │               │ │            │ │            │  │
│  └──────┬───────┘ └──────┬────────┘ └──────┬─────┘ └─────┬──────┘  │
│         │                │                 │              │         │
│         ▼                ▼                 ▼              ▼         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Services Layer                                              │   │
│  │  ┌────────────────┐ ┌────────────────┐ ┌──────────────────┐  │   │
│  │  │stripe-client   │ │stripe-checkout │ │stripe-payments   │  │   │
│  │  │(SDK wrapper,   │ │(session create,│ │(card-on-file     │  │   │
│  │  │ key decrypt)   │ │ link generate) │ │ charge, webhook  │  │   │
│  │  │                │ │                │ │ reconciliation)  │  │   │
│  │  └────────┬───────┘ └───────┬────────┘ └────────┬─────────┘  │   │
│  │           │                 │                   │             │   │
│  │  ┌────────────────┐ ┌────────────────┐ ┌──────────────────┐  │   │
│  │  │stripe-connect  │ │stripe-customers│ │balance-due       │  │   │
│  │  │(account        │ │(Customer +     │ │(auto-generate    │  │   │
│  │  │ provisioning)  │ │ PaymentMethod  │ │ balance invoice) │  │   │
│  │  │                │ │ management)    │ │                  │  │   │
│  │  └────────────────┘ └────────────────┘ └──────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  pg-boss Queue                                               │   │
│  │  ┌──────────────────────┐  ┌──────────────────────────────┐  │   │
│  │  │stripe-webhook-process│  │stripe-balance-due-check      │  │   │
│  │  │(retry: 3x, exp.)    │  │(triggered after ins. payment)│  │   │
│  │  └──────────────────────┘  └──────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌────────────┐  ┌────────────┐  ┌────────────────┐
       │ PostgreSQL │  │ Stripe API │  │ Stripe Webhooks│
       │ (encrypted │  │ (Connect)  │  │ (→ /api/stripe │
       │  fields)   │  │            │  │  /webhooks)    │
       └────────────┘  └────────────┘  └────────────────┘
```

## Data Model

### Practice Model (MODIFIED)

| Field | Type | Notes |
|-------|------|-------|
| stripeConnectedAccountId | String? | Stripe Connect account ID (e.g., acct_1234) |
| stripeApiKeyEncrypted | String? | **Encrypted at rest** (AES-256-GCM) |
| stripeApiKeyLastFour | String? | Last 4 chars for display |
| stripeWebhookSecretEncrypted | String? | **Encrypted at rest** (AES-256-GCM) |

### StripeCustomer (NEW)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | @id @default(cuid()) | |
| practiceId | String | | FK to Practice |
| participantId | String | | FK to ParticipantProfile |
| stripeCustomerId | String | | Stripe Customer ID |
| createdAt | DateTime | @default(now()) | |
| updatedAt | DateTime | @updatedAt | |

Indexes: @@unique([practiceId, participantId]), @@unique([practiceId, stripeCustomerId])

### SavedPaymentMethod (NEW)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | @id @default(cuid()) | |
| stripeCustomerId | String | | FK to StripeCustomer |
| stripePaymentMethodId | String | @unique | Stripe PM token |
| cardBrand | String | | e.g., "visa" |
| cardLastFour | String | | Last 4 digits |
| expiryMonth | Int | | |
| expiryYear | Int | | |
| isDefault | Boolean | @default(false) | |
| createdAt | DateTime | @default(now()) | |

### CheckoutSession (NEW)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | @id @default(cuid()) | |
| invoiceId | String | | FK to Invoice |
| stripeSessionId | String | @unique | Stripe session ID |
| stripePaymentIntentId | String? | | Set after payment |
| status | CheckoutSessionStatus | @default(OPEN) | OPEN/COMPLETED/EXPIRED |
| expiresAt | DateTime | | 24h from creation |
| createdAt | DateTime | @default(now()) | |

### CheckoutSessionStatus (NEW ENUM)

OPEN, COMPLETED, EXPIRED

### Invoice Model (MODIFIED)

| Field | Type | Notes |
|-------|------|-------|
| paymentLinkUrl | String? | Active Checkout session URL |
| paymentLinkExpiresAt | DateTime? | When link expires |
| balanceDueSourceInvoiceId | String? | Self-relation for balance-due invoices |

### Payment Model (MODIFIED)

| Field | Type | Notes |
|-------|------|-------|
| stripePaymentIntentId | String? | @unique — for webhook idempotency |

## Services

### stripe-client.ts
SDK wrapper. All Stripe API calls go through here. Handles key decryption and connected account scoping.

### stripe-connect.ts
Admin-only connected account provisioning. Creates Express accounts, stores encrypted keys.

### stripe-checkout.ts
Checkout session creation. Finds/creates StripeCustomer, creates session with generic descriptions (COND-2), stores CheckoutSession record, updates Invoice with payment link.

### stripe-payments.ts
Card-on-file charges via PaymentIntent. Webhook payment recording with idempotency on stripePaymentIntentId. Invoice status recalculation.

### stripe-customers.ts
Customer and PaymentMethod lifecycle. Create Stripe Customer with name+email only (COND-7). Save/list/remove cards.

### balance-due.ts
Auto-generates draft balance-due invoices after insurance partial payments. Updates existing drafts on adjustment. Triggered via pg-boss queue.

## Routes

### stripe-webhooks.ts (NEW — registered BEFORE express.json())
- POST /api/stripe/webhooks — raw body, signature verification, async queue

### stripe-payments.ts (NEW)
- POST /api/stripe/payments/checkout — create Checkout session
- POST /api/stripe/payments/charge — charge saved card
- GET /api/stripe/customers/:participantId/cards — list saved cards
- DELETE /api/stripe/customers/:participantId/cards/:cardId — remove card
- GET /api/stripe/connection-status — check Stripe connection

### invoices.ts (MODIFIED)
- POST /:id/send — extended to create Checkout session + include payment link
- POST /:id/resend-link — create fresh Checkout session

### app.ts Registration Order (Critical)

```
1. Stripe webhook route (express.raw, no auth) — BEFORE express.json()
2. express.json({ limit: "1mb" })
3. All other routes including stripe-payments (standard JSON + auth)
```

## Compliance Control Implementation

| Condition | Implementation |
|-----------|---------------|
| COND-1: BAA with Stripe | Deployment gate |
| COND-2: Minimize PHI | Generic descriptions in Checkout + emails |
| COND-3: Key encryption | AES-256-GCM via encryption middleware |
| COND-4: Raw body webhooks | express.raw() before express.json() |
| COND-5: No card data | SavedPaymentMethod stores only tokens + last4 |
| COND-6: Audit logging | Explicit audit calls in service layer |
| COND-7: Data minimization | Customer has name+email only, metadata has invoiceId only |
| COND-8: Access control | ClinicianClient ownership checks on all endpoints |

## File Structure

### New Files
```
packages/api/src/services/stripe-client.ts
packages/api/src/services/stripe-connect.ts
packages/api/src/services/stripe-checkout.ts
packages/api/src/services/stripe-payments.ts
packages/api/src/services/stripe-customers.ts
packages/api/src/services/balance-due.ts
packages/api/src/routes/stripe-webhooks.ts
packages/api/src/routes/stripe-payments.ts
packages/shared/src/schemas/stripe.ts
apps/web/src/hooks/use-stripe-payments.ts
apps/web/src/hooks/use-saved-cards.ts
apps/web/src/components/billing/ChargeCardDialog.tsx
apps/web/src/components/billing/SavedCardsSection.tsx
apps/web/src/components/billing/PaymentLinkBadge.tsx
apps/web/src/components/billing/StripeStatusBadge.tsx
```

### Modified Files
```
packages/db/prisma/schema.prisma
packages/db/src/encryption-middleware.ts
packages/api/src/app.ts
packages/api/src/services/queue.ts
packages/api/src/services/payments.ts
packages/api/src/routes/invoices.ts
packages/shared/src/schemas/index.ts
apps/web/src/app/(dashboard)/billing/page.tsx
apps/web/src/app/(dashboard)/participants/[id]/page.tsx
```
