# Stripe Private Pay (Phase 1) — Feature Specification

## Overview

Clinicians using Steady waste time chasing private-pay clients for payment and manually recording transactions. By integrating Stripe Connect with hosted Checkout Sessions, Steady enables clinicians to send invoices with embedded "Pay Online" links and charge saved cards — automating payment collection and recording. Steady operates as a Stripe Connect platform; each practice is provisioned as a connected account by the Steady admin.

## Functional Requirements

### FR-1: Practice Stripe Connect Provisioning

Steady admin provisions a Stripe connected account for a practice. The practice does not self-onboard — Steady creates the connected account via the Stripe API and associates it with the Practice model.

**Acceptance Criteria:**
- GIVEN a Steady admin
  WHEN they provision a practice for Stripe payments
  THEN a Stripe connected account is created and linked to the Practice record

- GIVEN a practice with no Stripe connected account
  WHEN a clinician tries to send an invoice with a payment link
  THEN the payment link is omitted and the invoice sends as a plain invoice

- GIVEN a practice with a connected account
  WHEN the clinician views Practice Settings
  THEN they see "Online Payments: Connected" status with the connected account identifier

### FR-2: Invoice Payment Links

Every invoice sent to a client includes an online payment link. The link opens a branded Stripe Checkout session for the invoice amount. Payment is processed through the practice's connected account.

**Acceptance Criteria:**
- GIVEN a practice with Stripe connected and a SENT invoice
  WHEN the clinician clicks "Send Invoice"
  THEN the client receives an email from Steady with invoice details and a "Pay Online" link

- GIVEN a client with a payment link
  WHEN they click "Pay Online"
  THEN they see a Stripe Checkout page branded with Steady's theme showing the invoice amount, line items, and practice name

- GIVEN a client on the Stripe Checkout page
  WHEN they complete payment successfully
  THEN Stripe sends a webhook → Steady auto-creates a Payment record (method=CREDIT_CARD) → invoice status updates to PAID (or PARTIALLY_PAID if partial)

- GIVEN a client on the Stripe Checkout page
  WHEN they close the page without paying
  THEN the invoice remains in SENT status, no payment is recorded, and the clinician can resend the link

- GIVEN a payment link for an invoice that has already been paid
  WHEN the client clicks the link
  THEN they see a message that the invoice has already been paid

- GIVEN a practice WITHOUT Stripe connected
  WHEN the clinician sends an invoice
  THEN the email is sent without a payment link (existing behavior preserved)

### FR-3: Webhook Payment Reconciliation

Stripe webhooks automatically record payments and update invoice statuses. No manual recording needed for online payments.

**Acceptance Criteria:**
- GIVEN a successful Stripe Checkout payment
  WHEN the `checkout.session.completed` webhook fires
  THEN a Payment record is created with: amountCents from the session, method=CREDIT_CARD, reference=Stripe PaymentIntent ID, receivedAt=now

- GIVEN a Payment record created by webhook
  WHEN the payment amount equals the invoice total minus existing payments
  THEN the invoice status updates to PAID

- GIVEN a Payment record created by webhook
  WHEN the payment amount is less than the remaining balance
  THEN the invoice status updates to PARTIALLY_PAID

- GIVEN a duplicate webhook delivery (same PaymentIntent ID)
  WHEN Steady processes the webhook
  THEN no duplicate Payment record is created (idempotent on Stripe PaymentIntent ID)

- GIVEN a Stripe webhook with an invalid signature
  WHEN Steady receives the webhook
  THEN it returns 400 and does not process the event

### FR-4: Save Card During Payment

When a client pays an invoice via Stripe Checkout, they can opt to save their card for future payments. Saved cards are associated with the participant on the practice's connected account.

**Acceptance Criteria:**
- GIVEN a client on the Stripe Checkout page
  WHEN they check "Save card for future payments" and complete payment
  THEN the card is saved as a Stripe PaymentMethod on the practice's connected Stripe Customer, linked to the participant in Steady

- GIVEN a client who has previously saved a card
  WHEN the clinician views that client's detail page
  THEN they see a "Payment Methods" section showing the card brand and last 4 digits (e.g., "Visa ••••4242")

- GIVEN a client with a saved card
  WHEN the client pays another invoice via Checkout
  THEN the saved card is pre-selected in Checkout (Stripe handles this via the Customer)

- GIVEN a clinician viewing a client's saved cards
  WHEN they click "Remove" on a card
  THEN the PaymentMethod is detached from the Stripe Customer and removed from the UI

### FR-5: Charge Card on File

Clinicians can charge a client's saved card directly from an invoice, with confirmation before charging.

**Acceptance Criteria:**
- GIVEN an invoice in SENT or OVERDUE status for a client with a saved card
  WHEN the clinician clicks "Charge Card on File"
  THEN a confirmation dialog shows: invoice amount, card brand + last 4, and "Confirm Charge" / "Cancel" buttons

- GIVEN the confirmation dialog
  WHEN the clinician clicks "Confirm Charge"
  THEN a Stripe PaymentIntent is created on the practice's connected account, the card is charged, and a Payment record is auto-created

- GIVEN a successful card charge
  WHEN the PaymentIntent succeeds
  THEN the invoice status updates to PAID (or PARTIALLY_PAID), and a toast confirms "Payment of $X.XX processed"

