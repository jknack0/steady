# Sprint 14: Steady Work Review + Session Prep + Per-Participant Customization — UX Design

## Design Goals

- **Low-friction reflection.** A participant should complete their Steady Work Review in under 5 minutes from the push notification.
- **Clinician prep in one screen.** Everything a clinician needs before a session — review, homework, stats, notes — in a single page with no clicks to load more.
- **Invisible customization.** Participants never see "this was customized for you" — overrides merge seamlessly.
- **Keyboard-first on web.** Tab cycles panels, Enter expands sections, Cmd+S saves notes.
- **Accessible by default.** WCAG 2.1 AA — all form fields labeled, focus management on navigation.

---

## User Flows

### Flow 1: Participant completes Steady Work Review (mobile)

```
[Push notification: "Your session is tomorrow. Take 5 min to review your Steady Work"]
        │
        ▼
[Tap notification → opens review screen]
        │
        ▼
[Review screen loads: questions + barrier checklist from template]
        │
        ▼
[Participant answers each question (TextInput, multiline)]
[Participant checks applicable barriers (multi-select)]
        │
        ▼
[Tap "Submit Review"]
        │
        ▼
[Button → loading spinner]
        │
     ┌──┴──┐
     ▼     ▼
 [Success]  [Error]
 Screen:    Toast: "Couldn't submit.
 "Review     [Try again]"
 submitted   Button re-enabled
 — your
 clinician
 will see
 this before
 your session"
 [Done] → returns to app home
```

**Re-submission flow:** If the participant returns to the review screen after submitting, the form is pre-filled with their previous answers. Editing and re-submitting updates the existing review.

### Flow 2: Clinician opens session prep (web)

```
[Calendar week view → appointment card]
        │
        ▼
[Click "Prepare" button on card]
        │
        ▼
[Navigate to /sessions/prep/[appointmentId]]
        │
        ▼
[3-panel layout loads]
┌──────────────┬──────────────┬──────────────┐
│   Review     │   Homework   │  Stats +     │
│   Panel      │   Panel      │  Notes Panel │
└──────────────┴──────────────┴──────────────┘
        │
        ▼
[Clinician reads review responses]
[Scans homework completion]
[Glances at stats + tracker trends]
[Types session notes (autosaves after 2s)]
        │
        ▼
[Session starts — clinician references prep view on second monitor or tab]
```

### Flow 3: Clinician customizes homework (web)

```
[Participant detail page → click "Customize" tab]
        │
        ▼
[Customize tab loads: list of current overrides + "Add override" button]
        │
        ▼
[Click "Add override"]
        │
        ▼
[Modal opens with override type selector]
┌────────────────────────────────┐
│ Override type                   │
│ ( ) Hide homework item          │
│ ( ) Add homework item           │
│ ( ) Add resource                │
│ ( ) Add clinician note          │
└────────────────────────────────┘
        │
        ▼
[Select type → form fields update]
        │
        ▼
[Fill fields, click "Save override"]
        │
        ▼
[Override appears in list. Participant sees updated view on next module load.]
```

---

## Wireframes

### Review screen (mobile — Expo)

```
┌──────────────────────────────────┐
│ ← Back          Steady Work Review│
├──────────────────────────────────┤
│                                  │
│  Session with Dr. Smith          │
│  Tomorrow, April 7 at 10:00 AM  │
│                                  │
│  ─────────────────────────────   │
│                                  │
│  1. What did you work on in      │
│     Steady since your last       │
│     session?                     │
│  ┌──────────────────────────┐    │
│  │                          │    │
│  │                          │    │
│  └──────────────────────────┘    │
│                                  │
│  2. What went well?              │
│  ┌──────────────────────────┐    │
│  │                          │    │
│  └──────────────────────────┘    │
│                                  │
│  3. What was challenging?        │
│  ┌──────────────────────────┐    │
│  │                          │    │
│  └──────────────────────────┘    │
│                                  │
│  4. What would you like to       │
│     focus on in your session?    │
│  ┌──────────────────────────┐    │
│  │                          │    │
│  └──────────────────────────┘    │
│                                  │
│  ─────────────────────────────   │
│                                  │
│  What got in the way?            │
│  (check all that apply)          │
│                                  │
│  ☐ Forgot about the tasks        │
│  ☐ Too overwhelmed to start      │
│  ☐ Didn't understand the task    │
│  ☐ Ran out of time               │
│  ☐ Lost motivation               │
│  ☐ Got distracted                │
│  ☐ Felt too anxious              │
│  ☐ Technical issues              │
│  ☐ Nothing — it all went well    │
│                                  │
│  ┌──────────────────────────┐    │
│  │     Submit Review         │    │
│  └──────────────────────────┘    │
│                                  │
└──────────────────────────────────┘
```

