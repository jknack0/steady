# Sprint 19: Appointment Entity + Clinician Calendar — UX Design

## Design Goals

- **Zero-friction scheduling.** A clinician should be able to schedule an appointment in under 15 seconds from the week view.
- **Trust through visibility.** Every status change is visually confirmed and reversible (via audit-aware UI).
- **Respect the clinician's workflow.** Keyboard-first. Modals trap focus, Escape closes, Cmd/Ctrl+Enter submits.
- **Warn, don't block.** Conflicts and edge cases surface as inline banners, never silent failures or hard blocks.
- **Accessible by default.** WCAG 2.1 AA — color is never the sole status indicator.

---

## User Flows

### Flow 1: Schedule first appointment (happy path, empty state → success)

**Entry point:** `/appointments` (clicked "Calendar" in sidebar)
**Success state:** Week view shows the new appointment card with status `SCHEDULED`.

```
[Sidebar click "Calendar"]
        │
        ▼
[/appointments loads week view]
        │
        ▼
[Empty state: "No appointments this week"]
   ├─ CTA: [+ Schedule your first appointment] ────────┐
   │                                                   │
   ▼                                                   ▼
[Click empty time slot, e.g. Tue 10am]       [Click CTA button]
        │                                             │
        └──────────────────┬──────────────────────────┘
                           ▼
              [<AppointmentModal> opens — Create mode]
              startAt prefilled from clicked slot (or "now rounded up" from CTA)
              endAt = startAt + serviceCode.defaultDuration
                           │
                           ▼
              [User fills: Client, Service Code, Location, (optional note)]
                           │
                           ▼
              [Click "Schedule appointment" (or Cmd+Enter)]
                           │
                           ▼
              [Button → loading spinner; form fields disabled]
                           │
                ┌──────────┴──────────┐
                ▼                     ▼
     [Success 201]              [Error 4xx/5xx]
     Modal closes                Error banner at top of modal
     Toast: "Appointment         Field errors inline
      scheduled ✓"               Submit button re-enabled
     Week view animates
      in the new card
```

### Flow 2: Schedule with conflict (warn-only)

```
[User fills modal, submits]
        │
        ▼
[API returns 201 with conflicts: ['abc123']]
        │
        ▼
[Yellow banner in modal BEFORE closing]
   "⚠ This overlaps with 1 existing appointment.
    View: [Link to existing appointment in new tab]
    Still want to keep it? [Confirm] [Undo — delete new]"
        │
     ┌──┴──┐
     ▼     ▼
 [Confirm]  [Undo]
 Close      DELETE request to new appt id
 Toast ✓    Toast: "New appointment removed"
            Week view reverts
```

> **Design decision:** We surface conflicts post-save (not pre-save) because the API is warn-only and already committed the row. Undo is a real delete — allowed because the appointment was created <24h ago in SCHEDULED status (COND-11 passes).

### Flow 3: Change status (ATTENDED after session)

**Entry point:** Any calendar view, existing appointment card.

```
[Hover appointment card]
        │
        ▼
[Status badge becomes clickable + "⋯" menu appears]
        │
        ▼
[Click badge → <AppointmentStatusPopover> opens]
        │
        ▼
┌──────────────────────────────┐
│ ● Scheduled   (current)      │
│ ✓ Attended                   │
│ ✗ No-show                    │
│ ⊘ Late canceled              │
│ ⊘ Client canceled            │
│ ⊘ Clinician canceled         │
└──────────────────────────────┘
        │
        ▼
[Click "Attended"]
        │
        ▼
[Optimistic update: card turns green immediately]
Popover closes
        │
        ▼
  ┌─────┴─────┐
  ▼           ▼
[Success]  [API error]
Toast:     Toast: "Could not update —
"Marked    retry?" + [Retry]
attended"  Card reverts to SCHEDULED blue
```

**Special case: cancellation status selected.** The popover reveals an inline `cancelReason` textarea (placeholder: "Optional — visible only to you and your practice"):

```
[Click "Client canceled"]
        │
        ▼
[Popover expands with textarea + [Cancel] [Confirm]]
        │
        ▼
[User types reason or leaves blank, clicks Confirm]
        │
        ▼
[Same optimistic flow as above]
```

### Flow 4: Edit appointment (reschedule)

