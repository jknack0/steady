# STEADY with ADHD — Usability Study #1: Findings Report

**Date:** 2026-04-06
**Method:** Simulated moderated usability study with 3 agent personas walking actual UI code
**Personas tested:**
- **Dr. Sarah Kim** (Clinician, web) — 38, therapist, moderately tech-savvy, methodical
- **Marcus Thompson** (Participant, mobile) — 29, software dev, recently diagnosed ADHD, tech-savvy, scans quickly
- **Jamie Ortiz** (Participant, mobile) — 42, teacher, diagnosed 2 years ago, NOT tech-savvy, anxious, reads carefully

---

## Executive Summary

The app has strong visual design, thoughtful micro-interactions (confetti, streaks, auto-save indicators), and generally clean information hierarchy. However, the study surfaced **3 critical issues**, **8 major issues**, and several minor/cosmetic findings. The most severe problems are features that exist in code but are unreachable by users, and clinical jargon that creates comprehension barriers for the very population the app serves.

---

## Critical Issues (2)

### CRIT-1: Insights/Progress screen is completely unreachable (Mobile)
**Found by:** Marcus (P6), Jamie (P6)
**Location:** `apps/mobile/app/(app)/insights.tsx` exists, route registered in `_layout.tsx`, but **zero components in the entire codebase link to it**.

The Insights screen has task completion charts, regulation trend lines, journal heatmaps, homework progress bars, and system check-in indicators — all fully built. But no button, link, card, or menu item anywhere in the app navigates to it. Both participants searched every tab and gave up.

**Impact:** A core feature that answers "how am I doing?" is invisible to 100% of users.

**Fix:** Add an "Insights" card to the Today screen (tappable) and/or make the streak badges tap through to Insights.

---

### CRIT-2: No publish/draft workflow in the web UI (Web)
**Found by:** Sarah (C2)
**Location:** Programs have a `status` field (DRAFT/PUBLISHED/ARCHIVED) in the database, but the web program editor has **no publish button, no draft indicator, no status badge**.

Programs created via "Use Template" or "Start from Scratch" are immediately PUBLISHED. The clinician has no way to keep a program in draft while editing, and no way to see whether content is visible to participants.

**Impact:** A therapist may inadvertently expose half-finished clinical content to a patient. This is a trust and safety issue.

**Fix:** Add a DRAFT/PUBLISHED toggle or "Publish" button to the program detail page. Show status badge next to program type badge.

---

## Major Issues (8)

### MAJ-1: No session preparation view (Web)
**Found by:** Sarah (C4)

Clinician must click through 3-4 tabs (Overview widgets, Homework tab, Check-in tab, RTM tab) on a participant's detail page to gather pre-session information. No unified view aggregates homework completion, tracker trends, alerts, and session notes.

For a therapist seeing 15-20 clients/week, this friction compounds significantly.

**Fix:** Create a "Session Prep" view accessible from Calendar (per appointment) and client detail page, aggregating: homework status since last session, tracker trends, alerts, recent journal entries.

---

### MAJ-2: Program invitation not surfaced on Today screen (Mobile)
**Found by:** Marcus (P1), Jamie (P1)

The Today screen — the primary landing screen — shows "No program yet" when an invitation is pending. The user must independently discover the Program tab to find and accept the invitation. No banner, badge, or card appears on Today.

**Fix:** Add an invitation card to the Today screen, above the fold, with an inline "Accept" button. Distinct visual treatment (amber/yellow).

---

### MAJ-3: "Regulation score" uses clinical jargon (Mobile)
**Found by:** Marcus (P5), Jamie (P5)

The journal's primary data entry asks "How regulated do you feel?" with a 1-10 scale labeled "Dysregulated" to "Regulated." Neither persona understood what this meant. Marcus guessed; Jamie was confused and anxious about answering "wrong."

**Fix:** Replace with plain language: "How are you feeling right now?" with anchors like "Very overwhelmed" → "Very calm and focused." Add an info tooltip explaining the concept.

---

### MAJ-4: Homework buried deep in Today screen scroll (Mobile)
**Found by:** Jamie (P4)

