# Sprint 15: Gamification + Voice Capture + Smart Notification Escalation — Architecture

## System Overview

Sprint 15 adds three capabilities across the API and mobile app layers:

1. **Gamification backend** — new `StreakRecord` Prisma model, streak calculation service, pg-boss cron job, stats endpoint extension
2. **Voice capture (mobile-only)** — `expo-speech-recognition` integration with long-press FAB on tasks and mic button on journal; no server-side voice handling
3. **Smart notification escalation** — extends existing notification service with dismissal-aware copy selection; extends existing dismiss/engage API

No new infrastructure dependencies. No web (clinician) UI changes in this sprint.

---

## Prisma Schema Changes

### New enum: `StreakCategory`

```prisma
enum StreakCategory {
  JOURNAL
  CHECKIN
  HOMEWORK
}
```

### New model: `StreakRecord`

```prisma
model StreakRecord {
  id             String         @id @default(cuid())
  userId         String
  user           User           @relation(fields: [userId], references: [id])
  category       StreakCategory
  currentStreak  Int            @default(0)
  longestStreak  Int            @default(0)
  lastActiveDate DateTime       @db.Date
  gapDaysUsed    Int            @default(0)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  @@unique([userId, category])
  @@index([userId])
  @@map("streak_records")
}
```

**User model addition:**
```prisma
model User {
  // ... existing fields ...
  streakRecords  StreakRecord[]
}
```

### No schema change for NotificationPreference

Dismissal data is stored in the existing `customSettings Json?` field. The shape is already established by the existing `recordDismissal` function in `packages/api/src/services/notifications.ts`.

---

## Streak Calculation Algorithm

### Core logic: `packages/api/src/services/streaks.ts`

```typescript
interface StreakInput {
  userId: string;
  category: StreakCategory;
  activeDates: string[]; // ISO date strings, sorted ascending
  timezone: string;
}

interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  gapDaysUsed: number;
}

function calculateStreak(input: StreakInput): StreakResult;
```

**Algorithm (walk backward from today):**

1. Get today's date in the participant's timezone.
2. Sort `activeDates` descending.
3. Walk backward from today, day by day:
   - If the day is in `activeDates`: increment `currentStreak`, continue.
   - If the day is NOT in `activeDates` and `gapDaysUsed < 1` within the current rolling 7-day window: increment `gapDaysUsed`, increment `currentStreak`, continue (forgiveness applied).
   - If the day is NOT in `activeDates` and `gapDaysUsed >= 1` within the current 7-day window: streak is broken. Stop.
4. Track `longestStreak` as `max(existingRecord.longestStreak, currentStreak)`.
5. `lastActiveDate` = most recent date in `activeDates`.

**Rolling 7-day window definition:** For every consecutive 7 days within the streak, at most 1 gap day is forgiven. The window slides with the streak: days 1-7 get 1 forgiveness, days 8-14 get 1 forgiveness, etc.

### Data sources per category

| Category | Query | Active date definition |
|---|---|---|
| `JOURNAL` | `JournalEntry` where `participantId` matches, `entryDate` in last 60 days | `entryDate` |
| `CHECKIN` | `DailyTrackerEntry` where `userId` matches, `date` in last 60 days | `date` |
| `HOMEWORK` | `HomeworkInstance` where `participantId` matches, `status = COMPLETED`, `completedAt` in last 60 days | `completedAt` date portion |

### Cron job: `calculate-streaks`

**Schedule:** `0 2 * * *` (2 AM UTC daily)

**Worker registration** (added to `registerNotificationWorkers` in `packages/api/src/services/notifications.ts`):

```typescript
await boss.createQueue("calculate-streaks");
await boss.work("calculate-streaks", async () => {
  await calculateAllStreaks();
});
await boss.schedule("calculate-streaks", "0 2 * * *");
```

**`calculateAllStreaks` function:**

1. Query all users with role `PARTICIPANT` and at least one active enrollment.
2. For each user, for each category:
   a. Query the relevant activity dates (last 60 days).
   b. Call `calculateStreak()`.
   c. Upsert `StreakRecord`.
3. Process in batches of 100 to avoid memory pressure.

---

## API Changes

### New route: `GET /api/stats/streaks`

**File:** `packages/api/src/routes/stats.ts` (extend existing)

**Middleware:** `authenticate`, `requireRole("PARTICIPANT")`

**Handler:**
```typescript
const streaks = await prisma.streakRecord.findMany({
  where: { userId: req.user.userId },
  select: {
    category: true,
    currentStreak: true,
    longestStreak: true,
    lastActiveDate: true,
  },
});
res.json({ success: true, data: streaks });
```

### Extend existing: `GET /api/stats/:participantId`

Add `streaks` field to the `getParticipantStats` response. Query `StreakRecord` for the target participant (clinician ownership already verified by existing middleware).

