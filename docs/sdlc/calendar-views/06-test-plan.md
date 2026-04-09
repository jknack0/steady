# Mobile Calendar Views — Test Plan

## Test Strategy

**Overall approach**: Three-tier testing pyramid — heavy unit tests on pure helper functions, component-level tests for rendering logic and user interaction, and integration tests for cross-component state flows (view switching, navigation, sheet opening).

**What's testable automatically**:
- All date math helpers (pure functions, no dependencies)
- Component rendering based on props (dots, event blocks, grid layout)
- User interactions: segmented control taps, day cell taps, chevron presses
- State transitions: view mode changes, anchor date updates, selected date clearing on swipe
- Conditional rendering: FAB visibility, empty states, error states, "+N more" overflow
- Navigation calls on event tap in mini agenda sheet

**What requires manual testing**:
- Swipe gesture feel and momentum on physical devices
- Animation smoothness (bottom sheet spring, view transitions)
- Scroll performance on week time grid with many events
- Visual correctness of color-coded dots and event block positioning
- Accessibility: screen reader announcement order, focus management on view switch
- Device-specific layout (small phones, tablets, landscape)

## Unit Tests

### Helper Functions (helpers.ts)

| # | Test Case | Given | When | Then |
|---|-----------|-------|------|------|
| H1 | getMonthGrid returns 6x7 grid | Any month/year | Called | Returns 42 Date objects starting from correct weekday |
| H2 | getMonthGrid pads with previous/next month days | March 2026 (starts Sunday) | Called | First cell is correct, last cells are April days |
| H3 | getWeekDates returns 7 days | A Wednesday date | Called | Returns Sun-Sat array containing that Wednesday |
| H4 | getWeekDates respects week start | Monday 2026-04-06 | Called | Week array starts with Sunday 2026-04-05 |
| H5 | isToday returns true for current date | Today's date | Called | Returns true |
| H6 | isToday returns false for yesterday | Yesterday | Called | Returns false |
| H7 | isSameDay compares correctly | Two dates same day different time | Called | Returns true |
| H8 | isSameDay rejects different days | Adjacent days | Called | Returns false |
| H9 | getEventsForDay filters correctly | Events array, target date | Called | Returns only events on that day |
| H10 | getEventsForDay returns empty for no matches | Events array, date with no events | Called | Returns [] |
| H11 | formatPeriodLabel month view | April 2026 | Called with "month" | Returns "April 2026" |
| H12 | formatPeriodLabel week view | Week containing Apr 5-11 | Called with "week" | Returns "Apr 5 – 11, 2026" |
| H13 | formatPeriodLabel week crossing months | Week containing Mar 29 – Apr 4 | Called with "week" | Returns "Mar 29 – Apr 4, 2026" |
| H14 | getEventTopOffset maps time to pixels | Event at 9:30 AM, hourHeight=60 | Called | Returns 570 (9.5 * 60) |
| H15 | getEventHeight calculates duration | 90-minute event, hourHeight=60 | Called | Returns 90 |
| H16 | groupOverlappingEvents groups concurrent events | 3 events, 2 overlap | Called | Returns correct overlap groups |
| H17 | addMonths advances correctly | January 2026 | addMonths(1) | February 2026 |
| H18 | addMonths handles year boundary | December 2026 | addMonths(1) | January 2027 |
| H19 | addWeeks advances 7 days | April 5 2026 | addWeeks(1) | April 12 2026 |
| H20 | getAdjacentPeriodRange month | April 2026, "month" | Called | Returns {prev: Mar 1-31, next: May 1-31} |
| H21 | getAdjacentPeriodRange week | Week of Apr 5, "week" | Called | Returns prev/next week start/end |
| H22 | getFirstTwoChronological sorts and limits | 5 events | Called | Returns first 2 by start time |

### Component Tests

#### SegmentedControl
| # | Test Case |
|---|-----------|
| SC1 | Renders three segments: "Day", "Week", "Month" |
| SC2 | Highlights active segment |
| SC3 | Calls onChange on tap of inactive segment |
| SC4 | Does not call onChange for active segment |
| SC5 | Accessible labels present |

#### NavigationRow
| # | Test Case |
|---|-----------|
| NR1 | Shows period label |
| NR2 | Left chevron calls onPrev |
| NR3 | Right chevron calls onNext |
| NR4 | Today button calls onToday |
| NR5 | Chevrons have accessibility labels |

