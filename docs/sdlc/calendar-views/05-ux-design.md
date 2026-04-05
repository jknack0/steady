# Mobile Calendar Views — UX Design

## User Flows

### Flow 1: Default Landing (Open Calendar Tab)
1. Participant taps Calendar in bottom tab bar
2. Screen loads → Week view with current week displayed
3. Today's column header is highlighted (teal background on day label)
4. Time grid scrolls to 7 AM position (not midnight)
5. Event blocks visible in their time positions
6. Segmented control shows "Week" as active segment

### Flow 2: Browse Month → Drill Into Day
1. Participant taps "Month" in segmented control
2. View transitions to month grid for the month containing the previously selected date (or today)
3. Participant sees day numbers with colored dots on days that have events
4. Participant taps a day with dots → bottom sheet slides up with mini agenda
5. Participant scans events → taps one → view switches to Day view for that date
6. Segmented control updates to "Day", day view shows full event list

### Flow 3: Swipe Through Weeks
1. Participant is in Week view
2. Swipes left → next week slides in, previous day selection clears
3. Navigation label updates (e.g., "Apr 6–12" → "Apr 13–19")
4. Participant taps a day column header → that day is selected, bottom sheet opens with mini agenda
5. Participant swipes right twice → goes back two weeks, adjacent data is prefetched

### Flow 4: Quick Jump via Month
1. Participant is in Day view looking at April 2
2. Taps "Month" segment → April 2026 grid appears, April 2 highlighted as today
3. Swipes left → May 2026 appears, today highlight gone (different month)
4. Taps May 15 → bottom sheet shows May 15 events
5. Taps an event → Day view for May 15

### Flow 5: Network Error During Load
1. Participant switches to Month view
2. API call fails (no connection)
3. Month grid renders with day numbers but no dots (empty calendar)
4. Subtle error banner at top: "Couldn't load events. Pull down to retry."
5. Participant pulls down → refetch succeeds → dots appear

### Flow 6: Empty State (New User)
1. New participant opens Calendar tab for the first time
2. Week view loads with no events
3. Empty time grid with hour labels visible, no event blocks
4. Subtle centered message over the grid: "No events this week"
5. FAB is visible (only in Day view though) — participant toggles to Day to create

## Component Specifications

### Segmented Control
**Purpose:** Switch between Day, Week, and Month views.

