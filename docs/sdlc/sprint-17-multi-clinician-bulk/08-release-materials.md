# Sprint 17: Multi-Clinician Practice Management + Bulk Actions — Release Materials

## What's New

### Practice Owner Dashboard
Practice owners can now view aggregate statistics across all clinicians in their practice from a dedicated dashboard at `/practice`. The dashboard shows total clinicians, programs, active clients, and upcoming appointments at a glance, with per-clinician breakdowns.

### Practice-Wide Participant Visibility
Practice owners can see all participants across all clinicians in one searchable, paginated table. Each row shows the participant's assigned clinician, making it easy to oversee care delivery across the practice.

### Clinician Management
Practice owners can invite new clinicians by email and remove team members directly from the Practice dashboard. Invited clinicians immediately gain access to practice templates and shared resources.

### Enhanced Bulk Actions
- **Max 50 cap** prevents abuse and ensures manageable audit trails
- **Per-participant audit logging** for every bulk action (HIPAA COND-2 compliant)
- **500-character message truncation** on nudge messages
- Existing bulk actions (Unlock Next Module, Send Nudge, Push Task) work as before with these improvements

## Talking Points

1. "Group practices can now manage their entire team from one place — no more switching between individual clinician views."
2. "Practice owners get bird's-eye visibility into all participants across all clinicians, with full audit trails for compliance."
3. "Bulk actions are now capped at 50 participants per operation with per-participant audit logging, meeting HIPAA requirements for access tracking."

## FAQ

**Q: Can a non-owner clinician see other clinicians' participants?**
A: No. Only practice owners (PracticeMembership.role = OWNER) can access the practice-wide participant list and stats dashboard.

**Q: Are there schema changes in this sprint?**
A: No. Sprint 17 builds entirely on the existing Practice and PracticeMembership models.

**Q: What happens when a clinician is removed from a practice?**
A: Their PracticeMembership is deleted. Their programs and enrollments remain intact — they just lose access to practice templates and the owner loses visibility into their participants.

**Q: Is the bulk action limit configurable?**
A: Currently fixed at 50 per request. This can be made configurable per practice in a future sprint.

## Known Limitations

- Invite flow requires the clinician to already have a Steady account (no account creation during invite)
- No email notification sent on invite (deferred to email service integration)
- Practice nav item is visible to all clinicians (shows "No Practice" empty state for non-owners)
- Bulk action does not verify ClinicianClient ownership per-participant (uses profile resolution only)
