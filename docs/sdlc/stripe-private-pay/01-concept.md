# Stripe Private Pay (Phase 1) — Concept

## Problem Statement

Mental health clinicians using Steady spend unnecessary time chasing payments and manually recording them. Clients want a convenient way to pay online. Delays in payment collection hurt practice cash flow. By integrating Stripe Checkout Sessions via Stripe Connect, Steady enables clinicians to send payable invoice links and charge saved cards — eliminating manual payment recording for private-pay clients.

## Recommended Approach

**Stripe Connect + Checkout Sessions (Hosted).** Steady operates as a Stripe Connect platform. Each practice onboards as a connected account. Use Stripe's hosted Checkout in `payment` mode for invoice payment links (client clicks link, pays on Stripe's page, webhook records payment automatically). Use Checkout in `setup` mode for saving cards on file. Clinicians can then charge saved cards via PaymentIntents from the Steady dashboard. Webhooks sync all payment events back to the existing Invoice/Payment models.

### Key Decisions

- **Stripe Connect platform model** — Steady is the platform, each practice is a connected account (Standard or Express). Payments flow to the practice's connected account. Supports optional platform fees in the future.
- **Emails from Steady** — Invoice emails sent by Steady with payment link embedded. Stripe sends post-payment receipts automatically.
- **Branded Checkout** — Stripe Checkout customized with practice logo/colors via Steady's theme so the payment page feels like Steady, not generic Stripe.

## Key Scenarios

1. **Invoice payment link:** Clinician sends invoice → client receives email from Steady with "Pay Now" link → client pays on branded Stripe Checkout → webhook fires → Steady auto-records payment, updates invoice status to PAID
2. **Card on file:** Clinician saves client's card via Setup Checkout → card saved as Stripe PaymentMethod on the practice's connected account → clinician clicks "Charge Card" on a future invoice → PaymentIntent created → auto-recorded as paid
3. **Partial payment / failure:** Client's card declines or Stripe Checkout expires → invoice stays in current status → clinician sees "Payment failed" and can resend the link or try a different card

## Out of Scope

- Mobile app payments (Phase 2 — separate feature cycle)
- Subscription/recurring billing (clinicians bill per-session today)
- Platform fees on payments (Stripe Connect supports this but Steady won't charge practices in v1)
- Refund processing (handle manually in Stripe dashboard for now)
- ACH / bank transfer payments (card only for v1)

## Open Questions

- Standard vs Express connected accounts? (Standard gives practices their own Stripe dashboard; Express is simpler but less control for the practice)
- Should card-on-file require explicit client consent captured in the UI? (likely yes for compliance)

## Alternatives Considered

### Approach B: Stripe Payment Links (No-Code)
- **How:** Use Stripe's no-code Payment Links for invoice payments, Stripe Customer Portal for card management.
- **Why not:** Too rigid for dynamic invoice amounts. Poor mapping to per-invoice billing. No card-on-file-then-charge flow. Very little customization.

### Approach C: Stripe Elements (Embedded)
- **How:** Embed Stripe Elements (card input) directly in Steady's web UI with PaymentIntents and SetupIntents.
- **Why not:** More frontend work, higher PCI surface (SAQ-A vs SAQ-A-EP). Not needed for Phase 1. Good candidate for Phase 2 mobile integration where embedded payment sheets are standard.
