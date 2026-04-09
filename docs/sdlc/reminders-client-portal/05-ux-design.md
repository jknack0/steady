# Automated Appointment Reminders + Client Portal — UX Design

## Overview

This document specifies the user experience for both features across mobile (participant) and web (clinician) surfaces.

---

## Mobile UX (Participant)

### Screen 1: Appointments (Enhanced)

**Location**: Existing screen at `/appointments`

**Changes:**

1. **Reminder indicator**: For SCHEDULED appointments with pending reminders, show a small teal badge below the time: icon bell + "Reminder set". Muted color (#8A8A8A text, teal dot).

2. **Cancel button**: For SCHEDULED appointments, add a "Cancel Appointment" button at the bottom of each card. Style: outline button, red text (#D87D7D), no fill. On tap:
   - Show confirmation dialog: "Cancel this appointment?" with body "Your clinician will be notified."
   - Two buttons: "Keep Appointment" (secondary), "Cancel" (destructive red)
   - On confirm: call cancellation API, show success toast, refresh list
   - On error: show error toast

3. **Canceled state**: CLIENT_CANCELED appointments show a gray badge with strikethrough time text and "Canceled by you" label.

### Screen 2: Invoices List

**Location**: New screen at `/invoices`, accessible from:
- Today screen "Outstanding Invoices" card tap
- Settings screen "My Invoices" row

**Layout:**
- Header: "My Invoices" with back arrow
- Filter chips: "All" | "Unpaid" | "Paid" (default: "All")
- List of invoice cards, sorted by issuedAt descending

**Invoice card:**
```
+---------------------------------------+
| INV-001                    $140.00    |
| Apr 3, 2026                          |
| Dr. Smith           [SENT badge]     |
+---------------------------------------+
```

**Status badges:**
- SENT: Blue badge "Sent"
- PAID: Green badge "Paid"
- PARTIALLY_PAID: Amber badge "Partial"
- OVERDUE: Red badge "Overdue"

**Empty state**: "No invoices yet" with a document icon.

### Screen 3: Invoice Detail

**Location**: `/invoices/[id]`

**Layout:**
```
+---------------------------------------+
| <- Back         Invoice INV-001       |
+---------------------------------------+
| Status: SENT                          |
| Issued: Apr 3, 2026                  |
| Due: May 3, 2026                     |
+---------------------------------------+
| Line Items                            |
| Psychotherapy, 45 min                |
|   1 x $140.00           $140.00      |
+---------------------------------------+
| Subtotal                   $140.00    |
| Tax                          $0.00    |
| Total                      $140.00    |
| Paid                         $0.00    |
| Balance Due                $140.00    |
+---------------------------------------+
| Payments                              |
| (No payments recorded)               |
+---------------------------------------+
| Contact your clinician to             |
| arrange payment.                      |
+---------------------------------------+
```

**Colors:**
- Balance due > 0: Red text
- Fully paid: Green text with checkmark

### Screen 4: Today Screen Cards

**Location**: Existing `/(tabs)/today` screen

**New cards added below existing content:**

1. **Pending Forms Card** (shown if incomplete intake forms exist):
```
+---------------------------------------+
| [clipboard icon]  Pending Forms       |
| You have 2 forms to complete          |
|                        [View ->]      |
+---------------------------------------+
```
Style: Light amber background (#FFF8E1), amber text.
Tap navigates to Programs tab.

2. **Outstanding Invoices Card** (shown if SENT/OVERDUE invoices exist):
```
+---------------------------------------+
| [receipt icon]  Outstanding Invoices  |
| You have 1 invoice to review         |
|                        [View ->]      |
+---------------------------------------+
```
Style: Light blue background (#E3F2FD), blue text.
Tap navigates to Invoices screen.

**Card ordering**: Pending Forms card appears before Outstanding Invoices card, both after the existing daily content.

---

## Web UX (Clinician)

### Reminder Settings

**Location**: Clinician Settings page (existing)

**New section**: "Appointment Reminders" card, positioned after existing settings content.

```
+---------------------------------------+
| Appointment Reminders                 |
|                                       |
| [toggle] Enable appointment reminders |
|                                       |
| Reminder Times                        |
| [x] 24 hours before                  |
| [x] 1 hour before                    |
| [ ] Add another reminder time        |
|                                       |
| [Save]                                |
+---------------------------------------+
```

**Toggle behavior**: When disabled, shows muted text "Reminders will not be sent for new appointments."

**Custom times**: Clicking "Add another" shows a number input with unit selector (minutes/hours/days). Max 5 reminder times.

**Save**: Calls PUT /api/config/reminders. Shows success toast.

### Appointment Detail — Reminder Status

**Location**: Appointment detail modal (existing)

**Addition**: Below the appointment details, show a "Reminders" section:
```
Reminders
  24h before — Sent at Apr 2, 2:00 PM
  1h before  — Pending (scheduled Apr 3, 1:00 PM)
```

Status labels:
- PENDING: Gray dot + "Pending"
- SENT: Green dot + "Sent at [time]"
- FAILED: Red dot + "Failed"
- CANCELED: Strikethrough text + "Canceled"

---

## Interaction Flows

### Flow 1: Participant Cancels Appointment

1. Participant opens Appointments screen
2. Taps appointment card
3. Sees "Cancel Appointment" button
4. Taps button
5. Confirmation dialog appears
6. Taps "Cancel"
7. API call fires
8. Success toast: "Appointment canceled"
9. Card updates to show CLIENT_CANCELED state
10. Reminder indicators disappear

### Flow 2: Participant Views Invoice

1. Participant sees "Outstanding Invoices" card on Today screen
2. Taps "View"
3. Navigates to Invoices list
4. Sees list of invoices with status badges
5. Taps an invoice
6. Sees line items, totals, balance
7. Reads "Contact your clinician to arrange payment"

### Flow 3: Clinician Configures Reminders

1. Clinician opens Settings
2. Scrolls to "Appointment Reminders"
3. Toggle is ON by default
4. Default times: 24h and 1h
5. Clinician adds "48 hours before"
6. Clicks Save
7. Success toast
8. Future appointments will use 48h + 24h + 1h reminders

---

## Accessibility

- All interactive elements have accessible labels.
- Status badges include text labels (not color-only).
- Cancel confirmation dialog traps focus.
- Invoice amounts are formatted for screen readers (e.g., "$140.00" reads as "one hundred forty dollars").
- Cards on Today screen are tappable with clear touch targets (minimum 44px).

---

## Error States

- **Network error on cancel**: "Unable to cancel. Please try again." toast.
- **Network error on invoice load**: "Unable to load invoices. Pull to refresh." inline message.
- **Empty invoice list**: "No invoices yet" with illustration.
- **Empty appointment list**: Existing empty state unchanged.
