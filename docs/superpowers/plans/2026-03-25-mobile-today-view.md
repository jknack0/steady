# Mobile Today View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cluttered mobile Programs tab with a focused "Today" view and a dedicated "Program" tab. Move Settings to a gear icon in the header.

**Architecture:** Rename `programs.tsx` to `today.tsx` with 5 clean sections. Create `program.tsx` for module/part browsing. Update `_layout.tsx` for new tabs. Move `settings.tsx` from tabs to a stack screen. All existing components (ModuleCard, DailyTrackerCards, HomeworkInstances) are reused.

**Tech Stack:** Expo 54, React Native 0.81, Expo Router, NativeWind, TanStack Query, @expo/vector-icons (Ionicons)

**Spec:** `docs/superpowers/specs/2026-03-25-mobile-today-view-design.md`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `apps/mobile/app/(app)/(tabs)/_layout.tsx` | **Rewrite** | 5 tabs: today, program, tasks, calendar, journal. Gear icon in header. Remove enrollment-count query. |
| `apps/mobile/app/(app)/(tabs)/programs.tsx` | **Delete** | Replaced by today.tsx |
| `apps/mobile/app/(app)/(tabs)/today.tsx` | **Create** | Focused Today view: greeting, check-in, session, homework, program progress |
| `apps/mobile/app/(app)/(tabs)/program.tsx` | **Create** | Dedicated program tab: module list, part navigation |
| `apps/mobile/app/(app)/(tabs)/settings.tsx` | **Delete** | Moved to stack screen |
| `apps/mobile/app/(app)/_layout.tsx` | **Modify** | Add `Stack.Screen name="settings"` |
| `apps/mobile/app/(app)/settings.tsx` | **Create** | Settings as a stack screen (copy content from old tab) |

---

## Task 1: Move Settings to Stack Screen

**Files:**
- Modify: `apps/mobile/app/(app)/_layout.tsx`
- Create: `apps/mobile/app/(app)/settings.tsx`

This task must come first — the Settings tab gets removed from the tab bar in Task 2, so the stack screen needs to exist before that.

- [ ] **Step 1: Read the current settings tab**

Read `apps/mobile/app/(app)/(tabs)/settings.tsx` completely to understand its content (notification prefs, sign-out, etc.).

- [ ] **Step 2: Create the stack settings screen**

Create `apps/mobile/app/(app)/settings.tsx`. Copy the entire content from `apps/mobile/app/(app)/(tabs)/settings.tsx` — same component, different location. The only change: it's now a stack screen, not a tab screen.

- [ ] **Step 3: Register in stack layout**

In `apps/mobile/app/(app)/_layout.tsx`, add a new `Stack.Screen` after the existing screens (before the closing `</Stack>` tag):

```tsx
<Stack.Screen
  name="settings"
  options={{ title: "Settings", headerBackTitle: "Back" }}
/>
```

- [ ] **Step 4: Verify**