### Existing endpoints (already implemented): dismiss and engage

The `recordDismissal` function already exists in `packages/api/src/services/notifications.ts`. The routes `POST /api/notifications/dismiss` and `POST /api/notifications/engage` need to be added to `packages/api/src/routes/notifications.ts` if not already present.

**`POST /api/notifications/dismiss`:**
- Middleware: `authenticate`, `requireRole("PARTICIPANT")`
- Body: `{ category: NotificationCategory }` (Zod-validated)
- Calls existing `recordDismissal(userId, category)`

**`POST /api/notifications/engage`:**
- Middleware: `authenticate`, `requireRole("PARTICIPANT")`
- Body: `{ category: NotificationCategory }` (Zod-validated)
- Clears `customSettings.dismissals` for the matching user+category preference

### Engage implementation

```typescript
export async function resetDismissals(
  userId: string,
  category: string
): Promise<void> {
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId_category: { userId, category: category as any } },
  });
  if (!pref) return;

  const existingSettings = (pref.customSettings as any) || {};
  await prisma.notificationPreference.update({
    where: { id: pref.id },
    data: {
      customSettings: { ...existingSettings, dismissals: [] },
    },
  });
}
```

---

## Notification Escalation Service

The escalation logic already exists in `packages/api/src/services/notifications.ts` (lines 50-57). The `sendPushNotification` function already:

1. Calls `getRecentDismissals(userId, 7)`.
2. If count >= 3, replaces title/body with `getDiagnosticPromptCopy(category)`.

The `getDiagnosticPromptCopy` function exists in `packages/api/src/services/notification-copy.ts`. Sprint 15 verifies and extends the copy for all 5 notification categories:

| Category | Escalated title | Escalated body |
|---|---|---|
| `MORNING_CHECKIN` | "Checking in on you" | "Seems like mornings have been tough this week. What's one small thing you could do today?" |
| `HOMEWORK` | "We noticed you've been away" | "Seems like homework has been hard this week. What's getting in the way?" |
| `SESSION` | "Your sessions matter" | "It looks like session reminders haven't been helpful lately. Is there something we can adjust?" |
| `TASK` | "Tasks piling up?" | "When tasks feel overwhelming, it helps to pick just one. What's the smallest thing you could start?" |
| `WEEKLY_REVIEW` | "Reflection is optional" | "Weekly reviews haven't felt right lately. Would a different day or time work better?" |

---

## Mobile Architecture

### Voice Capture Module

**File:** `apps/mobile/lib/voice-capture.ts`

```typescript
export interface VoiceCaptureResult {
  text: string;
  confidence: number;
}

export interface VoiceCaptureCallbacks {
  onStart: () => void;
  onResult: (result: VoiceCaptureResult) => void;
  onError: (error: string) => void;
  onEnd: () => void;
}

export function startVoiceCapture(callbacks: VoiceCaptureCallbacks): void;
export function stopVoiceCapture(): void;
export function isVoiceCaptureAvailable(): Promise<boolean>;
export function requestMicrophonePermission(): Promise<boolean>;
```

**Implementation:** Wraps `expo-speech-recognition` with:
- Permission checking and requesting
- On-device mode enforcement
- Error mapping to user-friendly messages
- Automatic timeout (15 seconds max recording)

### Tasks Screen Voice Integration

**File:** `apps/mobile/app/(app)/(tabs)/tasks.tsx` (modify existing FAB)

- Wrap existing `TouchableOpacity` FAB with `Pressable` for `onLongPress` support.
- `onPress` (tap): opens add-task modal as before.
- `onLongPress` (500ms hold): starts voice capture.
- New state: `isRecording`, `isTranscribing`.
- On successful transcription: set `title` state with transcribed text, open add-task modal.

### Journal Screen Voice Integration

**File:** `apps/mobile/app/(app)/(tabs)/journal.tsx` (add mic button)

- Add a microphone `TouchableOpacity` next to the "Daily Reflection" heading.
- On tap: toggle voice capture on/off.
- Real-time partial results append to `content` state.
- On stop: final result committed.

### Completion Animations

**File:** `apps/mobile/components/completion-animations.tsx`

```typescript
// Task completion: spring scale on checkbox
export function useTaskCompletionAnimation(): {
  animatedStyle: AnimatedStyle;
  triggerAnimation: () => void;
};

// Module completion: full-screen confetti overlay
export function ModuleCompletionOverlay(props: {
  visible: boolean;
  onDismiss: () => void;
}): JSX.Element;

// Milestone celebration: bottom sheet
export function MilestoneCelebration(props: {
  milestone: 7 | 14 | 21 | 30;
  category: StreakCategory;
  visible: boolean;
  onDismiss: () => void;
}): JSX.Element;
```

