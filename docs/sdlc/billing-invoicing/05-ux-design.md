# Billing & Invoicing — UX Design

## Overview

The billing UI lives at `/billing` in the dashboard sidebar under a "Billing" section alongside RTM. It provides a summary dashboard, invoice list, invoice detail view, and modals for creation and payment recording.

## Navigation

Sidebar addition to the "Billing" section:
- **Billing** (DollarSign icon) — `/billing`
- **RTM** (Activity icon) — `/rtm` (existing)

## Page: /billing (Invoice List + Summary)

### Layout

```
+------------------------------------------------------------------+
| Billing                                             [+ New Invoice]|
+------------------------------------------------------------------+
| Summary Cards (4 across)                                          |
| +---------------+ +---------------+ +---------------+ +---------+ |
| | Outstanding   | | Received      | | Overdue       | | Total   | |
| | $4,200.00     | | $12,800.00    | | 3 invoices    | | 47 inv  | |
| |    this month  | |  this month   | |               | |         | |
| +---------------+ +---------------+ +---------------+ +---------+ |
+------------------------------------------------------------------+
| Filters: [Status v] [Client v] [Date range]         [Clear]      |
+------------------------------------------------------------------+
| Invoice Table                                                     |
| +------+----------+------------+----------+--------+-----------+  |
| | #    | Client   | Date       | Total    | Paid   | Status    |  |
| +------+----------+------------+----------+--------+-----------+  |
| |INV-12| Jane Doe | 2026-04-01 | $140.00  | $0.00  | [SENT]   |  |
| |INV-11| John S.  | 2026-03-28 | $280.00  | $140.00| [PARTIAL]|  |
| |INV-10| Jane Doe | 2026-03-15 | $140.00  | $140.00| [PAID]   |  |
| +------+----------+------------+----------+--------+-----------+  |
| [Load more]                                                       |
+------------------------------------------------------------------+
```

### Summary Cards

| Card | Value | Color |
|------|-------|-------|
| Outstanding | Sum of balanceCents for SENT + PARTIALLY_PAID + OVERDUE | Default |
| Received This Month | Sum of payment amountCents this calendar month | Green accent |
| Overdue | Count of OVERDUE invoices | Red/amber accent |
| Total Invoices | Count of all non-VOID invoices | Default |

### Status Badges

| Status | Color | Text |
|--------|-------|------|
| DRAFT | Gray | Draft |
| SENT | Blue | Sent |
| PAID | Green | Paid |
| PARTIALLY_PAID | Amber | Partial |
| OVERDUE | Red | Overdue |
| VOID | Gray strikethrough | Void |

### Filters

- **Status**: Multi-select dropdown (DRAFT, SENT, PAID, PARTIALLY_PAID, OVERDUE, VOID)
- **Client**: Searchable dropdown of participants
- **Date range**: From/To date pickers

### Empty State

"No invoices yet. Create your first invoice to start tracking billing."
with [+ New Invoice] CTA button.

## Page: /billing/[invoiceId] (Invoice Detail)

### Layout

```
+------------------------------------------------------------------+
| <- Back to Billing                                                |
+------------------------------------------------------------------+
| INV-012                                    Status: [SENT badge]   |
| Client: Jane Doe                                                  |
| Issued: 2026-04-01          Due: 2026-05-01                      |
+------------------------------------------------------------------+
| Line Items                                                        |
| +-----+----------------------------------+-------+-------+------+|
| | Svc | Description                      | Price | Qty   |Total ||
| +-----+----------------------------------+-------+-------+------+|
| |90834| Psychotherapy, 45 min            |$140.00|   1   |$140  ||
| |90832| Psychotherapy, 30 min            |$100.00|   1   |$100  ||
| +-----+----------------------------------+-------+-------+------+|
|                                          Subtotal: $240.00       |
|                                               Tax: $0.00         |
|                                             Total: $240.00       |
|                                              Paid: $100.00       |
|                                           Balance: $140.00       |
+------------------------------------------------------------------+
| Notes                                                             |
| Follow-up billing for March sessions.                             |
+------------------------------------------------------------------+
| Payments                                                          |
| +------------+----------+--------+-----------+--------+          |
| | Date       | Amount   | Method | Reference | Action |          |
| +------------+----------+--------+-----------+--------+          |
| | 2026-04-05 | $100.00  | Check  | #1234     | [x]    |          |
| +------------+----------+--------+-----------+--------+          |
|                                      [+ Record Payment]          |
+------------------------------------------------------------------+
| Actions                                                           |
| [Send Invoice] [Record Payment] [Void] [Delete (draft only)]     |
+------------------------------------------------------------------+
```

### Action Buttons (conditional)

| Status | Available Actions |
|--------|-------------------|
| DRAFT | Send, Edit, Delete |
| SENT | Record Payment, Void |
| PARTIALLY_PAID | Record Payment, Void |
| PAID | Void |
| OVERDUE | Record Payment, Void |
| VOID | None |

## Modal: Create Invoice

```
+------------------------------------------+
| Create Invoice                     [X]   |
+------------------------------------------+
| Client*  [Searchable dropdown       v]   |
+------------------------------------------+
| Line Items                               |
| Service Code*    Description    Price Qty |
| [90834 v]    [Psychotherapy] [$140] [1]  |
| [+ Add line item]                        |
+------------------------------------------+
| Tax (cents)  [0            ]             |
+------------------------------------------+
| Notes                                    |
| [textarea, 2000 char limit          ]   |
+------------------------------------------+
| [Cancel]              [Create as Draft]  |
+------------------------------------------+
```

### Behavior

- Client dropdown searches participants by name/email (reuses existing ClientSearchSelect pattern)
- Service code dropdown auto-fills description and unitPriceCents from ServiceCode defaults
- User can override description and price
- Quantity defaults to 1
- Line item total = unitPriceCents * quantity (displayed, computed on save)
- At least one line item required

## Modal: Record Payment

```
+------------------------------------------+
| Record Payment                     [X]   |
+------------------------------------------+
| Remaining balance: $140.00               |
+------------------------------------------+
| Amount*     [$140.00            ]        |
| Method*     [Credit Card         v]      |
| Reference   [Transaction #ABC    ]      |
| Date        [2026-04-05          ]      |
+------------------------------------------+
| [Cancel]              [Record Payment]   |
+------------------------------------------+
```

### Behavior

- Amount pre-filled with remaining balance (balanceCents)
- Method dropdown: Cash, Check, Credit Card, Insurance, Other
- Reference optional (check number, transaction ID)
- Date defaults to today
- On success: toast "Payment recorded", refresh invoice detail

## Appointment Card Integration

On the appointments/calendar page, for ATTENDED appointments:

```
+-- Appointment Card --+
| Jane Doe             |
| 90834 - 45min        |
| [ATTENDED badge]     |
| [Generate Invoice]   | <-- new button, only if no invoice exists
+----------------------+
```

- "Generate Invoice" button calls POST /api/appointments/:id/invoice
- On success: navigates to /billing/[newInvoiceId]
- Button hidden if an InvoiceLineItem already references this appointment

## Responsive Behavior

- Summary cards stack 2x2 on tablet, 1-column on mobile
- Invoice table becomes card layout on mobile
- Modals are full-screen on mobile viewports
- All interactions remain keyboard accessible

## Accessibility

- Status badges include text labels (not color-only)
- Money amounts use aria-label with full dollar values
- Tables use proper th/td semantics
- Modals trap focus and restore on close
- Action buttons have descriptive aria-labels