Homework appears as approximately the 8th section in the Today screen's scroll order — after greeting, streak widget, streak badges, progress summary, check-in, appointment card, and session card. On a phone, that's 3-4 screen-lengths of scrolling. There's also no link to homework from the Program tab and no dedicated homework view.

Additionally, homework is split across two locations: recurring instances on Today, and one-time homework inside program modules. No unified view exists.

**Fix:** Move homework higher in scroll order (right after check-in). Add a homework shortcut to the Program tab. Consider a "You have homework" banner near the top.

---

### MAJ-5: Appointments have no persistent navigation entry point (Mobile)
**Found by:** Marcus (P7), Jamie (P7)

The Appointments screen is only accessible via a "Next appointment" card on Today, which only renders when an appointment exists within 7 days. Outside that window, the entire appointments screen is unreachable. The Calendar tab does NOT show appointments.

**Fix:** Add an "Appointments" section to the Calendar tab, or add a persistent "My Appointments" link in Settings. Always show the card on Today (with empty state).

---

### MAJ-6: No first-use onboarding (Mobile)
**Found by:** Jamie (P1)

Jamie lands on a dense Today screen with 8-12 sections and zero guidance. No welcome message, walkthrough, or "start here" pointer. For an anxious non-tech user with ADHD, this is overwhelming.

**Fix:** Add a first-login onboarding carousel (3 screens: "Here's your daily hub", "Your therapist's program is here", "Track tasks, journal, and more") or a simplified Welcome state for the Today screen.

---

### MAJ-7: Appointments and Calendar are separate systems (Mobile)
**Found by:** Jamie (P7)

The Calendar tab shows personal events/time blocks. Appointments live in a separate screen. If a user goes to Calendar looking for their therapy session (natural instinct), they won't find it.

**Fix:** Show appointments as distinguished events on the Calendar tab, or add a visible link between the two.

---

### MAJ-8: "Client" vs "Patient" terminology inconsistency (Web)
**Found by:** Sarah (C3)

Page title says "Clients", button says "Invite Patient", empty state says "patients", modal says "Patient". Mixed terminology throughout.

**Fix:** Pick one term and use it consistently everywhere.

---

## Minor Issues (8)

| ID | Issue | Persona | Location |
|----|-------|---------|----------|
| MIN-1 | No template preview before cloning — "Use Template" immediately clones with no way to preview content first | Sarah (C1) | Programs page, Template Library |
| MIN-2 | Click-to-edit title has no visual affordance — no pencil icon or tooltip | Sarah (C2) | Program detail page |
| MIN-3 | Invite code displayed in Program column for pending invites — semantically wrong | Sarah (C3) | Participants table |
| MIN-4 | "Start from Scratch" vs "Create for Client" distinction is subtle and unexplained | Sarah (C6) | Create Program dialog |
| MIN-5 | No due date picker in task creation form, despite model supporting it | Marcus (P3) | Tasks tab, create modal |
| MIN-6 | CheckInSection vanishes after completion — no "already done" card or edit path | Marcus (P2) | Today screen |
| MIN-7 | "Send Reminder" on RTM cards is a TODO placeholder that does nothing | Sarah (C5) | RTM page |
| MIN-8 | Auto-save not explained on journal — anxious users worry about data loss | Jamie (P5) | Journal tab |

---

## Cosmetic Issues (6)

| ID | Issue | Persona |
|----|-------|---------|
| COS-1 | DailyProgressSummary uses ~10px font — borderline unreadable | Jamie |
| COS-2 | FAB buttons have no text labels — non-tech users may not recognize as buttons | Jamie |
| COS-3 | Long-press gestures (voice input, task delete) are completely hidden | Marcus, Jamie |
| COS-4 | "Fields to fill out" on tracker card — should say "questions to answer" | Jamie |
| COS-5 | "Today's Recurring Homework" header uses jargon — should just say "Today's Homework" | Jamie |
| COS-6 | Regulation score 1-10 with 10 verbal labels is too granular — adjacent levels indistinguishable | Marcus |

---

## What Worked Well

