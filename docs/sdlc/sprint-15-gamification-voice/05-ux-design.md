# Sprint 15: Gamification + Voice Capture + Smart Notification Escalation — UX Design

## Design Goals

- **Celebrate without condescending.** Animations are brief, tasteful, and skippable. ADHD participants are adults in clinical treatment, not children collecting stickers.
- **Reduce friction for the most common barrier.** Voice capture targets the #1 ADHD complaint: "I had the idea but couldn't get it out of my head and into the app fast enough."
- **Notifications that build trust.** When the system detects avoidance, it asks instead of nags. Participants should feel the app is on their side.
- **Respect motion sensitivity.** All animations have static fallbacks via `prefers-reduced-motion`.

---

## User Flows

### Flow 1: Task completion animation (happy path)

```
[Tasks screen, task "Call dentist" visible]
        |
        v
[Participant taps checkbox]
        |
        v
[Checkbox: spring scale 1.0 -> 1.3 -> 1.0 (300ms)]
[Haptic: medium impact]
[Task row: fade to 70% opacity over 500ms]
        |
        v
[Task moves to "Done" section after 800ms delay]
```

### Flow 2: Module completion celebration

```
[Participant completes last required part of Module 3]
        |
        v
[Part progress updates to COMPLETED]
[Module progress transitions to COMPLETED]
        |
        v
[Full-screen overlay fades in (200ms)]
[Confetti particles rain from top for 3 seconds]
[Center text: "Module 3 Complete!" with checkmark icon]
        |
        v
[After 3 seconds OR tap anywhere]
        |
        v
[Overlay fades out (200ms)]
[Participant returns to module list]
```

**Reduced motion variant:** Static overlay with "Module 3 Complete!" text and a green checkmark. No particle animation. Same 3-second auto-dismiss or tap-to-close.

### Flow 3: Streak milestone celebration

```
[Participant opens app / completes a streak-contributing action]
        |
        v
[App queries GET /api/stats/streaks]
[Detects currentStreak = 7 for JOURNAL, not yet celebrated]
        |
        v
[Bottom sheet slides up from bottom (300ms)]
[Content:]
  +-----------------------------------------+
  |                                         |
  |            [flame icon, large]          |
  |                                         |
  |          7-Day Journal Streak!          |
  |                                         |
  |   You've journaled 7 days in a row.    |
  |   That's real consistency.              |
  |                                         |
  |          [ Keep going! ]                |
  |                                         |
  +-----------------------------------------+
        |
        v
[Participant taps "Keep going!" or swipes down]
        |
        v
[Bottom sheet dismisses]
[Milestone marked as seen in AsyncStorage]
```

**Milestone copy variants:**

| Days | Title | Body |
|---|---|---|
| 7 | "7-Day Streak!" | "You've been consistent for a full week. That takes real effort." |
| 14 | "Two Weeks Strong!" | "14 days of showing up. Your future self thanks you." |
| 21 | "21-Day Streak!" | "Three weeks. They say it takes 21 days to build a habit." |
| 30 | "30-Day Streak!" | "A full month of consistency. This is what progress looks like." |

### Flow 4: Voice capture on tasks (long-press FAB)

1. Long-press FAB (500ms) -> check mic permission (prompt if needed; show inline message if denied).
2. FAB transforms: red bg, mic icon, pulsing dot, "Recording..." label.
3. Participant speaks. On release -> FAB returns to normal, "Transcribing..." appears.
4. **Success:** Add-task modal opens with title prefilled from transcription.
5. **Failure:** Toast "Couldn't catch that. Try again or type instead." FAB returns to default.

### Flow 5: Voice capture on journal (mic button)

1. Tap mic button next to "Daily Reflection" heading -> same permission check as Flow 4.
2. Mic button shows pulsing red dot. Partial results stream into text input in real time (appended to existing content).
3. Tap mic button again -> stop. Final result committed. Auto-save triggers.

### Flow 6: Notification escalation (participant experience)

1. Days 1-2: Participant dismisses HOMEWORK reminders. Standard copy continues.
2. Day 3+: 3rd dismissal in 7 days triggers escalated copy on next notification: "Seems like homework has been hard this week. What's getting in the way?"
3. Participant taps notification -> opens homework screen -> app sends engage event -> counter resets -> standard copy resumes.

---

## Wireframes

### Streak badge on home screen

Extends existing `WeeklyStreakWidget`. Badge shows highest active streak. Per-category streaks in a row below weekly dots: `[flame] Journal 12d  [flame] Check-in 5d`.

### Task completion animation

Checkbox springs 1.0 -> 1.3 -> 1.0 (300ms) + haptic buzz. Task row fades to 70% opacity.

### Module completion overlay

Full-screen overlay: confetti particles from top, center text "Module 3 Complete!" + subtitle, tap-anywhere to dismiss.

### Milestone bottom sheet

Handle bar, large flame icon, milestone title (e.g., "7-Day Journal Streak!"), congratulatory body, "Keep going!" button.