**States:**
| State | Appearance | Behavior |
|-------|-----------|----------|
| Default | 3 segments: "Day" / "Week" / "Month", active segment has teal (#5B8A8A) fill with white text, inactive segments have transparent bg with gray text | Tap inactive segment → switch view |
| Animating | Active indicator slides to tapped segment | View transitions immediately, no loading gate |

**Interactions:**
| Action | Feedback | Result | Error |
|--------|----------|--------|-------|
| Tap inactive segment | Active indicator slides, view swaps | New view renders with data from cache or fetch | If fetch fails, view renders empty + error banner |

### Navigation Row
**Purpose:** Show current period label and provide chevron navigation.

**States:**
| State | Appearance | Behavior |
|-------|-----------|----------|
| Day view | "‹  Mon, Apr 6, 2026  ›" | Chevrons step ±1 day |
| Week view | "‹  Apr 6–12, 2026  ›" | Chevrons step ±1 week |
| Month view | "‹  April 2026  ›" | Chevrons step ±1 month |

**Interactions:**
| Action | Feedback | Result |
|--------|----------|--------|
| Tap left chevron | Label updates instantly | Previous period loads (from prefetch cache) |
| Tap right chevron | Label updates instantly | Next period loads (from prefetch cache) |

### Month View (Grid)
**Purpose:** Overview of an entire month with event indicators for planning and navigation.

**States:**
| State | Appearance | Behavior |
|-------|-----------|----------|
| Default | 6x7 grid, day numbers in black, leading/trailing month days in light gray (#C0C0C0) | Tap any day → opens mini agenda |
| Today | Today's number has a teal (#5B8A8A) circle background with white text | Always visible when viewing current month |
| Selected | Tapped day gets a light teal (#E3EDED) circle background | Remains highlighted while bottom sheet is open |
| Has events | 1-2 small dots below the day number, colored by event type | Dots are 6px circles with 3px gap between them |
| Loading | Grid renders with day numbers, dots appear after fetch completes | No skeleton — grid structure is instant, dots fill in |
| Error | Grid renders with day numbers, no dots, error banner above | Pull-to-refresh to retry |
| Empty month | Grid with day numbers, no dots anywhere | No special message — an empty month is self-evident |

### Week Time Grid
**Purpose:** Google Calendar-style weekly overview with event blocks positioned by time.

**States:**
| State | Appearance | Behavior |
|-------|-----------|----------|
| Default | 7 columns with day labels at top (e.g., "SUN 6"), 24-hour axis on left, event blocks positioned by time | Vertically scrollable, initial scroll at 7 AM |
| Today column | Today's day label has teal circle (matching month view today treatment) | Visual anchor for "where am I" |
| Event block | Colored rectangle: bg from EVENT_COLORS[type].bg, left border 3px in EVENT_COLORS[type].border, title text truncated to fit | Height proportional to duration (60px/hr) |
| Overlap (≤2) | Blocks side-by-side, each taking half the column width | Both fully visible |
| Overflow (3+) | 2 blocks visible + small "+N" chip at bottom of the slot in muted gray | Tapping "+N" opens mini agenda for that day |
| Loading | Time grid structure visible, event blocks appear after fetch | Hour labels and grid lines render instantly |
| Empty week | Time grid with hour labels, no blocks | Centered text: "No events this week" over the grid in gray |

**Interactions:**
| Action | Feedback | Result |
|--------|----------|--------|
| Tap day column header | Header highlights with light teal bg | Mini agenda bottom sheet opens for that day |
| Tap "+N more" chip | Chip briefly highlights | Mini agenda bottom sheet opens for that day |
| Vertical scroll | Standard scroll physics | Navigate through 24-hour axis |
| Horizontal swipe | Page snaps to next/previous week | New week loads, no day selected |

### Day View
**Purpose:** Detailed view of a single day's events with full CRUD capabilities.

Unchanged from current implementation. All existing states and interactions preserved.

### Mini Agenda Bottom Sheet
**Purpose:** Quick preview of a day's events without leaving month/week view.

**States:**
| State | Appearance | Behavior |
|-------|-----------|----------|
| Open | Slides up from bottom over a semi-transparent backdrop. Header shows day: "Tuesday, April 15". List of event rows below. | Tap backdrop to dismiss |
| Event row | Left: colored circle (event type color) + time range ("9:00 AM – 10:00 AM"). Right: event title. Full width tap target. | Tap → navigate to Day view for that date |
| Empty day | Header + message: "No events" in gray, centered | Tap backdrop to dismiss |
| Many events | Scrollable list within the sheet | Max sheet height ~60% of screen |

**Interactions:**
| Action | Feedback | Result |
|--------|----------|--------|
| Tap event row | Row briefly highlights (light gray flash) | Sheet dismisses, view switches to Day for that date |
| Tap backdrop | Sheet slides down | Returns to previous view |
| Swipe sheet down | Sheet slides down with gesture | Returns to previous view |

### FAB (Floating Action Button)
**Purpose:** Entry point for creating new events.

**States:**
| State | Appearance | Behavior |
|-------|-----------|----------|
| Day view | Visible — teal circle with "+" icon, bottom-right | Tap opens Create Event modal |
| Week view | Hidden | — |
| Month view | Hidden | — |

## Information Hierarchy

**Header area (top → down):**
1. **Segmented control** — most prominent header element, always visible
2. **Navigation row** — period label centered between chevrons, secondary prominence
3. **Day pills** — week view only, tertiary row below navigation

**View area:**
- **Month view**: Day numbers are primary, dots are secondary visual cues — scannable at a glance
- **Week view**: Event blocks are primary (color + position tell the story), hour labels are secondary reference, day headers are tertiary navigation
- **Day view**: Event cards are primary (unchanged)

**Bottom sheet**: Date header is primary, event list is scannable — time on left (anchor), title on right (detail)

## Content & Copy

| Element | Copy | Notes |
|---------|------|-------|
| Segmented control labels | "Day" / "Week" / "Month" | Short, standard calendar terminology |
| Navigation label (day) | "Mon, Apr 6, 2026" | Abbreviated weekday + short date |
| Navigation label (week) | "Apr 6–12, 2026" | Range, same month collapsed. Cross-month: "Mar 30 – Apr 5, 2026" |
| Navigation label (month) | "April 2026" | Full month name + year |
| Week day column headers | "SUN 6" / "MON 7" / etc. | Abbreviated weekday + date number |
| Overflow chip | "+2 more" / "+3 more" | Lowercase, compact |
| Bottom sheet header | "Tuesday, April 15" | Full weekday + full date, no year |
| Bottom sheet empty | "No events" | Simple, no call-to-action (CTA is in day view) |
| Week view empty | "No events this week" | Centered over grid, gray text (#9CA3AF) |
| Error banner | "Couldn't load events. Pull down to retry." | Friendly, actionable |
| Month day pills (a11y) | "April 15, 3 events" | Screen reader announcement on focus |
| Segmented control (a11y) | "Day view" / "Week view" / "Month view" | Screen reader labels |

## Accessibility Notes

- **Segmented control**: Uses `accessibilityRole="tab"` with `accessibilityState={{ selected }}` on each segment. Group wrapped in `accessibilityRole="tablist"`.
- **Month grid cells**: Each cell announces "April 15" or "April 15, 3 events" via `accessibilityLabel`. Today additionally announces "today".
- **Week event blocks**: `accessibilityLabel` reads "Study Block, 9 AM to 10 AM, time block" (title + time + type).
- **Overflow chip**: Announces "3 more events, tap to view" via `accessibilityLabel`.
- **Bottom sheet**: Focus traps to sheet when open. First event row receives focus. Backdrop has `accessibilityLabel="Close"`.
- **Swipe navigation alternative**: Chevron buttons provide non-gesture navigation for users who can't swipe.
- **Color**: Event dots and blocks use color + shape (dots are always dots, blocks have type icon in a11y label). Not relying on color alone to convey event type.
- **Minimum tap targets**: All interactive elements ≥ 44x44pt (month cells, event rows, chevrons, segments).
