# Wire Up Orphaned Stripe Billing Components

**Feature**: Connect five fully-built billing components to their target pages.
**Date**: 2026-04-07
**Branch**: dev

---

## 1. Ideation

### Problem Statement
Five Stripe billing components and their associated hooks are fully implemented in
`apps/web/src/components/billing/` but are not imported or rendered on any page. The
API routes (`packages/api/src/routes/stripe-payments.ts`) and Prisma models (Invoice
has `paymentLinkUrl`, `paymentLinkExpiresAt`, `balanceDueSourceInvoiceId`; SavedPaymentMethod
model exists) are also complete. This is a pure wiring task -- no new business logic
is needed.

### Components to Wire
| Component | Purpose | Target Page(s) |
|-----------|---------|----------------|
| `ChargeCardDialog` | Charge a saved Stripe card on file for an invoice | Invoice detail |
| `SavedCardsSection` | Display/manage saved payment methods for a client | Participant detail |
| `PaymentLinkBadge` | Show payment link status (sent/expired/paid) | Invoice detail, billing list |
| `BalanceDueIndicator` | Show auto-generated balance-due origin badge | Invoice detail, billing list |
| `StripeStatusBadge` | Show Stripe connection status | Settings page (Integrations), billing hub |

### Non-Goals
- No new API routes or Prisma migrations.
- No changes to mobile app.
- No changes to the billing components themselves (they are already complete).

---

## 2. Product Owner Spec

### Acceptance Criteria

**AC-1: Invoice Detail Page** (`/billing/[invoiceId]`)
- PaymentLinkBadge renders next to the invoice status badge in the header when
  `paymentLinkUrl` is present.
- BalanceDueIndicator renders next to the status badge when `balanceDueSourceInvoiceId`
  is present (this is an auto-generated balance-due invoice after insurance payment).
- A "Charge Card" button appears in the Actions bar when (a) the invoice is payable
  (status SENT/PARTIALLY_PAID/OVERDUE), (b) the client has saved cards, and (c) Stripe
  is connected. Clicking opens ChargeCardDialog.

**AC-2: Billing List Page** (`/billing`)
- PaymentLinkBadge renders inline in the Status column when `paymentLinkUrl` is present.
- BalanceDueIndicator renders inline in the Status column when `balanceDueSourceInvoiceId`
  is present.

**AC-3: Participant Detail Page** (`/participants/[id]`)
- SavedCardsSection renders at the bottom of the Insurance tab, showing saved payment
  methods for that client. It self-gates on Stripe connection status (already built in).

**AC-4: Settings Page** (`/settings`)
- StripeStatusBadge renders in the Integrations card below the Stedi section, showing
  the practice's Stripe connection status.

**AC-5: Billing Hub Page** (`/billing`)
- StripeStatusBadge renders in the header area next to the "New Invoice" button, giving
  clinicians at-a-glance confirmation that Stripe is connected.

### User Triggers
- PaymentLinkBadge: Automatic -- shown whenever the invoice has a payment link URL.
- BalanceDueIndicator: Automatic -- shown whenever the invoice was auto-generated from
  a parent invoice after insurance payment.
- ChargeCardDialog: Clinician clicks "Charge Card" button on invoice detail page.
- SavedCardsSection: Clinician navigates to Insurance tab on participant detail page.
- StripeStatusBadge: Automatic -- shown on Settings and Billing hub pages.

---

## 3. Compliance (HIPAA / PCI)

### PCI DSS Considerations
- **No raw card data flows through Steady**. All card numbers are tokenized by Stripe.
  The `SavedPaymentMethod` model only stores: brand, last four digits, expiry month/year.
  These are non-sensitive display values per PCI DSS SAQ-A.
- **ChargeCardDialog** sends only `invoiceId` + `savedPaymentMethodId` (both opaque CUIDs)
  to the API. The API calls Stripe server-side via the Stripe SDK. No card numbers transit
  the Steady API.
- **SavedCardsSection** only displays masked card info (brand + last 4). Deletion calls
  Stripe's detach API server-side.
- **No logging of card data**. The existing logger PII-stripping in `packages/api/src/lib/logger.ts`
  already ensures no card data leaks into logs.

