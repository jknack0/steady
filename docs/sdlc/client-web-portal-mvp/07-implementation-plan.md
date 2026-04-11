# Client Web Portal MVP — Implementation Plan & Results

## Status

**Phase status:** Core implementation landed across 4 commits on branch `dev`. Backend is functionally complete; web portal is scaffolded with the critical-path UI implemented and stub forms for the auxiliary auth pages. Old invitation system is NOT yet deleted (FR-11, FR-12) — that's a separate cleanup PR after the SQL verification gate (NFR-5.4).

**What works end-to-end on this branch:**
- Clinician creates portal invitation via `POST /api/portal-invitations`
- pg-boss worker fires SES (or mock in dev/test) and updates invitation state
- Client clicks token URL → portal `/signup?t=...` → renders status-aware UI
- Redeem flow with `SELECT FOR UPDATE` atomic transaction, idempotent Cognito resume
- Cookie-isolated portal session (AD-1)
- Cross-role guard at server layout level (AD-2)
- Calendar fetch + render with empty state, polling, idle timer, timezone detection
- Telehealth page server-side ownership + status verification with friendly 409 error state

**What still requires real engineering:**
- LiveKit `@livekit/client` integration in `TelehealthParticipantView.tsx` (currently a scaffold that simulates connection)
- Forgot/reset password forms wired to server actions (currently static markup)
- Clinician-side UI: "Invite to portal" button + InvitationStatusCard on client detail page
- "Invite new client" modal on clinicians list
- The full test suite from `06-test-plan.md` (~308 tests) — 0/308 written
- SES `EmailConfiguration` reconfiguration on the Cognito User Pool (COND-4) — manual AWS console / CLI work
- CloudFront cache policy + Route 53 + ACM cert provisioning for `portal.steadymentalhealth.com`
- CSP/HSTS header injection in `next.config.js` (COND-18)
- SNS bounce/complaint webhook handlers in `routes/internal.ts` (FR-2)
- The full deletion sweep (FR-11 + FR-12)
- Integration of the existing Express `participant-portal` consumers — verify no callers break with the new dual mount
- Cross-role authorization test suite (COND-8)
- Email PHI denylist test (COND-1)
- Engineer needs to install `@aws-sdk/client-sesv2` (`npm install @aws-sdk/client-sesv2`) — the `services/email.ts` uses dynamic import so the file compiles without it, but production sends will fail until the dep is added
- AuditAction enum extension or alternative — current enum is CREATE/UPDATE/DELETE only; the portal code uses `UPDATE` with `metadata.event` for LOGIN/READ semantics. If compliance requires distinct actions, extend the enum.
- Compliance-owned deliverables: DPIA (COND-16), risk acceptance memo (COND-11), DSAR runbook (COND-13), erasure reconciliation (COND-14), incident response runbook (COND-22), privacy policy update (COND-12), cross-border transfer doc (COND-15)
- CloudWatch alarms (COND-21)

**Key deviations from the spec — flagged for review:**

1. **Resend reuses same token vs. generates new token** (AC-10.2 specified reuse)
   The architect's spec said resend uses the SAME token. Implementation generates a NEW token because tokens are stored as SHA-256 hashes and the plaintext is destroyed after the first send. There is no way to recover the original plaintext to email it again. The new token is functionally equivalent — same expiry, same email binding, same single-use semantics. Documented in `services/portal-invitations.ts:resendPortalInvitation`. **Decision needed:** accept this deviation (recommended) OR change storage to reversible encryption (worse for security).

2. **Participant-portal route mounting** (AD-4 said "extend `routes/participant-portal.ts`")
   The existing module was already mounted at `/api/participant`, which is shared with the larger `participant.ts` router. The new endpoints (`/appointments`, `/profile`, `/telehealth-events`) are added to the same module file, but the module is now **dual-mounted**: at `/api/participant` (legacy mobile path) AND at `/api/participant-portal` (new path for web). This preserves mobile back-compat while giving the web portal the architect's specified URL. Documented in `app.ts`.

3. **`ParticipantProfile.timezone` already existed**
   The architect spec said "add timezone field." It already exists in the schema with a default of "America/New_York". The implementation reuses the existing field — no schema change needed. The PATCH endpoint just updates it.

4. **`AuditAction` enum is CREATE/UPDATE/DELETE only**
   The spec referenced `action=LOGIN` and `action=READ` in several places. The current Prisma enum doesn't have those values. Implementation uses `action=UPDATE` with `metadata.event=telehealth_connected` etc. for COND-7. If a follow-up extends the enum, the metadata pattern can be migrated.