```
[Click existing appointment card]
        │
        ▼
[<AppointmentModal> opens — Edit mode]
Fields prefilled. Client field read-only (grey background).
        │
     ┌──┴──┐
     ▼     ▼
 [Active  [Terminal status
  status]  — ATTENDED/canceled]
     │         │
     │         ▼
     │     [Banner: "This appointment is completed.
     │      Only the internal note can be edited."]
     │      All fields read-only EXCEPT internalNote textarea
     │
     ▼
[User edits startAt, endAt, location, etc.]
        │
        ▼
[Click Save (or Cmd+Enter)]
        │
     ┌──┴──┐
     ▼     ▼
 [200]  [409 — terminal status scheduling change]
 Close   Inline banner inside modal:
 Toast   "Can't reschedule a completed appointment.
         Undo status first, or edit only the note."
         Button re-enabled
```

### Flow 5: Delete an accidental appointment

```
[Edit modal open for appointment <24h old, SCHEDULED]
        │
        ▼
[Footer shows: [Delete] (red text) [Cancel] [Save]]
        │
        ▼
[Click Delete]
        │
        ▼
[Inline confirm: "Permanently delete this appointment?
 This is for mistakes only — use 'Cancel' status for real cancellations.
 [Yes, delete]  [Keep it]"]
        │
     ┌──┴──┐
     ▼     ▼
 [Confirm] [Keep]
 204       Returns to edit mode
 Modal closes
 Toast: "Appointment deleted"
```

If guards fail (>24h, non-SCHEDULED, linked session), the Delete button is **not shown** in the first place — no dead-end UI. Tooltip on hover of the disabled state would explain why, but the cleaner approach is to omit the button entirely and rely on the Status popover for cancellations.

### Flow 6: Filter calendar by location

```
[Week view loaded]
        │
        ▼
[Click "Filters" pill in header]
        │
        ▼
[<CalendarFilters> dropdown opens]
┌──────────────────────────────┐
│ Location                     │
│ ☑ Main Office                │
│ ☐ Telehealth                 │
│ ☐ Downtown Office            │
│                              │
│ Status                       │
│ ☑ Scheduled                  │
│ ☑ Attended                   │
│ ☐ Canceled                   │
│ ☐ No-show                    │
│                              │
│ [Clear all]  [Apply]         │
└──────────────────────────────┘
        │
        ▼
[Apply → URL updates to ?location=<id>&status=SCHEDULED,ATTENDED]
Calendar refreshes. Active-filter chips appear next to "Filters" button:
[Main Office ×] [Scheduled ×] [Attended ×]
```

### Flow 7: Add a new client from the create modal

```
[Create modal open, cursor in Client field]
        │
        ▼
[Type "mar"]
        │
        ▼
[Dropdown shows]
┌────────────────────────────────┐
│ Maria Garcia — maria@...       │
│ Mark Thompson — mark@...       │
│ ────────────────────────────   │
│ + Add new client "mar"         │
└────────────────────────────────┘
        │
        ▼
[Click "Add new client"]
        │
        ▼
[Inline panel appears BELOW the Client field (no modal stacking)]
┌────────────────────────────────┐
│ First name*  [_____________]   │
│ Last name*   [_____________]   │
│ Email*       [_____________]   │
│ [Cancel]  [Create client]      │
└────────────────────────────────┘
        │
        ▼
[Submit → POST /api/participants]
        │
     ┌──┴──┐
     ▼     ▼
 [201]  [409 email exists]
 New client auto-selected  Inline error under email:
 in Client field.          "This email is already a client.
 Inline panel collapses.    [Select existing]"
```

### Flow 8: Session expired mid-flow

```
[User opens modal, edits, clicks Save after 31 min idle]
        │
        ▼
[401 response — JWT expired]
        │
        ▼
[API client auto-refreshes token silently (existing behavior)]
        │
     ┌──┴──┐
     ▼     ▼
 [Refresh OK]     [Refresh fails]
 Retry save       Modal shows:
 transparent      "Your session expired. [Sign in again]"
                  Form state preserved in memory —
                  after sign-in, user returns to modal with
                  same draft values.
```

---

## Wireframes

