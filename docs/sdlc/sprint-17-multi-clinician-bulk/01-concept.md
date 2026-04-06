# Sprint 17: Multi-Clinician Practice Management + Bulk Actions — Concept

## Problem Statement

Solo-clinician practices are well-served by Steady's current design, but group practices need practice-wide visibility and management tools. Today, a practice owner cannot see aggregate stats across clinicians, view all participants in the practice, or perform bulk actions on multiple participants simultaneously. Clinicians waste time performing repetitive single-participant operations (unlock module, send nudge, push task) one at a time.

## Stakeholders

| Role | Need |
|------|------|
| **Practice Owner** | Aggregate dashboard, practice-wide participant visibility, clinician management |
| **Staff Clinician** | Efficient bulk operations on their participant caseload |
| **Participant** | Unaffected — receives the same notifications/tasks/unlocks, just delivered more efficiently |

## User Stories

| ID | Story |
|----|-------|
| US-1 | As a **practice owner**, I want to **invite clinicians to my practice by email** so I can **grow my team without manual setup**. |
| US-2 | As a **practice owner**, I want to **remove a clinician from my practice** so I can **manage departures**. |
| US-3 | As a **practice owner**, I want to **see aggregate stats across all clinicians** so I can **monitor practice health**. |
| US-4 | As a **practice owner**, I want to **see all participants across all clinicians** so I can **oversee care delivery**. |
| US-5 | As a **clinician**, I want to **select multiple participants and unlock a module for all of them** so I can **save time on group progressions**. |
| US-6 | As a **clinician**, I want to **send a nudge notification to multiple participants at once** so I can **efficiently check in on my caseload**. |
| US-7 | As a **clinician**, I want to **push the same task to multiple participants** so I can **assign group homework efficiently**. |

## Key Decisions

1. **Invite = immediate membership** — No pending invitation flow; clinician must already have a Steady account. Simplifies MVP.
2. **Existing bulk actions stay in `/api/clinician/participants/bulk`** — The existing bulk endpoint already handles push-task, unlock-next-module, and send-nudge. Sprint 17 enhances validation (practice context, ownership verification, max 50 cap) but keeps the same shape.
3. **Practice dashboard is a new route** — `/practice` in the dashboard group, owner-only.
4. **No schema changes** — Practice and PracticeMembership models already exist with all needed fields.

## Success Metrics

- Practice owner can manage clinicians (invite/remove) from the web UI
- Practice owner sees aggregate stats and practice-wide participant list
- Bulk actions enforce max 50 participant cap and practice ownership
- All bulk actions generate per-participant audit log entries
- Zero cross-practice data leakage

## Out of Scope

- Clinician role permissions beyond OWNER/CLINICIAN
- Practice-level billing or invoicing
- Invitation email delivery (deferred to email service integration)
- Mobile practice management UI