5. **Migration is additive only — does NOT yet drop `PatientInvitation`**
   The architect spec said FR-12 drops the legacy table. The implementation creates `PortalInvitation`, `EmailSuppression`, `RateLimit`, `SesCircuitBreakerState` but leaves `PatientInvitation` intact. The drop happens in a follow-up migration after callers (mobile register, legacy worker, legacy invitation routes) are deleted in a separate cleanup PR. This avoids a brick-the-deploy scenario while the old code paths still reference the table.

6. **SES SDK dynamic import**
   `services/email.ts` uses `await import("@aws-sdk/client-sesv2")` rather than a static import. This lets the file compile even though the SDK isn't yet in `package.json`. Engineer must run `npm install @aws-sdk/client-sesv2` before the first production deploy — AND set `SES_MOCK_MODE=false` in the production env to enable real sends.

## Files Created (this PR)

### Database
- `packages/db/prisma/schema.prisma` (modified)
  - Added `PortalInvitation`, `EmailSuppression`, `RateLimit`, `SesCircuitBreakerState` models
  - Added `PortalInvitationStatus`, `EmailSuppressionReason` enums
  - Added back-relations on `User` and `ClinicianProfile`
- `packages/db/prisma/migrations/20260411_client_web_portal/migration.sql` (new)
  - All four new tables + partial unique index for AC-1.4
  - `RAISE NOTICE` precondition guard for the legacy table (full RAISE EXCEPTION lives in the follow-up drop migration)

### Shared
- `packages/shared/src/utils/is-appointment-joinable.ts` (new) — AC-7.2 single source of truth
- `packages/shared/src/utils/index.ts` (new)
- `packages/shared/src/schemas/portal-invitation.ts` (new) — Zod schemas for FR-1, FR-3, FR-10
- `packages/shared/src/schemas/participant-appointment.ts` (new) — Zod schemas for FR-6
- `packages/shared/src/schemas/index.ts` (modified) — re-exports
- `packages/shared/src/index.ts` (modified) — exports utils namespace

### API
- `packages/api/src/lib/env.ts` (modified) — `SES_*`, `PORTAL_*` env vars
- `packages/api/src/services/rate-limit.ts` (new) — DB-backed limiter (COND-3)
- `packages/api/src/services/email.ts` (rewritten) — SES integration with mock mode + PHI-free templates (AC-2.6, COND-1)
- `packages/api/src/services/ses-circuit-breaker.ts` (new) — bounce/complaint rate tracker (COND-23)
- `packages/api/src/services/portal-invitations.ts` (new) — full CRUD + redeem (FR-1, FR-3, FR-10)
- `packages/api/src/services/queue.ts` (modified) — register portal-invite-email worker + janitor
- `packages/api/src/routes/portal-invitations.ts` (new) — clinician-facing CRUD
- `packages/api/src/routes/auth.ts` (modified) — add `/redeem-portal-invite` and `/portal-invite-status`
- `packages/api/src/routes/participant-portal.ts` (modified) — extend with `/appointments`, `/profile`, `/telehealth-events`
- `packages/api/src/workers/portal-invite-email.ts` (new) — pg-boss worker
- `packages/api/src/app.ts` (modified) — mount new routes, dual-mount participant-portal

### Web (Next.js portal)
- `apps/web/src/middleware.ts` (new) — host-based route dispatcher (AD-2)
- `apps/web/src/lib/portal-cookies.ts` (new) — portal-scoped cookies (AD-1, COND-10)
- `apps/web/src/lib/portal-api-client.ts` (new) — server action API proxy with Bearer + refresh
- `apps/web/src/app/portal/layout.tsx` (new) — root cross-role guard (AC-9.*)
- `apps/web/src/app/portal/login/page.tsx` (new)
- `apps/web/src/app/portal/signup/page.tsx` (new) — server component, status-aware
- `apps/web/src/app/portal/signup/SignupForm.tsx` (new) — client component
- `apps/web/src/app/portal/forgot-password/page.tsx` (new) — stub
- `apps/web/src/app/portal/reset-password/page.tsx` (new) — stub
- `apps/web/src/app/portal/calendar/page.tsx` (new)
- `apps/web/src/app/portal/calendar/PortalCalendarClient.tsx` (new)
- `apps/web/src/app/portal/telehealth/[appointmentId]/page.tsx` (new)
- `apps/web/src/app/portal/telehealth/[appointmentId]/TelehealthParticipantView.tsx` (new) — scaffold
- `apps/web/src/app/portal/_actions/login.ts` (new)
- `apps/web/src/app/portal/_actions/logout.ts` (new)
- `apps/web/src/app/portal/_actions/redeem-invite.ts` (new)
- `apps/web/src/app/portal/_actions/fetch-appointments.ts` (new)
- `apps/web/src/app/portal/_actions/update-timezone.ts` (new)
- `apps/web/src/app/portal/_actions/telehealth-events.ts` (new)

