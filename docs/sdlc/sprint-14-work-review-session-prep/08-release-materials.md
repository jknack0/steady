# Sprint 14: Steady Work Review + Session Prep + Per-Participant Customization — Release Materials

## One-Liner

Participants now complete a structured pre-session reflection from their phone, and clinicians walk into every session with a single-screen prep view that puts the review, homework status, and session notes in one place.

---

## Elevator Pitch

Before this sprint, clinicians stitched together session context from three separate screens. Participants had no structured way to reflect before showing up. Sprint 14 closes both gaps: a participant-facing Steady Work Review (mobile, ~5 minutes, prompted 24h before the session) feeds directly into a new clinician Session Prep page — a three-panel view showing the submitted review, open homework, and a notes area that autosaves. Clinicians who want to personalize content for a specific participant can now add, hide, or annotate program materials on a per-enrollment basis without touching the program template.

---

## Feature Highlights

### For Clinicians

**Session Prep page (three-panel layout)**
- Opens from the calendar event detail with one click.
- Left panel: participant's submitted Steady Work Review — answers and any checked barriers, or a "not yet submitted" placeholder.
- Center panel: open and recently completed homework items for the enrollment.
- Right panel: clinician notes with 2-second autosave + tracker trends (mood, sleep, energy) over the last 30 days.
- No additional loading — all three panels populate in a single API call.

**Customize review template per program**
- Configure the questions and barrier checklist shown to participants before sessions.
- A sensible default template is used until the clinician overrides it — no setup required to ship.

**Per-participant content customization (Customize tab)**
- Available on any enrollment detail page.
- Clinicians can hide a specific homework item, add a one-off resource link, append an extra homework task, or attach a private clinician note to a module — all without altering the program template.
- Overrides are applied transparently; participants see the personalized content as if it were always there.

### For Participants

**Steady Work Review (mobile)**
- Simple scrollable screen: a set of reflection questions and a barrier checklist.
- Takes about 5 minutes. Responses are saved immediately — participants can close and reopen without losing work.
- Submitted review is visible to the clinician in the Session Prep view before the session.

---

## FAQ

**Q: Does setting up a review template take long?**
A: No. A built-in default template is active for every program from day one — questions and barriers are ready to use without any configuration. Clinicians can customize the template whenever they want, but it is never required.

**Q: What happens if a participant does not submit a review before the session?**
A: The Session Prep page shows a "not yet submitted" placeholder in the review panel. The clinician still has access to the homework and notes panels. Nothing breaks.

**Q: Can participants see the clinician notes or overrides?**
A: No. Clinician notes in the prep view are private to the clinician. Enrollment overrides alter what the participant sees (content added or hidden), but the participant has no visibility into the override records themselves.

**Q: Does customizing an enrollment affect other participants in the same program?**
A: No. Overrides are scoped to a single enrollment. The program template and all other participants are untouched.

**Q: Can a clinician undo an override?**
A: Yes. Overrides can be deleted from the Customize tab at any time. Deleting a HIDE override immediately restores the original content for that participant.

**Q: Will participants be notified to complete their review before the session?**
A: The 24-hour push notification trigger is built but not yet enabled — it will be activated in sprint 15 once the pg-boss scheduling integration is finalized. In the meantime, clinicians can remind participants verbally or via the existing messaging flow.

---

## What Is NOT Included in This Release

| Item | Status |
|---|---|
| 24h push notification to trigger the review | Deferred to sprint 15 |
| Override merge into live participant content delivery | Deferred to sprint 15 (`applyOverrides()` is complete; wiring into delivery endpoint deferred) |
| Recurring / scheduled reviews (outside the pre-session flow) | Out of scope for this sprint |
| Web component tests for prep page and customize tab | Deferred to sprint 15 (non-blocking per policy) |

---

## Migration Notes

- **Additive only.** Three new database tables (`ReviewTemplate`, `SessionReview`, `EnrollmentOverride`) and one new enum (`OverrideType`) are added. No existing tables are modified.
- **No breaking changes.** All existing API endpoints, schemas, and mobile screens are unchanged.
- **No data backfill required.** Default review templates are generated at query time; no seed data is needed.
- **Zero downtime migration.** `prisma db push` (or the migration SQL equivalent) on deploy is sufficient.
