# Sprint 15: Gamification + Voice Capture + Smart Notification Escalation — QA Test Plan

## Overview

This document defines the test plan for Sprint 15. Estimated ~60 tests across API integration tests, service unit tests, and schema validation tests. Mobile component tests are deferred to the mobile test suite.

---

## Test File Layout

```
packages/api/src/__tests__/streaks.test.ts              — streak calculation unit tests (~18 tests)
packages/api/src/__tests__/streaks-api.test.ts           — streak API integration tests (~8 tests)
packages/api/src/__tests__/notification-dismiss.test.ts  — dismiss + engage endpoint tests (~12 tests)
packages/api/src/__tests__/notification-escalation.test.ts — escalation logic unit tests (~10 tests)
packages/shared/src/__tests__/streak.schema.test.ts      — streak Zod schema tests (~6 tests)
packages/shared/src/__tests__/notification.schema.test.ts — dismiss/engage schema tests (~6 tests)
```

**Total estimated: ~60 tests**

---

## Traceability Matrix

| Requirement | Test File | Test Description |
|---|---|---|
| **FR-1** Streak computation | `streaks.test.ts` | 5 consecutive days -> streak = 5 |
| FR-1 | `streaks.test.ts` | Gap forgiveness: miss 1 day in 7 -> streak continues |
| FR-1 | `streaks.test.ts` | 2 missed days in 7-day window -> streak resets |
| FR-1 | `streaks.test.ts` | Gap used + another miss in same window -> reset |
| FR-1 | `streaks.test.ts` | longestStreak updates when currentStreak exceeds it |
| FR-1 | `streaks.test.ts` | longestStreak preserved when current < longest |
| FR-1 | `streaks.test.ts` | Empty activity dates -> streak = 0 |
| FR-1 | `streaks.test.ts` | Single active day -> streak = 1 |
| FR-1 | `streaks.test.ts` | Timezone boundary: activity at 11:59 PM counts for that day |
| FR-1 | `streaks.test.ts` | Rolling 7-day window resets gap allowance at day 8 |
| FR-1 | `streaks.test.ts` | Multi-category streaks computed independently |
| FR-1 | `streaks.test.ts` | JOURNAL category queries JournalEntry.entryDate |
| FR-1 | `streaks.test.ts` | CHECKIN category queries DailyTrackerEntry.date |
| FR-1 | `streaks.test.ts` | HOMEWORK category queries HomeworkInstance.completedAt |
| FR-1 | `streaks.test.ts` | Batch processing handles 100+ participants |
| FR-1 | `streaks.test.ts` | Cron job upserts (creates new, updates existing) |
| FR-1 | `streaks.test.ts` | 60-day lookback window respected |
| FR-1 | `streaks.test.ts` | Inactive participant (no enrollments) skipped |
| **FR-2** Streak retrieval | `streaks-api.test.ts` | GET /api/stats/streaks returns own streaks |
| FR-2 | `streaks-api.test.ts` | Returns empty array when no records |
| FR-2 | `streaks-api.test.ts` | Returns all categories with records |
| FR-2 | `streaks-api.test.ts` | 401 on unauthenticated request |
| FR-2 | `streaks-api.test.ts` | 403 on clinician role (participant-only endpoint) |
| FR-2 | `streaks-api.test.ts` | Cannot access another user's streaks |
| FR-2 | `streaks-api.test.ts` | Clinician can see streaks via GET /api/stats/:participantId |
| FR-2 | `streaks-api.test.ts` | Clinician ownership check on stats endpoint |
| **FR-8** Dismiss tracking | `notification-dismiss.test.ts` | POST dismiss records dismissal in customSettings |
| FR-8 | `notification-dismiss.test.ts` | Creates NotificationPreference if not exists |
| FR-8 | `notification-dismiss.test.ts` | Trims entries older than 30 days |
| FR-8 | `notification-dismiss.test.ts` | Invalid category returns 400 |
| FR-8 | `notification-dismiss.test.ts` | 401 on unauthenticated request |
| FR-8 | `notification-dismiss.test.ts` | 403 on clinician role |
| **FR-9** Escalation logic | `notification-escalation.test.ts` | 3+ dismissals triggers escalated copy |
| FR-9 | `notification-escalation.test.ts` | 2 dismissals uses standard copy |
| FR-9 | `notification-escalation.test.ts` | 0 dismissals uses standard copy |
| FR-9 | `notification-escalation.test.ts` | Each category has distinct escalated copy |
| FR-9 | `notification-escalation.test.ts` | Dismissals older than 7 days not counted |
| FR-9 | `notification-escalation.test.ts` | Escalation re-evaluated per notification send |
| **FR-10** Engage reset | `notification-dismiss.test.ts` | POST engage clears dismissals for category |
| FR-10 | `notification-dismiss.test.ts` | Engage with no prior dismissals succeeds (no-op) |
| FR-10 | `notification-dismiss.test.ts` | Engage only clears specified category |
| FR-10 | `notification-dismiss.test.ts` | Invalid category returns 400 |
| FR-10 | `notification-dismiss.test.ts` | 401 on unauthenticated request |
| FR-10 | `notification-dismiss.test.ts` | After engage, next notification uses standard copy |
| **Schema** | `streak.schema.test.ts` | Valid streak response parses correctly |
| Schema | `streak.schema.test.ts` | Invalid category rejected |
| Schema | `streak.schema.test.ts` | Negative streak value rejected |
| Schema | `streak.schema.test.ts` | Missing required fields rejected |
| Schema | `streak.schema.test.ts` | lastActiveDate accepts date string |
| Schema | `streak.schema.test.ts` | Extra fields stripped |
| Schema | `notification.schema.test.ts` | Valid dismiss body parses |
| Schema | `notification.schema.test.ts` | Valid engage body parses |
| Schema | `notification.schema.test.ts` | Invalid category rejected (dismiss) |
| Schema | `notification.schema.test.ts` | Invalid category rejected (engage) |
| Schema | `notification.schema.test.ts` | Extra fields stripped (dismiss) |
| Schema | `notification.schema.test.ts` | Extra fields stripped (engage) |

