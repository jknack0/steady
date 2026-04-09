# Stripe Private Pay (Phase 1) — UX Design

## User Flows

### Flow 1: Send Invoice with Payment Link

**Entry point:** Billing page → invoice detail → "Send" button
**Success state:** Invoice status changes to SENT, client receives email with "Pay Online" link, PaymentLinkBadge appears

**Steps:**
1. Clinician navigates to an invoice in DRAFT status and clicks "Send Invoice"
2. Button text changes to "Sending..." with spinner, button disabled
3. System creates a Stripe Checkout session for the invoice amount
4. System sends email to client with invoice details and "Pay Online" button
5. Invoice status updates to SENT
6. PaymentLinkBadge appears: link icon + "Payment link sent"
7. Toast: "Invoice sent with payment link"

**Error paths:**
- Practice has no Stripe → invoice sends as plain email. Toast: "Invoice sent (online payment not configured)"
- Stripe unavailable → invoice sends without payment link. Toast: "Invoice sent without payment link — Stripe is temporarily unavailable"

### Flow 2: Client Pays Online

**Entry point:** Client clicks "Pay Online" in invoice email
**Success state:** Payment processed, invoice auto-updates to PAID

**Steps:**
1. Client clicks "Pay Online" in email
2. Stripe Checkout page opens (branded with Steady theme)
3. Checkout shows: practice name, amount, line items ("Professional services")
4. Client enters card, optionally checks "Save card for future payments"
5. Client clicks "Pay" → success page: "Payment received — thank you"
6. Webhook fires → Payment record created → invoice status updates

**Error paths:**
- Client closes without paying → invoice stays SENT
- Card declined → Stripe shows inline error, client retries
- Link expired (>24h) → "This payment link has expired. Please contact your provider for a new link."
- Invoice already paid → "This invoice has already been paid."

### Flow 3: Charge Card on File

**Entry point:** Invoice detail → "Charge Card on File" button
**Success state:** Card charged, Payment created, invoice updated

**Steps:**
1. Clinician views SENT/OVERDUE invoice for client with saved card
2. Clicks "Charge Card on File"
3. ChargeCardDialog opens: amount, card brand + last 4, "Confirm Charge" / "Cancel"
4. Clinician clicks "Confirm Charge" → spinner: "Processing..."
5. Success → dialog closes, toast: "Payment of $X.XX processed"

**Error paths:**
- Declined → dialog shows: "Payment failed: Card declined. Try a different card or send a payment link."
- Expired card → "Payment failed: Card expired. Send a payment link so the client can pay with a different card."
- Network error → "Unable to process payment — please try again later." with Retry button

### Flow 4: View Saved Cards

**Entry point:** Participant detail page → "Payment Methods" section
**Success state:** Card list with brand, last4, expiry, remove action

**Steps:**
1. Clinician navigates to participant detail page
2. "Payment Methods" section shows saved cards: brand icon, last 4, expiry, "Remove" button
3. If no cards: "No cards on file. Cards are saved when clients pay an invoice online."

**Remove card:**
1. Click "Remove" → confirmation: "Remove this card? The client will need to re-enter it on their next payment."
2. Confirm → card removed, toast: "Card removed"

### Flow 5: Auto Balance-Due Invoice

**Entry point:** System-triggered after insurance partial payment
**Success state:** Draft invoice created with remaining balance

**Steps:**
1. Insurance payment recorded → invoice moves to PARTIALLY_PAID
2. System creates draft invoice for remaining balance
3. Line item: "Patient responsibility — balance after insurance"
4. Draft appears in billing dashboard with amber "Balance due" tag
5. Clinician reviews → clicks "Send" → normal Flow 1 with payment link

### Flow 6: Practice Stripe Connection Status

**Entry point:** Practice Settings page
**Success state:** Connection status displayed

**Steps:**
1. Navigate to Practice Settings
2. "Online Payments" section shows:
   - Connected: green dot + "Online Payments: Connected" + masked account ID
   - Not connected: gray dot + "Online Payments: Not connected" + "Contact Steady support to enable online payments"

## Component Specifications

### ChargeCardDialog

| State | Appearance | Behavior |
|-------|-----------|----------|
| Open (single card) | Modal: amount, card row (brand + last4 + exp), "Confirm Charge" + "Cancel" | Focus on Confirm |
| Open (multiple cards) | Same with card dropdown, default pre-selected | Can switch cards |
| Processing | Spinner on "Confirm Charge", Cancel hidden, disabled | Cannot close |
| Success | Auto-closes | Toast appears |
| Error (declined) | Red alert: "Payment failed: [reason]..." + "Close" | Can close |
| Error (network) | Amber alert: "Unable to process..." + "Retry" + "Close" | Retry re-attempts |
| Conflict (paid) | Blue info: "This invoice has already been paid." + "Close" | Informational |

### SavedCardsSection

| State | Appearance | Behavior |
|-------|-----------|----------|
| Loading | Skeleton rows with aria-busy | |
| Has cards | Card rows: brand icon + "Visa ••••4242" + Exp MM/YY + "Remove" | Click Remove → popover |
| No cards | Muted: "No cards on file. Cards are saved when clients pay an invoice online." | No actions |
| Stripe not configured | Section not rendered | Hidden entirely |
| Remove confirmation | Popover: "Remove this card?" + "Remove" destructive + "Keep" link | Confirm removes |
| Error loading | "Unable to load payment methods" + "Retry" link | |

