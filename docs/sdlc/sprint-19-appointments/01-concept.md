# Sprint 19: Appointment Entity + Clinician Calendar — Concept

## Problem Statement

Steady clinicians have no way to schedule 1:1 work with clients from a calendar UI. The existing `CalendarEvent` model is participant-facing (time blocks for personal time management), and the existing `Session` model is a clinical-notes container with no calendar surface. SimplePractice competitors all have a clinician-first scheduling calendar as the operational hub of the platform — Steady cannot compete for practice-management customers without one.

Sprint 19 introduces a clinician-facing `Appointment` entity as the foundation for everything downstream: reminders (sprint 21), progress notes per appointment (sprint 25), insurance claims (sprint 36), telehealth (sprint 42), and automated workflows (sprint 49+).

## Recommended Approach

**Greenfield `Appointment` model, orthogonal-but-linkable to `Session`, with five resolved design decisions.**

### Decision 1: Appointment vs. Session relationship

`Appointment` and `Session` stay **orthogonal but linked**. Rationale:
- `Appointment` = calendar event (when, where, who, what service code, status)
- `Session` = clinical note (what happened in the session, signed/locked, HIPAA-sensitive)
- An `Appointment` can exist without a `Session` (scheduled future appointment; attended but notes not yet written)
- A `Session` can exist without an `Appointment` (historical backfill; impromptu clinical work)
- Going forward, `Session.appointmentId` is an optional FK. New sessions created from the calendar auto-link to their appointment.

This preserves existing `Session` semantics, avoids retrofit, and lets sprint 25 (progress notes) build cleanly on top.

### Decision 2: Client model