### Week view (default landing)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Steady                                           [Search]  [Avatar]  [Logout]│
├──────────────────────────────────────────────────────────────────────────────┤
│ [≡]                                                                          │
│ [🏠] Dashboard     ┌─────────────────────────────────────────────────────┐   │
│ [👥] Participants  │  Calendar                                           │   │
│ [📅] Calendar  ◄── │  ┌────┐ ┌────────┐                         [Filters]│   │
│ [💬] Sessions      │  │Day │ │  Week  │ │Month│    ◄ Apr 5 – 11 ►  Today │   │
│ [⚙] Settings       │  └────┘ └────────┘                                  │   │
│                    │                                                     │   │
│                    │         Mon 6   Tue 7   Wed 8   Thu 9   Fri 10      │   │
│                    │         ─────  ─────  ─────  ─────  ─────            │   │
│                    │   8am  │      │      │      │      │      │         │   │
│                    │        │      │      │      │      │      │         │   │
│                    │   9am  │      │ ┌──┐ │      │      │      │         │   │
│                    │        │      │ │MG│ │      │      │      │         │   │
│                    │  10am  │      │ │  │ │      │ ┌──┐ │      │         │   │
│                    │        │      │ └──┘ │      │ │JT│ │      │         │   │
│                    │  11am  │ ┌──┐ │      │      │ │  │ │      │         │   │
│                    │        │ │AB│ │      │      │ └──┘ │      │         │   │
│                    │  12pm  │ └──┘ │      │      │      │      │         │   │
│                    │        │      │      │      │      │      │         │   │
│                    │   1pm  │      │      │      │      │      │         │   │
│                    │   ...                                                │   │
│                    └─────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘

Legend — appointment card (e.g. "MG"):
┌─────────────────┐
│ ● 10:00–10:45   │   ● = status color dot + text label
│ Maria Garcia    │
│ 90834 · Main    │
│ "bring ins..."  │   (clipped internal note, 80 chars)
└─────────────────┘
```

### Day view

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Calendar     Day  [Week]  Month       ◄ Tuesday, April 7, 2026 ►     Today  │
│                                                                              │
│                        [Filters: Main Office × · Scheduled ×]                │
│   ┌──────────────────────────────────────────────────────────────────────┐   │
│   │ 8am  │ ─────────────────────────────────────────────────────────── │   │
│   │      │                                                             │   │
│   │ 9am  │ ─────────────────────────────────────────────────────────── │   │
│   │      │   ┌──────────────────────────────────────────────┐          │   │
│   │ 10am │   │ ● SCHEDULED  9:30 – 10:15                    │          │   │
│   │      │   │ Maria Garcia                                 │          │   │
│   │      │   │ 90834 · Psychotherapy, 45 min · Main Office  │          │   │
│   │      │   │ "bring insurance card"                  [⋯] │          │   │
│   │ 11am │   └──────────────────────────────────────────────┘          │   │
│   │      │                                                             │   │
│   │ 12pm │ ─────────────────────────────────────────────────────────── │   │
│   │ ...                                                                    │
│   └──────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Month view

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Calendar     Day  Week  [Month]       ◄ April 2026 ►              Today     │
│                                                                              │
│   Sun    Mon    Tue    Wed    Thu    Fri    Sat                              │
│   ───    ───    ───    ───    ───    ───    ───                              │
│                        1      2      3      4                                │
│                        •      • •                                            │
│   5      6      7      8      9      10     11                               │
│          • •    • • •         •      • •                                     │
│   12     13     14     15     16     17     18                               │
│          ...                                                                 │
│                                                                              │
│   Dots = 1 per appointment, up to 4; if >4, show "+3 more"                   │
│   Click a day → switches to Day view for that date                           │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Create / Edit appointment modal

```
┌──────────────────────────────────────────────────┐
│  Schedule appointment                        [×] │
├──────────────────────────────────────────────────┤
│                                                  │
│  Client *                                        │
│  ┌────────────────────────────────────────┐      │
│  │ 🔍 Search clients...                   │      │
│  └────────────────────────────────────────┘      │
│                                                  │
│  Service code *                                  │
│  ┌────────────────────────────────────────┐      │
│  │ 90834 — Psychotherapy, 45 min        ▾ │      │
│  └────────────────────────────────────────┘      │
│                                                  │
│  Location *                                      │
│  ┌────────────────────────────────────────┐      │
│  │ Main Office                          ▾ │      │
│  └────────────────────────────────────────┘      │
│                                                  │
│  When *                                          │
│  ┌──────────────┐  ┌──────────┐                  │
│  │ Apr 7, 2026  │  │ 10:00 AM │                  │
│  └──────────────┘  └──────────┘                  │
│  ↓ 45 min                                        │
│  ┌──────────────┐  ┌──────────┐                  │
│  │ Apr 7, 2026  │  │ 10:45 AM │                  │
│  └──────────────┘  └──────────┘                  │
│                                                  │
│  Appointment type                                │
│  ( • ) Individual   ( ) Couple                   │
│                                                  │
│  Internal note (only you see this)               │
│  ┌────────────────────────────────────────┐      │
│  │                                        │      │
│  │                                        │      │
│  └────────────────────────────────────────┘      │
│                                        0 / 500   │
│                                                  │
├──────────────────────────────────────────────────┤
│                      [Cancel]  [Schedule  ⏎Cmd+↵]│
└──────────────────────────────────────────────────┘
```

### Status popover

```
                    ┌───────────────────────────┐
                    │ Change status             │
                    ├───────────────────────────┤
                    │ ● Scheduled       ✓ (now) │
                    │ ✓ Attended                │
                    │ ✗ No-show                 │
                    │ ⊘ Late canceled           │
                    │ ⊘ Client canceled         │
                    │ ⊘ Clinician canceled      │
                    └───────────────────────────┘
