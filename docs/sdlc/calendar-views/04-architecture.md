# Mobile Calendar Views — Architecture

## System Boundaries

### What Changes
- **`apps/mobile/app/(app)/(tabs)/calendar.tsx`** — Refactored from a single-view 412-line file into a thin orchestrator that delegates to view-specific components. Gains view toggle state, gesture navigation, and prefetching logic.
- **New component files** under `apps/mobile/components/calendar/` — MonthView, WeekTimeGrid, DayView (extracted from existing), MiniAgendaSheet, SegmentedControl, and shared helpers.

### What Does NOT Change
- **API layer** — No new endpoints. The existing `GET /api/participant/calendar?start=&end=` (max 500 events, `packages/api/src/routes/calendar.ts`) serves all three views. The mobile `api.getCalendarEvents()` call is unchanged.
- **API route file** (`packages/api/src/routes/calendar.ts`) — Untouched.
- **API client** (`apps/mobile/lib/api.ts`) — Untouched. Same `getCalendarEvents(start, end)` signature.
- **Create/update/delete mutations** — The FAB and "Add Event" modal remain functionally identical; they just move into a shared component.
- **Database schema** — No changes.
- **`packages/shared`** — No schema changes.
- **`apps/web`** — Unaffected.

## Component Architecture

```
CalendarScreen (calendar.tsx)
├── CalendarHeader
│   ├── SegmentedControl [Day | Week | Month]
│   ├── NavigationRow (chevrons + month/year label)
│   └── DayPills (week view only — existing, extracted)
├── ViewContainer (swipe gesture wrapper)
│   ├── MonthView
│   │   └── MonthGrid
│   │       └── DayCell (date number + up to 2 event dots)
│   ├── WeekTimeGrid
│   │   ├── TimeColumn (hour labels, 6 AM–9 PM)
│   │   └── DayColumn x7
│   │       └── EventBlock (positioned by time, colored by type)
│   │       └── OverflowChip ("+N more")
│   └── DayView (extracted from current calendar.tsx)
│       └── EventCard (existing event card markup)
├── MiniAgendaSheet (bottom sheet, shown on month day tap)
│   └── AgendaRow (time range + title + type icon)
├── CreateEventModal (existing "Add Event" modal, extracted)
└── FAB (existing, unchanged)
```

### Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **CalendarScreen** | Owns `viewMode`, `anchorDate`, `selectedDate` state. Coordinates prefetching. Renders header + active view + FAB + modals. |
| **SegmentedControl** | Three-button toggle emitting `onViewChange("day" \| "week" \| "month")`. Animated selection indicator. |
| **NavigationRow** | Chevron left/right buttons. Label shows contextual text: "Mon, Apr 6" (day), "Apr 6–12, 2026" (week), "April 2026" (month). Chevrons call `onNavigate(-1 \| 1)`. |
| **DayPills** | Horizontal row of 7 day pills (Sun–Sat). Shown in week view header only. Tapping sets `selectedDate`. |
| **MonthView** | Full calendar grid (6 rows x 7 cols). Each cell shows date number + up to 2 colored dots derived from events for that day. Tapping a cell opens MiniAgendaSheet for that date. |
| **WeekTimeGrid** | 24-hour vertical time grid with 7 day columns. Event blocks positioned absolutely based on `startTime`/`endTime`. When >2 events overlap a slot, shows "+N more" chip. Scrolls vertically; initial scroll offset set to 7 AM. |
| **DayView** | Extracted from current calendar.tsx lines 196–269. List of EventCards for `selectedDate`. Empty state unchanged. |
| **MiniAgendaSheet** | Bottom sheet (React Native Modal with slide animation, matching existing CreateEventModal pattern). Lists events for tapped day as compact rows. Tapping a row switches to day view for that date. |
| **EventBlock** | Compact event representation for WeekTimeGrid. Shows truncated title, colored background from `EVENT_COLORS`. Height proportional to duration. |
| **EventCard** | Existing event card (lines 222–265 of current file). Extracted as-is. |

## State Management

### Local State (CalendarScreen)

```typescript
type ViewMode = "day" | "week" | "month";

const [viewMode, setViewMode] = useState<ViewMode>("week");
const [anchorDate, setAnchorDate] = useState<Date>(new Date()); // center of current view period
const [selectedDate, setSelectedDate] = useState<Date>(new Date()); // selected day (for day view, day pills)
const [agendaDate, setAgendaDate] = useState<Date | null>(null); // non-null → MiniAgendaSheet open
```

