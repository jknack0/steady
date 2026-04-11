# Client Web Portal MVP — Technical Architecture

## Overview

The portal lives as a new route tree in the existing Next.js 15 monorepo under `apps/web/src/app/(portal)/*`, served from a new subdomain `portal.steadymentalhealth.com` via Amplify host-based routing. **All portal-to-API calls go through Next.js server actions on the portal subdomain**, which hold the auth cookies and proxy to the existing Express API — this gives us cookie isolation from the clinician app without a second API deployment (COND-10). Invitations are a brand-new `PortalInvitation` table (the legacy `PatientInvitation` system is dropped entirely per FR-12), using opaque 48-byte tokens that are email-bound and SHA-256 hashed at rest. SES is wired as the real email transport with SNS bounce/complaint webhooks feeding a new `EmailSuppression` table. The cross-role authorization guard is implemented as a Next.js server-layout check (not edge middleware) because Cognito tokens lack role claims and server layouts have DB access.

---

## Load-bearing architectural decisions

### AD-1: Cookie isolation via Next.js server action proxy (COND-10)

**The #1 decision.** Three options were on the table:

- (a) Portal Next.js server actions proxy all API calls — cookies live ONLY on `portal.steadymentalhealth.com`
- (b) Deploy Express API on `api.portal.steadymentalhealth.com` separately from `api.steadymentalhealth.com`
- (c) Distinct cookie names per subdomain with `Domain=.steadymentalhealth.com`

**Chosen: (a).** Rationale:
- Zero infra cost — the API stays where it is on the existing EC2. No second API deployment, no new certs beyond the portal subdomain itself, no CORS changes.
- Strongest isolation: the portal's auth cookies are scoped to `portal.steadymentalhealth.com` via Next.js server-set cookies. The clinician app has zero visibility. A clinician-side XSS cannot steal portal cookies and vice versa because the two subdomains are different origins.
- Next.js 15 server actions are purpose-built for this: they run on the Next.js server (Amplify compute), can read/write httpOnly cookies, and make fetch calls to the internal API.
- The Express API continues to accept Cognito Bearer tokens in the `Authorization` header (existing behavior). The portal's Next.js server extracts the Cognito token from the portal cookie and attaches it as a Bearer header when calling the API. No cookie crosses the API boundary.

**Trade-off:** Every portal API call is a double-hop (browser → Next.js server → Express API). Latency adds ~20-50ms per call on top of the direct path. Acceptable because the portal is a small read-heavy surface.

**Rejected: (b)** requires a second PM2 process or second EC2, new TLS cert for `api.portal.*`, duplicated env config, and double the deployment surface. Not worth the complexity.

**Rejected: (c)** doesn't actually solve the XSS problem because parent-domain cookies are readable from any subdomain in the same parent. COND-10 explicitly forbids this.

### AD-2: Cross-role guard via Next.js server layout, NOT edge middleware (COND-8 + COND-10)

Cognito access tokens carry no app-specific role claim. Edge middleware can't do the role check without a DB lookup, which edge middleware can't do.

**Chosen mechanism:** A server layout at `apps/web/src/app/(portal)/layout.tsx` (the root portal layout) performs the role check on every request. Flow:

1. Server layout reads the portal auth cookie via `cookies()`.
2. If no cookie → redirect to `/portal/login?redirect={pathname}`.
3. If cookie present → decode the Cognito access token, extract the `sub`, fetch the user from the DB via a cached helper with `select: { id, role }`, verify `role === 'PARTICIPANT'`.
4. If role mismatch → redirect to `https://steadymentalhealth.com/` (for CLINICIAN) or the admin surface (for ADMIN).
5. If all checks pass → render children.

This satisfies AC-9.1–9.8 and is implemented ONCE in the root layout, not duplicated across pages.

**Crucially:** the API re-verifies role on every sensitive endpoint via the existing `requireRole()` middleware. The server layout is UI routing; the API is the security boundary (NFR-2.12, COND-8).

