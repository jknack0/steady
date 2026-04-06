# Sprint 15: Gamification + Voice Capture + Smart Notification Escalation — Concept

## Problem Statement

Steady participants with ADHD face a core engagement paradox: the same executive-function challenges the platform treats (task initiation, consistency, follow-through) directly undermine their ability to use the platform consistently. Current engagement data shows:

1. **Streak drop-off:** Daily tracker and journal entries decline ~40% after week 2 of enrollment. There is no visible reward for consistency and no recovery mechanism after a missed day.
2. **Task creation friction:** Adding tasks requires typing on a mobile keyboard — a high-friction action for ADHD users experiencing working-memory overload. Ideas that arrive verbally ("I need to call the dentist") are lost before they can be typed.
3. **Notification fatigue:** Participants who dismiss the same category of reminder 3+ times in a week are likely experiencing a barrier, not forgetfulness. Repeating the same notification copy reinforces avoidance rather than addressing the underlying obstacle.

Sprint 15 addresses all three with: (a) gamification elements that reward consistency with visual feedback and forgive ADHD-typical gaps, (b) voice-to-text capture on the tasks and journal screens, and (c) smart notification escalation that shifts tone from reminder to empathetic inquiry after repeated dismissals.

## Stakeholders

| Role | Interest |
|---|---|
| **Participants** | Visible progress, reduced friction for task/journal entry, notifications that feel supportive rather than nagging |
| **Clinicians** | Higher engagement rates, streak data as a conversation starter in sessions, better homework completion |
| **Product** | Retention improvement, differentiation from generic ADHD apps |
| **Compliance** | Voice transcription privacy, notification content not containing PHI |

## User Stories

| ID | Story |
|---|---|
| US-1 | As a **participant**, I want to **see a streak count and flame badge on my home screen** so I feel motivated to maintain daily engagement. |
| US-2 | As a **participant**, I want **a 1-day forgiveness window per 7 days** so a single missed day doesn't destroy my streak and motivation. |
| US-3 | As a **participant**, I want to **see a celebration animation when I complete a task** so I get immediate positive reinforcement. |
| US-4 | As a **participant**, I want to **see a full-screen celebration when I complete a module** so major milestones feel rewarding. |
| US-5 | As a **participant**, I want to **see milestone celebrations at 7, 14, 21, and 30 days** so I have near-term goals to work toward. |
| US-6 | As a **participant**, I want to **long-press the FAB on the tasks screen to record a task by voice** so I can capture ideas without typing. |
| US-7 | As a **participant**, I want to **tap a microphone button on the journal screen to dictate my entry** so journaling feels lower-effort. |
| US-8 | As a **participant**, I want **notifications that change tone after repeated dismissals** so they feel supportive rather than nagging. |
| US-9 | As a **participant**, I want **the escalation counter to reset when I engage** so the system recognizes my effort. |
| US-10 | As a **clinician**, I want to **see participant streak data** so I can acknowledge consistency and discuss barriers in sessions. |

## Key Decisions

### Decision 1: Gap-day forgiveness model

**1 forgiveness day per rolling 7-day window.** Rationale: ADHD participants commonly have 1 "off" day per week. Strict consecutive-day streaks punish the condition we are treating. The forgiveness window is generous enough to maintain motivation but strict enough to preserve meaning.

### Decision 2: Voice transcription approach

**On-device transcription via `expo-speech-recognition`.** The OS speech-to-text engine runs locally — no audio is transmitted to third-party servers. This eliminates HIPAA concerns around voice data and avoids API costs. Tradeoff: accuracy depends on the device's speech engine, but modern iOS/Android engines are adequate for short-form input.

### Decision 3: Notification escalation storage

**Store dismissals in `NotificationPreference.customSettings` JSON field.** No new model needed. The existing `customSettings` JSON column is already per-user per-category. This avoids a schema migration while keeping the dismissal history co-located with the preference it modifies. Trimmed to 30-day rolling window.

### Decision 4: Streak calculation timing

**Daily pg-boss cron job at 2 AM UTC.** Streaks are computed server-side and cached in a new `StreakRecord` model. This avoids client-side calculation inconsistencies and provides a single source of truth that both mobile and the clinician dashboard can query.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Voice recognition accuracy varies by device/accent | Medium | Low | Graceful fallback: show error toast, user can type instead. No data loss. |
| Gamification feels patronizing to some adults | Low | Medium | Animations are brief (1-3s) and non-blocking. Future: add settings toggle. |
| Streak forgiveness logic has edge cases around timezone boundaries | Medium | Medium | Server uses participant's configured timezone for day boundaries. |
| Notification escalation messages feel intrusive | Low | Medium | Copy reviewed with clinical team. Messages are open-ended questions, not directives. |
| `expo-speech-recognition` compatibility across Expo 54 / RN 0.81 | Low | High | Verify in spike before committing. Fallback: defer voice to sprint 16. |

## Recommendation

**Proceed to specification.** All three sub-features are low-risk, high-engagement-impact additions that build on existing infrastructure (pg-boss, notification service, stats service). The PHI surface area increase is minimal (streaks are aggregate counts; voice never leaves the device; dismissal tracking stores only category names). Ship all three as a cohesive "engagement quality" sprint.

## Out of Scope

- Leaderboards or social comparison features
- Achievement badges beyond streak milestones
- Voice capture on web (clinician dashboard)
- Custom notification escalation messages per clinician
- Streak data in RTM billing calculations
- Haptic pattern customization
- Voice recording storage or playback (transcription only, ephemeral)
