# Mobile Calendar Views — Implementation Plan

## Implementation Summary

### Files Created (18 new files)

**Helpers & Constants**
- `apps/mobile/components/calendar/constants.ts` — EVENT_COLORS, HOUR_HEIGHT, layout constants
- `apps/mobile/components/calendar/helpers.ts` — 20+ pure functions for date math, grid generation, event grouping, label formatting

**Shared UI Components**
- `apps/mobile/components/calendar/segmented-control.tsx` — Day/Week/Month toggle
- `apps/mobile/components/calendar/navigation-row.tsx` — Chevrons + period label + today button
- `apps/mobile/components/calendar/mini-agenda-sheet.tsx` — Bottom sheet with event list
- `apps/mobile/components/calendar/event-block.tsx` — Compact event for week grid

**Views**
- `apps/mobile/components/calendar/month-view.tsx` — 6x7 grid with dots and today highlight
- `apps/mobile/components/calendar/week-time-grid.tsx` — 24-hour time grid with event blocks
- `apps/mobile/components/calendar/day-view.tsx` — Extracted from calendar.tsx
- `apps/mobile/components/calendar/event-card.tsx` — Extracted event card
- `apps/mobile/components/calendar/day-pills.tsx` — Extracted day pill selector
- `apps/mobile/components/calendar/create-event-modal.tsx` — Extracted create modal

**Tests**
- `apps/mobile/components/calendar/__tests__/helpers.test.ts` — 22 unit tests
- `apps/mobile/components/calendar/__tests__/segmented-control.test.tsx` — 5 tests
- `apps/mobile/components/calendar/__tests__/navigation-row.test.tsx` — 5 tests
- `apps/mobile/components/calendar/__tests__/mini-agenda-sheet.test.tsx` — 8 tests
- `apps/mobile/components/calendar/__tests__/month-view.test.tsx` — 10 tests
- `apps/mobile/components/calendar/__tests__/week-time-grid.test.tsx` — 11 tests

### Files Modified (1 file)
- `apps/mobile/app/(app)/(tabs)/calendar.tsx` — Rewritten as orchestrator with view toggle, swipe navigation, and prefetching

### Key Decisions
- No third-party calendar library — plain RN Views
- Column-packing algorithm for week view overlap (max 2 visible + "+N more")
- Query keys: ["calendar", start.toISOString(), end.toISOString()]
- staleTime 5min, gcTime 30min
- All testIDs match QA spec
