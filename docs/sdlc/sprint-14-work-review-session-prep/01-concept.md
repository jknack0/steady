# Sprint 14: Steady Work Review + Session Prep + Per-Participant Customization — Concept

## Problem Statement

### 14.1 — Steady Work Review + Session Prep

Clinicians and participants arrive at sessions poorly prepared to use their time well. Participants forget what they completed or struggled with since the last session. Clinicians flip through raw homework status records and session notes from the previous visit, mentally assembling a picture that the platform already has the data to produce automatically. This friction wastes the first 5–10 minutes of every session, erodes the quality of clinical review, and leaves participants feeling unseen ("my clinician never reads what I did").

Steady already captures homework completion, daily tracker entries, and session notes. What's missing is a structured pre-session ritual: a participant-facing reflection prompt 24 hours before each appointment, and a clinician-facing aggregated "Prepare for Session" view that surfaces exactly what they need before the client walks in.

### 14.2 — Per-Participant Homework Customization

ADHD presentations are heterogeneous. A program's homework items are designed for a generalized population, but a clinician may need to de-emphasize items irrelevant to a specific client, add resources tailored to that client's comorbidities, or attach a brief note visible only to that participant. Today, the only options are to modify the shared program (affecting all enrolled participants) or do nothing. This creates a false choice between platform-level customization and no customization, locking out the nuanced, individualized care that differentiates ADHD-specialized practice.

---

## Who Benefits

| Stakeholder | Pain Today | Gain from Sprint 14 |
|---|---|---|
| Clinician | Manually reviews records before each session; misses patterns | Pre-populated session prep view; structured review responses waiting before they log in |
| Participant | Forgets what they worked on; feels clinician isn't reading their data | Prompted to reflect 24h out; sees their effort acknowledged in session |
| Practice (owner) | Wants evidence of structured clinical workflows for compliance/payer audits | Timestamped review submissions create an auditable pre-session record |

---

## Core User Stories

### 14.1 — Steady Work Review + Session Prep

**US-1 (Clinician — configure review questions):**
As a clinician, I can configure the set of review questions sent to a participant before each session, per program, so that the reflection questions match what that program emphasizes.

**US-2 (Clinician — configure barrier checklist):**
As a clinician, I can configure a barrier diagnostic checklist (with defaults pre-populated) so that participants can quickly identify what got in the way of completing Steady Work, without writing paragraphs.

**US-3 (Participant — complete pre-session review):**
As a participant, I receive a push notification 24 hours before my scheduled appointment and can complete my Steady Work Review from the mobile app in under 5 minutes.

**US-4 (Clinician — session prep view):**
As a clinician, I can open a full-screen "Prepare for Session" view for an upcoming appointment that shows: the participant's review responses, homework completion status, key stats since last session, the previous session's notes, and a textarea for drafting today's notes — all in one place.

**US-5 (Clinician — fallback when review not submitted):**
As a clinician, I can still open the session prep view even if the participant did not submit a review, and the relevant homework/stats sections are still populated from existing data.

### 14.2 — Per-Participant Homework Customization

**US-6 (Clinician — hide homework items):**
As a clinician, I can hide specific homework items from a participant's enrollment view without modifying the underlying program, so other participants are unaffected.

**US-7 (Clinician — add supplemental resources):**
As a clinician, I can attach supplemental resources (links, text, uploaded files) to a specific participant's enrollment that are not part of the base program.

**US-8 (Clinician — add participant-visible notes):**
As a clinician, I can write a short note on a participant's enrollment that the participant sees in the relevant module or homework section, acknowledging their individual situation.

**US-9 (Participant — transparent delivery):**
As a participant, I see my customized homework view without any visual indication that the underlying program has been modified — overrides are merged transparently so the UX feels intentional, not patched.

---

## Key Design Decisions

### Decision 1: Where does the review response live?

**Recommended: New `SessionReview` model linked to `Appointment`.**

A `SessionReview` is a discrete clinical artifact — timestamped, participant-authored, linked to a specific appointment. Storing it as a `JournalEntry` subtype would muddy the journal's personal-reflection semantics. Storing it in the `Session` model would mix participant-authored pre-session content with clinician-authored notes. A purpose-built `SessionReview` model keeps separation of concerns clean, satisfies the audit requirement (who submitted, when, linked to which appointment), and gives sprint 25 (progress notes) a clean surface to reference.

**Rejected alternative:** Freeform journal entry submitted "before session" with a special tag. Rejected because: no structured barrier checklist support, no reliable linkage to a specific appointment, difficult to surface in the prep view without a join table anyway.

### Decision 2: Review question configuration — program-level or appointment-level?

**Recommended: Program-level with per-question enable/disable, not per-appointment customization.**

Clinicians configure a `ReviewTemplate` per program (a set of `ReviewQuestion` records). All appointments within an enrollment use that program's template. Per-appointment question customization is out of scope — it adds significant UI complexity for a rare use case. The defaults (4 open-ended questions + 9-item barrier checklist) cover the vast majority of needs.

### Decision 3: 24h notification trigger — event-driven or scheduled poll?

**Recommended: pg-boss scheduled job triggered when an Appointment is created or updated.**

