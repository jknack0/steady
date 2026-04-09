# Sprint 19: Clinician Calendar — Release Materials

> **Scope note:** This document describes the full sprint-19 release. The backend (models, API, tenant isolation, audit, tests) is shipped in this PR. The clinician-facing web UI ships in a follow-up PR — messaging below assumes the full release. Hold external communications until both PRs are merged.

## One-liner

Steady now has a real calendar. Schedule, edit, and track client appointments from your dashboard — with HIPAA-grade audit, tenant isolation, and zero extra tools.

## Elevator pitch (30 seconds)

Until today, Steady was great for content and homework but quiet about *when* you actually meet your clients. Sprint 19 changes that. Clinicians now get a day/week/month calendar built into Steady, with 15 pre-seeded CPT service codes, multi-location support, status tracking (scheduled, attended, no-show, canceled), and a warning when you're about to double-book. It's the first piece of making Steady a full practice-management tool — and it was built HIPAA-compliant from day one, with tenant-scoped access, audit trails, and practice-wide visibility for group practice owners.

## Feature highlights

### For solo clinicians
- **Schedule in seconds.** Click any time slot in the week view, pick your client and service code, and you're done.
- **Three calendar views.** Day, week, and month — navigate with keyboard shortcuts (`D`/`W`/`M`, arrow keys, `T` for today).
- **Status tracking.** Mark appointments as attended, no-show, or canceled without leaving the calendar.
- **Internal notes.** Private reminders per appointment ("bring insurance card") — visible only to you and your practice, never to the client.
- **Conflict warnings.** Double-booked? Steady warns you but doesn't block — sometimes you meant to.
- **Mistakes are reversible.** Accidentally created an appointment? Delete within 24 hours. After that, use cancellation to preserve the audit trail.

### For group practices
- **Shared calendar visibility.** Practice owners see every clinician's schedule in one view.
- **Per-practice locations.** Main office, satellite offices, telehealth — manage them once, use them everywhere.
- **Owner-only controls.** Standard clinicians can't modify locations; owners have full control.

### For billing and compliance
- **15 pre-seeded CPT codes.** Industry standard (90791, 90834, 90837, etc.) — ready to use on day one.
- **Audit trail.** Every create, update, cancel, and delete is logged with who, what, and when — but never the content of private notes.
- **Client attendance history.** Every status change is timestamped and auditable — the foundation for future billing workflows.

## What's NOT in sprint 19 (set expectations)

- Recurring appointments — coming in sprint 20
- Drag-to-reschedule — coming in sprint 20
- Automated client reminders (email/SMS) — later sprint
- Client-initiated booking — later sprint
- Calendar sync (Google/Apple/Outlook) — later sprint
- Mobile app UI for clinicians (mobile remains participant-only)
- Editing service codes (the 15 pre-seeded codes are fixed for now)

## Sales talking points

1. **"Steady is now a practice-management tool, not just a content platform."** Sprint 19 is the biggest shift in what Steady *is* since launch.
2. **"Built HIPAA-compliant from day one."** Most calendar SaaS tools are not HIPAA-compliant. Steady's calendar is tenant-isolated, audit-logged, and enforces PHI protection at the API level.
3. **"Scheduling takes under 15 seconds."** We measured. Click a slot, pick a client, pick a code, done.
4. **"Your clients don't need to be enrolled in a program to be scheduled."** Sprint 19 decouples the calendar from the content engine — you can use Steady for any client, even ones who aren't on a program track.
5. **"Group practices see a unified calendar."** Account owners get practice-wide visibility; standard clinicians see only their own schedule.

## FAQ

**Q: Can clients see their appointments?**
A: Not yet. Sprint 19 is clinician-only. Participant-facing appointment views are coming in a future sprint. When they ship, they'll automatically exclude your internal notes and cancellation reasons — those always stay private to you.

**Q: What happens if I double-book?**
A: Steady saves the appointment and shows you a yellow warning banner listing the conflict. You can keep both, undo the new one, or reschedule. Conflict detection ignores canceled and no-show slots.

**Q: Can I delete an appointment I made by mistake?**
A: Yes, within 24 hours of creating it, as long as it hasn't been marked attended and no clinical notes are linked. After 24 hours (or if it's been linked to a session), use the cancellation flow instead — this preserves the audit trail required for compliance.

