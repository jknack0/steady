# Concept — Client Web Portal (MVP: Login, Calendar, Telehealth Join)

## One-Line Pitch
Give clinician clients a dedicated web portal on `portal.steadymentalhealth.com` where they can log in, see their calendar, and join telehealth sessions — built on a new unified token-based invitation system with real SES email delivery, as the first footprint of a long-term client web experience.

## Problem Statement

Today, clinician clients can only interact with STEADY through the Expo mobile app. Two concrete problems:

1. **Not every client will use mobile.** A web app for clients is table stakes for clinical SaaS — having no web login is a meaningful gap in the product's credibility and usability. Some clients (older demographics, accessibility needs, laptop-first workflows) will never touch mobile. Today they have no way into the product at all.
2. **There's no foundation for a real client web experience.** The longer-term roadmap includes messaging, agreements, billing, and self-service from the client side — none of which can live on mobile alone. Without a portal shell and a clean client auth surface, every future web-side client feature becomes a one-off hack.

This feature ships the first web portal experience (login + calendar + telehealth join) *and* rebuilds the invitation system into a single unified token-based flow that eliminates a prior abandoned email-delivery effort. It is intentionally larger than the "telehealth launcher" framing of the first Ideator pass because the user has confirmed there is no production user base and no legacy compatibility cost.

## Status Context (Critical)

**This system is not yet live with real clients.** That single fact unblocks the most expensive constraints:
- No data migration for pending invites.
- No deprecation window for mobile register.
- No mobile minimum-version enforcement.
- No dual-accept period for old code-based invites.

Deleting and rebuilding is cheaper than incremental evolution, and the user has explicitly chosen that path.

## Recommended Approach

A unified three-pillar build:

1. **Client web portal on a dedicated subdomain.** `portal.steadymentalhealth.com` as a separate route tree in the existing Next.js app, host-routed via middleware. The subdomain split (rejected in the first Ideator pass) is now chosen because the HIPAA tenant-isolation argument is stronger than the "over-engineered for MVP" argument — clinician and client sessions must not share cookies at the same origin when PHI is present. Portal surface in v1: `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/calendar`, `/telehealth/[appointmentId]`.

2. **Unified token-based invitation system, replacing the existing code-based system entirely.** The current `PatientInvitation` + `STEADY-XXXX` code flow (including `services/invitations.ts`, `routes/invitations.ts`, `workers/invite-email.ts`, `workers/scrub-expired-invites.ts`, `__tests__/invitations.test.ts`, `__tests__/auth-invite.test.ts`, and the mobile register screen at `apps/mobile/app/(auth)/register.tsx`) is deleted. Replaced by an opaque-token system: 48-byte URL-safe token, bound to the invited email address, 7-day TTL, single-use on first consumption, rate-limited by IP. Mobile becomes **login-only forever** — no mobile onboarding, no deep-link handling, no universal links.

3. **Real Amazon SES email delivery.** The existing `services/email.ts` stub (which gates on `ENABLE_INVITE_EMAIL` and returns mock success with a TODO comment for SendGrid) is replaced with a real SES implementation using the already-configured AWS account and BAA. Bounce/complaint handling via SNS topics is in scope (required for HIPAA — a high bounce rate can trigger SES account suspension). SES is chosen because it matches the existing AWS stack, the BAA is already signed, and transactional volume is low enough that deliverability parity with premium ESPs is irrelevant.

## Key Scenarios

1. **New client onboarding (primary flow).** Clinician opens a client's detail page → clicks "Invite to portal" → system creates a token row bound to the client's email → SES sends invite email to the client → client clicks the link → lands on `portal.steadymentalhealth.com/signup?token=...` → confirms their email address (binding check) → sets password → Cognito user is created + existing `redeemInvitation()` transaction runs (User + ParticipantProfile + ClinicianClient + ClientConfig) → client lands on `/calendar` → sees their upcoming session → clicks Join → enters telehealth.