- GIVEN a failed card charge
  WHEN the PaymentIntent fails (declined, insufficient funds, expired card)
  THEN the invoice status is unchanged, and the clinician sees an error: "Payment failed: [reason]. Try a different card or send a payment link."

- GIVEN an invoice that is already PAID or VOID
  WHEN the clinician views it
  THEN the "Charge Card on File" button is not shown

- GIVEN a client with no saved card
  WHEN the clinician views a SENT/OVERDUE invoice
  THEN "Charge Card on File" is not shown (only "Send Payment Link" is available)

### FR-6: Auto-Generate Balance-Due Invoice After Insurance Payment

When an insurance payment is recorded on an invoice and a balance remains, the system auto-generates a draft invoice for the client's portion.

**Acceptance Criteria:**
- GIVEN an invoice with total $140 and an insurance payment of $100 recorded
  WHEN the invoice moves to PARTIALLY_PAID
  THEN the system creates a new invoice in DRAFT status for $40, linked to the same appointment, with a line item description "Patient responsibility — balance after insurance"

- GIVEN an auto-generated balance-due invoice
  WHEN the clinician views their billing queue
  THEN they see the draft invoice flagged as "Balance after insurance" with a visual indicator

- GIVEN an auto-generated balance-due invoice
  WHEN the clinician reviews and clicks "Send"
  THEN it sends to the client with a payment link (per FR-2), like any other invoice

- GIVEN an insurance payment that covers the full invoice amount
  WHEN the invoice moves to PAID
  THEN no balance-due invoice is created

- GIVEN an invoice that already has a balance-due invoice generated
  WHEN another insurance payment is recorded (adjustment)
  THEN the existing draft balance-due invoice is updated with the new remaining amount (not duplicated)

### FR-7: Payment Status Visibility

Clinicians can see payment status and Stripe activity on invoices and the billing dashboard.

**Acceptance Criteria:**
- GIVEN an invoice with a pending payment link
  WHEN the clinician views the invoice detail
  THEN they see "Payment link sent" with the timestamp

- GIVEN an invoice paid via Stripe
  WHEN the clinician views the invoice detail
  THEN the Payment record shows method=CREDIT_CARD, the Stripe PaymentIntent ID as reference, and the payment timestamp

- GIVEN the billing dashboard
  WHEN the clinician views the invoice list
  THEN invoices with active payment links show a link icon indicator

## Non-Functional Requirements

### NFR-1: Performance
- Stripe Checkout session creation must complete within 3 seconds
- Webhook processing must complete within 5 seconds
- Card-on-file charges must return a result (success/failure) within 10 seconds

### NFR-2: Security & Compliance
- Steady never stores raw card numbers, CVVs, or full card details — all card data stays in Stripe (PCI SAQ-A)
- Stripe webhook signatures must be verified on every webhook request using the webhook signing secret
- Stripe API keys and webhook secrets must be stored encrypted (same AES-256-GCM pattern as Stedi keys)
- All payment-related actions must be audit-logged (payment created, card saved, card charged, card removed)
- Payment links must be unique per invoice and expire when the invoice is paid or voided

### NFR-3: Reliability
- Webhook processing must be idempotent (duplicate webhook deliveries must not create duplicate payments)
- Failed webhook processing must be retried via pg-boss queue (not lost)
- If Stripe is unreachable during "Charge Card on File", the clinician sees a clear error — no silent failures

## Scope

### In Scope
- Stripe Connect connected account provisioning (admin-initiated)
- Invoice payment links via Stripe Checkout (payment mode)
- Webhook-based automatic payment recording
- Save card during Checkout payment
- Charge saved card on file with confirmation
- Auto-generate balance-due invoice after insurance partial payment
- Payment status indicators on invoices and billing dashboard
- Card display (brand + last 4) and removal on client detail page

### Out of Scope
- Mobile app payments (Phase 2)
- Standalone "save card" flow without an invoice payment (future — during client onboarding)
- Subscription/recurring billing
- Platform fees (Steady takes no cut in v1)
- Refund processing (use Stripe dashboard directly)
- ACH / bank transfers (card only)
- Stripe Customer Portal
- Practice self-service Stripe onboarding (admin provisions for now)
- Email template customization (use a standard Steady template)

## Dependencies
- Stripe Connect platform account (Steady must register as a Stripe Connect platform)
- Stripe API (stripe npm package)
- Email sending capability (existing pg-boss queue for async email delivery)
- Existing Invoice/Payment/Practice models in Prisma

## Assumptions
- Steady will use Stripe Connect Express accounts (simpler onboarding, Steady manages the dashboard experience, practices don't need their own Stripe dashboard)
- One connected account per Practice (not per clinician)
- Payment processing fees are paid by the practice (standard Stripe pricing, passed through — Steady doesn't mark up)
- Stripe test mode will be used in development; Steady admin switches to live mode per-practice
- Client email addresses are available on the ParticipantProfile (or User model) for sending invoice emails

## Glossary
- **Connected Account:** A Stripe account created under Steady's platform, representing a practice
- **Checkout Session:** A Stripe-hosted payment page created per-invoice for collecting payment
- **PaymentIntent:** A Stripe object representing a charge attempt (used for card-on-file charges)
- **SetupIntent:** A Stripe object for collecting card details without charging (handled within Checkout via payment_method_options)
- **PaymentMethod:** A saved card stored on a Stripe Customer object
- **Webhook:** An HTTP callback from Stripe notifying Steady of payment events