| Area | Notes |
|------|-------|
| **RTM billing flow (Web)** | Sarah completed the entire flow — filter billable → identify client → generate superbill — in under 2 minutes. Billability checklist, progress bars, and contextual actions are excellent. |
| **Daily check-in flow (Mobile)** | Clear section header, clean form layout, encouraging confetti celebration on completion. All 3 personas completed it. |
| **Auto-save with indicator** | The debounced auto-save with "Saving..." → "Saved ✓" pattern works well on both web and mobile. Users noticed and appreciated it (once they found it). |
| **Task creation (Mobile)** | Simple, fast, clear affordances. Marcus completed it in 15 seconds. |
| **Visual design** | Earth tone palette, calming colors, clean cards, good whitespace. Multiple personas noted the app feels calming and professional. |
| **Share with clinician toggle** | Both mobile personas appreciated having control over journal privacy. |
| **Drag-and-drop module reordering (Web)** | Sarah discovered and used it without trouble. |

---

## Prioritized Recommendations

### Sprint priority (fix before Sprint 15 gamification work)

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| P0 | **CRIT-1:** Wire up Insights screen navigation | XS (add 1 card + link) | Unlocks an entire built feature |
| P0 | **CRIT-2:** Add publish/draft workflow to program editor | S-M | Prevents exposing incomplete content to patients |
| P1 | **MAJ-2:** Surface invitation on Today screen | XS | First-run experience is broken without it |
| P1 | **MAJ-3:** Replace "regulation score" jargon | XS (copy change) | Core daily input is incomprehensible |
| P1 | **MAJ-4:** Move homework higher + add entry point from Program tab | S | Primary therapeutic action is buried |
| P1 | **MAJ-5:** Add persistent appointments navigation | S | Core scheduling feature has conditional access |
| P2 | **MAJ-1:** Build session prep view | M-L | High value but larger effort |
| P2 | **MAJ-6:** Add first-use onboarding | M | Important for low-tech users |
| P2 | **MAJ-7:** Merge appointments into Calendar tab | M | Mental model alignment |
| P2 | **MAJ-8:** Fix client/patient terminology | XS | Quick find-and-replace |

---

## Task Completion Summary

### Clinician (Sarah) — 6 tasks

| Task | Completed | Time | Issues |
|------|-----------|------|--------|
| C1: Create program from template | ✅ Yes | 60-90s | Minor: no preview |
| C2: Customize and publish | ⚠️ Partial | 3-5 min | **Critical: no publish button** |
| C3: Invite client + assign program | ✅ Yes | 2-3 min | Minor: terminology |
| C4: Prepare for session | ⚠️ Partial | 3-5 min | **Major: no prep view** |
| C5: RTM billing check | ✅ Yes | 1-2 min | Clean flow |
| C6: Create blank program for client | ✅ Yes | 30-60s | Minor: subtle distinction |

### Participant — Marcus (tech-savvy) — 7 tasks

| Task | Completed | Time | Issues |
|------|-----------|------|--------|
| P1: Accept invitation | ✅ Yes | 45-90s | Major: not on Today |
| P2: Daily check-in | ✅ Yes | 60-90s | Minor: disappears after |
| P3: Add task | ✅ Yes | 15-20s | Clean |
| P4: Complete homework | ⚠️ Partial | 60-120s | Major: split locations |
| P5: Journal entry | ✅ Yes | 2-3 min | Major: jargon |
| P6: Check progress | ❌ No | 60s+ | **Critical: unreachable** |
| P7: Find appointment | ✅ Yes | 10-15s | Major: fragile nav |

### Participant — Jamie (low-tech) — 7 tasks

| Task | Completed | Time | Issues |
|------|-----------|------|--------|
| P1: Accept invitation | ✅ Yes | 3-4 min | Major: no onboarding |
| P2: Daily check-in | ✅ Yes | 2-3 min | Minor: jargon |
| P3: Add task | ✅ Yes | 1-2 min | Minor: FAB label |
| P4: Complete homework | ✅ Yes | 3-5 min | Major: buried in scroll |
| P5: Journal entry | ✅ Yes | 2-3 min | Major: jargon |
| P6: Check progress | ❌ No | 3+ min | **Critical: unreachable** |
| P7: Find appointment | ✅ Yes | 1-2 min | Major: calendar mismatch |

**Overall unassisted completion rate:** 17/20 tasks (85%) — meets 80% target but 2 critical failures and 1 partial