### PaymentLinkBadge

| State | Appearance | Behavior |
|-------|-----------|----------|
| Link active | Teal pill: link icon + "Payment link sent" | Tooltip: "Sent [time]. Expires [time]." |
| Link expired | Gray pill: link icon + "Link expired" | Tooltip: "Expired [time]. Resend to generate a new link." |
| Paid online | Green pill: check icon + "Paid online" | Tooltip: "Paid [time] via Stripe" |
| No link | Not rendered | |

### StripeStatusBadge

| State | Appearance | Behavior |
|-------|-----------|----------|
| Connected | Green dot + "Online Payments: Connected", muted "acct_••••4abc" | Static |
| Not connected | Gray dot + "Online Payments: Not connected", muted helper text | Static |
| Loading | Skeleton bar, aria-busy | |
| Error | Amber: "Unable to check connection status" + "Retry" | |

### BalanceDueIndicator

| State | Appearance | Behavior |
|-------|-----------|----------|
| Balance-due draft | Amber pill: info icon + "Balance due" | Tooltip: "Auto-generated from invoice #[num] after insurance payment" |
| Balance-due sent | Same amber pill alongside SENT badge | Same tooltip |
| Not balance-due | Not rendered | |

### InvoiceSendButton

| State | Appearance | Behavior |
|-------|-----------|----------|
| Ready (Stripe) | Primary: "Send Invoice" | Creates Checkout + sends email |
| Ready (no Stripe) | Primary: "Send Invoice" | Sends plain email |
| Sending | Disabled, spinner, "Sending..." | Non-interruptible |
| Resend mode | Outline: "Resend Payment Link" with link icon | Fresh Checkout + email |
| PAID/VOID | Not rendered | Hidden |

## Content & Copy

| Element | Copy | Notes |
|---------|------|-------|
| Send button (draft) | "Send Invoice" | Primary button |
| Send sending state | "Sending..." | With spinner |
| Send success (Stripe) | "Invoice sent with payment link" | Toast, 5s |
| Send success (no Stripe) | "Invoice sent (online payment not configured)" | Toast, 5s |
| Resend button | "Resend Payment Link" | Outline + link icon |
| Resend success | "Payment link resent" | Toast, 5s |
| Payment link badge (active) | "Payment link sent" | Teal pill |
| Payment link badge (expired) | "Link expired" | Gray pill |
| Payment link badge (paid) | "Paid online" | Green pill |
| Charge card button | "Charge Card on File" | Secondary button |
| Charge dialog title | "Charge Card on File" | Modal heading |
| Charge confirm | "Confirm Charge" | Primary in dialog |
| Charge cancel | "Cancel" | Ghost in dialog |
| Charge processing | "Processing..." | Spinner text |
| Charge success | "Payment of $X.XX processed" | Toast, 5s |
| Charge declined | "Payment failed: Card declined. Try a different card or send a payment link." | Red alert |
| Charge expired | "Payment failed: Card expired. Send a payment link so the client can pay with a different card." | Red alert |
| Charge network error | "Unable to process payment — please try again later." | Amber alert |
| Charge conflict | "This invoice has already been paid." | Blue info |
| Saved cards heading | "Payment Methods" | Section heading |
| Saved cards empty | "No cards on file. Cards are saved when clients pay an invoice online." | Muted text |
| Remove card button | "Remove" | Text button |
| Remove card confirm | "Remove this card? The client will need to re-enter it on their next payment." | Popover |
| Remove card success | "Card removed" | Toast, 5s |
| Balance-due indicator | "Balance due" | Amber pill |
| Balance-due tooltip | "Auto-generated from invoice #[number] after insurance payment" | Hover |
| Balance-due line item | "Patient responsibility — balance after insurance" | Generic |
| Checkout line item | "Professional services — [date]" | HIPAA-safe |
| Checkout success | "Payment received — thank you" | Stripe page |
| Checkout expired | "This payment link has expired. Please contact your provider for a new link." | Stripe page |
| Checkout already paid | "This invoice has already been paid. No further action is needed." | Stripe page |
| Stripe connected | "Online Payments: Connected" | Green dot |
| Stripe not connected | "Online Payments: Not connected" | Gray dot |
| Stripe not connected help | "Contact Steady support to enable online payments for your practice." | Muted |
| Save card checkbox | "Save card for future payments" | Stripe Checkout |

## Accessibility Notes

- **Keyboard:** ChargeCardDialog fully navigable. Tab: card selector → Confirm → Cancel. Escape closes.
- **Screen reader:** All badges have aria-labels. PaymentLinkBadge: "Payment link sent, expires [date]". BalanceDueIndicator: "Auto-generated balance-due invoice from invoice number [num]".
- **Focus management:** Dialog open → focus to Confirm. Dialog close → focus to trigger button. Card removed → focus to next card's Remove or section heading.
- **Color contrast:** All badge colors meet WCAG AA. Error states use text + icon, not color alone.
- **Error announcements:** Dialog errors use role="alert". Toasts use role="status" with aria-live="polite".
- **Loading states:** Spinners retain aria-label. Skeletons have aria-busy="true".
- **Tooltips:** Accessible via keyboard focus, linked via aria-describedby.

## Sidebar Navigation

No new nav items. All features integrate into existing views:
- **Billing** — payment links, balance-due indicators, charge card
- **Clients** — saved cards section on participant detail
- **Practice** — Stripe connection status in settings