**Edge middleware** is still used for one thing only: a host-header dispatcher at `apps/web/src/middleware.ts`. It inspects `request.headers.host`, and rewrites `portal.steadymentalhealth.com/*` to `/(portal)/*` in the Next.js route tree (without a client-visible URL change).

### AD-3: New `PortalInvitation` table, drop `PatientInvitation` entirely (FR-12)

No data migration. Migration has two steps:
1. Runtime-safe precondition check: the Prisma migration's SQL begins with `DO $$ BEGIN IF (SELECT COUNT(*) FROM "PatientInvitation") > 0 THEN RAISE EXCEPTION 'PatientInvitation has rows; cannot drop'; END IF; END $$;` — this aborts the deploy if rows exist, enforcing NFR-5.4 at the schema level in addition to the engineer-attached screenshot gate (COND-9).
2. Drop `PatientInvitation`, create `PortalInvitation`, create `EmailSuppression`.

### AD-4: Participant appointments endpoint extends `routes/participant-portal.ts` (FR-6)

Before extending, the engineer verifies via grep that the existing `/api/participant-portal/*` endpoints have active consumers. If any of the existing routes (invoices, appointment-cancel) are still in use, the new routes coexist. If the whole file is orphaned, it can be cleaned up in the same PR as a bonus.

### AD-5: Calendar grid component strategy (spike-required)

The existing clinician calendar grid in `apps/web/src/components/` was built around clinician-side actions. Architect's spike assumption: if it accepts a `readOnly` prop and edit affordances are gated behind that, reuse it. Otherwise, a new `ParticipantCalendarGrid` is built using the same date/range math.

**Decision rule:** Engineer runs the spike in the first day. If the spike shows >8 clinician-specific props or conditional branches, fork it. If it's clean (one or two props), reuse it.

### AD-6: Participant telehealth view is a new component

Per AC-7.6, the participant telehealth view is NOT a reuse of the clinician `TelehealthSession.tsx`. New component at `apps/web/src/app/(portal)/telehealth/[appointmentId]/TelehealthParticipantView.tsx`. Shares the LiveKit room primitive via a common `useLiveKitRoom()` hook. Strips: transcript, AI summary, session prep, recording controls, end-for-all. Adds: consent modal listener on data channel.

### AD-7: Amazon SES as replacement for `services/email.ts` stub

New interface: `export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult>` wrapping `@aws-sdk/client-sesv2`. The `ENABLE_INVITE_EMAIL` feature flag is removed; SES is always on in production and staging.

### AD-8: SNS webhook handlers at `/api/internal/*`

New Express routes for `POST /api/internal/ses-bounce` and `POST /api/internal/ses-complaint`. Skip `authenticate` middleware but enforce: SNS signature verification via `@aws-sdk/sns-message-validator`, topic ARN allowlist, auto-confirm `SubscriptionConfirmation` via provided `SubscribeURL`.

### AD-9: Single Cognito pool with compensating controls (COND-11)

Architect accepts the single-pool risk. Compensating controls: cross-role guard at the server layout layer (AD-2) + API `requireRole()` middleware (existing) + cross-role PHI isolation test suite (COND-8). Compliance officer writes the risk acceptance memo.

### AD-10: Rate limit storage — DB-backed (COND-3)

New `RateLimit` table keyed on `(bucket, identifier)` with a `count` and `windowStart`. pg-boss janitor clears entries older than the longest window. Redis deferred to v2 if performance requires.

---

## Components

### Portal Next.js route group `(portal)`

**Location:** `apps/web/src/app/(portal)/`

**Responsibility:** Renders all portal UI. Hosts auth flows, calendar, telehealth views. Owns portal-scoped cookies.

**Routes:** `/portal/login`, `/portal/signup`, `/portal/forgot-password`, `/portal/reset-password`, `/portal/calendar`, `/portal/telehealth/[appointmentId]`, `/portal/404`, `/portal/error`.

**Server actions** in `apps/web/src/app/(portal)/_actions/`:
- `loginAction`, `logoutAction`, `redeemInviteAction`, `forgotPasswordAction`, `confirmResetAction`, `fetchAppointmentsAction`, `issueTelehealthTokenAction`, `updateTimezoneAction`, `telehealthEventsAction`

