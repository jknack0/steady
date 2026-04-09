# Stripe Private Pay — User Guide

## Overview

Steady integrates with [Stripe](https://stripe.com/) to let clients pay invoices online and allow clinicians to charge saved cards on file. This eliminates manual payment chasing and recording — payments are processed and recorded automatically.

**What's included (Phase 1):**
- Online invoice payment links (clients pay via Stripe Checkout)
- Save card during payment for future use
- Charge card on file from the billing dashboard
- Auto-generate balance-due invoices after insurance partial payment
- Automatic payment recording via webhooks

**What's not included (Phase 1):**
- Mobile app payments (Phase 2)
- Recurring/subscription billing
- Refund processing (use Stripe Dashboard directly)
- ACH / bank transfer (card payments only)

---

## How It Works

Steady uses **Stripe Connect** — Steady is the platform, and each practice is a connected account. This means:

- Payments go directly to the practice's bank account
- Steady never holds practice funds
- Each practice has its own Stripe account managed by Steady
- Stripe handles all card data — Steady never sees or stores card numbers (PCI SAQ-A compliant)

---

## Setup (Admin)

Setup is handled by the Steady admin team. Clinicians do not need to configure Stripe themselves.

### 1. Prerequisites

Before production deployment:
- **Business Associate Agreement (BAA)** with Stripe must be signed (HIPAA requirement)
- Practice must have a completed billing profile in Steady

### 2. Environment Variables

Add these to the API server environment:

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Steady's platform Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret for signature verification |

### 3. Provision a Practice

The admin provisions a Stripe connected account for a practice via the admin API:

```bash
# Create connected account for a practice
curl -X POST https://api.steady.app/api/admin/stripe/provision \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{ "practiceId": "practice-123" }'

# Save API keys for the connected account
curl -X PUT https://api.steady.app/api/admin/stripe/keys \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "practiceId": "practice-123",
    "apiKey": "sk_live_...",
    "webhookSecret": "whsec_..."
  }'
```

### 4. Configure Stripe Webhook Endpoint

In the Stripe Dashboard, create a webhook endpoint pointing to:

```
https://api.steady.app/api/stripe/webhooks
```

Subscribe to these events:
- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

### 5. Push Database Schema

If running a fresh deployment:

```bash
npm run db:generate
npm run db:push
```

This adds the `StripeCustomer`, `SavedPaymentMethod`, and `CheckoutSession` tables.

### 6. Install Stripe Package

```bash
npm install stripe
```

---

## Checking Connection Status (Clinicians)

Once the admin has provisioned your practice:

1. Go to **Practice Settings** (sidebar → Practice)
2. Look for the **Online Payments** section
3. You should see a green dot with "Online Payments: Connected"

If you see "Not connected", contact Steady support.

---

## Sending Invoices with Payment Links

When your practice has Stripe connected, every invoice you send automatically includes a "Pay Online" link.

### How to Send

1. Create an invoice from an appointment (Billing → create invoice)
2. Click **Send Invoice**
3. The system automatically:
   - Creates a Stripe Checkout session for the invoice amount
   - Sends the client an email with invoice details and a **Pay Online** button
   - Shows a teal "Payment link sent" badge on the invoice

### What the Client Sees

1. Client receives an email from Steady with their invoice
2. They click **Pay Online**
3. A Stripe Checkout page opens (branded with Steady's colors)
4. The page shows:
   - Practice name
   - Amount due
   - Line item: "Professional services" (generic for HIPAA compliance — no clinical terms)
5. Client enters their card and pays
6. Optional: Client checks **"Save card for future payments"**
7. Success page: "Payment received — thank you"

### What Happens Automatically

- Stripe sends a webhook to Steady
- A Payment record is created (method = CREDIT_CARD)
- The invoice status updates to **PAID**
- You see the payment in your billing dashboard — no manual recording needed

### If the Client Doesn't Pay

- Payment links expire after **24 hours**
- The invoice stays in SENT status
- Click **Resend Payment Link** to generate a fresh link and re-email the client

### If Stripe Is Not Connected

Invoices still send normally — the email just won't include a payment link. You can record payments manually as before.

---

## Charging a Card on File

If a client saved their card during a previous payment, you can charge it directly without sending a link.

### How to Charge

1. Go to the **Billing** page
2. Find the SENT or OVERDUE invoice
3. If the client has a saved card, you'll see a **Charge Card on File** button
4. Click it — a confirmation dialog appears showing:
   - Amount to charge
   - Card brand and last 4 digits (e.g., "Visa ••••4242")
   - Expiry date
5. Click **Confirm Charge**
6. Payment processes in ~3 seconds
7. Success: toast "Payment of $X.XX processed", invoice updates to PAID

### If the Charge Fails

The dialog stays open with an error message:

| Error | What to Do |
|-------|------------|
| "Card declined" | Ask client for a different card, or send a payment link instead |
| "Card expired" | Send a payment link so the client can pay with a new card |
| "Unable to process" | Try again later — Stripe may be temporarily unavailable |

The invoice is unchanged when a charge fails — no partial state.

### If the Client Has Multiple Cards

The dialog shows a dropdown to select which card to charge. The default card is pre-selected.

---

## Viewing Saved Cards

1. Go to a client's detail page (sidebar → **Clients** → select client)
2. Look for the **Payment Methods** section
3. You'll see each saved card: brand icon, last 4 digits, expiry date

### Removing a Card

1. Click the trash icon on the card row
2. Confirm: "Remove this card? The client will need to re-enter it on their next payment."
3. The card is detached from Stripe and removed from Steady

### When Are Cards Saved?

Cards are only saved when a client checks **"Save card for future payments"** during Checkout. There is no way to add a card manually in Phase 1 — the client must initiate saving during a payment.

---

## Balance-Due Invoices (After Insurance)

When insurance pays part of an invoice, Steady automatically creates a draft invoice for the remaining balance.

### How It Works

1. You record an insurance payment on an invoice (e.g., $100 of $140)
2. The invoice moves to **PARTIALLY_PAID**
3. Steady automatically creates a new **DRAFT** invoice for $40
4. The draft has a line item: "Patient responsibility — balance after insurance"
5. You see it in your billing dashboard with an amber **"Balance due"** tag

### What to Do

1. Review the draft invoice — adjust the amount if needed
2. Click **Send Invoice** — the client receives an email with a payment link
3. Normal payment flow from there (client pays online, or you charge their card)

### Important Details

- Balance-due invoices are always created as **DRAFT** — you review before sending
- If insurance makes an adjustment (e.g., additional payment), the draft amount updates automatically
- If insurance covers the full amount, no balance-due invoice is created
- The draft links back to the original invoice — you can see the relationship in the tooltip

---

## Payment Status Indicators

The billing dashboard shows payment status at a glance:

| Badge | Meaning |
|-------|---------|
| Teal "Payment link sent" | Invoice sent with active payment link |
| Gray "Link expired" | Payment link expired (>24h) — resend to create a new one |
| Green "Paid online" | Client paid via Stripe |
| Amber "Balance due" | Auto-generated draft for remaining balance after insurance |

---

## Data Security & Compliance

- **No card data in Steady** — all card numbers, CVVs, and expiration dates stay in Stripe. Steady only stores tokenized references (brand + last 4 digits). This keeps Steady at **PCI SAQ-A** (lightest compliance level).
- **Stripe API keys encrypted** — stored with AES-256-GCM encryption, same as Stedi keys. Only the last 4 characters are displayed.
- **Webhook signatures verified** — every webhook from Stripe is cryptographically verified to prevent forgery.
- **Generic service descriptions** — invoice emails and Stripe Checkout show "Professional services" instead of clinical terms like "ADHD therapy" (HIPAA compliance).
- **Audit logging** — all payment actions (charge, save card, remove card, webhook events) are audit-logged.
- **Ownership verification** — clinicians can only charge cards or view payment methods for their own clients.
- **BAA required** — Stripe must sign a Business Associate Agreement before production use.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Online Payments: Not connected" | Contact Steady support to provision Stripe for your practice |
| Invoice sent without payment link | Practice may not have Stripe connected, or Stripe was temporarily unavailable. Click "Resend Payment Link" to retry. |
| "Payment failed: Card declined" | Ask client for a different card or send a payment link |
| "Charge Card on File" button not showing | Client doesn't have a saved card. Send a payment link — they can save their card during payment. |
| Client says payment link expired | Click "Resend Payment Link" on the invoice to generate a fresh 24-hour link |
| Payment not showing up after client paid | Webhook may be delayed — wait a few minutes. If still missing, check that the webhook endpoint is correctly configured in Stripe. |
| Balance-due invoice has wrong amount | Edit the draft invoice before sending. If insurance makes another adjustment, the draft updates automatically. |
| Multiple balance-due drafts for same invoice | This shouldn't happen — the system updates the existing draft. If it does, void the duplicate. |

---

## API Endpoints (for developers)

### Payment Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stripe/payments/checkout` | POST | Create Checkout session for an invoice |
| `/api/stripe/payments/charge` | POST | Charge a saved card on file |
| `/api/stripe/customers/:participantId/cards` | GET | List saved cards for a client |
| `/api/stripe/customers/:participantId/cards/:cardId` | DELETE | Remove a saved card |
| `/api/stripe/connection-status` | GET | Check if practice has Stripe connected |

### Webhook Endpoint

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stripe/webhooks` | POST | Stripe webhook receiver (no auth — signature verified) |

### Admin Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/stripe/provision` | POST | Provision connected account for a practice |
| `/api/admin/stripe/keys` | PUT | Save API key + webhook secret for a practice |
| `/api/admin/stripe/status/:practiceId` | GET | Check connection status for a practice |

---

## Phase 2 Roadmap

Phase 2 will add **client portal payments** in the Expo mobile app:
- Clients can view and pay invoices from the app
- Expo payment sheet integration for native card input
- Push notification when a new invoice is available

Phase 2 is a separate feature cycle and will be planned independently.