When an appointment is saved, a pg-boss job is enqueued with a `runAt` of `appointment.startAt - 24h`. If the appointment is rescheduled, the old job is cancelled and a new one is enqueued. This avoids a polling cron that scans all appointments on an interval, and fits the existing pg-boss infrastructure already used for RTM and notification workers. The job emits a push notification to the participant (via Expo Server SDK, same path as existing notification workers).

### Decision 4: Session prep view — new route or in-place panel on the calendar?

**Recommended: Full-screen route at `/sessions/prep/[appointmentId]` on the web app, accessible from the appointment card in the calendar.**

A full-screen route allows deep-linking (clinician opens it from email reminder, mobile device, or second monitor), supports keyboard navigation across sections, and avoids overloading the calendar's popover with dense clinical data. The appointment card in the calendar gets a "Prepare" CTA button. The view is clinician-only (requires `CLINICIAN` role); participant review responses are read-only.

### Decision 5: EnrollmentOverride model scope

**Recommended: `EnrollmentOverride` model with three override types — `HIDE_ITEM`, `ADD_RESOURCE`, `CLINICIAN_NOTE`.**

The override record references an `enrollmentId`, a `targetId` (the part or homework item being overridden), `targetType` (enum), and an `overrideType`. This is a clean, extensible schema. Supplemental resources and clinician notes are stored as typed JSON payloads on the override record.

The module delivery service (`services/participant.ts`) merges overrides at query time: hidden items are filtered out, supplemental resources are injected after their target part, and clinician notes are attached to the relevant part or section. The participant never sees a "this was customized for you" message — the merged view renders identically to a non-customized view.

**Rejected alternative:** Copy the entire enrollment's content into a participant-specific fork at override time. Rejected because: forks diverge permanently, program updates don't propagate, and it requires duplicating large content trees for a potentially minor change.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Clinicians skip configuring review questions and the feature goes unused | Medium | Medium | Ship with opinionated defaults that require zero configuration to activate — the review fires automatically for any appointment unless the clinician explicitly disables it |
| Participants ignore the 24h notification | High | Low | Low impact because the session prep view still populates from homework/stats data; the review response section shows "not submitted" gracefully |
| Over-customization creates clinical inconsistency (clinician hides important items for the wrong reasons) | Low | High | No platform guardrail — this is a clinical judgment call. Document in PO spec that Steady does not validate clinical appropriateness of overrides. Consider an audit log entry per override for compliance |
| Session prep view becomes a data dump that clinicians don't actually read | Medium | Medium | UX must be ruthlessly prioritized: progressive disclosure, summary cards first, detail on expand. This is a UX spec concern, not a concept concern — flag for sprint 14 UX phase |
| `EnrollmentOverride` merge logic introduces N+1 queries | Medium | High | Merge must be implemented in the service layer with a single prefetch of all overrides for the enrollment, not per-item lookups. Architecture phase must enforce this |
| pg-boss `runAt` job timing drifts if server restarts or job is delayed | Low | Low | 24h is approximate; a few minutes of drift is acceptable clinically. Document expected precision in PO spec |

---

## Recommendation

Ship both 14.1 and 14.2 together in Sprint 14. They are logically independent (different models, different UI surfaces) but share a philosophical theme — individualizing the clinical experience around the participant's actual Steady Work. Shipping them together keeps the sprint narrative coherent and avoids a half-sprint of effort that doesn't tell a complete user story.

**Critical scope boundary:** The session prep view in 14.1 reads from the `Appointment` model introduced in Sprint 19. If Sprint 14 is developed before Sprint 19 ships, the prep view must either be gated behind a feature flag or stubbed against the existing `Session` model (without appointment linkage). The concept assumes Sprint 19's `Appointment` entity is available; the PO must confirm sequencing.

**Default-on, zero-config philosophy:** Both sub-features should be on by default. Review questions use the 4-question + 9-barrier defaults out of the box. EnrollmentOverrides are opt-in per participant but require no program-level setup to become available. Clinicians who never configure anything should still see the session prep view populated with homework data and stats.

---

## Out of Scope (explicitly deferred)

- Participant-completed review from the web portal (mobile-only for Sprint 14)
- Recurring review templates that vary by session number (e.g., "first session questions" vs. "week 4 questions")
- Clinician ability to override review questions per individual appointment
- Group session review (multiple participants submitting reviews for one appointment)
- Review response analytics across a cohort (deferred to stats/insights sprint)
- Per-participant override of program-level tracker configuration (separate sprint)
- Version history of EnrollmentOverrides (deferred — current override state is what matters clinically)
- Participant-initiated requests to hide homework items

---

## Open Questions (for PO to lock down)

1. **Sprint sequencing**: Is `Appointment` (Sprint 19) available before Sprint 14 ships, or does the prep view need to degrade gracefully against `Session` only?
2. **Review submission deadline**: Is 24h the right trigger? Should the clinician be able to configure the lead time per program (e.g., 48h for intensive programs)?
3. **Clinician note visibility scope**: Is a clinician note on an enrollment visible to other clinicians in the same practice, or only to the originating clinician?
4. **Barrier checklist format**: Are barriers single-select (pick one primary barrier) or multi-select (check all that apply)? Multi-select is richer data but adds friction.
5. **Review response retention**: How long are `SessionReview` records retained? HIPAA requires a minimum of 6 years. Confirm this aligns with the platform's overall data retention policy.