### Host-dispatch middleware (`apps/web/src/middleware.ts`)

Inspects `host` header, rewrites `portal.steadymentalhealth.com/*` to `/(portal)/*`. Does NOT do role or auth checking — that's the server layout's job.

### Portal root layout (`apps/web/src/app/(portal)/layout.tsx`)

Cross-role guard applied once at root. Public routes bypass auth check; all others verify PARTICIPANT role via Cognito token + DB lookup.

### Portal cookie utility (`apps/web/src/lib/portal-cookies.ts`)

Single source of truth for cookie read/write. Cookies: `portal_access_token` (httpOnly, secure, sameSite=lax, maxAge=30min, NO Domain attribute) and `portal_refresh_token` (httpOnly, secure, sameSite=lax, maxAge=7days, NO Domain attribute). Without `Domain`, cookies are scoped exactly to `portal.steadymentalhealth.com`.

### `/api/portal-invitations` router

**Location:** `packages/api/src/routes/portal-invitations.ts`

All endpoints `requireRole("CLINICIAN")`. Cross-clinician access returns `404`.

- `POST /api/portal-invitations` — create (FR-1)
- `GET /api/portal-invitations` — list own, paginated
- `GET /api/portal-invitations/:id` — ownership-scoped
- `POST /api/portal-invitations/:id/resend` — re-enqueue (FR-10)
- `POST /api/portal-invitations/:id/renew` — new token, reset expiry
- `POST /api/portal-invitations/:id/revoke` — soft-delete

### `/api/auth/redeem-portal-invite` endpoint

Unauthenticated, rate-limited 10/hour per IP. Replaces `/api/auth/register-with-invite`. Consumes token and creates/promotes the user.

### `services/portal-invitations.ts`

Functions: `createPortalInvitation`, `redeemPortalInvitation` (with SELECT FOR UPDATE + idempotency), `resendPortalInvitation`, `renewPortalInvitation`, `revokePortalInvitation`, `listPortalInvitations`.

### `workers/portal-invite-email.ts`

pg-boss worker consuming `send-portal-invite-email` jobs. Checks circuit breaker, calls SES, updates status. Retries with exponential backoff, SEND_FAILED on exhaustion.

### `services/email.ts` (rewritten)

Wraps `@aws-sdk/client-sesv2`. Exports `sendEmail(params)`. Checks `EmailSuppression` before sending.

### SNS webhook handlers in `routes/internal.ts`

`POST /api/internal/ses-bounce` and `POST /api/internal/ses-complaint`. Signature verification, idempotent state updates, circuit breaker bookkeeping.

### `services/ses-circuit-breaker.ts`

Tracks rolling bounce/complaint rate. Opens circuit on threshold breach, auto-closes after 4h. (COND-23)

### `services/rate-limit.ts`

DB-backed sliding-window rate limiter. (COND-3)

---

## Data Model

### New: `PortalInvitation`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | String @id @default(cuid()) | — | — |
| `clinicianId` | String | FK → ClinicianProfile.id, NOT NULL | — |
| `clientId` | String? | FK → User.id, nullable | Populated post AC-1.2 |
| `recipientEmail` | String | NOT NULL, encrypted-at-rest | Via encryption-middleware |
| `recipientEmailHash` | String | NOT NULL | SHA-256 of canonical email |
| `tokenHash` | String? | Unique, nullable after burn | SHA-256 of plaintext token |
| `tokenBurnedAt` | DateTime? | — | Set on redemption |
| `status` | PortalInvitationStatus | NOT NULL, default PENDING | — |
| `existingUser` | Boolean | NOT NULL, default false | — |
| `firstName` | String? | Encrypted-at-rest | Pre-fill stub data |
| `lastName` | String? | Encrypted-at-rest | Pre-fill stub data |
| `expiresAt` | DateTime | NOT NULL | `createdAt + 7 days` |
| `sendCount` | Int | NOT NULL, default 0 | Worker-success only |
| `lastSentAt` | DateTime? | — | — |
| `acceptedAt` | DateTime? | — | — |
| `acceptedByUserId` | String? | FK → User.id, nullable | — |
| `revokedAt` | DateTime? | — | — |
| `bounceType` | String? | — | "hard" or "soft" |
| `bouncedAt` | DateTime? | — | — |
| `createdAt` | DateTime @default(now()) | NOT NULL | — |
| `updatedAt` | DateTime @updatedAt | NOT NULL | — |
| `deletedAt` | DateTime? | — | Soft delete |