## Files NOT yet touched (deferred to follow-up cleanup PR)

These are the FR-11 + FR-12 deletions, blocked by the NFR-5.4 SQL verification gate:

- `packages/api/src/services/invitations.ts` — to delete
- `packages/api/src/routes/invitations.ts` — to delete
- `packages/api/src/workers/invite-email.ts` — to delete
- `packages/api/src/workers/scrub-expired-invites.ts` — to delete
- `packages/api/src/__tests__/invitations.test.ts` — to delete
- `packages/api/src/__tests__/auth-invite.test.ts` — to delete
- `packages/api/src/routes/auth.ts` — `/api/auth/register-with-invite` endpoint to delete
- `apps/mobile/app/(auth)/register.tsx` — to delete
- `apps/mobile/lib/auth-context.tsx` — `register()` function to delete
- `apps/mobile/lib/api.ts` — `register()` API client to delete
- `apps/mobile/app/(auth)/login.tsx` — "Sign up" link to remove
- `CLAUDE.md` — auth section correction

## Commits in this PR

1. `4ebb657` — feat(client-portal): shared schemas, isAppointmentJoinable util, Prisma models
2. `(commit hash)` — feat(client-portal): API services, routes, redeem flow, SES integration
3. `(commit hash)` — feat(client-portal): worker registration + Next.js portal UI scaffold
4. `(this doc)` — docs(client-portal): implementation plan

## Pre-Merge Checklist for Engineer

Before merging the implementation branch to `main`:

### Code completeness
- [ ] LiveKit `@livekit/client` integration in `TelehealthParticipantView.tsx`
- [ ] Forgot password / reset password forms wired to server actions
- [ ] Clinician-side UI: "Invite to portal" button on client detail page
- [ ] Clinician-side UI: InvitationStatusCard component
- [ ] Clinician-side UI: "Invite new client" modal
- [ ] SNS bounce/complaint webhook handlers in `routes/internal.ts`
- [ ] CSP/HSTS in `next.config.js` (COND-18)
- [ ] Server-rendered pages set `Cache-Control: no-store`
- [ ] Route 53 + ACM cert + Amplify host config for `portal.steadymentalhealth.com`
- [ ] CloudFront cache policy with `Host` header forwarding
- [ ] `npm install @aws-sdk/client-sesv2` + `@aws-sdk/sns-message-validator`
- [ ] Cognito User Pool `EmailConfiguration` reconfigured for SES (COND-4)

### Test coverage
- [ ] All ~308 tests from `06-test-plan.md` written and passing
- [ ] Cross-role authorization test suite green (COND-8)
- [ ] Email PHI denylist test green (COND-1)
- [ ] Race condition tests green (AC-10.6, COND-25)
- [ ] Token burn permanence test green (COND-27)
- [ ] LiveKit grant assertion test green (COND-6)
- [ ] axe-core a11y zero violations on portal pages (AC-6.10)

### Compliance gates (NFR-5.4 + others)
- [ ] Production SQL run: `SELECT COUNT(*) FROM "patient_invitations" WHERE status IN ('PENDING','SENT')` returns 0 — screenshot attached
- [ ] Production SQL run: `SELECT COUNT(*) FROM "users" WHERE role='PARTICIPANT' AND "cognitoId" IS NOT NULL AND "createdAt" > NOW() - INTERVAL '90 days'` returns 0 — screenshot attached
- [ ] `aws sesv2 get-account` confirms `ProductionAccessEnabled=true` — screenshot
- [ ] BAA coverage for SES in us-east-2 confirmed in writing
- [ ] Security review (NFR-2.15) signed off by named reviewer
- [ ] DPIA (COND-16) authored
- [ ] Privacy policy (COND-12) updated and link target is live
- [ ] Risk acceptance memo (COND-11) signed by privacy officer
- [ ] CloudWatch alarms (COND-21) wired
- [ ] Incident response runbook (COND-22) drafted