**Q: What CPT codes are included?**
A: 15 common therapy codes: 90791 (diagnostic eval), 90832/90834/90837 (psychotherapy 30/45/60 min), 90846/90847 (family therapy), 90853 (group), 90839/90840 (crisis), 96127/96136/96138 (testing), 99354/99355 (prolonged), 90785 (interactive complexity add-on). Each has a default duration and suggested price that auto-fills when you pick the code.

**Q: Can I add my own service codes or edit the defaults?**
A: Not in sprint 19. Custom and editable codes are planned for a follow-up release. If the default 15 don't cover your practice, contact support.

**Q: How are time zones handled?**
A: All appointments are stored in UTC. The calendar displays times in your configured clinician time zone (defaults to Eastern; change it in your profile settings). Future: per-location time zones for traveling clinicians.

**Q: Can a clinician in Practice A accidentally see appointments from Practice B?**
A: No. Tenant isolation is enforced at the database query layer on every single appointment, location, and service code lookup. Cross-practice requests return "not found" — we don't even confirm the resource exists. This is a hard architectural guarantee, not a convention, and every endpoint has a dedicated test that attempts cross-practice access and verifies it fails.

**Q: What gets audit-logged?**
A: Every create, update, cancel, and delete. The log captures who did it, what type of action, which resource, and which field names changed — but never the content of private fields like internal notes. Status transitions additionally log the old and new status (both non-PII enum values), which is permitted by HIPAA's minimum-necessary standard.

**Q: Is my data encrypted?**
A: Yes — at rest in Postgres and in transit via TLS, same as everything else in Steady.

**Q: When can I drag appointments to reschedule?**
A: Sprint 20, alongside recurring appointments. For sprint 19, use the edit modal.

**Q: Does this integrate with Google Calendar?**
A: Not yet. External calendar sync is a later sprint. For now, Steady is your source of truth for appointments.

## Migration notes for existing users

- **Nothing breaks.** Your existing sessions, programs, and enrollments continue to work exactly as before.
- **Two default locations** ("Main Office" and "Telehealth") are automatically created for your practice the first time you open the calendar.
- **15 CPT codes** are automatically seeded for your practice the first time you open the calendar.
- **Your existing `Session` records** are unchanged. A new optional link field (`appointmentId`) exists but remains empty for all historical data.
- **Clients without an active program enrollment** can now be scheduled. Previously, `ParticipantProfile` was always tied to a program — sprint 19 decouples this.

## Support readiness checklist

- [ ] Support team briefed on the three calendar views and their keyboard shortcuts
- [ ] Support team briefed on the 24-hour delete window vs cancellation distinction
- [ ] Support team briefed on the practice-owner vs standard-clinician permission split
- [ ] Known-issue tracker updated with deferred items (recurring, drag-to-reschedule, calendar sync)
- [ ] Updated help-center article with the FAQ above
- [ ] Screenshot/demo video for the onboarding email

## Metrics to watch post-launch

- Time-to-first-appointment per new clinician (target: <5 min from sidebar click to saved appointment)
- Appointments created per active clinician per week
- Status change distribution (SCHEDULED → ATTENDED should dominate; high NO_SHOW could signal workflow issues)
- Conflict warning frequency (tells us whether clinicians are actually using conflict detection or dismissing it)
- Delete usage within 24h (should be rare — high volume would indicate UX friction in create flow)
- Practice owner dashboard usage (indicates group practice adoption)

## Internal announcement draft

> **Shipping today: the Steady Calendar.**
>
> We just shipped the biggest functional change to Steady since launch: a real calendar inside the clinician dashboard. Schedule client appointments, track status through the day, filter by location or clinician, and see your whole week at a glance — all without leaving Steady.
>
> For solo clinicians, this replaces whatever third-party scheduling tool you were using. For group practices, owners now see a unified calendar across the whole team.
>
> 15 CPT service codes are pre-seeded. Two default locations (Main Office + Telehealth) are created automatically. Everything is tenant-isolated and audit-logged to HIPAA standards — we don't leak across practices, ever, and there's a dedicated test suite proving it.
>
> Drag-to-reschedule, recurring appointments, and external calendar sync are coming in sprint 20 and beyond. Feedback welcome in #product-feedback.