**State transitions:**
- Toggle view mode: `viewMode` changes; `anchorDate` stays (view anchors to selected date). `selectedDate` preserved.
- Swipe/chevron navigate: `anchorDate` shifts by 1 day / 1 week / 1 month. `selectedDate` is cleared (set to `null` equivalent — no day highlighted after swipe).
- Tap day pill (week view): `selectedDate` updated, triggers day view content filter.
- Tap day cell (month view): `agendaDate` set → MiniAgendaSheet opens.
- Tap agenda row → day view: `viewMode` = "day", `selectedDate` = tapped date, `agendaDate` = null.

### Derived Date Ranges

```typescript
// Computed from anchorDate + viewMode
const dateRange = useMemo(() => {
  switch (viewMode) {
    case "day":
      return { start: startOfDay(anchorDate), end: endOfDay(anchorDate) };
    case "week":
      return { start: startOfWeek(anchorDate), end: endOfWeek(anchorDate) };
    case "month":
      return { start: startOfMonth(anchorDate), end: endOfMonth(anchorDate) };
  }
}, [viewMode, anchorDate]);
```

Note: Month view fetches extra days to fill the 6x7 grid (leading/trailing days from adjacent months). The fetch range extends to the Sunday before the 1st and the Saturday after the last day.

### TanStack Query Keys

```typescript
// Primary query — drives the visible view
queryKey: ["calendar", dateRange.start.toISOString(), dateRange.end.toISOString()]

// Prefetch queries — adjacent periods for instant swipe
queryKey: ["calendar", prevRange.start.toISOString(), prevRange.end.toISOString()]
queryKey: ["calendar", nextRange.start.toISOString(), nextRange.end.toISOString()]
```

**Migration from current key**: The existing `["calendar", weekStart]` key uses only the start date. The new key includes both start and end to uniquely identify variable-length ranges (day vs. week vs. month). Old cached data is naturally evicted by `staleTime`.

Query configuration:
```typescript
{
  staleTime: 5 * 60 * 1000,   // 5 minutes — events don't change frequently
  gcTime: 30 * 60 * 1000,     // 30 minutes — keep adjacent periods in cache
}
```

## Data Flow

### API → Cache → View

```
1. CalendarScreen computes dateRange from (viewMode, anchorDate)
2. useQuery fetches GET /api/participant/calendar?start={}&end={}
3. TanStack Query caches as ["calendar", start, end]
4. useMemo groups events by date string → Map<dateStr, CalendarEvent[]>
5. Active view component receives grouped events as prop
6. MonthView: counts events per day for dot indicators
   WeekTimeGrid: positions events by hour offset within each day column
   DayView: filters to selectedDate (existing logic)
```

### Prefetching Strategy

```typescript
// In CalendarScreen, after primary query resolves:
useEffect(() => {
  const { prev, next } = getAdjacentRanges(viewMode, anchorDate);

  queryClient.prefetchQuery({
    queryKey: ["calendar", prev.start.toISOString(), prev.end.toISOString()],
    queryFn: () => api.getCalendarEvents(prev.start.toISOString(), prev.end.toISOString())
      .then(r => { if (!r.success) throw new Error(r.error); return r.data; }),
    staleTime: 5 * 60 * 1000,
  });

  queryClient.prefetchQuery({
    queryKey: ["calendar", next.start.toISOString(), next.end.toISOString()],
    queryFn: () => api.getCalendarEvents(next.start.toISOString(), next.end.toISOString())
      .then(r => { if (!r.success) throw new Error(r.error); return r.data; }),
    staleTime: 5 * 60 * 1000,
  });
}, [viewMode, anchorDate]);
```

Adjacent periods per view mode:
- **Day**: previous day, next day
- **Week**: previous week, next week
- **Month**: previous month, next month

This means at most 3 API calls per navigation (1 primary + 2 prefetch), and swipes into adjacent periods are instant cache hits.

### Query Invalidation

Existing pattern preserved — create/update/delete mutations call:
```typescript
queryClient.invalidateQueries({ queryKey: ["calendar"] });
```
This invalidates ALL calendar queries regardless of date range, ensuring all cached periods refresh after a mutation.

## File Structure

