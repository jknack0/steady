# Sprint 15: Gamification + Voice Capture + Smart Notification Escalation — Feature Specification

## Overview

Sprint 15 introduces three participant-engagement capabilities: (1) gamification with completion animations, streak tracking with gap-day forgiveness, and milestone celebrations; (2) voice-to-text capture on the tasks and journal screens; and (3) smart notification escalation that detects repeated dismissals and shifts notification tone from reminder to empathetic inquiry.

## Glossary

| Term | Definition |
|---|---|
| **StreakRecord** | Server-side per-user per-category record tracking current streak length, longest streak, last active date, and gap-day usage within a rolling 7-day window. |
| **Gap-day forgiveness** | A missed day within a 7-day window that does not break the streak. Each participant gets 1 forgiveness day per rolling 7-day window per category. |
| **Milestone** | A streak length threshold (7, 14, 21, 30 days) that triggers a celebration bottom sheet. |
| **Notification escalation** | The system's behavior of changing notification copy after detecting 3+ dismissals in a 7-day window for a given category. |
| **Engagement reset** | When a participant opens a screen matching a notification category, the dismissal counter for that category resets to zero. |

---

## User Stories

| ID | Story |
|---|---|
| US-1 | As a **participant**, I want to **see a streak count and flame badge on my home screen** so I feel motivated to maintain daily engagement. |
| US-2 | As a **participant**, I want **a 1-day forgiveness window per 7 days** so a single missed day doesn't destroy my streak. |
| US-3 | As a **participant**, I want to **see a spring animation when I complete a task** so I get immediate positive reinforcement. |
| US-4 | As a **participant**, I want to **see a full-screen celebration when I complete a module** so milestones feel rewarding. |
| US-5 | As a **participant**, I want to **see milestone celebrations at 7, 14, 21, and 30 days** so I have near-term goals. |
| US-6 | As a **participant**, I want to **long-press the FAB on the tasks screen to record a task by voice** so I can capture ideas without typing. |
| US-7 | As a **participant**, I want to **tap a microphone button on the journal screen to dictate my entry** so journaling feels lower-effort. |
| US-8 | As a **participant**, I want **notifications that change tone after repeated dismissals** so they feel supportive. |
| US-9 | As a **participant**, I want **the escalation counter to reset when I engage** so the system recognizes my effort. |
| US-10 | As a **clinician**, I want to **see participant streak data via the stats endpoint** so I can discuss consistency in sessions. |

---

## Functional Requirements

### FR-1: Streak record computation

A daily pg-boss cron job computes and upserts streak records for every active participant.

**Acceptance Criteria:**
- **GIVEN** a participant with journal entries on 5 consecutive days
  **WHEN** the streak cron job runs
  **THEN** a `StreakRecord` exists with `category = JOURNAL`, `currentStreak = 5`, `gapDaysUsed = 0`
- **GIVEN** a participant who journaled on days 1-4, missed day 5, journaled day 6
  **WHEN** the streak cron job runs
  **THEN** `currentStreak = 6`, `gapDaysUsed = 1` (forgiveness applied)
- **GIVEN** a participant who missed 2 days within a 7-day window
  **WHEN** the streak cron job runs
  **THEN** the streak resets to the count since the second missed day (only 1 gap forgiven per 7-day window)
- **GIVEN** a participant with `currentStreak = 6` and `gapDaysUsed = 1` who misses another day within the same 7-day window
  **WHEN** the streak cron job runs
  **THEN** `currentStreak` resets to 0, `gapDaysUsed` resets to 0
- **GIVEN** a streak record where `currentStreak > longestStreak`
  **WHEN** the cron job runs
  **THEN** `longestStreak` is updated to match `currentStreak`

### FR-2: Streak retrieval

**Acceptance Criteria:**
- **GIVEN** an authenticated participant
  **WHEN** they `GET /api/stats/streaks`
  **THEN** the response contains an array of streak records (one per active category) with `category`, `currentStreak`, `longestStreak`, `lastActiveDate`
- **GIVEN** no streak records exist for the participant
  **WHEN** they request streaks
  **THEN** the response contains an empty array
- **GIVEN** an authenticated clinician viewing a participant's stats
  **WHEN** they `GET /api/stats/:participantId` (existing endpoint)
  **THEN** the response includes a `streaks` field alongside existing stats

### FR-3: Task completion animation

**Acceptance Criteria:**
- **GIVEN** a participant on the tasks screen
  **WHEN** they tap the checkbox to mark a task as done
  **THEN** the checkbox plays a spring scale-up animation (1.0 -> 1.3 -> 1.0, 300ms) with haptic feedback (medium impact), and the task row fades to 70% opacity over 500ms
- **GIVEN** a participant with `prefers-reduced-motion` enabled
  **WHEN** they complete a task
  **THEN** the checkbox changes state instantly without animation; haptic feedback still fires

### FR-4: Module completion celebration