**Indexes:**
- `@@index([clinicianId, status])`
- `@@index([recipientEmailHash])`
- Partial unique on `(clinicianId, recipientEmailHash)` WHERE `status IN ('PENDING','SENT') AND deletedAt IS NULL` — raw SQL migration
- `@@index([tokenHash])`

**Enum:** `PortalInvitationStatus = PENDING | SENT | ACCEPTED | BOUNCED | COMPLAINED | SEND_FAILED | EXPIRED | REVOKED`

### New: `EmailSuppression`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | String @id @default(cuid()) | — | — |
| `emailHash` | String | Unique, NOT NULL | — |
| `email` | String | NOT NULL, encrypted-at-rest | — |
| `reason` | EmailSuppressionReason | NOT NULL | BOUNCE / COMPLAINT / MANUAL |
| `bounceType` | String? | — | — |
| `createdAt` | DateTime | NOT NULL | — |
| `expiresAt` | DateTime? | — | Soft bounces 30d; hard/complaint never |
| `deletedAt` | DateTime? | — | — |

### New: `RateLimit`

| Field | Type | Constraints |
|---|---|---|
| `id` | String @id @default(cuid()) | — |
| `bucket` | String | NOT NULL |
| `identifier` | String | NOT NULL |
| `count` | Int | NOT NULL, default 0 |
| `windowStart` | DateTime | NOT NULL |
| `createdAt` | DateTime | NOT NULL |
| `updatedAt` | DateTime | NOT NULL |

Unique on `(bucket, identifier)`. Janitor clears rows where `windowStart < now - 24h`.

### Modified: `ClinicianClient`

No schema change. Semantic transition: `INVITED → ACTIVE` on successful redemption. Revoke only affects the invitation, not the ClinicianClient.

### Modified: `ParticipantProfile`

Add `timezone` field (String?, IANA timezone string, e.g., "America/New_York").

### Dropped: `PatientInvitation`

Entire table + enum dropped. Migration enforces zero-row precondition via `RAISE EXCEPTION`.

---

## API Design

### `POST /api/portal-invitations`

**Auth:** CLINICIAN. **Rate limit:** 20/hour per clinicianId.

**Request:**
```json
{
  "recipientEmail": "client@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "existingClientId": "optional"
}
```

**Response (201):** `{ success, data: { id, status, recipientEmail, expiresAt, sendCount, existingUser } }`

**Errors:** 400 (validation), 403 (not clinician), 409 (duplicate pending OR suppressed email), 500.

### `GET /api/portal-invitations?cursor=&limit=&status=`

**Auth:** CLINICIAN. Paginated own invitations, excluding soft-deleted.

### `POST /api/portal-invitations/:id/resend|renew|revoke`

**Auth:** CLINICIAN (404 on ownership mismatch). Resend errors: 409 on cooldown/max, 422 on BOUNCED/COMPLAINED.

### `POST /api/auth/redeem-portal-invite`

**Auth:** None. **Rate limit:** 10/hour per IP.

**Request:** `{ token, email, firstName, lastName, password }`
**Response:** `{ success, data: { user, accessToken, refreshToken } }`
**Errors:** 400, 403 (binding mismatch), 404, 409 (used/revoked/expired), 410 (clinician suspended), 429, 500.

### `GET /api/participant-portal/appointments?from=&to=&cursor=&limit=`

**Auth:** PARTICIPANT. Limit capped at 100. Returns appointments for `participantId = req.user.participantProfileId`, filtered by status and date range, with `isJoinable` pre-computed via shared function.

