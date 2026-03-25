# Mobile Programs Page → Today View Redesign

**Date:** 2026-03-25
**Status:** Draft
**Scope:** Redesign the mobile Programs tab into a focused "Today" view. Move program content to a dedicated Program tab. Drop Settings tab (move to header icon).

## Problem

The mobile Programs tab stacks 8+ sections vertically: greeting banner, session card, streak badges, homework cards, tracker cards, and the full program module list. On a ~600px phone screen, the user must scroll 1.5+ viewports before seeing their program content. Information density is too high and nothing feels prioritized.

## Solution

Split into two concerns:
- **Today tab** — a focused daily view showing only what needs attention right now
- **Program tab** — dedicated screen for browsing program modules and parts

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Tab restructure | 5 tabs: Today, Program, Tasks, Calendar, Journal | Settings moves to header gear icon |
| Today view priority | Check-in first, then session, homework, program progress | Daily habit (check-in) is the primary engagement driver |
| Program content | Own tab with module/part list | Deserves dedicated space, not buried below daily items |
| Greeting | Slim one-liner, not a teal banner | Reduce visual weight at top |
| Streak badges | Removed from Today view | Streaks show on individual cards (check-in, homework) instead of a separate section |

## Tab Bar

**Old:** Programs, Tasks, Calendar, Journal, Settings
**New:** Today, Program, Tasks, Calendar, Journal

Settings accessed via gear icon in the header (all screens).

### Tab bar icons (Ionicons — the app uses `@expo/vector-icons`)

| Tab | Icon (Ionicons) | Label |
|---|---|---|
| Today | `today-outline` / `today` | Today |
| Program | `book-outline` / `book` | Program |
| Tasks | `checkbox-outline` / `checkbox` | Tasks |
| Calendar | `calendar-outline` / `calendar` | Calendar |
| Journal | `journal-outline` / `journal` | Journal |

## Today View

The Today tab shows only what needs attention right now. Vertical scroll, no horizontal axes.

### Section 1: Greeting (slim)

One line: "Hi, {firstName}" + today's date on the right. No banner, no background color, no "Welcome to your Steady journey" subtitle. Just a clean header row.

### Section 2: Check-in Card

The participant's single daily tracker (the one `DailyTracker` record where `participantId` matches this user's `ParticipantProfile.id`). Since we now enforce one tracker per participant (via the single check-in model from the earlier spec), the app fetches trackers and renders the first (only) result.