**Acceptance Criteria:**
- **GIVEN** a participant who completes the last required part of a module
  **WHEN** the module progress status transitions to `COMPLETED`
  **THEN** a full-screen overlay displays with confetti animation for 3 seconds, then auto-dismisses
- **GIVEN** the celebration overlay is showing
  **WHEN** the participant taps anywhere on the overlay
  **THEN** it dismisses immediately
- **GIVEN** `prefers-reduced-motion` is enabled
  **WHEN** a module completes
  **THEN** a static "Module complete!" banner shows for 3 seconds instead of the confetti overlay

### FR-5: Streak milestone celebration

**Acceptance Criteria:**
- **GIVEN** a participant whose streak just reached 7, 14, 21, or 30 days (detected on app open or after streak-contributing action)
  **WHEN** the milestone is detected
  **THEN** a bottom sheet appears with the milestone count, a congratulatory message, and a flame icon
- **GIVEN** the milestone bottom sheet is showing
  **WHEN** the participant taps "Keep going!" or swipes down
  **THEN** it dismisses
- **GIVEN** a milestone has already been shown for this streak length
  **WHEN** the participant re-opens the app
  **THEN** the milestone is not shown again (tracked in AsyncStorage)

### FR-6: Voice capture on tasks screen

**Acceptance Criteria:**
- **GIVEN** a participant on the tasks screen
  **WHEN** they long-press the FAB (500ms hold)
  **THEN** the FAB transforms into a recording indicator (pulsing red dot), and speech recognition starts
- **GIVEN** speech recognition is active
  **WHEN** the participant releases the FAB
  **THEN** the recording stops, a "Transcribing..." label appears, and on success the transcribed text populates the new-task title field and the add-task modal opens
- **GIVEN** the microphone permission has not been granted
  **WHEN** the participant long-presses the FAB
  **THEN** the OS permission prompt appears; if denied, an inline message appears: "Microphone access needed for voice input. You can enable it in Settings."
- **GIVEN** transcription fails (timeout, no speech detected, error)
  **WHEN** the error occurs
  **THEN** an error toast appears: "Couldn't catch that. Try again or type instead." The FAB returns to its normal state.
- **GIVEN** a device without speech recognition support
  **WHEN** the participant long-presses the FAB
  **THEN** a toast appears: "Voice input isn't available on this device."

### FR-7: Voice capture on journal screen

**Acceptance Criteria:**
- **GIVEN** a participant on the journal screen (today view)
  **WHEN** they tap the microphone button next to the text input
  **THEN** the button shows a pulsing red dot, speech recognition starts, and recognized text is appended to the existing journal content in real time
- **GIVEN** speech recognition is active on the journal screen
  **WHEN** the participant taps the microphone button again
  **THEN** recognition stops and the final transcribed text is committed to the input field
- **GIVEN** permission denied or transcription failure
  **WHEN** the error occurs
  **THEN** the same graceful degradation as FR-6 applies (inline message for permission, toast for transcription failure)

### FR-8: Track notification dismissal

**Acceptance Criteria:**
- **GIVEN** a participant who dismisses a push notification
  **WHEN** the mobile app's notification handler detects the dismissal
  **THEN** `POST /api/notifications/dismiss` is called with `{ category: string }`
- **GIVEN** the dismiss endpoint receives a valid request
  **WHEN** processed
  **THEN** a dismissal record is appended to `NotificationPreference.customSettings.dismissals` for the matching category, and entries older than 30 days are trimmed
- **GIVEN** no `NotificationPreference` exists for this user+category
  **WHEN** a dismissal is recorded
  **THEN** a new preference is created with `enabled: true` and the dismissal record

### FR-9: Notification escalation logic

**Acceptance Criteria:**
- **GIVEN** a participant with 3+ dismissals for a category in the last 7 days
  **WHEN** the notification service prepares to send a reminder for that category
  **THEN** the notification title and body are replaced with a diagnostic/empathetic prompt (e.g., category HOMEWORK: "Seems like homework has been hard this week. What's getting in the way?")
- **GIVEN** a participant with 2 dismissals in the last 7 days
  **WHEN** the notification service prepares to send
  **THEN** the standard notification copy is used (no escalation)
- **GIVEN** escalation is active
  **WHEN** the notification is sent
  **THEN** the escalated copy is used for that single notification; the next notification re-evaluates dismissal count

### FR-10: Engagement reset

**Acceptance Criteria:**
- **GIVEN** a participant with 4 dismissals for HOMEWORK category
  **WHEN** they `POST /api/notifications/engage` with `{ category: "HOMEWORK" }`
  **THEN** all dismissal records for that category are cleared from `customSettings`
- **GIVEN** the mobile app
  **WHEN** the participant navigates to a screen matching a notification category (tasks screen -> TASK, journal screen -> MORNING_CHECKIN, program screen -> HOMEWORK)
  **THEN** the app sends the engage event for the matching category

---

## Permissions & Multi-tenancy

| Actor | Can do |
|---|---|
| **Unauthenticated** | Nothing |
| **Participant** | Read own streaks; dismiss/engage notifications; use voice capture locally |
| **Clinician** | Read participant streaks via existing stats endpoint |
| **Admin** | Same as clinician |