**Response data shape:**
```json
{
  "id": "apt_123",
  "startTime": "...",
  "endTime": "...",
  "status": "SCHEDULED",
  "clinician": { "firstName": "...", "lastName": "..." },
  "appointmentType": "INDIVIDUAL_THERAPY",
  "location": { "name": "...", "type": "IN_PERSON" },
  "cancelReason": null,
  "isJoinable": false
}
```

### `PATCH /api/participant-portal/profile`

**Auth:** PARTICIPANT. Body: `{ timezone }`. Updates `ParticipantProfile.timezone`.

### `POST /api/participant-portal/telehealth-events`

**Auth:** PARTICIPANT. Body: `{ event: "connected"|"disconnected", appointmentId }`. Writes AuditLog.

### `POST /api/internal/ses-bounce` and `POST /api/internal/ses-complaint`

**Auth:** None (signature-verified). Returns 200 on success, 403 on invalid signature.

### Modified: `POST /api/telehealth/token`

When caller is PARTICIPANT:
1. Verify `appointment.participantId = req.user.participantProfileId` (403 mismatch)
2. Verify `appointment.status = SCHEDULED` (409 SessionUnavailable)
3. Issue LiveKit token with PARTICIPANT grants only (`canPublish`, `canSubscribe`, `canPublishData`, `canUpdateOwnMetadata`) — NO roomAdmin, NO roomRecord, NO canEndRoom
4. AuditLog entry with `metadata.event=telehealth_token_issued`

---

## Data Flow — Key Scenarios

### Clinician invites a new client

1. Clinician clicks "Invite new client" on clinician app
2. POST `/api/portal-invitations` with `{ email, firstName, lastName }`
3. Express validates, checks rate limit + EmailSuppression + duplicate invite
4. Service transaction: create stub User → create ClinicianClient → create PortalInvitation → enqueue pg-boss job with `{ invitationId, plaintextToken }`
5. Worker: checks circuit breaker, decrypts email, renders template, calls SES, updates status on success

### Client redeems invitation

1. Client clicks `https://portal.steadymentalhealth.com/signup?t=<token>`
2. CloudFront forwards Host to Amplify
3. Next.js host middleware rewrites to `/(portal)/signup?t=...`
4. Portal layout: public route, render signup form with pre-fill
5. Client submits → server action → POST `/api/auth/redeem-portal-invite`
6. Express transaction: SELECT FOR UPDATE → verify status/binding → create Cognito user (idempotent) → promote stub User → update ClinicianClient ACTIVE → burn token → audit log → COMMIT
7. Cognito login → return tokens
8. Server action sets portal-scoped cookies, redirects to `/portal/calendar`

### Client views calendar and joins session

1. Navigate to `/portal/calendar`
2. Portal layout: cross-role guard passes
3. Server action fetches appointments with Cognito Bearer
4. Page renders calendar with `isJoinable` flags
5. Click Join → `/portal/telehealth/[id]`
6. Layout guard passes → server action issues LiveKit token
7. Client connects to LiveKit room
8. `room.connected` → POST `/api/participant-portal/telehealth-events` for audit (COND-7)
9. Idle timer paused during session
10. Leave → audit disconnect → back to calendar

### SES bounce arrives

1. SES publishes to bounce SNS topic → POST `/api/internal/ses-bounce`
2. Handler verifies signature (403 on invalid)
3. Parse notification, extract + hash bounced email
4. Transaction: update PortalInvitation status=BOUNCED + EmailSuppression upsert
5. Update circuit breaker rolling count; open if threshold breached
6. Return 200 (idempotent)

### Clinician revokes mid-redemption (race)

1. Clinician POST `/api/portal-invitations/:id/revoke` → acquires lock, sets REVOKED, COMMIT
2. Client submits redeem form concurrently → `SELECT FOR UPDATE` waits, gets updated REVOKED row, aborts with 409 InvitationRevoked
3. Client sees revoked error page, NOT logged in

---

## Access Control Matrix (COND-17)