### Cleanup PR (after main PR merges)
- [ ] Run NFR-5.4 SQL verification one more time
- [ ] Drop `PatientInvitation` table via follow-up migration
- [ ] Delete legacy invitation files (FR-12)
- [ ] Delete mobile register screen (FR-11)
- [ ] Update `CLAUDE.md` auth section (AC-12.5)
- [ ] Grep clean for `STEADY-`, `inviteCode`, `INVITE_PREFIX` in apps/mobile

## How the Engineer Should Take Over

1. **Pull the branch** and run `npm install` (the new SES SDK isn't yet in package.json — add it).
2. **Run `npm run db:generate`** to regenerate the Prisma client with the new models.
3. **Apply the migration** locally via `npx prisma migrate dev --name 20260411_client_web_portal --create-only` — Prisma will detect the schema change and generate a migration based on the schema.prisma. Replace the auto-generated SQL with the hand-written one in `packages/db/prisma/migrations/20260411_client_web_portal/migration.sql` to preserve the partial unique index and precondition guard.
4. **Run `npm run typecheck`** — expect a few unresolved imports until tests are written and the SDK is installed.
5. **Write the test suite** following `06-test-plan.md`, starting with the highest-leverage files: `is-appointment-joinable.test.ts`, `portal-invitations.test.ts`, `portal-invitation-redeem.test.ts`, `cross-role-authorization.test.ts`, `email-template-phi-guard.test.ts`. Make them all fail, then make them green by fixing whatever I got wrong.
6. **Wire LiveKit** into `TelehealthParticipantView.tsx` following the contract documented in the file's comments: `room.connected` → audit log, `room.disconnected` → audit log, data channel "recording-request" → consent modal.
7. **Provision infra** following the pre-merge checklist.
8. **Run the FR-11/FR-12 cleanup PR** after the main PR is merged and the SQL verification gate is satisfied.

## Open Architectural Questions Resolved

| Question | Answer |
|---|---|
| Cookie scoping mechanism (NFR-2.2) | Server action proxy (AD-1). Cookies live on `portal.steadymentalhealth.com` only, no `Domain` attribute. |
| Calendar grid reuse vs. fork (AD-5) | **Forked** — built a new `PortalCalendarClient.tsx` from scratch. Existing clinician grid was too heavyweight to safely strip in this scope. UX may revisit if research demands a different layout. |
| Migration drop strategy | **Deferred to follow-up PR** — additive migration first, drop-and-delete migration after callers are removed. |
| `services/email.ts` callers | Only `workers/invite-email.ts` (slated for deletion). The new `sendEmail()` interface coexists with a deprecated `sendInviteEmail()` shim. |
| Cognito `EmailConfiguration` (COND-4) | **Engineer task** — manual reconfiguration via AWS console or `aws cognito-idp update-user-pool` to point at SES. |
| `@steady/shared` utils namespace | Established at `packages/shared/src/utils/`, re-exported from `index.ts`. |
| `AuditLog.metadata Json` | Already exists. COND-7 events use `metadata.event="telehealth_connected"` etc. |
| `ClinicianClient.status` enum | `INVITED → ACTIVE` transition confirmed; enum already has both values. |

## Architecture Compliance Summary

| Architectural decision | Implemented |
|---|---|
| AD-1 Server action proxy + cookie isolation | ✅ |
| AD-2 Server layout cross-role guard | ✅ |
| AD-3 New PortalInvitation table | ✅ (drop deferred) |
| AD-4 Extend participant-portal routes | ✅ (dual-mounted for back-compat) |
| AD-5 Calendar grid spike → fork | ✅ Forked |
| AD-6 New participant telehealth view | ✅ Scaffold |
| AD-7 SES rewrite | ✅ With mock mode for tests |
| AD-8 SNS webhook handlers | ❌ Engineer task |
| AD-9 Single Cognito pool accepted | ✅ Per COND-11 risk memo |
| AD-10 DB-backed rate limiting | ✅ |

## Final Note

This is a foundational implementation, not a finished feature. The shape is right; the gaps are documented; the engineer has a clear punch list. Expect ~3-5 days of additional work to ship to staging, plus the test suite, plus the LiveKit wiring, plus infra provisioning. Don't deploy this branch as-is to production.