2. **Returning client login.** Client already has an account (rare in v1 since we're not live, but becomes common over time) → goes to `portal.steadymentalhealth.com/login` → enters email + password → Cognito auth → role check confirms `PARTICIPANT` → land on `/calendar`.

3. **Cross-role authorization guard.** A clinician's access token reaches `portal.steadymentalhealth.com/*` → middleware checks role → redirect to `app.steadymentalhealth.com` (or `/`). A participant's access token reaches `/participants/*` on the clinician domain → redirect to portal. Neither role can ever see the other's UI.

4. **Expired or leaked token.** Client clicks invite link after 7 days → friendly "this invite has expired, please contact your clinician." Client forwards the email to a spouse who clicks first → second click sees "invite has been used" (single-use burn on first land). Client's email is scraped by a leak → attacker tries the token but enters a different email → binding check fails, 403.

5. **SES bounce.** Clinician creates invite for a typo'd email → SES delivery bounces → SNS handler marks the invite row as `BOUNCED` + surfaces "delivery failed" status in the clinician UI → clinician can correct the email and resend → suppression list is updated.

## Scope

### In scope (v1)
- `portal.steadymentalhealth.com` subdomain on the existing Next.js app (host-based routing, Route 53 record, ACM cert or wildcard cert reuse, Amplify host config, Cognito callback URL update, cookie domain scoping).
- New token-based invitation model (schema + service + routes + worker for sending + worker for scrubbing expired).
- Deletion of the entire existing code-based invitation system including the mobile register screen.
- Real SES email integration with bounce/complaint SNS handling and suppression list maintenance.
- One invite email template — PHI-free, hardcoded copy, no clinician input in the body.
- Clinician-side UI: "Invite to portal" button on client detail page, list of pending/sent/accepted/revoked/bounced invites with resend/revoke actions.
- Client-side portal shell: header with name + logout, no clinician sidebar, simple navigation.
- `/portal/login`, `/portal/signup?token=...`, `/portal/forgot-password`, `/portal/reset-password` (the last two reuse the existing Cognito `ForgotPasswordCommand` + `ConfirmForgotPasswordCommand` endpoints, just new UI).
- `/portal/calendar` — full calendar grid showing the logged-in client's appointments (not time-blocks — actual clinician-scheduled appointments). Displayed in the participant's own timezone.
- `/portal/telehealth/[appointmentId]` — participant-facing telehealth view. **This is not a reuse** of the clinician telehealth page; it is a new dedicated component that shares only the LiveKit room primitive. It strips clinician-only affordances (transcript, AI summary, session prep, recording controls, end-session-for-all) and presents a participant-appropriate consent flow (respond to a request rather than initiate one).
- New participant-scoped appointments endpoint — **extend the existing `routes/participant-portal.ts` module** rather than creating a new one, since it's already the participant-endpoints aggregator.
- Role-gated Next.js middleware/layout for the portal subdomain (architect decides exact placement — edge middleware vs. server layout, given Cognito tokens lack role claims).
- Cross-role authorization tests proving clinician JWT cannot hit portal routes and vice versa.
- Updated CLAUDE.md to correct the auth description (it currently describes legacy JWT; production runs Cognito).

### Out of scope (v1)
- Messaging, agreements, billing, homework, programs, journals, or any other client-side feature on web — all remain mobile-only for now.
- Calendar editing from the client side — view-only + join.
- Mobile onboarding — forever. Mobile is login-only.
- Email notifications other than the portal invite (no session reminders, no payment receipts, no nothing — separate project).
- White-label subdomains (`portal.{clinicianbrand}.com`).
- Client self-registration without a clinician invite.
- Two Cognito user pools (clinician vs. participant isolation) — single pool is retained; the compliance phase can escalate if the shared blast radius is unacceptable.
- SMS invitation delivery.
- Re-running the ADHD-specific UX debate on "calendar grid vs. next session card" — user has chosen grid reuse; UX phase may revisit.

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| URL strategy | Subdomain split (`portal.steadymentalhealth.com`) | Shared-origin cookies between `/` and `/portal/*` violate HIPAA tenant isolation; subdomain split is the correct boundary. Reverses Q4 decision from first Ideator pass based on adversarial review. |
| Onboarding model | Clinician-initiated invite only (token-based) | No self-registration (HIPAA identity verification), no code entry (UX friction), no dual mobile/web flows. |
| Invitation backbone | New opaque token system, replacing existing codes | Not live → no migration cost → cheaper to delete and rebuild than to maintain two systems. |
| Mobile onboarding | Deleted, never replaced | User confirmed mobile is login-only forever. No deep links, no universal links, no Expo linking config. |
| Email provider | Amazon SES (already configured with BAA) | Matches AWS stack, BAA already signed, low volume → provider parity irrelevant. |
| Calendar data source | New participant-scoped appointments endpoint extending `routes/participant-portal.ts` | Existing `/api/participant/calendar` returns `CalendarEvent` time-blocks, not `Appointment` rows — explicit gap. |
| Calendar UI | Reuse clinician grid components, filtered to participant, participant's own timezone | User explicitly chose grid reuse; timezone policy set to participant-local with clinician-timezone on hover (UX may refine). |
| Telehealth page | New participant-specific component, not a reuse | Clinician-only features (transcript, AI summary, session prep, recording, end-for-all) must be stripped — cheaper as a new component than a feature-flagged fork. |
| Token security | Email-bound, 7-day TTL, single-use on first land, rate-limited by IP, never logged | Architect refines exact mechanics. |
| Cognito auth middleware | Deferred to architect | Cognito access tokens lack role claims; edge middleware can't read DB. Architect picks between (a) second non-httpOnly role hint cookie, (b) server layout check, (c) signed role cookie. |
| Cognito pool topology | Single pool (unchanged) | Accept shared blast radius unless compliance escalates. Clinicians already have accounts in the existing pool — migration to two pools is a different project. |
| Foundation justification | Accepted | No commitment yet to a specific follow-up feature, but user has stated this is long-term foundation work. Compliance and Architect may push back if they see concrete over-engineering. |

## Alternatives Considered (and Rejected)

- **Magic-link `/join/[appointmentToken]` as a Phase 0 that might obviate the portal.** Adversarial agent's recommendation. Rejected because the user's primary driver is "non-mobile clients need a web app," not "audit-trail fix." The magic-link only solves the latter.
- **Code-based invitation system, kept as-is, with a web UI added on top.** Rejected because the user wants a single unified system and is willing to delete the old one.
- **Clickable URL that prefills an existing STEADY-XXXX code.** Rejected for the same reason — user wants unification, not dual-system coexistence.
- **Brand-new opaque token system while keeping `PatientInvitation` for mobile.** Rejected — mobile onboarding is going away entirely, so there's nothing left to keep `PatientInvitation` for.
- **SendGrid or Postmark for email.** Rejected — SES is already configured with a BAA, matches the AWS stack, and transactional volume is low enough that ESP feature parity is irrelevant.
- **Shared `/login` with role-based redirect.** Rejected in Q4 of the first Ideator pass; subdomain split is now the correct boundary.
- **Same-origin `/portal/*` with cookie-based role hint.** Rejected based on adversarial review — HIPAA tenant isolation requires subdomain separation.
- **Two Cognito user pools (clinician + participant).** Out of scope for v1 but flagged for compliance. Reasoning: clinicians already live in the existing pool; migration is its own project.
- **Deep-linked mobile onboarding after the delete.** Rejected — user confirmed mobile is login-only forever.

## Known Edge Cases to Flag for Architect

1. **Cognito token lacks role claims.** Edge middleware cannot do role-based routing without a secondary signal. Architect picks between a sidecar role-hint cookie, a server layout check, or a signed role cookie. This is the #1 load-bearing architectural decision.
2. **Cookie domain scoping across `steadymentalhealth.com` and `portal.steadymentalhealth.com`.** Shared parent cookie works but leaks the boundary; scoped cookies (one per subdomain) require separate Cognito login flows. Architect chooses.
3. **Token format and storage.** New `PortalInvitation` table (clean) vs. extending `PatientInvitation` (reuse). If extending, the code field becomes optional and only the token is used going forward. If new, explicit migration of the old table to `ARCHIVED` status + eventual drop.
4. **Token email binding mechanics.** Store encrypted or hashed? Confirm against encrypted-at-rest via `encryption-middleware`. Signup form requires the invitee to re-enter email; mismatched email returns a generic error (no enumeration). Architect specifies exact algorithm.
5. **SES bounce/complaint SNS wiring.** New SNS topics, subscription handler in the API (Express route for SNS confirmation + message delivery), suppression list as a DB table (`EmailSuppression`), and UI surface on clinician invite list.
6. **Next.js host-based routing.** Amplify deployment needs to recognize both hostnames and route to the same Next.js build. Middleware needs to read the `host` header (NOT `x-forwarded-host` only — CloudFront rewrites). Architect confirms the Amplify/CloudFront header forwarding.
7. **Existing `participant-portal.ts` has unknown consumers.** User is "not sure we're using it anywhere." Before extending it, the architect MUST grep the mobile app + web app for references to `/api/participant-portal/*` and confirm whether it's dead, partially used, or the active path.
8. **Email archaeology.** The existing `services/email.ts` has a `// TODO: Integrate with SendGrid` — someone previously planned email and didn't ship it. Do a git log pass on `services/email.ts` and `workers/invite-email.ts` to understand why and avoid hitting the same wall.
9. **Password reset flow on the portal subdomain.** Cognito `ForgotPasswordCommand` sends an email with a code. If SES is the sender, the email source needs to match the sender domain on the portal subdomain, not the root. Architect verifies Cognito `MessageAction` + email template configuration.
10. **Logout + Cognito global sign-out interaction with subdomain cookies.** `/api/auth/logout` currently calls `GlobalSignOutCommand`. With subdomain split, clearing the cookie on one subdomain doesn't clear it on the other. Architect specifies the cookie-clearing scope.
11. **Telehealth participant view's consent flow.** Current recording-consent flow assumes the clinician initiates. Participants respond. The new participant telehealth view needs a different UX + different API call. Flag for UX and architect.
12. **Timezone handling on the calendar.** Participant may be in a different timezone from their clinician. Display policy: participant's own timezone as primary, clinician's timezone on hover. Architect specifies where timezone is stored on the user / how it's detected (browser `Intl.DateTimeFormat().resolvedOptions().timeZone` on first login → persist to ParticipantProfile).

## Open Questions for Downstream Phases

**For Compliance (phase 3):**
- Is single Cognito user pool with shared blast radius acceptable, or does HIPAA require two pools?
- SES BAA scope — is it signed at the account level, and does it cover this specific sending domain?
- SES production mode (out of sandbox) status — if still in sandbox, every unverified recipient will silently fail.
- Invite email audit log requirements — PHI in emails is already forbidden by concept, but log events may themselves be PHI.
- Suppression list retention requirements.
- HIPAA-required audit events on portal login/logout/invite redemption.

**For Architect (phase 4):**
- Middleware strategy for Cognito-based role routing (the #1 decision, see edge case #1).
- Subdomain routing with Amplify (host header forwarding, cookie domain scoping).
- Token format, table design, and binding mechanics.
- SES bounce/complaint SNS wiring architecture.
- Password reset email sender domain alignment.
- Participant telehealth view component architecture (new vs. fork).
- Calendar timezone storage and detection.
- Empirical verification of the "not live" claim via prod SQL queries (pending invites count + recent participant registrations).

**For UX (phase 5):**
- Is the full calendar grid genuinely the right first UX for client users, or is a "Next session" hero card with grid secondary better? (Flagged from Q3 of the first Ideator pass — user chose grid reuse but asked UX to validate with synthetic research.)
- Participant telehealth view — what to strip, what to add, how to handle recording consent UX.
- Timezone display pattern on calendar.
- Invite email copy — PHI-free, friendly, scannable.
- Clinician-side invite management UX (pending/sent/accepted/bounced states).
- Bounce state surfacing on clinician client detail page.
- Error states: expired token, used token, email mismatch.

**For QA/SDET (phase 6):**
- Cross-role authorization tests (clinician JWT → portal routes, participant JWT → clinician routes).
- Token replay tests (single-use, email-mismatch, expired).
- SES stub/fake for tests (never actually send during CI).
- Bounce simulation tests.
- Full invite→signup→login→calendar→join flow as an integration test.
- Subdomain routing tests (host header behavior in Next.js).

**For Engineer (phase 7):**
- Order of operations: subdomain infra → SES integration → token model + API → portal UI → mobile register deletion → tests → QA.
- Feature flag strategy during build-out (e.g., `ENABLE_PORTAL` env var that gates the portal route tree until ready).

## Success Criteria (for UX Researcher phase)

A synthetic participant persona should be able to:
1. Receive an invite email in under 60 seconds of clinician clicking "Invite to portal," click the link, confirm their email, set a password, and land on `/portal/calendar` in under 2 minutes.
2. Find their next upcoming session on the calendar within 2 clicks of landing.
3. Click Join and enter a telehealth session successfully (LiveKit connects, camera/mic work, no clinician-only UI leaks through).
4. Log out and log back in with email + password without hitting a clinician-branded page or URL.
5. Attempt to log in as a participant and land on a clinician URL (`steadymentalhealth.com/participants/abc`) → be cleanly redirected to the portal.
6. Attempt to log in as a clinician and land on a portal URL (`portal.steadymentalhealth.com/calendar`) → be cleanly redirected to the clinician app.
7. Click a previously-used or expired invite link → see a clear error with next-step instructions, not a blank page or stack trace.
8. Have a spouse click the same invite email → second click fails gracefully without consuming the original user's session.

## Adversarial Review Summary

The first draft of this concept received a **NEEDS WORK** verdict from adversarial review. Critical concerns addressed in this revision:

1. **Factual auth error** — original concept described legacy JWT; production runs Cognito. Corrected; middleware strategy deferred to architect.
2. **Mobile register dead-code assumption** — user has confirmed the system is not live with any real users, so deletion is safe without migration.
3. **Phishing primitive in token URL** — mitigated with email binding, single-use burn, short TTL, rate limiting. Architect refines.
4. **Same-origin cookie leakage** — subdomain split is now the chosen approach, reversing the Q4 decision from the first Ideator pass.
5. **Existing `participant-portal.ts` not reconciled** — now explicitly referenced as the module to extend; architect audits consumers first.
6. **SES bounce/complaint handling** — now in scope.
7. **Telehealth "reuse" mischaracterized** — now explicitly called out as a new participant view, not a reuse.
8. **Participant appointments endpoint underestimated** — now called out as extending an existing module with its own scope.
9. **Email archaeology** — flagged for architect to investigate why the previous SendGrid attempt stalled.
10. **Opportunity cost vs. Stripe Phase 1** — user has decided to proceed with portal; this is a product prioritization call not a technical one, and is documented as an accepted trade-off.

Residual concerns that are accepted rather than resolved:
- **Single Cognito pool blast radius.** Compliance may escalate.
- **"Foundation for future features" justification without committed follow-up.** Accepted risk — the user has stated this is long-term foundation work. If the follow-up doesn't materialize, the carrying cost of the portal shell is real.
- **Billing refactor in flight.** 60+ modified files in git status imply active work in adjacent areas. Merge conflict risk is real but unavoidable.

## Recommendation to PO

This is a larger feature than the original concept implied. Lock these scope items hard:
1. The three pillars (portal + token invites + SES) all ship together. Any one without the others is incomplete.
2. The subdomain split is non-negotiable — HIPAA tenant isolation requires it.
3. The token email binding is non-negotiable — security requires it.
4. Mobile register deletion is part of this feature, not a follow-up.
5. Bounce handling is part of SES integration, not a follow-up.
6. The clinician telehealth page is NOT touched — only a new participant view is added.
7. The existing Cognito user pool is unchanged.
8. No calendar editing, no messaging, no billing, no agreements on web. None of them. For any of these, the answer in v1 is "use the mobile app."

PO should focus on: acceptance criteria for all the edge cases (expired token, used token, email mismatch, bounce, logout across subdomains, cross-role authorization), clinician UX for invite management, and the portal landing/empty states.