The app should still work — Settings tab still exists (we haven't removed it yet), and the new stack route is registered.

- [ ] **Step 5: Commit**

```bash
git add "apps/mobile/app/(app)/settings.tsx" "apps/mobile/app/(app)/_layout.tsx"
git commit -m "feat(mobile): add settings as a stack screen

Copy settings content to stack route. Register Stack.Screen for
gear icon navigation (tab removal happens in next task)."
```

---

## Task 2: Rewrite Tab Layout

**Files:**
- Rewrite: `apps/mobile/app/(app)/(tabs)/_layout.tsx`

- [ ] **Step 1: Read the current layout**

Read `apps/mobile/app/(app)/(tabs)/_layout.tsx` completely. Understand the tab configuration, the `BrandHeader`, the enrollment-count query for `programLabel`, and the conditional tab rendering.

- [ ] **Step 2: Rewrite the layout**

Replace the entire file with:

1. **Remove** the enrollment-count query (`useQuery` for enrollments) — no longer needed
2. **Keep** the `BrandHeader` component
3. **Add** a settings gear icon in `screenOptions.headerRight`:

```tsx
import { TouchableOpacity } from "react-native";
import { router } from "expo-router";

// In screenOptions:
headerRight: () => (
  <TouchableOpacity onPress={() => router.push("/settings")} style={{ marginRight: 16 }}>
    <Ionicons name="settings-outline" size={22} color="#2D2D2D" />
  </TouchableOpacity>
),
```

4. **Configure 5 tabs** in this order:

```tsx
<Tabs.Screen
  name="today"
  options={{
    headerTitle: () => <BrandHeader />,
    title: "Today",
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="today-outline" size={size} color={color} />
    ),
  }}
/>
<Tabs.Screen
  name="program"
  options={{
    headerTitle: () => <BrandHeader />,
    title: "Program",
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="library-outline" size={size} color={color} />
    ),
  }}
/>
```

Then Tasks, Calendar, Journal — same conditional rendering pattern as current (`isModuleEnabled`). But **remove the Settings tab**.

5. **Hide the old files** — add `href: null` for any tab files that still exist but shouldn't show:

```tsx
<Tabs.Screen name="programs" options={{ href: null }} />
<Tabs.Screen name="settings" options={{ href: null }} />
```

This prevents Expo Router errors for files that exist in the directory but aren't tabs.

- [ ] **Step 3: Verify tab bar renders**

The app should show: Today (empty for now), Program (empty), Tasks, Calendar, Journal. Gear icon in header navigates to Settings.

- [ ] **Step 4: Commit**

```bash
git add "apps/mobile/app/(app)/(tabs)/_layout.tsx"
git commit -m "feat(mobile): restructure tabs — Today, Program, Tasks, Calendar, Journal

Remove Settings tab (gear icon in header instead). Remove enrollment
count query. Add Today and Program tabs."
```

---

## Task 3: Create Program Tab

**Files:**
- Create: `apps/mobile/app/(app)/(tabs)/program.tsx`

- [ ] **Step 1: Read the current SingleProgramView**

Read `apps/mobile/app/(app)/(tabs)/programs.tsx` lines ~254-400 (the `SingleProgramView` component and enrollment/module rendering). Also read `apps/mobile/lib/program-components.tsx` for `ModuleCard`.

- [ ] **Step 2: Create program.tsx**

Extract the program content into a dedicated tab. The file should:

1. Fetch enrollments via the same query as current `programs.tsx`
2. If 0 enrollments: show empty state "No program yet — your clinician will enroll you when ready."
3. If 1 enrollment: render `SingleProgramView` inline (program header + module list)
4. If >1 enrollments: render enrollment cards FlatList (same as current)
5. Include `MilestoneCelebration` component with its state (`MILESTONE_STORAGE_KEY`, `useEffect` for storage initialization)
6. Include `RefreshControl` for pull-to-refresh

Import `ModuleCard`, `SingleProgramView` pattern, `MilestoneCelebration` from existing locations.

- [ ] **Step 3: Verify**

Program tab should show the module list for enrolled participants.

- [ ] **Step 4: Commit**

```bash
git add "apps/mobile/app/(app)/(tabs)/program.tsx"
git commit -m "feat(mobile): create dedicated Program tab

Module list, enrollment handling, milestone celebrations.
Extracted from old programs.tsx SingleProgramView."
```

---

## Task 4: Create Today View

**Files:**
- Create: `apps/mobile/app/(app)/(tabs)/today.tsx`

This is the core task — the new focused daily view.

- [ ] **Step 1: Read existing components**

Read these files to understand what's available:
- `apps/mobile/components/daily-tracker-card.tsx` — `DailyTrackerCards`
- `apps/mobile/components/homework-instances.tsx` — `TodaysHomeworkInstances`
- `apps/mobile/app/(app)/(tabs)/programs.tsx` — `UpcomingSessionCard`, `GreetingBanner`
- `apps/mobile/lib/auth-context.tsx` — for `useAuth` (user's name)

- [ ] **Step 2: Create today.tsx**

Build the Today view with these sections in order:

**Section 1: Greeting** — slim one-liner
```tsx
<View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
  <Text style={{ fontSize: 22, fontFamily: "PlusJakartaSans_700Bold", color: "#2D2D2D" }}>
    Hi, {user?.firstName}
  </Text>
  <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_500Medium", color: "#8A8A8A" }}>
    {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
  </Text>
</View>
```

**Section 2: Check-in Card** — reuse `DailyTrackerCards` from `components/daily-tracker-card.tsx`. It already renders tracker cards for the user. With the single check-in model, it shows one card.

**Section 3: Upcoming Session** — reuse or copy `UpcomingSessionCard` from the old `programs.tsx` (lines 31-96). It's self-contained with its own `useQuery`.

**Section 4: Due Homework** — reuse `TodaysHomeworkInstances` from `components/homework-instances.tsx`. It already handles conditional rendering (hidden when no homework).

**Section 5: Program Progress Card** — a new compact card:
```tsx
function ProgramProgressCard() {
  // Fetch enrollments
  const { data: enrollments } = useQuery({
    queryKey: ["enrollments"],
    queryFn: async () => {
      const res = await api.getEnrollments();
      return res.success ? res.data : [];
    },
  });

  const active = enrollments?.find((e: any) => e.status === "ACTIVE");
  if (!active) {
    return (
      <View style={{ /* card styling */ }}>
        <Text>No program yet</Text>
        <Text>Your clinician will enroll you when ready.</Text>
      </View>
    );
  }

  // Render: program title, progress bar, "Open Program" touchable
  // On press: switch to Program tab
  return (
    <TouchableOpacity onPress={() => router.push("/(app)/(tabs)/program")}>
      {/* Card with title, progress bar */}
    </TouchableOpacity>
  );
}
```

**"All caught up" empty state** — show when sections 2-4 are all hidden.

**Pull-to-refresh** — `RefreshControl` on `ScrollView` that invalidates relevant query keys.

The Today view does NOT include:
- ~~Teal greeting banner~~
- ~~Streak badges section~~
- ~~Module list / part rows~~
- ~~Sign-out button~~
- ~~Insights card~~ (or optionally, small icon in greeting row)

- [ ] **Step 3: Verify**

Today tab shows the 5 sections with correct conditional rendering.

- [ ] **Step 4: Commit**

```bash
git add "apps/mobile/app/(app)/(tabs)/today.tsx"
git commit -m "feat(mobile): create Today view — focused daily screen

Greeting, check-in, session, homework, program progress.
Clean and prioritized for daily engagement."
```

---

## Task 5: Delete Old Files + Cleanup

**Files:**
- Delete: `apps/mobile/app/(app)/(tabs)/programs.tsx`
- Delete: `apps/mobile/app/(app)/(tabs)/settings.tsx`

- [ ] **Step 1: Delete old programs.tsx**

```bash
rm apps/mobile/app/(app)/(tabs)/programs.tsx
```

If the tab layout has `<Tabs.Screen name="programs" options={{ href: null }} />`, this file deletion will cause an Expo Router error. Either:
- Keep the file with a minimal redirect component: `export default function() { return null; }`
- Or ensure `_layout.tsx` doesn't reference `programs` at all

The safest approach: keep a minimal `programs.tsx` that redirects:
```tsx
import { Redirect } from "expo-router";
export default function() { return <Redirect href="/(app)/(tabs)/today" />; }
```

- [ ] **Step 2: Delete old settings.tsx from tabs**

Same approach — keep minimal redirect or null component if referenced in layout:
```tsx
import { Redirect } from "expo-router";
export default function() { return <Redirect href="/settings" />; }
```

- [ ] **Step 3: Audit push notification paths**

Check `packages/api/src/services/notification-copy.ts` for any hardcoded `/programs` paths. If found, update to `/today`.

```bash
grep -r "programs" packages/api/src/services/notification-copy.ts
```

- [ ] **Step 4: Verify**

Run the app. All 5 tabs work. Settings gear icon works. No dead routes.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(mobile): cleanup — redirect old routes, audit notifications

Replace old programs.tsx and settings.tsx with minimal redirects.
Check notification paths for /programs references."
```

---

## Task 6: Final Verification

- [ ] **Step 1: Test Today tab**
- Greeting shows user's name + date
- Check-in card shows (or hidden if no tracker)
- Session card shows (or hidden if no session)
- Homework cards show (or hidden if none due)
- Program progress card always shows
- "All caught up" shows when nothing due
- Pull-to-refresh works

- [ ] **Step 2: Test Program tab**
- Module list renders for enrolled user
- Expand/collapse modules works
- Tapping a part navigates to part detail
- Empty state shows for non-enrolled user
- Milestone celebration works

- [ ] **Step 3: Test Settings**
- Gear icon visible on all tabs
- Tapping gear opens Settings screen
- Sign out works from Settings
- Notification preferences render
- Back navigation works

- [ ] **Step 4: Test tab bar**
- 5 tabs visible with correct icons and labels
- Active tab highlighted in teal
- Tab switching works

- [ ] **Step 5: Commit if cleanup needed**

```bash
git add <files>
git commit -m "chore: mobile today view cleanup"
```
