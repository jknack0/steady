# Mobile Calendar Views — Concept

## Problem Statement
Participants can only see one day at a time in the mobile calendar (with a week navigation strip), making it tedious to navigate to distant dates, spot schedule patterns, or gauge overall busyness. They need zoomed-out week and month views for planning and quick navigation.

## Recommended Approach
**Three-View Toggle (Day / Week / Month)** — Add a segmented control in the calendar header that switches between day, week, and month views.

- **Month view:** Full month grid with up to 2 color-coded dots per day indicating events. Tapping a day shows a bottom sheet mini agenda. From the bottom sheet, tap through to full day view.
- **Week view:** Google Calendar-style time-grid with 7 day columns and event blocks positioned by time across a full 24-hour axis. Tapping a day shows the same bottom sheet mini agenda.
- **Day view:** Unchanged from current implementation. Event creation and deletion remain here only.

**View context anchored to active date** — switching to month view shows the month containing the currently selected day. Switching to week shows the week containing that day. No state is remembered between toggles.

**Swipe navigation** — swipe left/right to navigate forward/backward by one week (in week view) or one month (in month view).

## Key Scenarios
1. **Planning ahead:** Participant toggles to month view, scans for busy/free weeks, taps a light day → sees mini agenda → navigates to day view to create an event.
2. **Quick date navigation:** Participant needs to check the 28th — toggles to month, taps it, sees the mini agenda preview without leaving month view.
3. **Week overview:** Participant toggles to week view, sees time blocks laid out Google Calendar-style across 7 days with full 24-hour axis, identifies gaps and overlaps visually.
4. **Empty month:** New participant with few events sees a mostly empty month grid with today highlighted.

## Out of Scope
- Event creation or deletion from month or week views (day view only)
- Multi-month scrolling / year view
- Calendar sync with external providers (Google, Apple)
- Landscape orientation support
- Remembering view mode between sessions
- More than 2 dot indicators per day cell in month view

## Decisions Made
- Week view shows full 24-hour time grid (not a subset)
- Swipe left/right navigates between weeks (week view) or months (month view)
- Max 2 event dots per day in month view
- Event deletion is day-view only
- View always anchors to the currently selected date when toggling

## Alternatives Considered
- **Month Header Expansion** — Expanding the week strip into a full month grid inline. Not chosen because of gesture conflicts with pull-to-refresh and cramped feel on smaller devices.
- **Separate Month Screen** — Dedicated screen for month view. Not chosen because it feels disconnected — toggling within the same tab is more seamless.
- **Day + Month only (no week)** — Considered but week view is a standard calendar pattern and fills the gap between day and month naturally.
