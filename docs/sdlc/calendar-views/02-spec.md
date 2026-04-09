# Mobile Calendar Views — Feature Specification

## Overview
Participants currently see only a single day at a time in the mobile calendar, with week navigation limited to chevron buttons and day pills. This makes it slow to navigate to distant dates, impossible to spot schedule patterns, and difficult to gauge overall busyness. The solution adds a three-view toggle (Day / Week / Month) with a segmented control, where Week is the default landing view. Week view uses a Google Calendar-style time grid; Month view uses a dot-indicator grid. Both support a mini agenda bottom sheet on day tap and swipe navigation.

## Functional Requirements

### FR-1: View Toggle Segmented Control
A segmented control in the calendar header allows switching between Day, Week, and Month views. Week view is the default when opening the Calendar tab.

**Acceptance Criteria:**
- GIVEN a participant opens the Calendar tab
  WHEN the screen loads
  THEN the Week view is displayed with the current week visible and today highlighted

- GIVEN a participant is in any view
  WHEN they tap a different segment (Day/Week/Month)
  THEN the view switches to show the period containing the currently selected date (or today if no date is selected)

### FR-2: Month View
A full month grid displaying day numbers with up to 2 color-coded dots per day cell indicating events. Today is always highlighted in the current month.

**Acceptance Criteria:**
- GIVEN a participant is in Month view
  WHEN the month loads
  THEN a calendar grid shows all days of the month with leading/trailing days from adjacent months grayed out

- GIVEN a day has events
  WHEN the month grid renders
  THEN up to 2 dots are shown, colored by event type, representing the first 2 events chronologically

- GIVEN a day has more than 2 events
  WHEN the month grid renders
  THEN only the first 2 chronological event type dots are shown (no "+N" indicator in the grid itself)

- GIVEN the participant is viewing the current month
  WHEN no day is selected
  THEN today's cell is visually highlighted (distinct from selection highlight)

- GIVEN the participant swipes left
  WHEN in Month view
  THEN the next month is displayed

- GIVEN the participant swipes right
  WHEN in Month view
  THEN the previous month is displayed

- GIVEN the participant swipes to a different month and then back
  WHEN the current month is displayed again
  THEN today is still highlighted

### FR-3: Week View
A Google Calendar-style time grid with 7 day columns spanning a full 24-hour axis. Event blocks are positioned by start/end time.

**Acceptance Criteria:**
- GIVEN a participant is in Week view
  WHEN the week loads
  THEN 7 day columns are displayed with a 24-hour vertical time axis and event blocks positioned by their start/end times

- GIVEN a time slot has 1-2 events
  WHEN the week grid renders
  THEN all events are visible as blocks within the column

- GIVEN a time slot has 3+ events
  WHEN the week grid renders
  THEN 2 event blocks are shown with a "+N more" indicator for the remainder

- GIVEN the participant swipes left
  WHEN in Week view
  THEN the next week is displayed

- GIVEN the participant swipes right
  WHEN in Week view
  THEN the previous week is displayed

- GIVEN the participant swipes to navigate weeks
  WHEN a new week appears
  THEN no day is selected until the participant taps one

### FR-4: Mini Agenda Bottom Sheet
Tapping a day in Week or Month view opens a bottom sheet showing that day's events with time range, title, and event type icon/color.

**Acceptance Criteria:**
- GIVEN a participant taps a day cell in Month view
  WHEN the day has events
  THEN a bottom sheet slides up showing a list of events with time range, title, and event type color/icon

- GIVEN a participant taps a day column header in Week view
  WHEN the day has events
  THEN the same bottom sheet appears

- GIVEN a day has no events
  WHEN the participant taps it
  THEN the bottom sheet shows an empty state (e.g., "No events")

- GIVEN the bottom sheet is open
  WHEN the participant taps an event in the list
  THEN the view switches to Day view for that date

### FR-5: Day View (Unchanged)
The existing day view remains the same. Event creation (FAB + modal) and event deletion (long-press) are only available in Day view.

**Acceptance Criteria:**
- GIVEN a participant is in Day view
  WHEN they interact with events
  THEN all existing functionality (create via FAB, delete via long-press, pull-to-refresh) works as before

- GIVEN a participant is in Week or Month view
  WHEN they look for create/delete controls
  THEN no FAB or deletion controls are available

## Non-Functional Requirements

### NFR-1: Performance
- Month view must render within 500ms of toggle tap, including fetching events for the month
- Week view must render within 300ms of toggle tap
- Swipe navigation between weeks/months must feel instant — prefetch adjacent period data in the background
- Bottom sheet must appear within 200ms of day tap

### NFR-2: Data Efficiency
- Month view fetches the full month's events in a single API call using the existing start/end range params
- Week view fetches one week at a time
- Adjacent periods (next/previous week or month) are prefetched after the current view renders
- No new API endpoints required — existing GET /api/participant/calendar supports arbitrary date ranges

### NFR-3: Accessibility
- Segmented control must be navigable via screen reader with labels ("Day view", "Week view", "Month view")
- Month grid day cells must announce day number and event count (e.g., "April 15, 3 events")
- Bottom sheet events must be accessible via screen reader
- Swipe gestures must have non-gesture alternatives (e.g., chevron buttons in the header)

## Scope

### In Scope
- Three-view segmented control (Day / Week / Month) with Week as default
- Month grid with up to 2 color-coded event dots per day
- Week time grid with 24-hour axis and event blocks (Google Calendar style)
- "+N more" indicator for 3+ overlapping events in week view
- Mini agenda bottom sheet on day tap (week and month views)
- Swipe left/right navigation for weeks and months
- Chevron buttons as non-gesture navigation alternative
- Today always highlighted in current month
- No day selected after swiping to a new week/month
- View anchored to selected date (or today) when toggling between views

### Out of Scope
- Event creation or deletion from week or month views
- Multi-month continuous scrolling / year view
- Calendar sync with external providers (Google, Apple)
- Landscape orientation
- Persisting last-used view mode between sessions
- More than 2 dot indicators per day in month view
- Pinch-to-zoom on week view time grid
- Drag-to-reschedule events in week view
- Any changes to the API or data model

## Dependencies
- Existing GET /api/participant/calendar?start=&end= endpoint (no changes needed — already supports arbitrary date ranges up to 500 events)
- React Native gesture handler for swipe navigation (already available via Expo)
- Existing event type color scheme (TIME_BLOCK, SESSION, CATCH_UP, EXTERNAL_SYNC)

## Assumptions
- 500 events per API call is sufficient for a full month's data (unlikely a participant has 500+ events in 30 days)
- The 24-hour time grid in week view will be vertically scrollable — the full 24 hours won't fit on screen without scrolling
- Event blocks in week view use the same color coding as the existing day view event cards
- The segmented control replaces the current week navigation header (chevrons + day pills) in week and month views, but day view retains its current navigation