### FAB voice states

Default: teal bg + plus icon. Recording: red bg + mic icon + pulsing dot + "Recording..." label. Transcribing: teal bg + hourglass + "Transcribing...".

### Journal mic button

Mic icon to the right of "Daily Reflection" heading. Default: teal `mic-outline`. Recording: red `mic` + pulsing dot. Real-time partial results stream into text input.

---

## Component Specifications

### 1. `<TaskCompletionAnimation>`

**Purpose:** Spring scale + haptic on task checkbox toggle.

**Integration:** Wraps the existing `<AnimatedCheckbox>` component.

| State | Visual | Duration |
|---|---|---|
| Unchecked -> Checked | Spring scale 1.0 -> 1.3 -> 1.0 | 300ms |
| Haptic | Medium impact | Instant |
| Row fade | Opacity 1.0 -> 0.7 | 500ms |
| Reduced motion | Instant state change, no scale | 0ms |

### 2. `<ModuleCompletionOverlay>`

**Purpose:** Full-screen confetti celebration on module completion.

| State | Visual | Duration |
|---|---|---|
| Appearing | Fade-in overlay + confetti start | 200ms fade |
| Active | Confetti raining, center text visible | 3 seconds |
| Dismissing (auto or tap) | Fade-out | 200ms |
| Reduced motion | Static banner with text, no particles | 3 seconds |

### 3. `<MilestoneCelebration>`

**Purpose:** Bottom sheet for streak milestones.

| State | Visual | Behavior |
|---|---|---|
| Appearing | Slide up from bottom | 300ms ease-out |
| Active | Flame icon + text + button visible | Swipe down or tap button to dismiss |
| Dismissing | Slide down | 200ms |

### 4. `<VoiceFAB>` (tasks screen)

**Purpose:** Extended FAB supporting tap (add task) and long-press (voice capture).

| State | Visual | Behavior |
|---|---|---|
| Default | Teal bg, plus icon | Tap -> add task modal; long-press -> recording |
| Recording | Red bg, mic icon, pulsing dot, "Recording..." label | Release -> stop + transcribe |
| Transcribing | Teal bg, hourglass icon, "Transcribing..." label | Wait for result |
| Unavailable | Teal bg, plus icon (no change) | Long-press -> toast "Voice input isn't available" |

### 5. `<JournalMicButton>`

**Purpose:** Toggle mic for voice-to-text dictation into journal.

| State | Visual | Behavior |
|---|---|---|
| Default | Teal mic-outline icon | Tap -> start recording |
| Recording | Red mic icon, pulsing dot | Tap -> stop recording |
| No permission | Gray mic-off icon | Tap -> show permission message |

---

## Notification Escalation Message Examples

### Standard vs. escalated copy

| Category | Standard | Escalated (3+ dismissals) |
|---|---|---|
| MORNING_CHECKIN | "Good morning! Time for your daily check-in." | "Checking in on you -- Seems like mornings have been tough this week. What's one small thing you could do today?" |
| HOMEWORK | "You have Steady Work waiting for you." | "We noticed you've been away -- Seems like homework has been hard this week. What's getting in the way?" |
| TASK | "Don't forget about your tasks today." | "Tasks piling up? -- When tasks feel overwhelming, it helps to pick just one. What's the smallest thing you could start?" |
| WEEKLY_REVIEW | "Time for your weekly reflection." | "Reflection is optional -- Weekly reviews haven't felt right lately. Would a different day or time work better?" |
| SESSION | "You have an upcoming session." | "Your sessions matter -- It looks like session reminders haven't been helpful lately. Is there something we can adjust?" |

**Copy principles:**
- Never accusatory ("You haven't done X")
- Open-ended questions, not directives
- Acknowledge the difficulty, don't dismiss it
- Offer agency ("What's getting in the way?" vs "Do your homework")

---

## Accessibility

- All animations respect `prefers-reduced-motion` via `useReducedMotion()` hook. Static alternatives for every animated element.
- FAB: `accessibilityLabel="Add task"`, `accessibilityHint="Long press to record task by voice"`.
- Journal mic: `accessibilityLabel="Dictate journal entry"`.
- Recording state changes announced via `AccessibilityInfo.announceForAccessibility()`.
- Milestone bottom sheet: focus trapped, `accessibilityRole="dialog"`, dismissible via button and swipe.
- Streak badge: `accessibilityLabel="12 day journaling streak"`. Weekly dots: per-day labels.

---

## States Summary

| Surface | Loading | Error | Empty |
|---|---|---|---|
| Streak badge | Skeleton + "--" | Hidden (non-critical) | "Start a streak by checking in daily" |
| Voice capture | "Transcribing..." label | Toast: "Couldn't catch that" | N/A |
| Voice permission | N/A | Inline: "Microphone access needed" | N/A |
| Milestone | Background check | N/A | No bottom sheet triggered |
| Dismiss/engage API | N/A | Silent retry | N/A |