| Endpoint | Anon | PARTICIPANT | CLINICIAN | ADMIN | PHI |
|---|---|---|---|---|---|
| `POST /api/portal-invitations` | 401 | 403 | own | 403 | No |
| `GET /api/portal-invitations` | 401 | 403 | own | 403 | Recipient email (encrypted) |
| `POST /api/portal-invitations/:id/*` | 401 | 403 | own only (404 mismatch) | 403 | No |
| `POST /api/auth/redeem-portal-invite` | ALLOW (RL) | ALLOW | ALLOW | ALLOW | Creates User |
| `POST /api/auth/login` | ALLOW (RL) | ALLOW | ALLOW | ALLOW | Tokens |
| `POST /api/auth/logout` | 400 | ALLOW | ALLOW | ALLOW | No |
| `POST /api/auth/forgot-password` | ALLOW (RL) | ALLOW | ALLOW | ALLOW | No |
| `POST /api/auth/confirm-reset-password` | ALLOW (RL) | ALLOW | ALLOW | ALLOW | No |
| `GET /api/participant-portal/appointments` | 401 | own | 403 | 403 | **Full PHI** |
| `PATCH /api/participant-portal/profile` | 401 | own | 403 | 403 | Timezone |
| `POST /api/participant-portal/telehealth-events` | 401 | own appt | 403 | 403 | Audit metadata |
| `POST /api/telehealth/token` (PARTICIPANT) | 401 | own + SCHEDULED | (unchanged CLINICIAN) | 403 | LiveKit token |
| `POST /api/internal/ses-bounce` | signature | — | — | — | Email hash |
| `POST /api/internal/ses-complaint` | signature | — | — | — | Email hash |

**Server-layout route guard (UI-level):**

| Route | Anon | PARTICIPANT | CLINICIAN | ADMIN |
|---|---|---|---|---|
| `portal.*/login, /signup, /forgot-password, /reset-password, /404, /error` | ALLOW | ALLOW | → clinician | → admin |
| `portal.*/calendar, /telehealth/*` | → login | ALLOW | → clinician | → admin |
| `steadymentalhealth.com/*` | existing | → portal | ALLOW | ALLOW |

---

## Compliance Controls Mapping

| Cond | Implementation |
|---|---|
| COND-1 | `__tests__/email-template-phi-guard.test.ts` denylist scan in CI |
| COND-2 | CI deploy step `aws sesv2 get-account` gate + manual BAA checklist |
| COND-3 | New `RateLimit` DB table + `services/rate-limit.ts` |
| COND-4 | Cognito pool `EmailConfiguration = DEVELOPER` + SES SourceArn in us-east-2 |
| COND-5 | Explicit Prisma `select` blocks + PR checklist item |
| COND-6 | `PARTICIPANT_GRANTS` constant in `services/telehealth.ts` + JWT grant assertion test |
| COND-7 | `POST /api/participant-portal/telehealth-events` + client LiveKit event subscriber |
| COND-8 | `__tests__/cross-role-authorization.test.ts` iterates every PHI endpoint |
| COND-9 | Migration `RAISE EXCEPTION` guard + engineer screenshot in ship PR |
| COND-10 | AD-1 Next.js server action proxy |
| COND-11 | Compliance-owned risk memo at `risk-acceptances/single-cognito-pool.md` |
| COND-12 | Compliance-owned privacy policy update |
| COND-13 | Compliance-owned DSAR runbook |
| COND-14 | Compliance-owned erasure reconciliation doc |
| COND-15 | Compliance-owned cross-border transfer doc |
| COND-16 | Compliance-owned DPIA (launch gate) |
| COND-17 | Access control matrix above |
| COND-18 | `next.config.js` `headers()` + integration test HEAD requests |
| COND-19 | CloudFront `redirect-to-https` + HSTS header |
| COND-20 | AWS SDK v3 default TLS + PR review |
| COND-21 | CloudWatch alarms via IaC or manual + launch checklist |
| COND-22 | `runbooks/email-incidents.md` |
| COND-23 | `services/ses-circuit-breaker.ts` + worker check |
| COND-24 | DR runbook priority-1 entry |
| COND-25 | `__tests__/portal-invitations-race.test.ts` |
| COND-26 | Classification table referenced in 03-compliance.md |
| COND-27 | Integration test in `__tests__/portal-invitations.test.ts` |
| COND-28 | UX-owned privacy link placement |
| COND-29 | Manual launch checklist |