**Animation specs:**
- Task checkbox: `react-native-reanimated` spring — scale 1.0 -> 1.3 -> 1.0, damping 10, stiffness 150, mass 0.5. Duration ~300ms. Haptic: `Haptics.impactAsync(ImpactFeedbackStyle.Medium)`.
- Module confetti: `react-native-confetti-cannon` or custom particle system. 3-second auto-dismiss. Full-screen `<Modal transparent>`.
- Milestone bottom sheet: reuse existing bottom-sheet pattern from the app. Flame icon, streak count, congratulatory text, "Keep going!" button.

### Streak Display on Home Screen

**File:** `apps/mobile/app/(app)/(tabs)/today.tsx` (extend `WeeklyStreakWidget`)

The `WeeklyStreakWidget` already shows streak data from the tracker. Sprint 15 extends it to:
1. Query `GET /api/stats/streaks` alongside existing today-screen data.
2. Show the highest active streak across all categories.
3. Check for unseen milestones (compare streak values against AsyncStorage-tracked seen milestones).
4. Trigger `MilestoneCelebration` if a new milestone is detected.

### Engagement Tracking (Mobile)

**File:** `apps/mobile/lib/engagement-tracker.ts`

```typescript
const SCREEN_CATEGORY_MAP: Record<string, string> = {
  "/(app)/(tabs)/tasks": "TASK",
  "/(app)/(tabs)/journal": "MORNING_CHECKIN",
  "/(app)/(tabs)/program": "HOMEWORK",
};

export function useEngagementTracking(): void;
```

Uses `expo-router`'s navigation state listener. On screen focus, if the screen maps to a notification category, fire `POST /api/notifications/engage`.

Debounced to fire at most once per category per 5-minute window (avoid flooding on rapid tab switching).

---

## File Structure Summary

### New files

```
packages/api/src/services/streaks.ts          — streak calculation logic
packages/api/src/__tests__/streaks.test.ts     — streak service unit tests
packages/api/src/__tests__/streaks-api.test.ts — streak API integration tests
packages/api/src/__tests__/notification-dismiss.test.ts — dismiss/engage tests

apps/mobile/lib/voice-capture.ts               — expo-speech-recognition wrapper
apps/mobile/lib/engagement-tracker.ts          — screen-to-category engagement events
apps/mobile/components/completion-animations.tsx — task/module/milestone animations
```

### Modified files

```
packages/db/prisma/schema.prisma               — add StreakCategory enum + StreakRecord model
packages/api/src/services/notifications.ts     — add resetDismissals function
packages/api/src/routes/stats.ts               — add GET /api/stats/streaks
packages/api/src/routes/notifications.ts       — add dismiss + engage endpoints
packages/api/src/services/stats.ts             — extend getParticipantStats with streaks
packages/shared/src/schemas/stats.ts           — add streak response schema

apps/mobile/app/(app)/(tabs)/today.tsx         — streak display + milestone trigger
apps/mobile/app/(app)/(tabs)/tasks.tsx         — long-press FAB voice capture
apps/mobile/app/(app)/(tabs)/journal.tsx       — mic button voice capture
apps/mobile/components/animated-checkbox.tsx   — add spring animation on completion
```

---

## Compliance Conditions Mapping

| Condition | Implementation location |
|---|---|
| COND-1 On-device voice | `apps/mobile/lib/voice-capture.ts` — configure `expo-speech-recognition` for on-device mode |
| COND-2 Streak data isolation | `packages/api/src/routes/stats.ts` — filter by `req.user.userId` |
| COND-3 Enum-only dismiss/engage | `packages/shared/src/schemas/stats.ts` — Zod schema with `z.nativeEnum(NotificationCategory)` |
| COND-4 No content in logs | `packages/api/src/services/notifications.ts` — logger calls use only userId + category + boolean |
| COND-5 Voice text same path | `apps/mobile/app/(app)/(tabs)/tasks.tsx` and `journal.tsx` — voice sets same state as keyboard |

---

## Dependencies

| Dependency | Version | Purpose | New? |
|---|---|---|---|
| `expo-speech-recognition` | ^2.x | On-device speech-to-text | Yes (mobile only) |
| `expo-haptics` | existing | Haptic feedback on task completion | No |
| `react-native-reanimated` | existing | Spring animations | No |
| `react-native-confetti-cannon` | ^1.5 | Module completion confetti | Yes (mobile only) |
| `pg-boss` | existing | Streak calculation cron job | No |

---

## Migration Plan

1. Add `StreakCategory` enum and `StreakRecord` model to Prisma schema.
2. Run `npm run db:generate` and `npm run db:push`.
3. The streak cron job will populate `StreakRecord` rows on its first run. No backfill migration needed — the calculation looks at the last 60 days of activity data.
4. Mobile app update required for voice capture and animations. Feature-flagged behind client config if needed.