```

After clicking a cancellation:
```
                    ┌───────────────────────────┐
                    │ Client canceled           │
                    ├───────────────────────────┤
                    │ Reason (optional)         │
                    │ ┌───────────────────────┐ │
                    │ │                       │ │
                    │ └───────────────────────┘ │
                    │              0 / 500      │
                    │                           │
                    │         [Back]  [Confirm] │
                    └───────────────────────────┘
```

---

## Component Specifications

### 1. `<Calendar>` — top-level container

**Purpose:** Hosts the view toggle, navigation, filters, and swaps between day/week/month subviews.

**States:**

| State | Appearance | Behavior |
|---|---|---|
| Loading (initial) | Header visible; body shows skeleton grid (hour rows, faint cards) | No interaction on body |
| Loaded (with data) | Active view rendered with cards | Full interaction |
| Loaded (empty range) | Active view rendered, grid visible, single centered empty-state panel over the grid | CTA button "Schedule your first appointment" opens modal |
| Error (query failed) | Header + grid visible; centered error banner "Couldn't load your calendar. [Retry]" | Retry re-runs the query |
| Refetching (background) | Subtle top progress bar; existing cards stay visible | No blocking |

**URL state:**
- `?view=week|day|month`
- `?date=YYYY-MM-DD` (anchor date; the view decides the range)
- `?location=<id>[,<id>]`
- `?status=SCHEDULED,ATTENDED`
- `?clinicianId=<id>` (account owner only)

### 2. `<CalendarDayView>` / `<CalendarWeekView>` / `<CalendarMonthView>`

**Purpose:** Render appointments for their respective range.

**Shared states:**

| State | Appearance | Behavior |
|---|---|---|
| Empty | Grid visible, small centered message "No appointments this [day/week/month]" + CTA | CTA opens create modal with now-rounded-up start |
| Populated | Cards laid out by time | Cards clickable, empty slots clickable |
| Overlap in week/day | Overlapping cards narrow to 50%/33% width side-by-side, preserving visibility | Both remain clickable |
| >4 per day in month | First 3 visible as dots + "+N more" text | Click day → switch to day view for that date |

**Interactions:**

| Action | Feedback | Result | Error |
|---|---|---|---|
| Click empty time slot | Slot briefly highlights | Modal opens with prefilled start/end | n/a |
| Click card | Card dims for 100ms | Edit modal opens | n/a |
| Keyboard: Arrow keys on focused slot | Focus moves visually | Next/prev slot focused | n/a |
| Keyboard: Enter on focused slot | — | Opens create modal (empty slot) or edit modal (card) | n/a |
| Keyboard: Left/Right nav | — | Previous/next period | n/a |
| Keyboard: T | — | Jump to Today | n/a |
| Keyboard: D/W/M | — | Switch to Day/Week/Month view | n/a |

### 3. `<AppointmentCard>`

**Purpose:** Visual representation of a single appointment in any view.

**Visible fields:**
- Status color dot + status label (e.g. "● Scheduled")
- Start–end time (in clinician's TZ)
- Client display name
- Service code short (e.g. "90834") + location name (truncated)
- Internal note preview (if present, max 80 chars, "…" overflow)
- Conflict warning badge (yellow "⚠" icon) if part of a conflict set
- `⋯` menu button (opens status popover)

**States:**

| State | Appearance | Behavior |
|---|---|---|
| Default | Colored left border + light tinted bg matching status | Hover → slight lift + shadow; `⋯` button appears |
| Focused (kbd) | 2px accent outline | Enter opens edit modal |
| Optimistic (status changing) | Slight fade + spinner on status badge | Locked until response |
| Conflict | Extra yellow border-top 2px | Clicking the conflict badge opens the conflicting appointment in a new tab |
| Error state (update failed) | Red 1px border, brief shake animation | Tooltip: "Couldn't save — click to retry" |

**Status color system (WCAG 2.1 AA, color + label always together — NFR-4c):**

| Status | Dot/Border | Label | Text on card |
|---|---|---|---|
| SCHEDULED | blue-500 | "Scheduled" | blue-900 on blue-50 |
| ATTENDED | green-500 | "Attended" | green-900 on green-50 |
| NO_SHOW | red-500 | "No-show" | red-900 on red-50 |
| LATE_CANCELED | amber-500 | "Late canceled" | amber-900 on amber-50 |
| CLIENT_CANCELED | gray-500 | "Client canceled" | gray-900 on gray-50 |
| CLINICIAN_CANCELED | gray-500 + ⊘ icon | "You canceled" | gray-900 on gray-50 |

All pairs meet 4.5:1 contrast.

### 4. `<AppointmentModal>`

**Purpose:** Create or edit an appointment.

**Modes:** `create`, `edit-active`, `edit-terminal` (status is ATTENDED or any cancellation — only `internalNote` editable).

**States:**

| State | Appearance | Behavior |
|---|---|---|
| Opening | Fade-in overlay; modal scales from 98% to 100% in 120ms | Focus moves to Client field (create) or first editable field (edit) |
| Idle | Form editable | Submit enabled only when form is valid and dirty |
| Submitting | Form fields disabled; submit button shows spinner + "Saving…" | Cancel button disabled |
| Validation error | Offending field gets red outline; inline error below field | Submit re-enabled when user fixes field |
| API error (non-validation) | Red banner at top of form: "<message from API>. [Try again]" | Form re-enabled |
| Conflict warning | Yellow banner at top AFTER successful save: "This overlaps with N other appointment(s). [View] [Keep] [Undo]" | Keep → close modal; Undo → DELETE call |
| Terminal status (edit) | All fields disabled except `internalNote`; info banner at top: "This appointment is completed. Only the internal note can be edited." | Save only sends `internalNote` |
| Dirty + close attempt | Confirm dialog: "Discard changes? [Keep editing] [Discard]" | Escape also triggers confirm if dirty |

**Interactions:**

| Action | Feedback | Result | Error |
|---|---|---|---|
| Type in Client field | Debounced 300ms search | Dropdown with up to 20 results + "Add new" option | 429 rate limit → "Too many searches — wait a moment" |
| Click "Add new client" | Inline panel expands below field | New client form | Same as flow 7 |
| Select service code | Field fills; endAt auto-recomputes from defaultDuration (only if user hasn't manually touched endAt) | — | — |
| Change startAt | If endAt auto-linked, endAt shifts by same delta preserving duration | — | — |
| Submit | Button → spinner | 201 → close + toast (or show conflict banner); 4xx → inline error | — |
| Escape | If clean, closes; if dirty, shows confirm | — | — |
| Cmd/Ctrl+Enter | Submit | Same as submit | — |
| Tab | Focus cycles within modal (trap) | — | — |

### 5. `<AppointmentStatusPopover>`

**Purpose:** Quick status change from any card.

**States:**

| State | Appearance | Behavior |
|---|---|---|
| Closed | — | — |
| Open (list) | 6 status options with current highlighted | Click applies optimistically |
| Expanded (cancellation selected) | Textarea + [Back] [Confirm] | Back returns to list; Confirm submits |
| Submitting | Selected row shows spinner | Locked |
| Error | Popover stays open; red text: "Couldn't save. [Retry]" | Retry re-sends |

**Keyboard:**
- Arrow Up/Down move selection
- Enter selects
- Escape closes without changes

### 6. `<CalendarFilters>`

**Purpose:** Multi-select filter for location, status, clinician (account owner only).

**States:**

| State | Appearance | Behavior |
|---|---|---|
| Closed | "Filters" pill + chip count badge if any active | Click opens |
| Open | Dropdown with grouped checkboxes | Live-apply or apply-on-close — chosen: apply-on-close for performance |
| Active | Active-filter chips render next to the button, each with × | × removes one filter and refetches |
| Error loading filter options | Show filters with placeholder "Couldn't load locations" + retry | — |

### 7. `<ClientSearchSelect>`

**Purpose:** Searchable picker with "Add new client" affordance.

**States:**

| State | Appearance | Behavior |
|---|---|---|
| Empty, focused | Placeholder "Search by name or email" | — |
| Typing (<2 chars) | Hint below: "Type at least 2 characters" | No search fired |
| Searching | Spinner on right | — |
| Results | Up to 20 rows + "+ Add new client" sticky footer | Arrow keys + Enter navigation |
| No results | "No matches. [+ Add new client \"<query>\"]" | — |
| Rate limited | Red hint: "Too many searches, wait a moment." | Disables input for 5s |
| Selected | Pill with client name + × | × clears selection (only in create mode) |
| Read-only (edit mode) | Pill, no × | — |

### 8. `<ServiceCodeSelect>`

Standard dropdown; rows show `code — description (default duration)`. No search needed (15 codes). Default selection = last used by this clinician, stored in localStorage.

### 9. `<LocationSelect>`

Standard dropdown; rows show `name (type badge)`. Default selection = most recent used on this calendar, or the `isDefault` location of the matching type.

### 10. `<AppointmentStatusPopover>` (same as 5, listed for file count)

### 11. Toast notifications

**Purpose:** Non-blocking feedback for every mutation.

| Trigger | Message | Duration | Action |
|---|---|---|---|
| Create success | "Appointment scheduled" | 4s | [Undo] (delete) |
| Create with conflicts | "Scheduled — check conflicts" (yellow) | 6s | [View] |
| Update success | "Appointment updated" | 3s | — |
| Status change success | "Marked <status>" | 3s | [Undo] (reverts) |
| Delete success | "Appointment deleted" | 4s | — |
| API error | "<error message>" (red) | 6s | [Retry] |
| Network error | "You're offline. Changes will sync when you reconnect." | sticky | — |

---

## Information Hierarchy

**Top priority (always visible):**
1. Current view + date range
2. Today button (never more than 1 click away)
3. View toggles
4. Active filter chips

**Secondary (one interaction away):**
- Filters dropdown
- Create CTA (empty state only; otherwise via clicking slots)

**Tertiary (contextual):**
- Status popover (hover/click on card)
- Edit modal (click on card)

**Hidden but reachable:**
- Delete (only inside edit modal footer, and only when guards allow)
- Cancel reason (only after selecting a cancellation status)

---

## Content & Copy

| Element | Copy | Notes |
|---|---|---|
| Sidebar nav | "Calendar" | Matches existing sidebar tone |
| Page title | "Calendar" | Browser tab: "Calendar — Steady" |
| Empty week state | "No appointments this week" + "Schedule your first appointment" | Friendly, action-oriented |
| Empty day state | "Nothing scheduled for <day>" | — |
| Create button (modal) | "Schedule appointment" | Not "Save" — verb matches intent |
| Edit button (modal) | "Save changes" | Standard |
| Delete button | "Delete" (red text) | Distinguishes from Cancel |
| Delete confirm | "Permanently delete this appointment? This is for mistakes — use 'Cancel' status for real cancellations." | Explains the difference |
| Client field placeholder | "Search by name or email" | — |
| Internal note label | "Internal note (only you see this)" | Reinforces privacy |
| Internal note placeholder | "e.g. bring insurance card, check SOAP notes from last visit" | Suggestive, no PHI examples |
| Terminal-status banner | "This appointment is completed. Only the internal note can be edited." | — |
| Conflict warning | "This overlaps with <N> existing appointment(s)." | Plural-aware |
| Validation: endAt<=startAt | "End time must be after start time" | Inline under endAt |
| Validation: missing client | "Pick a client to continue" | — |
| Error: cross-tenant 404 | "We couldn't find that appointment." | Never says "it belongs to another practice" |
| Error: terminal schedule change | "Can't reschedule a completed appointment. Undo status first, or edit only the note." | Gives a path forward |
| Error: 24h delete guard | — | Button simply not shown |
| Rate-limit on search | "Too many searches, wait a moment." | — |
| Session expired | "Your session expired. Sign in again to continue." + [Sign in again] | — |
| Toast: undo delete | "Appointment deleted. [Undo]" | Undo re-creates via POST with same payload (stored in memory 10s) |

---

## Accessibility (WCAG 2.1 AA)

### Keyboard navigation

| Action | Key |
|---|---|
| Move focus between time slots | Arrow keys |
| Open create modal on empty slot | Enter |
| Open edit modal on card | Enter |
| Next period | Right arrow at edge / `]` |
| Previous period | Left arrow at edge / `[` |
| Jump to today | `T` |
| Switch to day view | `D` |
| Switch to week view | `W` |
| Switch to month view | `M` |
| Open filters | `F` |
| Close modal / popover | Escape |
| Submit modal | Cmd/Ctrl + Enter |
| Cycle modal focus | Tab / Shift+Tab (focus trapped) |

### Screen reader

- Calendar grid uses `role="grid"` with `aria-colcount`, `aria-rowcount`. Slots are `role="gridcell"`.
- Each appointment card is `role="button"` with `aria-label="<status>, <client name>, <start>–<end>, <service code>, <location>"`.
- Status badge has `aria-label="Status: <label>"`.
- Modal is `role="dialog" aria-modal="true" aria-labelledby="modal-title"`.
- Toast is `role="status" aria-live="polite"` (non-intrusive); errors use `aria-live="assertive"`.
- Date range change announces the new appointment count: `aria-live="polite"` region "Showing 12 appointments, April 6–12".
- Focus restoration: closing any modal returns focus to the element that opened it.

### Color contrast

All status color pairs (dot + label, border + bg + text) meet 4.5:1. Status is never color-alone — always paired with a text label. Conflict warning uses both color and an icon (⚠).

### Motion

Respect `prefers-reduced-motion`: disables the card lift, modal scale, and toast slide animations.

---

## Loading States Summary

| Surface | Loading treatment |
|---|---|
| Calendar initial | Skeleton grid (hour rows + ghost cards) |
| Calendar refetch | Top thin progress bar, existing cards stay |
| Card optimistic update | Spinner on status badge |
| Modal submit | Button spinner + disabled form |
| Client search | Inline spinner in dropdown right side |
| Filter options load | "Loading…" placeholder in each group |

## Error States Summary

| Source | Display |
|---|---|
| Network unreachable | Sticky toast "You're offline" + calendar shows cached data |
| 401 expired | Silent refresh → if fails, modal sign-in prompt preserving draft state |
| 400 validation | Inline field errors |
| 404 cross-tenant | Toast "We couldn't find that appointment" + refetch calendar |
| 409 status-transition conflict | Inline banner in modal with explanation |
| 409 delete guard | Button not shown in first place |
| 429 rate limit (search) | Inline hint under search input |
| 500/unknown | Toast "Something went wrong — [Retry]" |

## Empty States Summary

| Surface | Copy | CTA |
|---|---|---|
| Week view, no appts | "No appointments this week" | "Schedule your first appointment" |
| Day view, no appts | "Nothing scheduled for <day>" | "+ New appointment" |
| Month view, no appts | Grid renders without dots; no additional message | — |
| Client search, no results | "No matches" | "+ Add new client \"<query>\"" |
| Filter yields zero | "No appointments match these filters" | "Clear filters" |

---

## Mobile / responsive note (sprint 19 scope)

Sprint 19 is **clinician web only** (per spec: "Out of Scope: mobile app UI for clinicians"). On narrow viewports (<900px), the week view collapses to the day view automatically and the sidebar collapses to a burger menu. Month view remains accessible. Full mobile-native support is deferred.

---

## Open Questions / Flagged for future sprints

- **Drag-to-reschedule** is out of scope (spec line 711) but UX feels incomplete without it. Recommend fast-follow in sprint 20.
- **Recurring appointments** UI pattern — reserved for sprint 20+. Today's modal has no "Repeat" field.
- **Color-coding by service code or clinician** — spec says out of scope; all cards use status color only.
- **Confirmation before status change to ATTENDED when startAt is in the future** — spec says allow silently. UX could add a soft "This appointment is in the future — mark attended anyway?" confirmation, but we defer to spec's "allow, audit captures".
- **Undo window for destructive actions** — toasts have undo for delete and status change, memory-only, 10s. Not persisted across page reloads. Acceptable for sprint 19.