### Session prep page (web — 3-panel layout)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Steady                                              [Search] [Avatar] [Logout]│
├──────────────────────────────────────────────────────────────────────────────┤
│ [Sidebar]       ┌───────────────────────────────────────────────────────┐    │
│                 │ ← Back to Calendar                                    │    │
│                 │                                                       │    │
│                 │ Session Prep: Maria Garcia                            │    │
│                 │ Tomorrow, April 7 · 10:00 AM · 90834 Psychotherapy   │    │
│                 │                                                       │    │
│                 ├───────────────┬──────────────┬────────────────────────┤    │
│                 │ REVIEW        │ HOMEWORK     │ STATS + NOTES          │    │
│                 │               │              │                        │    │
│                 │ Submitted     │ Module 3:    │ Since last session     │    │
│                 │ Apr 6, 2:30pm │ "Building    │ (4 weeks)              │    │
│                 │               │  Routines"   │                        │    │
│                 │ ────────────  │              │ Tasks: 8/12 (67%)      │    │
│                 │               │ ☑ Daily      │ Journal: 5 entries     │    │
│                 │ 1. What did   │   planning   │ Tracker: 10/14 days    │    │
│                 │ you work on?  │   worksheet  │                        │    │
│                 │               │ ☑ Time       │ ────────────────────   │    │
│                 │ "I practiced  │   blocking   │                        │    │
│                 │ the time      │   exercise   │ Mood trend (14d)       │    │
│                 │ blocking      │ ☐ Habit      │ ▁▂▃▂▄▅▃▄▅▆▅▄▅▆       │    │
│                 │ strategy..."  │   tracker    │                        │    │
│                 │               │   review     │ ────────────────────   │    │
│                 │ 2. What went  │              │                        │    │
│                 │ well?         │              │ Last session notes     │    │
│                 │               │              │ Mar 24, 2026           │    │
│                 │ "The morning  │              │ "Discussed time        │    │
│                 │ routine is    │              │  management. Maria     │    │
│                 │ sticking..."  │              │  responded well to     │    │
│                 │               │              │  the visual timer..."  │    │
│                 │ 3. What was   │              │                        │    │
│                 │ challenging?  │              │ ────────────────────   │    │
│                 │               │              │                        │    │
│                 │ "Executive    │              │ Session notes          │    │
│                 │ function..."  │              │ ┌──────────────────┐   │    │
│                 │               │              │ │ (autosaves)      │   │    │
│                 │ ────────────  │              │ │                  │   │    │
│                 │               │              │ │                  │   │    │
│                 │ Barriers:     │              │ └──────────────────┘   │    │
│                 │ • Got         │              │              Saved ✓   │    │
│                 │   distracted  │              │                        │    │
│                 │ • Ran out     │              │                        │    │
│                 │   of time     │              │                        │    │
│                 ├───────────────┴──────────────┴────────────────────────┤    │
│                 └───────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
```

**When review is not submitted:**

```
│ REVIEW          │
│                 │
│ ⏳ Not yet      │
│ submitted       │
│                 │
│ Notification    │
│ sent Apr 6,     │
│ 10:00 AM        │
│                 │
```

### Customize tab (web — participant detail page)

```
┌──────────────────────────────────────────────────────────────────┐
│ Maria Garcia                                                     │
│ [Overview] [Progress] [Sessions] [Customize]                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Enrollment: ADHD Skills Program                                 │
│  Overrides (3)                          [+ Add override]         │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐      │
│  │ 🚫 HIDE: "Habit tracker review worksheet"              │      │
│  │    Module 3 · Added Mar 15                    [Delete] │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐      │
│  │ 📎 RESOURCE: "Visual Timer Guide"                      │      │
│  │    Module 3 · https://example.com/timer    [Delete]    │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐      │
│  │ 📝 NOTE: "Focus on morning routine strategies..."      │      │
│  │    Module 3 · Added Mar 20                    [Delete] │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                  │
│  ─────────────────────────────────────────────────────────       │
│  No overrides for other modules.                                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Add override modal