---

## Technology Choices

| Decision | Choice | Rationale |
|---|---|---|
| Email provider | Amazon SES v2 | BAA signed, AWS-native, low volume |
| Email SDK | `@aws-sdk/client-sesv2` | Official, typed |
| SNS signature | `sns-validator` or manual | Small dedicated dep |
| Cookie storage | Next.js server-set httpOnly | No client JS exposure |
| Cross-role guard | Server layout | Has DB access, runs per-request |
| Host routing | Next.js middleware | Single deployment |
| Rate limit storage | DB-backed `RateLimit` | Stateless per CLAUDE.md |
| Pagination | Cursor, 100 max | CLAUDE.md convention |
| LiveKit client | `@livekit/client` (existing) | Already in use |
| Date/timezone | `date-fns` + `date-fns-tz` (existing) | Already in use |
| Calendar component | Reuse if spike passes, else fork | Minimize duplication |
| Telehealth participant view | New component | Too many clinician-only features |

---

## File Structure

### New files

**Database:**
- `packages/db/prisma/migrations/20260411_client_web_portal/migration.sql`

**Shared:**
- `packages/shared/src/schemas/portal-invitation.ts`
- `packages/shared/src/schemas/email-suppression.ts`
- `packages/shared/src/schemas/participant-appointment.ts`
- `packages/shared/src/utils/is-appointment-joinable.ts`

**API services:**
- `packages/api/src/services/portal-invitations.ts`
- `packages/api/src/services/ses-circuit-breaker.ts`
- `packages/api/src/services/rate-limit.ts`
- `packages/api/src/services/participant-appointments.ts`

**API routes:**
- `packages/api/src/routes/portal-invitations.ts`

**API workers:**
- `packages/api/src/workers/portal-invite-email.ts`
- `packages/api/src/workers/scrub-expired-portal-invites.ts`
- `packages/api/src/workers/rate-limit-janitor.ts`

**API tests:**
- `packages/api/src/__tests__/portal-invitations.test.ts`
- `packages/api/src/__tests__/portal-invitations-race.test.ts`
- `packages/api/src/__tests__/portal-invitation-redeem.test.ts`
- `packages/api/src/__tests__/participant-appointments.test.ts`
- `packages/api/src/__tests__/participant-telehealth-events.test.ts`
- `packages/api/src/__tests__/ses-webhook.test.ts`
- `packages/api/src/__tests__/email-template-phi-guard.test.ts`
- `packages/api/src/__tests__/cross-role-authorization.test.ts`
- `packages/api/src/__tests__/rate-limit.test.ts`
- `packages/api/src/__tests__/ses-circuit-breaker.test.ts`
- `packages/api/src/__tests__/integration/portal-invite-to-join.test.ts`

**Web portal routes:**
- `apps/web/src/app/(portal)/layout.tsx`
- `apps/web/src/app/(portal)/login/page.tsx`
- `apps/web/src/app/(portal)/signup/page.tsx`
- `apps/web/src/app/(portal)/forgot-password/page.tsx`
- `apps/web/src/app/(portal)/reset-password/page.tsx`
- `apps/web/src/app/(portal)/calendar/page.tsx`
- `apps/web/src/app/(portal)/telehealth/[appointmentId]/page.tsx`
- `apps/web/src/app/(portal)/telehealth/[appointmentId]/TelehealthParticipantView.tsx`
- `apps/web/src/app/(portal)/404/page.tsx`
- `apps/web/src/app/(portal)/error/page.tsx`
- `apps/web/src/app/(portal)/_actions/*.ts` (9 actions)