### New Files

```
apps/mobile/components/calendar/
├── segmented-control.tsx      — View toggle (Day/Week/Month)
├── navigation-row.tsx         — Chevrons + period label
├── day-pills.tsx              — Week day selector (extracted from calendar.tsx)
├── month-view.tsx             — Month grid with event dots
├── week-time-grid.tsx         — 24-hour time grid with positioned event blocks
├── day-view.tsx               — Event card list (extracted from calendar.tsx)
├── mini-agenda-sheet.tsx      — Bottom sheet for month day tap
├── event-card.tsx             — Single event card (extracted from calendar.tsx)
├── event-block.tsx            — Compact event for week time grid
├── create-event-modal.tsx     — Add event bottom sheet (extracted from calendar.tsx)
├── constants.ts               — EVENT_COLORS, HOURS, layout constants
└── helpers.ts                 — Date math: getWeekDays, startOfWeek, getMonthGrid, getAdjacentRanges, formatHour, groupEventsByDate
```

### Modified Files

```
apps/mobile/app/(app)/(tabs)/calendar.tsx — Rewritten as thin orchestrator (~150 lines down from 412)
```

### Untouched Files

```
apps/mobile/lib/api.ts                    — No changes
packages/api/src/routes/calendar.ts        — No changes
packages/api/src/__tests__/integration/calendar.test.ts — No changes needed (API unchanged)
```

## Key Technical Decisions

### 1. No Third-Party Calendar Library

**Decision**: Build custom views with plain React Native components and inline styles (matching existing codebase style — no stylesheet abstractions are used anywhere in the mobile app).

**Rationale**: Libraries like `react-native-calendars` or `react-native-big-calendar` bring:
- Heavy native dependencies (Reanimated, Gesture Handler versions that may conflict with Expo 54)
- Opinionated styling that fights NativeWind/inline style patterns
- Features we don't need (event creation drag, multi-day spans, agenda view)
- Bundle size cost for a participant-facing app where calendar is one of five tabs

The three views are geometrically simple:
- Month grid = 6x7 `View` grid with flex
- Week time grid = `ScrollView` with absolutely positioned event blocks
- Day view = already built

### 2. Gesture Navigation via ScrollView Paging

**Decision**: Use horizontal `ScrollView` with `pagingEnabled` and `onMomentumScrollEnd` for swipe navigation between periods.

**Implementation**: Render a 3-page ScrollView (previous / current / next period). On swipe completion:
1. Update `anchorDate` to the new period
2. Reset ScrollView to center page (no animation)
3. Prefetch fires for the new adjacent periods

This avoids adding `react-native-gesture-handler` PanGesture complexity and works reliably on both iOS and Android. The pattern is identical to how many RN calendar apps handle swipe navigation.

```typescript
<ScrollView
  horizontal
  pagingEnabled
  showsHorizontalScrollIndicator={false}
  onMomentumScrollEnd={(e) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    if (page === 0) navigatePeriod(-1);
    else if (page === 2) navigatePeriod(1);
    // Reset to center page
    scrollRef.current?.scrollTo({ x: screenWidth, animated: false });
  }}
  ref={scrollRef}
>
  <View style={{ width: screenWidth }}>{/* Previous period */}</View>
  <View style={{ width: screenWidth }}>{/* Current period */}</View>
  <View style={{ width: screenWidth }}>{/* Next period */}</View>
</ScrollView>
```

### 3. Week Time Grid Layout Strategy

**Decision**: Use absolute positioning within a fixed-height container for event blocks. Each hour row = 60px height. Event top/height calculated from time.

```typescript
const HOUR_HEIGHT = 60; // px per hour
const topOffset = (event.startHour - 6) * HOUR_HEIGHT + (event.startMinute / 60) * HOUR_HEIGHT;
const height = ((endTime - startTime) / (60 * 60 * 1000)) * HOUR_HEIGHT;
```

**Overlap handling**: Sort events by start time. Use a simple column-packing algorithm:
1. For each time slot, track occupied columns.
2. Assign each event to the first available column.
3. If >2 columns are occupied, show only 2 event blocks + a "+N more" chip.

Column width = `(dayColumnWidth - 4px gap) / numColumns` with a minimum of 40px.

### 4. Month View Dot Indicators