### HIPAA Considerations
- PaymentLinkBadge/BalanceDueIndicator display financial status, not PHI. Invoice data
  is already behind authentication + ownership checks.
- SavedCardsSection fetches cards via `/api/stripe/customers/:participantId/cards` which
  already has an ownership check (ClinicianClient lookup) -- see line 83 of stripe-payments.ts.
- StripeStatusBadge shows only connection status (boolean + masked account ID). No PHI.

### Verdict: PASS -- no new PCI or HIPAA risks introduced.

---

## 4. Architecture

### Data Flow (no changes needed)

```
Invoice model (Prisma)
  paymentLinkUrl         -> PaymentLinkBadge
  paymentLinkExpiresAt   -> PaymentLinkBadge
  balanceDueSourceInvoiceId -> BalanceDueIndicator
  status                 -> ChargeCardDialog (gate: SENT/PARTIALLY_PAID/OVERDUE)
  participantId          -> useSavedCards(participantId) -> ChargeCardDialog

GET /api/stripe/connection-status -> useStripeConnectionStatus() -> StripeStatusBadge
GET /api/stripe/customers/:id/cards -> useSavedCards() -> SavedCardsSection, ChargeCardDialog
POST /api/stripe/payments/charge -> useChargeCard() -> ChargeCardDialog
```

### Conditional Rendering Logic

| Component | Render when |
|-----------|-------------|
| PaymentLinkBadge | `invoice.paymentLinkUrl` is truthy |
| BalanceDueIndicator | `invoice.balanceDueSourceInvoiceId` is truthy |
| ChargeCardDialog trigger | `canPay && stripeConnected && savedCards.length > 0` |
| SavedCardsSection | Always rendered (self-gates on Stripe status internally) |
| StripeStatusBadge | Always rendered (self-handles loading/error states internally) |

### Data Already Available
- Invoice detail: `useInvoice(id)` already returns all Invoice scalar fields including
  `paymentLinkUrl`, `paymentLinkExpiresAt`, `balanceDueSourceInvoiceId` (Prisma includes
  all scalar fields by default).
- Invoice list: `listInvoices` also returns all scalar fields from the Invoice model.
- Participant detail: `participantProfileId` is available as `data.participantProfileId`.

---

## 5. UX Design

### Invoice Detail Page Layout
```
[Back to Billing]

Invoice #INV-001                         [SENT] [Payment link sent] [Balance due]
Client: Jane Doe
Issued: 04/07/2026 | Due: 05/07/2026

[Line Items table]
[Payments table]

[Download PDF] [Charge Card] [Send Invoice] [Void] [Delete]
```
- PaymentLinkBadge and BalanceDueIndicator appear as inline badges next to the status badge.
- "Charge Card" button appears in the Actions bar with a CreditCard icon.

### Billing List Page Layout
```
Status column cell:
  [Sent] [Payment link sent]     -- or --     [Partial] [Balance due]
```
- Badges appear inline after the status pill, same row.

### Participant Detail Page (Insurance Tab)
```
[Insurance info card]
[Eligibility check]

--- separator ---

Payment Methods (h3)
  visa ....4242  Exp 12/28  [trash icon]
  No cards on file. Cards are saved when clients pay an invoice online.
```
- SavedCardsSection renders at the bottom of the InsuranceTab component.

### Settings Page (Integrations Card)
```
Integrations
  Connect external services for insurance billing and claims.

  Stedi (Insurance / EDI)
  [status indicator]
  [API key input + save]
  [Test Connection]

  --- separator ---

  Online Payments (Stripe)
  [StripeStatusBadge component]
```

### Billing Hub Header
```
Billing                          [StripeStatusBadge] [New Invoice]
```
- StripeStatusBadge renders inline in the header row, left of the New Invoice button.

---

## 6. Engineering Plan

This is purely a wiring task. No new components, hooks, API routes, or Prisma changes.

### 6.1 Invoice Detail Page (`apps/web/src/app/(dashboard)/billing/[invoiceId]/page.tsx`)

**Imports to add:**
```typescript
import { PaymentLinkBadge } from "@/components/billing/PaymentLinkBadge";
import { BalanceDueIndicator } from "@/components/billing/BalanceDueIndicator";
import { ChargeCardDialog } from "@/components/billing/ChargeCardDialog";
import { useStripeConnectionStatus } from "@/hooks/use-stripe-payments";
import { useSavedCards } from "@/hooks/use-saved-cards";
import { CreditCard } from "lucide-react"; // already imported set includes this
```

