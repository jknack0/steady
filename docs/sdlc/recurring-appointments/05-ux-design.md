# Recurring Appointments — UX Design

## Overview

Recurring appointments integrate into the existing calendar UI with minimal new surfaces. The primary interaction point is the "Repeat" toggle in the create-appointment modal. Management of series is via a "Recurring" tab on the calendar page.

## Component Specifications

### 1. AppointmentModal — Repeat Toggle (Create Mode Only)

**Location:** Below the appointment type radio buttons, before the internal note field.

**Default state:** Toggle OFF (matches existing single-appointment behavior).

**When toggled ON, show:**
- **Frequency dropdown:** "Weekly" (default) | "Every 2 weeks" | "Monthly"
- **End date picker:** Optional. Label: "Ends on". Default: empty (ongoing).
  - Placeholder text: "Ongoing (no end date)"
  - When set: shows a date picker for the end date

**Submit button text changes:** "Schedule recurring" instead of "Schedule appointment"

**On submit:** calls `POST /api/recurring-series` instead of `POST /api/appointments`.
Success toast: "Recurring series created - X appointments scheduled"

**Constraints:**
- Repeat toggle is hidden in edit mode (editing an occurrence uses the existing edit flow)
- The day of week is derived from the selected start date
- Start time / end time come from the existing time fields
- All other fields (client, service code, location, type, note) are shared

### 2. Recurring Appointment Card Indicator

**Location:** Top-right corner of the AppointmentCard component.

**Visual:** Small repeat icon using the Unicode character or an SVG icon, in muted gray. Tooltip on hover: "Part of a recurring series"

**Behavior:** Clicking the card still opens the normal edit modal, but with the edit-choice dialog (see below).

### 3. Edit Choice Dialog

**Trigger:** When a clinician clicks to edit an appointment that has `recurringSeriesId`.

**Layout:** A small dialog/popover with two options:
- "Edit just this appointment" -- opens the normal AppointmentModal in edit mode
- "Edit all future appointments" -- opens the AppointmentModal but submit calls PATCH on the series

**Design:** Uses the existing Dialog component. Simple two-button layout, no extra fields.

### 4. Recurring Series Management Section

**Location:** New "Recurring" tab in the calendar page header, alongside Day | Week | Month.

**Layout:** A list/table of series with columns:
- Client name (first + last)
- Day and time (e.g., "Tuesdays 2:00 - 2:45 PM")
- Frequency (Weekly / Biweekly / Monthly)
- Location name
- Status badge: "Active" (green) or "Paused" (gray)
- Actions: Edit | Pause/Resume | Delete

**Empty state:** "No recurring series yet. Create one from the appointment modal."

**Pause/Resume:** Single button that toggles. Paused series show grayed-out styling and a "Paused" badge.

**Delete:** Shows a confirmation dialog:
- Title: "Delete recurring series?"
- Body: "This will cancel all future scheduled appointments in this series. Past and attended appointments will be kept."
- Buttons: "Cancel" | "Delete series"

### 5. Series Detail (on row click)

**Shows:**
- Series configuration (client, day, time, frequency, service code, location)
- Upcoming appointments list (next 4 weeks) with status badges
- Edit button to modify series settings

## String Additions

Added to `apps/web/src/lib/strings/appointments.ts`:

```typescript
// Recurring
repeatToggle: "Repeat",
repeatFrequencyWeekly: "Weekly",
repeatFrequencyBiweekly: "Every 2 weeks",
repeatFrequencyMonthly: "Monthly",
repeatEndDate: "Ends on",
repeatEndDateOngoing: "Ongoing (no end date)",
repeatScheduleBtn: "Schedule recurring",
repeatToastCreated: (n: number) => `Recurring series created - ${n} appointments scheduled`,
recurringIndicatorTooltip: "Part of a recurring series",
editChoiceTitle: "Edit recurring appointment",
editChoiceJustThis: "Edit just this appointment",
editChoiceAllFuture: "Edit all future appointments",
recurringTabLabel: "Recurring",
recurringEmptyState: "No recurring series yet. Create one from the appointment modal.",
recurringColumnClient: "Client",
recurringColumnSchedule: "Schedule",
recurringColumnFrequency: "Frequency",
recurringColumnLocation: "Location",
recurringColumnStatus: "Status",
recurringPauseBtn: "Pause",
recurringResumeBtn: "Resume",
recurringDeleteBtn: "Delete",
recurringDeleteConfirmTitle: "Delete recurring series?",
recurringDeleteConfirmBody: "This will cancel all future scheduled appointments in this series. Past and attended appointments will be kept.",
recurringDeleteConfirmYes: "Delete series",
recurringDeleteConfirmNo: "Cancel",
recurringPausedBadge: "Paused",
recurringActiveBadge: "Active",
recurringPauseSuccess: "Series paused",
recurringResumeSuccess: "Series resumed",
recurringDeleteSuccess: "Series deleted",
recurringUpdateSuccess: "Series updated - future appointments regenerated",
```

## Accessibility

- Repeat toggle is a standard checkbox with label, keyboard-operable.
- Edit choice dialog traps focus, supports Enter/Escape.
- Recurring tab is keyboard-navigable in the tab group.
- Recurring indicator has an aria-label for screen readers.
- Series list is a table with proper headers for screen readers.

## Responsive Behavior

- On mobile-width screens, the recurring series list collapses to cards instead of a table.
- The repeat toggle and its sub-fields stack vertically on narrow screens.