**Decision**: Show up to 2 small colored dots per day cell. Dots use `EVENT_COLORS[eventType].border` for color. When a day has >2 event types, show dots for the first 2 types by frequency.

Dot rendering is pure derivation from the `eventsByDate` map — no additional state.

### 5. Bottom Sheet Pattern

**Decision**: Reuse the existing Modal + slide animation pattern from the current "Add Event" modal (lines 297–409 of calendar.tsx) rather than adding `@gorhom/bottom-sheet`.

The current codebase already uses this pattern (Modal with transparent background, TouchableOpacity backdrop, animated slide). Consistency matters more than the snap-point features of a dedicated bottom sheet library.

### 6. Date Math — No External Library

**Decision**: Use plain `Date` arithmetic with small helper functions in `calendar/helpers.ts`, matching the existing `getWeekDays()` and `formatHour()` pattern already in the codebase.

Required helpers (all pure functions):
- `startOfWeek(date)` / `endOfWeek(date)` — Sunday-based week bounds
- `startOfMonth(date)` / `endOfMonth(date)` — first/last day
- `getMonthGrid(date)` — returns 42 `Date` objects (6 weeks) for the grid
- `getAdjacentRanges(viewMode, anchorDate)` — returns `{prev, next}` date ranges
- `groupEventsByDate(events)` — returns `Map<string, CalendarEvent[]>` keyed by `date.toDateString()`
- `isSameDay(a, b)` / `isToday(date)` — comparison utilities

This avoids adding `date-fns` (200+ KB) for 10 lines of date math.

## Performance Considerations

### Rendering
- **Month view**: 42 cells rendered, each with 0–2 dots. Lightweight — no virtualization needed.
- **Week time grid**: Up to ~35 event blocks visible (5 per day x 7 days). Each is a simple absolutely-positioned View. No virtualization needed. The outer ScrollView handles vertical scrolling of the 16-hour time range.
- **Day view**: Current ScrollView with event cards. Unchanged.
- **Memoization**: `MonthView` and `WeekTimeGrid` wrapped in `React.memo` with `eventsByDate` map as dependency. `groupEventsByDate` is a `useMemo` in CalendarScreen.

### Network
- **Prefetching** ensures swipe navigation is instant (cache hit).
- **Query deduplication**: TanStack Query deduplicates concurrent requests for the same key. Rapid swipes don't cause N fetches.
- **staleTime: 5min** prevents re-fetching when toggling views for the same period (week ↔ day for the same week hit overlapping data, but use different query keys — acceptable because the prefetch cost is low).

### Memory
- **gcTime: 30min** evicts old period caches. A user browsing many months won't accumulate unbounded cache.
- **3-page ScrollView** for swipe: only 3 periods rendered at any time, not all visited periods.

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| **ScrollView paging jank on Android** | Swipe between periods feels janky or doesn't snap correctly on some Android devices | Medium | Test on Android emulator early. Fallback: use `FlatList` with `getItemLayout` + `snapToInterval` which has more reliable paging behavior on Android. |
| **Week time grid overflow with many events** | If a user has 10+ overlapping events in one time slot, the "+N more" chip logic gets complex | Low | Cap visible blocks at 2 per column. The "+N more" chip is a static count — tapping it could switch to day view for drill-down. Keep layout algorithm simple. |
| **Month grid date range exceeds 500-event API cap** | A month with >500 events would silently truncate | Very Low | Participant calendars are personal — 500 events/month is extreme. If needed, the month view could fetch in two 2-week chunks, but this is premature optimization. |
| **Timezone edge cases** | Events near midnight may appear on wrong day depending on local timezone vs UTC | Medium | All date grouping uses `toDateString()` which respects local timezone. The existing code already does this (line 117). Maintain this pattern in `groupEventsByDate`. |
| **Large refactor of calendar.tsx breaks existing behavior** | Extracting ~400 lines into components introduces regressions | Medium | Extract components one at a time, starting with DayView (pure extraction of lines 196–269) and CreateEventModal (lines 297–409). Verify each extraction preserves behavior before adding new views. Write component tests for each extracted piece. |
| **3-page ScrollView content flash on period change** | When resetting to center page after swipe, the adjacent pages may flash stale content for one frame | Low | Render adjacent pages from prefetched cache data. If cache miss, show a subtle loading skeleton in the adjacent page slot. The reset `scrollTo` with `animated: false` happens synchronously before the next paint in most cases. |