```
┌──────────────────────────────────────────────┐
│  Add Override                           [×]  │
├──────────────────────────────────────────────┤
│                                              │
│  Override type *                              │
│  ┌────────────────────────────────────┐      │
│  │ Hide homework item              ▾  │      │
│  └────────────────────────────────────┘      │
│                                              │
│  Module *                                    │
│  ┌────────────────────────────────────┐      │
│  │ Module 3: Building Routines     ▾  │      │
│  └────────────────────────────────────┘      │
│                                              │
│  Homework item to hide *                     │
│  ┌────────────────────────────────────┐      │
│  │ Habit tracker review worksheet  ▾  │      │
│  └────────────────────────────────────┘      │
│                                              │
├──────────────────────────────────────────────┤
│                    [Cancel]  [Save override]  │
└──────────────────────────────────────────────┘
```

For ADD_RESOURCE type:
```
│  Title *                                     │
│  ┌────────────────────────────────────┐      │
│  │ Visual Timer Guide                 │      │
│  └────────────────────────────────────┘      │
│                                              │
│  URL *                                       │
│  ┌────────────────────────────────────┐      │
│  │ https://example.com/timer          │      │
│  └────────────────────────────────────┘      │
│                                              │
│  Description (optional)                      │
│  ┌────────────────────────────────────┐      │
│  │                                    │      │
│  └────────────────────────────────────┘      │
```

For CLINICIAN_NOTE type:
```
│  Note content *                              │
│  (visible to this participant)               │
│  ┌────────────────────────────────────┐      │
│  │                                    │      │
│  │                                    │      │
│  └────────────────────────────────────┘      │
│                                    0 / 2000   │
```

---

## Component States

### Review screen (mobile)

| State | Appearance | Behavior |
|---|---|---|
| Loading | Skeleton placeholder for questions + barriers | No interaction |
| Ready (empty) | Questions + barriers from template, all empty | Submit disabled until at least one answer filled |
| Ready (pre-filled) | Previous answers loaded | Submit enabled, shows "Update Review" instead of "Submit Review" |
| Submitting | Button spinner, inputs disabled | -- |
| Success | Green checkmark + confirmation message + [Done] | Done returns to app home |
| Error | Red toast at bottom: "Couldn't submit. Try again." | Button re-enabled |
| No appointment | "No upcoming appointment found" | Back button only |

### Session prep page (web)

| State | Appearance | Behavior |
|---|---|---|
| Loading | 3-panel skeleton | No interaction |
| Loaded (with review) | All 3 panels populated | Full interaction |
| Loaded (no review) | Review panel shows "Not yet submitted" | Other panels still populated |
| Loaded (no enrollment) | Review: N/A, Homework: empty, Stats: participant-level only | Notes still functional |
| Error | Centered error: "Couldn't load session prep. [Retry]" | Retry re-fetches |
| Notes saving | Small spinner next to "Session notes" header | Input still active |
| Notes saved | "Saved" text fades in for 2s | -- |

### Customize tab (web)

| State | Appearance | Behavior |
|---|---|---|
| Loading | Skeleton list | No interaction |
| Empty | "No overrides yet. Customize this participant's homework with the button above." + [Add override] | -- |
| Populated | List of override cards with delete buttons | Click delete shows inline confirm |
| Delete confirm | Card expands: "Remove this override? The original content will be restored. [Cancel] [Remove]" | -- |
| Adding | Modal open with form | Save creates override + closes modal + refreshes list |

---

## Content & Copy