**No new top-level `Client` entity.** Instead, decouple `ParticipantProfile` from `Enrollment`: a `ParticipantProfile` can exist without a program enrollment (they're "just a client"). This requires no schema bloat — just removing any assumption that enrollment is required.

Rationale: SP's "client" and Steady's "participant" are the same concept. Introducing a parallel `Client` model would fork the codebase and create reconciliation debt forever. One entity, two relationship types (enrolled-in-program / not-enrolled).

### Decision 3: Service codes

**Per-practice library seeded with CPT defaults.**
- System ships with a seed list of the ~15 most common mental-health CPT codes (90834, 90837, 90791, 90847, 90846, 90853, 96127, 96136, etc.)
- Practices can add/edit/disable codes in their own library (full CRUD deferred — sprint 19 ships seed + read-only)
- Each `Appointment.serviceCodeId` references one code
- Service codes carry duration hint, default price, and description (unblocks billing + insurance claims later)

### Decision 4: Locations

**Practice-owned `Location` entity with both physical and virtual types.**
- New `Location` model owned by `Practice`
- `LocationType`: `IN_PERSON` or `VIRTUAL` (telehealth uses `VIRTUAL` — sprint 42 builds on this)
- `Appointment.locationId` references the chosen location
- Ships with seed defaults per practice (one default in-person + one default telehealth)
- Full location CRUD included (simple enough to ship in sprint 19)

### Decision 5: Recurrence

**Deferred to sprint 20 (Availability + Booking).** Sprint 19 ships **single appointments only**. Keeps scope honest for 2 weeks and respects the existing sprint plan boundary.

## Key Scenarios

### Scenario 1: Solo clinician schedules a first session with a new client
Clinician opens the calendar, clicks an empty time slot on Tuesday 2pm, picks a client from their participant list (un-enrolled is fine), selects service code `90791` (Initial Evaluation, 60 min), selects their default office location, saves. The appointment appears on the calendar with status `SCHEDULED`.

### Scenario 2: Clinician marks an appointment attended after the session
Clinician opens the past appointment, clicks "Mark Attended". Status changes to `ATTENDED`. (Sprint 25 will add a "Write progress note" action that creates a `Session` linked to this appointment.)

### Scenario 3: Client no-shows, clinician enforces cancellation policy
Clinician opens an appointment that has passed, clicks status dropdown, selects `NO_SHOW`. Audit log captures the state change with the clinician's user ID. (Sprint 21 will add automatic no-show fee billing; sprint 50 will add the no-show follow-up workflow.)

### Scenario 4: Group practice with multiple clinicians and locations
A 5-clinician practice with two physical offices. Calendar view filters by clinician (default: only mine) and location. Appointments created by Clinician A are not visible to Clinician B unless Clinician B has `entire practice access` (deferred to sprint 46 for full role granularity — sprint 19 ships simple "own appointments only" for non-owners).

### Edge case: Appointment conflict
Two appointments overlap for the same clinician at the same time. Sprint 19 **warns but does not block** — clinicians sometimes intentionally double-book (e.g., a consult squeezed in). Backend records both; UI highlights the conflict.

## Out of Scope (explicitly deferred)

- **Recurring appointment series** → sprint 20
- **Availability blocks with repeating patterns** → sprint 20
- **Client-initiated appointment requests (booking via portal/mobile)** → sprint 20
- **Appointment reminders (email/SMS/voice)** → sprint 21
- **Automatic cancellation policy enforcement / fees** → sprint 21
- **Group appointments with 3+ participants** → deferred (sprint 47, group practice phase). Sprint 19 supports `INDIVIDUAL` and `COUPLE` types only. Schema includes `GROUP` enum value for forward compatibility, but no multi-participant UI.
- **Service code CRUD UI** → sprint 19 ships read-only UI + seeded defaults; admin editing is stretch
- **Full role-based calendar visibility (Practice Manager, Supervisor, etc.)** → sprint 46
- **Calendar color-coding** → sprint 46
- **Multi-clinician calendar filters with admin view** → sprint 46
- **Calendar sync (Google/Apple/Outlook)** → sprint 22
- **Telehealth launch from appointment** → sprint 42
- **Insurance claim auto-generation from attended appointment** → sprint 36
- **Session note auto-creation from appointment** → sprint 25
- **Waitlist** → sprint 23

## Open Questions (for PO to lock down)

1. **Default appointment duration**: Pull from `ServiceCode.defaultDuration`, or always prompt? **Recommendation:** pull from service code, allow override.
2. **Time zones**: Clinician's time zone is canonical for storage; UI renders in clinician local. Multi-timezone practices deferred. **Recommendation:** store UTC, display in clinician's configured TZ.
3. **Cancellation vs. deletion**: Canceled appointments stay in the database (audit trail) with status = `CANCELED`. Hard delete only for mistakenly-created appointments (permission-gated, audit-logged). **Recommendation:** soft-delete-by-status by default; no hard delete UI in sprint 19.
4. **Appointment notes field**: Free-text "internal note" on the appointment itself (distinct from clinical `Session` note)? **Recommendation:** yes, include a short `internalNote` field — clinicians use these for "bring insurance card" style reminders to themselves. Not client-visible.
5. **Color of appointment card**: Per service code? Per status? Per clinician? **Recommendation:** sprint 19 ships status-based coloring only (scheduled/attended/canceled palette). Full color-coding is sprint 46.

## Alternatives Considered

### Approach B: Thin join model over existing `Session`
Add a few fields to `Session` (`scheduledStartAt`, `serviceCode`, `locationId`, `appointmentStatus`) and build the calendar UI directly over `Session` records. **Rejected because:**
- Muddies `Session` semantics (it's a clinical note container, not a calendar event)
- `Session` already has complex audit/locking implications from HIPAA — overloading it with scheduling concerns creates compliance risk
- No path forward for scheduling non-session work (consults, intake calls, administrative time)
- Retrofits existing `Session` audit trail in confusing ways

### Approach C: UI-only sprint with minimal schema delta
Just build a calendar UI over existing `Session` + `CalendarEvent` records, with no new backend entities. Push schema work to later. **Rejected because:**
- Blocks every downstream sprint (reminders, telehealth, claims, notes all need a stable `Appointment` identity)
- Creates a UX/backend mismatch — users see "appointments" but the data model has no such concept
- Would require a disruptive migration later once downstream sprints need the entity anyway
- Fails the roadmap's stated goal of sprint 19 as "foundation"

### Approach D: Full-scope SimplePractice parity in one sprint
Build Appointment + availability + recurring series + reminders + booking all in sprint 19. **Rejected because:**
- Impossible in 2 weeks (the sprint plan already allocates 4 sprints for this: 19, 20, 21, 23)
- Merges multiple gate-worthy decisions into one sprint, making iteration harder
- Violates the roadmap's explicit sprint boundaries
