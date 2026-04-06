# Clinician Patient Invitations — Concept

## Problem Statement
Clinicians have no way to bring patients into the Steady app. There is a complete gap between a clinician wanting a patient on the platform and that patient having an account. This blocks the entire value chain — no patients means no homework, no check-ins, no RTM tracking.

## Recommended Approach
**Hybrid invite code + optional email notification.** The system generates a unique invite code tied to the clinician (and optionally a program). The clinician shares the code however they see fit — verbally, on paper, through their own patient portal, etc. Optionally, they can trigger a PHI-free email nudge to the patient. Invite status lives on the existing patients page (pending invites shown alongside active patients), and a widget on the individual patient view page tracks that specific patient's invite/onboarding status.

## Key Scenarios
1. **In-session invite with program:** Clinician creates an invite, selects a CBT program, and reads the code to the patient during their appointment. Patient downloads the app that evening, enters the code, and lands in the program.
2. **Batch onboarding without program:** Clinician is moving their practice to Steady. They generate invite codes for several patients and send optional email nudges. Patients trickle in over the next week — clinician sees pending vs. accepted status right on their patients page.
3. **Invite goes stale:** Patient never signed up. Clinician sees "pending" status on the patients page, clicks into the patient view, and resends the email nudge or generates a fresh code from the invite widget.

## Out of Scope
- Dedicated invite dashboard (invite status lives on existing patients page)
- SMS notifications (email only for optional nudge, code sharing is clinician's choice)
- Patient self-registration without a clinician invite
- Bulk import from EHR/CSV systems
- In-app messaging between clinician and patient

## Open Questions
- How long should invite codes remain valid before expiring? (7 days? 30 days? configurable?)
- Should there be a limit on how many pending invites a clinician can have?
- Can a single patient receive invites from multiple clinicians (e.g., therapist + psychiatrist)?

## Alternatives Considered
- **Email/SMS invite link only** — Rejected because email/SMS are not HIPAA-secure channels and this forces a single sharing mechanism. Doesn't align with letting clinicians use the app their way.
- **Invite code only (no email option)** — Rejected because it leaves the "patient forgets" problem entirely unsolved. The optional email nudge adds flexibility without compromising security.