**Tenant isolation:**
- Streak records filter by `userId` from JWT
- Notification dismiss/engage filter by `userId` from JWT
- No cross-participant data exposure

---

## Data Model Requirements

### New model: `StreakRecord`

| Field | Type | Notes |
|---|---|---|
| `id` | String @id @default(cuid()) | |
| `userId` | String | FK -> User |
| `category` | StreakCategory enum | JOURNAL, CHECKIN, HOMEWORK |
| `currentStreak` | Int @default(0) | Current consecutive days (with forgiveness) |
| `longestStreak` | Int @default(0) | All-time longest |
| `lastActiveDate` | DateTime @db.Date | Last day the participant was active in this category |
| `gapDaysUsed` | Int @default(0) | Forgiveness days consumed in the current 7-day window |
| `createdAt` | DateTime @default(now()) | |
| `updatedAt` | DateTime @updatedAt | |

**Unique constraint:** `@@unique([userId, category])`
**Index:** `@@index([userId])`

### New enum: `StreakCategory`

```
JOURNAL
CHECKIN
HOMEWORK
```

### Existing model change: `NotificationPreference.customSettings`

No schema change. The `customSettings` JSON field already exists. Sprint 15 standardizes its shape for dismissal tracking:

```typescript
{
  dismissals: Array<{ date: string }> // ISO date strings, trimmed to 30 days
}
```

---

## API Surface

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/stats/streaks` | Participant's current streak records | Participant |
| POST | `/api/notifications/dismiss` | Record a notification dismissal | Participant |
| POST | `/api/notifications/engage` | Reset escalation counter for a category | Participant |

### `GET /api/stats/streaks`

**Response:**
```json
{
  "success": true,
  "data": [
    { "category": "JOURNAL", "currentStreak": 12, "longestStreak": 21, "lastActiveDate": "2026-04-04" },
    { "category": "CHECKIN", "currentStreak": 5, "longestStreak": 14, "lastActiveDate": "2026-04-05" }
  ]
}
```

### `POST /api/notifications/dismiss`

**Request body:** `{ "category": "HOMEWORK" }`
**Response:** `{ "success": true }`

### `POST /api/notifications/engage`

**Request body:** `{ "category": "HOMEWORK" }`
**Response:** `{ "success": true }`

---

## Non-Functional Requirements

### NFR-1: Performance

- **NFR-1a:** `GET /api/stats/streaks` returns within **100ms p95** (simple indexed query)
- **NFR-1b:** Streak cron job completes within **30 seconds** for up to 10,000 active participants
- **NFR-1c:** Task completion animation runs at **60fps** on devices from iPhone 12 / Pixel 5 onward
- **NFR-1d:** Voice transcription latency under **2 seconds** for utterances up to 10 seconds

### NFR-2: Pagination

- **NFR-2a:** `GET /api/stats/streaks` returns max 3 records per user (one per category) — naturally bounded, no pagination needed

### NFR-3: Security & HIPAA

- **NFR-3a:** Streak records contain only aggregate counts and dates — no PHI
- **NFR-3b:** Voice audio is processed entirely on-device via OS APIs; no audio data is transmitted to Steady servers or third-party services
- **NFR-3c:** `NotificationPreference.customSettings.dismissals` stores only dates, not notification content
- **NFR-3d:** Dismiss and engage endpoints accept only a category enum string — no free-text fields
- **NFR-3e:** All mutations audit-logged (field names only, never values)
- **NFR-3f:** Logs never contain notification body text or voice transcription content

### NFR-4: Accessibility

- **NFR-4a:** Celebration overlays respect `prefers-reduced-motion` — static alternatives provided
- **NFR-4b:** Voice capture buttons have accessible labels: "Record task by voice" / "Dictate journal entry"
- **NFR-4c:** Recording state announced to screen readers: "Recording started" / "Recording stopped" / "Transcribing"
- **NFR-4d:** Milestone bottom sheet is focus-trapped and dismissible via swipe-down or button

### NFR-5: Testing

- **NFR-5a:** Streak calculation logic has dedicated unit tests with edge cases (forgiveness, timezone boundaries, multi-category)
- **NFR-5b:** Notification dismiss and engage endpoints have integration tests
- **NFR-5c:** Escalation logic has unit tests verifying threshold behavior
- **NFR-5d:** Coverage on `packages/api` and `packages/shared` remains >80%
- **NFR-5e:** Every acceptance criterion has at least one corresponding test

---

## Out of Scope

- Leaderboards or social comparison features
- Achievement badges beyond streak milestones
- Voice capture on web (clinician dashboard)
- Custom notification escalation messages per clinician
- Streak data in RTM billing calculations
- Haptic pattern customization
- Voice recording storage or playback (transcription only, ephemeral)
- Streak visualization charts (defer to a future analytics sprint)
- Configurable milestone thresholds
- Multi-language voice recognition configuration