**Web utilities:**
- `apps/web/src/lib/portal-cookies.ts`
- `apps/web/src/lib/portal-api-client.ts`

**Web components:**
- `apps/web/src/components/portal/PortalHeader.tsx`
- `apps/web/src/components/portal/PortalCalendarGrid.tsx`
- `apps/web/src/components/portal/InvitationStatusCard.tsx`

**Docs:**
- `docs/sdlc/client-web-portal-mvp/runbooks/email-incidents.md`
- `docs/sdlc/client-web-portal-mvp/risk-acceptances/single-cognito-pool.md`
- `docs/sdlc/client-web-portal-mvp/dpia.md` (compliance placeholder)

### Modified files

- `packages/db/prisma/schema.prisma` (add PortalInvitation, EmailSuppression, RateLimit, ParticipantProfile.timezone)
- `packages/api/src/routes/auth.ts` (DELETE register-with-invite, ADD redeem-portal-invite + portal-invite-status)
- `packages/api/src/routes/telehealth.ts` (role branching + SessionUnavailable check)
- `packages/api/src/routes/participant-portal.ts` (add appointments, profile, telehealth-events)
- `packages/api/src/routes/internal.ts` (add SNS webhooks)
- `packages/api/src/services/telehealth.ts` (PARTICIPANT_GRANTS constant)
- `packages/api/src/services/email.ts` (REWRITE with SES SDK)
- `packages/api/src/app.ts` (mount new routes)
- `apps/web/src/middleware.ts` (host-based route rewrite)
- `apps/web/next.config.js` (headers for CSP, HSTS, X-Frame-Options)
- `CLAUDE.md` (correct auth section per AC-12.5)

### Deleted files

- `packages/api/src/services/invitations.ts`
- `packages/api/src/routes/invitations.ts`
- `packages/api/src/workers/invite-email.ts`
- `packages/api/src/workers/scrub-expired-invites.ts`
- `packages/api/src/__tests__/invitations.test.ts`
- `packages/api/src/__tests__/auth-invite.test.ts`
- `apps/mobile/app/(auth)/register.tsx`

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Calendar grid spike fails | Schedule slip 1-2 days | Engineer spike first; fork is fallback |
| Cognito pool not configured for SES BAA | HIPAA violation on password reset | Architect checks config first; config change is first merge |
| pg-boss retry storm on SES outage | Delayed invitations | Circuit breaker + dead-letter after 5 retries |
| Redeem transaction lock contention | Slow portal signup | `SELECT FOR UPDATE` on one row only; split COMMIT if observed |
| Host header forwarding misconfiguration | Portal routes don't resolve | Integration test with `Host:` header assertion |
| Circuit breaker false positives | Legitimate invitations held | Auto-close after 4h + manual clear + on-call page |
| Multi-clinician participant PHI leak | Privacy violation | Explicit test on merged view scoping |
| Cognito `UsernameExistsException` retry loop | Stuck redeem | Idempotency path fetches existing sub |
| Timezone detection race | Wrong times briefly | Synchronous detection before initial render |
| SES quota exceeded | Emails rejected | Default 50k/day; alarm at 80% |
| Signup page scraping | Mass signup attempts | Rate limit + WAF + CAPTCHA follow-up |
| `isAppointmentJoinable` drift | Clinician/participant disagree | Both sides import from `@steady/shared` + unit test |

---

## Open Architectural Questions for Engineer

1. **Calendar grid reuse vs. fork** — resolved by day-1 spike (AD-5)
2. **`services/email.ts` caller audit** — grep, list in PR, preserve or migrate (AC-2.8, COND-20)
3. **Cognito User Pool current `EmailConfiguration`** — if not DEVELOPER+SES, fix first (COND-4)
4. **CloudFront cache policy for portal** — configure `Cache-Control: no-store` + Host forwarding
5. **`@steady/shared` utils namespace** — establish pattern if new
6. **AuditLog `metadata JSON` column** — add via migration if missing (COND-7 depends)
7. **`ClinicianClient.status` enum values** — verify `ACTIVE` exists, add if missing

Engineer resolves these before first implementation task.