| Element | Copy | Notes |
|---|---|---|
| Push notification title | "Session tomorrow" | Short for lock screen |
| Push notification body | "Take 5 minutes to complete your Steady Work Review" | Action-oriented |
| Review screen title | "Steady Work Review" | Matches concept language |
| Review screen subtitle | "Session with [clinicianName]" + date/time | Context |
| Submit button (first time) | "Submit Review" | -- |
| Submit button (re-submit) | "Update Review" | Distinguishes from first submit |
| Success message | "Review submitted — your clinician will see this before your session" | Acknowledges effort |
| Prep page title | "Session Prep: [participantName]" | Clinician-facing |
| Prep back link | "Back to Calendar" | Navigation |
| Review panel header | "Review" | -- |
| Review not submitted | "Not yet submitted" | Neutral tone |
| Homework panel header | "Homework" | -- |
| Stats panel header | "Stats + Notes" | -- |
| Last session notes label | "Last session notes" | -- |
| Session notes label | "Session notes" | -- |
| Session notes placeholder | "Jot down thoughts for this session..." | Suggestive |
| Autosave indicator | "Saved" (fades after 2s) | -- |
| Customize tab label | "Customize" | Matches concept |
| Add override button | "Add override" | -- |
| Override type: hide | "Hide homework item" | -- |
| Override type: add resource | "Add resource" | -- |
| Override type: add note | "Add clinician note" | -- |
| Override type: add homework | "Add homework item" | -- |
| Delete confirm | "Remove this override? The original content will be restored." | Explains consequence |
| Empty overrides | "No overrides yet. Customize this participant's homework with the button above." | -- |
| Barrier section header | "What got in the way?" | Empathetic framing |
| Barrier section hint | "Check all that apply" | -- |

---

## Accessibility (WCAG 2.1 AA)

### Keyboard navigation

| Action | Key | Surface |
|---|---|---|
| Cycle between prep panels | Tab | Web prep page |
| Expand/collapse section within panel | Enter / Space | Web prep page |
| Focus session notes textarea | Tab to panel, then Tab to textarea | Web prep page |
| Submit review | Enter (when focused on Submit button) | Mobile review screen |
| Open add override modal | Enter on [Add override] button | Web customize tab |
| Close modal | Escape | Web customize tab |
| Confirm delete | Enter on [Remove] | Web customize tab |
| Navigate barrier checkboxes | Arrow keys within checkbox group | Mobile review screen |

### Screen reader

- Review questions use `accessibilityLabel` including question number and text.
- Barrier checkboxes are grouped with `role="group"` and `aria-label="Barriers — check all that apply"`.
- Session prep panels use `role="region"` with `aria-label` ("Review", "Homework", "Stats and Notes").
- Autosave indicator uses `aria-live="polite"`.
- Override list uses `role="list"` with each override as `role="listitem"`.
- Delete confirmation uses `role="alertdialog"`.

### Color contrast

- All text meets 4.5:1 contrast.
- Barrier checkboxes use both color and checkmark icon.
- Override type badges use both color and text label.
- Review submission status uses both color and text ("Submitted" / "Not yet submitted").

---

## Loading States Summary

| Surface | Treatment |
|---|---|
| Review screen (mobile) | Skeleton: 4 text input placeholders + checkbox placeholders |
| Session prep (web) | 3-column skeleton with header visible |
| Customize tab | Skeleton list of 3 cards |
| Override modal | Instant (no data to load beyond dropdowns from parent) |

## Error States Summary

| Source | Display |
|---|---|
| Review submit fails | Toast: "Couldn't submit. Try again." + button re-enabled |
| Prep load fails | Centered: "Couldn't load session prep. [Retry]" |
| Override create fails | Modal inline error: "[message from API]" |
| Override delete fails | Toast: "Couldn't remove override. Try again." |
| Notes autosave fails | "Save failed" text (red) replaces "Saved" indicator |
| 401 expired (web) | Silent token refresh; if fails, redirect to login |
| 404 appointment | "Appointment not found" + back link |

## Empty States Summary

| Surface | Copy | CTA |
|---|---|---|
| Prep — no review | "Not yet submitted" + notification sent timestamp | -- |
| Prep — no homework | "No homework in this module" | -- |
| Prep — no stats | "No activity data since last session" | -- |
| Prep — no last session | "No previous session notes" | -- |
| Customize — no overrides | "No overrides yet. Customize this participant's homework with the button above." | [Add override] |

---

## Responsive Notes

- **Session prep page:** On viewports <1024px, the 3-panel layout stacks vertically (Review -> Homework -> Stats+Notes). Each panel becomes a collapsible accordion.
- **Customize tab:** Override list remains single-column; modal becomes full-width on mobile viewports.
- **Review screen:** Mobile-native only (Expo). No web equivalent in sprint 14.