Shows:
- "Daily Check-in" title (use the tracker's `name` field)
- Completion status (checkmark if done today, prompt if not)
- Streak count (flame icon) if > 0
- Tap to open check-in form

If no tracker exists for this participant, this section is hidden.

### Section 3: Upcoming Session (conditional)

Only shows if a session is scheduled today or tomorrow. Shows:
- Session date/time
- Clinician name
- "Join Call" button if video URL exists

If no upcoming session, this section is hidden entirely (not an empty state).

### Section 4: Due Homework (conditional)

Today's homework instances. Each as a compact card:
- Homework title
- Item count
- Completion status
- Tap to open and complete

If no homework due today, this section is hidden.

### Section 5: Program Progress Card

A single compact card showing:
- Current program title
- Current module name
- Progress bar (X of Y modules complete)
- Tap navigates to the Program tab

If not enrolled in any program, shows "No program yet" with a subtle message.

### Rendering logic

Section 5 (Program Progress Card) is **always rendered** — it's the anchor of the page.

Sections 2-4 are conditional — each is hidden when there's no data.

If all of sections 2-4 are hidden (no check-in, no session, no homework), show a friendly "All caught up for today!" message above the Program Progress Card.

### Insights entry point

The current `GreetingBanner` has a "My Insights" link to `/(app)/insights`. This entry point moves to the greeting row — a small chart icon next to the date that navigates to insights. If insights is not a priority, it can be omitted entirely.

### Pull-to-refresh

The Today view uses `RefreshControl` on its `ScrollView`. On pull, invalidate all relevant query keys: `["participant-sessions"]`, `["homework-instances"]`, `["daily-trackers"]`, `["enrollments"]`.

## Program Tab

A dedicated tab for browsing program content. This is the SingleProgramView that currently lives in the Programs tab, but cleaner:

### Single enrollment

- Program header: title, description, cadence
- Module list: collapsible cards, same as current ModuleCard pattern
  - Status icon (locked/unlocked/completed)
  - Module title + progress bar
  - "Current" badge on active module
  - Expand to see PartRow list
  - Tap part to navigate to part detail

### Multiple enrollments

- List of program cards, tap to navigate to program detail
- Same as current multi-enrollment FlatList

### No enrollment

- Empty state: "No program yet — your clinician will enroll you when ready."

## Settings Access

Remove the Settings tab. Add a gear icon button in the header bar (top-right corner, visible on all tabs). Tapping opens the existing settings screen as a stack navigation push.

The settings screen content stays the same — just the navigation entry point changes.

## Files to Change

### Mobile app (`apps/mobile/`)

| File | Action | Purpose |
|---|---|---|
| `app/(app)/(tabs)/programs.tsx` | **Rewrite** → rename to `today.tsx` | Today view with 5 sections |
| `app/(app)/(tabs)/program.tsx` | **Create** | Dedicated program tab |
| `app/(app)/(tabs)/_layout.tsx` | **Modify** | Update tab bar: rename Programs→Today, add Program tab, remove Settings tab, reorder. Remove the `programLabel` enrollment-count query (always label "Program"). |
| `app/(app)/(tabs)/settings.tsx` | **Remove** from tabs | Move to stack navigation |
| `app/(app)/_layout.tsx` | **Modify** | Add `Stack.Screen name="settings"` entry so `router.push("/settings")` works from the gear icon |
| `app/(app)/settings.tsx` | **Create** or **Move** | Settings as a stack screen instead of tab |
| `components/daily-tracker-card.tsx` | **Minor** | Ensure single check-in card works standalone |
| `components/homework-instances.tsx` | **Minor** | Compact card variant for Today view |
| `lib/program-components.tsx` | **Unchanged** | ModuleCard/PartRow reused in Program tab |

### Header gear icon

Add to the tab layout's header configuration (using Ionicons, not Lucide):
```tsx
headerRight: () => (
  <TouchableOpacity onPress={() => router.push("/settings")}>
    <Ionicons name="settings-outline" size={22} color="#2D2D2D" />
  </TouchableOpacity>
)
```

### Sign-out

The inline sign-out button in the old `GreetingBanner` is removed. Sign-out remains accessible via Settings (gear icon → Settings screen → Sign Out button). No replacement needed on the Today view.

## Migration Notes

- The URL `/programs` in the tab bar changes to `/today` — Expo Router handles this via filename
- Deep links to `/programs` should redirect to `/today`
- The program detail screen at `app/(app)/program/[enrollmentId].tsx` stays as-is — it's used when navigating from multi-enrollment list
- `MilestoneCelebration` moves to the Program tab. Its state (`lastCelebratedMilestone` stored via `MILESTONE_STORAGE_KEY` in AsyncStorage) and `useEffect` initialization move with the component to `app/(app)/(tabs)/program.tsx`.
- Audit push notification payloads in `packages/api/src/services/notification-copy.ts` for hardcoded `/programs` paths — update to `/today` if found.

## Testing Strategy

- **Today view:** Verify each section renders/hides correctly based on data (no check-in → hidden, no session → hidden, etc.)
- **Program tab:** Verify module list renders, expand/collapse works, part navigation works
- **Tab bar:** Verify 5 tabs render with correct icons/labels, Settings gear icon works
- **Empty states:** Verify "All caught up" message when nothing due, "No program yet" when not enrolled
