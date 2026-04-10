# Concept — Client Web Portal (MVP: Telehealth Launcher)

## One-Line Pitch
Give clinician clients a dedicated web portal (`/portal`) where they can log in, see their calendar, and join telehealth sessions — the foundation for a full client web experience (messaging, agreements, billing) that ships later.

## Problem Statement

Today, clinician clients can only interact with STEADY through the Expo mobile app. This creates two concrete problems:

1. **Some clients refuse mobile entirely.** Older demographic, accessibility, or simple preference — they want to do everything from a laptop browser. Today clinicians work around this by manually sending meeting links outside the app, which defeats HIPAA audit trails, confuses scheduling, and erodes trust that the platform "just works."
2. **There's no foundation for a real client web experience.** The roadmap includes messaging, agreements, billing, and self-service from the client side — none of which can live on mobile alone. Without a portal shell and a clean client auth surface, every future web-side client feature becomes a one-off hack.

This feature solves #1 directly (shipping the telehealth join flow) and, more importantly, lays the auth + routing + shell plumbing for #2 so we're not rewriting it in 3 months.

## Who It's For

**Primary user:** ADHD treatment clients of participating clinicians.
- Some have existing mobile accounts and want to log in from a laptop for specific sessions.
- Some have never used mobile and are being onboarded to the platform via clinician invite.
- Characteristic cognitive load: ADHD. They need to get from "I have a session in 5 minutes" to "I'm in the session" with zero friction.

**Secondary user:** Clinicians, who need one button on the client detail page to grant or revoke a client's portal access.

## Scope (MVP)

### In scope
1. **Hybrid onboarding (Option D from Q2):**
   - Clinician clicks "Invite to portal" on the client detail page → system emails a single-use signup link → client sets password → logged in.
   - Clients who already registered via mobile can log in on web using their existing credentials — no re-signup required.
   - One clinician-facing toggle: "Portal access" (grant / revoke).
2. **Dedicated client portal shell:**
   - New route tree `/portal/*` with its own layout (no clinician sidebar, client-appropriate header, their name + logout).
   - Middleware enforces role boundaries: clinicians blocked from `/portal/*`, participants blocked from `/`, `/participants/*`, clinician routes.
3. **Separate login page (Option B from Q4):**
   - Clinicians: `/login` → `/` (unchanged)
   - Clients: `/portal/login` → `/portal`
   - Invite emails, password-reset emails, and any marketing surface for clients point at `/portal/login`.
4. **Client calendar view (Option C from Q3):**
   - Route `/portal/calendar` — full calendar grid, reusing existing calendar components from the clinician side, filtered to the logged-in participant's appointments.
   - Appointment card reuse: existing `AppointmentCard` component with a client-appropriate action set (Join instead of Edit/Cancel).
5. **Join telehealth from calendar:**
   - Big Join button on appointments that are in the join window.
   - Reuses existing `/telehealth/[appointmentId]` page and LiveKit session flow.
   - Participant-role JWT attaches to the LiveKit token issuance (existing endpoint already supports PARTICIPANT role).

### Explicitly out of scope (v1)
- Messaging, agreements, billing, homework, programs, journals — these all already exist on mobile and will come to the portal in later waves.
- Calendar editing (clients cannot reschedule or cancel from v1 — view-only + join).
- Mobile-side changes (the mobile app continues to work as-is).
- Client self-registration without a clinician invite.
- White-label subdomains (`portal.steadymentalhealth.com`) — deferred to future infra work.
- Email/SMS notifications about upcoming sessions (separate project — the portal is pull, not push, in v1).

## Key Design Decisions (locked from Ideation Q&A)

| Decision | Choice | Source |
|---|---|---|
| Primary pain driver | B (non-mobile clients) + C (portal foundation) | Q1 |
| Onboarding model | D — Hybrid: clinician invite + existing mobile credentials | Q2 |
| MVP surface | C — Dedicated `/portal/calendar` reusing existing components | Q3 |
| URL strategy | B — Separate portals: `/login` for clinicians, `/portal/login` for clients | Q4 |