#### MonthView
| # | Test Case |
|---|-----------|
| MV1 | Renders 7 day-of-week headers |
| MV2 | Renders 42 day cells |
| MV3 | Today cell has teal highlight |
| MV4 | Non-current-month days are dimmed |
| MV5 | Day with 1 event shows 1 dot |
| MV6 | Day with 3 events shows 2 dots max |
| MV7 | Dots are color-coded by event type |
| MV8 | Tapping a day calls onDayPress |
| MV9 | Selected day has distinct style |
| MV10 | Empty month shows no dots |

#### WeekTimeGrid
| # | Test Case |
|---|-----------|
| WG1 | Renders 24 hour labels |
| WG2 | Renders 7 day column headers |
| WG3 | Event block positioned correctly |
| WG4 | Event block shows title |
| WG5 | 2 overlapping events both visible |
| WG6 | 3 overlapping events show "+1 more" |
| WG7 | Tapping day header calls onDayPress |
| WG8 | Tapping event block calls onEventPress |
| WG9 | Today column has highlight |
| WG10 | Empty week shows empty state |
| WG11 | Current time indicator shown for today |

#### MiniAgendaSheet
| # | Test Case |
|---|-----------|
| MA1 | Shows date header |
| MA2 | Lists events with time |
| MA3 | Events show type icon/color |
| MA4 | Tapping event calls onEventPress |
| MA5 | Empty state shown |
| MA6 | Events sorted chronologically |
| MA7 | Close button/gesture calls onClose |

## Integration Tests

### CalendarScreen (orchestrator)
| # | Test Case |
|---|-----------|
| CS1 | Default view is Week |
| CS2 | Switch to Month view |
| CS3 | Switch to Day view |
| CS4 | FAB hidden in week view |
| CS5 | FAB hidden in month view |
| CS6 | FAB visible in day view |
| CS7 | Tap day in month opens agenda sheet |
| CS8 | Tap day in week opens agenda sheet |
| CS9 | Tap event in agenda navigates to day view |
| CS10 | Chevron forward in month view |
| CS11 | Chevron back in week view |
| CS12 | Selected date clears on period navigation |
| CS13 | View toggle anchors to selected date |
| CS14 | View toggle anchors to today if no selection |
| CS15 | Error state renders |
| CS16 | Loading state renders |
| CS17 | Prefetch called for adjacent periods |
| CS18 | Today button resets to current period |

## Manual Test Checklist

- [ ] Swipe left/right in week view feels natural, momentum and snap behavior correct
- [ ] Swipe left/right in month view transitions smoothly
- [ ] Bottom sheet spring animation feels responsive, not sluggish
- [ ] Week time grid scrolls smoothly with 20+ events
- [ ] Month grid dots align visually within cells on small screens (iPhone SE)
- [ ] Event block colors are distinguishable (colorblind-friendly)
- [ ] Screen reader announces view mode changes
- [ ] Screen reader reads day cells with event count ("April 15, 2 events")
- [ ] Focus moves logically after view switch
- [ ] Chevron buttons have adequate tap target (44x44pt minimum)
- [ ] No layout jank when rotating device
- [ ] Pull-to-refresh works on error state
- [ ] Month view renders correctly for February (28/29 days)
- [ ] Week view handles DST transition week correctly
- [ ] Performance: screen transition under 300ms on low-end Android

## Test Code

Test code files should be created at `apps/mobile/components/calendar/__tests__/`. The full test implementations are provided below.

### helpers.test.ts

See: `apps/mobile/components/calendar/__tests__/helpers.test.ts`

Tests all 13 exported helper functions with 22 test cases covering date math, grid generation, event filtering, label formatting, overlap detection, and period navigation.

### segmented-control.test.tsx

See: `apps/mobile/components/calendar/__tests__/segmented-control.test.tsx`

5 tests covering rendering, active state, onChange callbacks, and accessibility roles.

### month-view.test.tsx

See: `apps/mobile/components/calendar/__tests__/month-view.test.tsx`

10 tests covering grid rendering, today highlight, overflow day dimming, event dots (count, max, color-coding), day press callbacks, selection styling, and empty state.

### week-time-grid.test.tsx

See: `apps/mobile/components/calendar/__tests__/week-time-grid.test.tsx`

11 tests covering hour labels, day headers, today highlight, event block rendering, overlap handling (+N more), day/event press callbacks, empty state, and current time indicator.

### mini-agenda-sheet.test.tsx

See: `apps/mobile/components/calendar/__tests__/mini-agenda-sheet.test.tsx`

8 tests covering date header, event listing, type indicators, press callbacks, empty state, chronological ordering, close behavior, and visibility toggling.

### calendar-screen.test.tsx

See: `apps/mobile/components/calendar/__tests__/calendar-screen.test.tsx`

18 integration tests covering default view, view switching, FAB visibility, agenda sheet opening, chevron navigation, date selection clearing, view anchoring, error state, and today button reset.