**State to add:**
```typescript
const [chargeDialogOpen, setChargeDialogOpen] = useState(false);
const { data: stripeStatus } = useStripeConnectionStatus();
const { data: savedCardsData } = useSavedCards(invoice?.participantId);
const savedCards = (savedCardsData ?? []) as SavedCard[];
const stripeConnected = !!stripeStatus?.connected;
```

**Placement 1** -- badges next to status in the header div.
**Placement 2** -- "Charge Card" button in the Actions div.
**Placement 3** -- ChargeCardDialog component at the end.

### 6.2 Billing List Page (`apps/web/src/app/(dashboard)/billing/page.tsx`)

**Imports to add:**
```typescript
import { PaymentLinkBadge } from "@/components/billing/PaymentLinkBadge";
import { BalanceDueIndicator } from "@/components/billing/BalanceDueIndicator";
import { StripeStatusBadge } from "@/components/billing/StripeStatusBadge";
```

**Placement 1** -- StripeStatusBadge in the header row.
**Placement 2** -- PaymentLinkBadge + BalanceDueIndicator inline in each invoice row's
Status cell.

### 6.3 Participant Detail Page (`apps/web/src/app/(dashboard)/participants/[id]/page.tsx`)

**Import to add:**
```typescript
import { SavedCardsSection } from "@/components/billing/SavedCardsSection";
```

**Placement** -- at the bottom of the `InsuranceTab` component, after all existing content.

### 6.4 Settings Page (`apps/web/src/app/(dashboard)/settings/page.tsx`)

**Import to add:**
```typescript
import { StripeStatusBadge } from "@/components/billing/StripeStatusBadge";
```

**Placement** -- inside the Integrations card (`CardContent`), after the Stedi section
and test connection block, separated by a divider.

---

## 7. QA / Test Plan

### Manual Testing Checklist

- [ ] **Invoice detail -- PaymentLinkBadge**: Create invoice, send it (generates payment link).
      Verify "Payment link sent" badge appears. Let link expire and verify "Link expired" badge.
      Mark invoice as paid and verify "Paid online" badge.
- [ ] **Invoice detail -- BalanceDueIndicator**: Create a balance-due invoice (via insurance
      partial payment flow). Verify "Balance due" badge appears with tooltip referencing source invoice.
- [ ] **Invoice detail -- ChargeCardDialog**: With Stripe connected and a client who has saved
      cards, verify "Charge Card" button appears. Click it, select a card, confirm charge.
      Verify dialog shows loading state, then closes on success. Verify invoice status updates.
- [ ] **Invoice detail -- ChargeCardDialog hidden**: With no saved cards or Stripe not connected,
      verify "Charge Card" button does not appear.
- [ ] **Billing list -- badges**: Verify PaymentLinkBadge and BalanceDueIndicator render inline
      in the Status column for applicable invoices.
- [ ] **Billing hub -- StripeStatusBadge**: Verify connection status shows in header.
- [ ] **Participant detail -- SavedCardsSection**: Navigate to Insurance tab. With Stripe
      connected, verify Payment Methods section appears. With cards on file, verify they display
      with masked numbers. Verify remove flow (confirm -> delete). With no cards, verify
      placeholder text.
- [ ] **Participant detail -- SavedCardsSection hidden**: With Stripe not connected, verify
      Payment Methods section does not render.
- [ ] **Settings -- StripeStatusBadge**: Verify badge shows "Connected" or "Not connected"
      in the Integrations card.

### Automated Tests (future)
- Component render tests for each billing component with mocked hook data.
- Integration test for ChargeCardDialog: mock useChargeCard, verify it sends correct
  invoiceId + savedPaymentMethodId.
- Snapshot/render tests for PaymentLinkBadge in all three states (sent, expired, paid).

### Regression Checks
- [ ] Invoice detail page loads without errors when no payment link exists.
- [ ] Billing list page loads without errors.
- [ ] Participant detail Insurance tab loads without errors when Stripe is not configured.
- [ ] Settings page loads without errors.