---

## Compliance Verification Plan

| Condition | Verification method |
|---|---|
| **COND-1** On-device voice | Code review: `expo-speech-recognition` config. Manual test: network monitor during recording shows zero external requests. |
| **COND-2** Streak data isolation | `streaks-api.test.ts`: participant cannot query another user's streaks; `userId` query param ignored |
| **COND-3** Enum-only dismiss/engage | `notification.schema.test.ts`: arbitrary string rejected; `notification-dismiss.test.ts`: 400 on bad category |
| **COND-4** No content in logs | Code review of logger calls in escalation path. Integration test: invoke escalation, grep test log for notification body text, assert zero matches. |
| **COND-5** Voice text same path | Code review: voice output feeds same `setTitle`/`setContent` as keyboard input. No separate API call. |

---

## Adversarial Tests

| Test | Expected result |
|---|---|
| GET streaks with spoofed userId in query param | Ignored; returns authenticated user's data only |
| POST dismiss with category = "SQL_INJECTION'; DROP TABLE" | 400 Bad Request (Zod enum validation) |
| POST dismiss with body size > 1KB | 400 (body parsing limit) |
| POST engage for category user has no preference for | 200 (no-op, graceful) |
| Streak cron with user who has 0 activity | StreakRecord upserted with currentStreak = 0 |
| Concurrent dismiss calls for same user+category | Both succeed; dismissals array grows correctly (no race condition due to upsert) |

---

## Coverage Expectations

| Package | Current | Sprint 15 target |
|---|---|---|
| `packages/api` | >80% | Maintained >80% |
| `packages/shared` | >80% | Maintained >80% |

---

## Mobile Tests (deferred to mobile suite)

The following are documented for the mobile team but not included in the ~60 count:

- Voice capture: permission flow, recording start/stop, transcription success/failure
- Task completion animation: fires on toggle, respects reduced motion
- Module completion overlay: appears on module complete, dismisses on tap
- Milestone celebration: appears at 7/14/21/30, not shown twice (AsyncStorage)
- Engagement tracking: sends engage event on screen focus, debounced 5 min

---

## Sign-off Criteria

- All ~60 API + shared tests pass
- Full `packages/api` suite passes (no regressions)
- Full `packages/shared` suite passes (no regressions)
- Typecheck passes for `packages/api`, `packages/shared`, `packages/db`
- All 5 compliance conditions verified
- Coverage remains >80% on both packages