## Alternatives Considered (and Rejected)

- **Pure self-registration with invite code (Q2 option B):** Rejected as a HIPAA footgun — you can't verify the real Jane Smith through a forwarded code.
- **Magic-link only, no passwords (not offered but worth noting):** Rejected because it doesn't match clinician workflow expectations and creates friction for frequent logins.
- **Ruthless "Next Session" card only (Q3 option A):** Strong UX pick for ADHD users but rejected because we already have the calendar components — reuse wins here. Flagged for UX phase to revisit.
- **Shared login with role-based redirect (Q4 option A):** Simpler now but creates phishing risk and muddies the client-facing URL. Rejected for maintainability.
- **Subdomain split (Q4 option C):** Over-engineered for MVP. DNS/cert/CORS/cookie-domain work is real cost. Deferred.

## Known Edge Cases to Flag for Architect

1. **Existing mobile-registered participants logging in on web for the first time.** They have a User row and ParticipantProfile but no web session. The login flow must work against their existing bcrypt hash.
2. **"Stub" clients created via `ClinicianClient` with no User row yet.** The clinician invite flow must handle the case where no User exists — create one on invite acceptance.
3. **Clients who were invited but never accepted.** The invite token expires; clinician should be able to re-send.
4. **Password reset for clients.** Must go through `/portal/forgot-password` not `/forgot-password` (so clients don't land on clinician-branded pages).
5. **Clients with multiple clinicians.** A client may be seeing more than one clinician in the practice. Calendar must show all their appointments, not just one clinician's view.
6. **Revoking portal access.** If a clinician toggles "Portal access" off, existing refresh tokens must be revoked (entire family) so the client is logged out within the access-token TTL (30 min).
7. **Cookie scoping.** Access token cookie is currently `path: /`. With separate portals under the same domain, we need to be sure auth cookies are shared across `/` and `/portal/*` (they will be, at `path: /`) but the auth middleware differentiates by JWT role, not path.
8. **CORS origins.** `CORS_ORIGINS` env var doesn't need to change (same domain), but anything that hardcodes clinician URLs in emails/templates must be audited.

## Open Questions for Downstream Phases

- **PO:** Should the "Portal access" toggle be per-client or auto-granted on creation? (My lean: auto-granted, toggle only visible as an override / revoke.)
- **Compliance:** HIPAA impact of a new auth surface — new login velocity rate limits, audit log entries for portal logins, session timeout enforcement on portal routes. Also: invite email must not contain PHI.
- **Architect:** Does the existing `User.role = PARTICIPANT` + `ParticipantProfile` model need any schema additions (e.g., `portalAccessEnabled: Boolean`), or can we piggyback on existing state? Does `ClinicianClient.stubUserId` exist today, or is a stub client truly unlinked from User?
- **UX:** Is the full calendar grid genuinely the right first UX for ADHD clients, or should the landing page be a "Next session" hero card with the calendar grid secondary? Flagged from Q3 — user explicitly chose C but asked UX to validate.
- **QA/SDET:** Cross-role authorization tests are critical. Must prove a clinician JWT cannot hit `/portal/*` and a participant JWT cannot hit any clinician route.

## Success Criteria (for Research phase later)

A synthetic participant persona should be able to:
1. Receive an invite email, click the link, set a password, and land on `/portal` in under 90 seconds.
2. Find their upcoming session on the calendar within 2 clicks of landing.
3. Click Join and enter a telehealth session successfully (LiveKit connects, camera/mic work).
4. Log out and log back in with email + password without hitting a clinician-branded page.
5. A clinician persona must NOT be able to accidentally reach `/portal/*` and a client must NOT be able to reach `/` or `/participants/*` — middleware blocks both with a clean redirect.

## Recommendation to PO

Lock this scope hard. The temptation will be to add "just one more thing" (messaging, agreements, a profile page). Resist it. The auth + routing + shell + calendar + telehealth join flow is already a meaningful chunk of work, and every extra feature expands the test surface and delays the real win: clients who won't use mobile can finally self-serve their sessions.
