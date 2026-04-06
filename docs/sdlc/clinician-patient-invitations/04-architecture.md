# Clinician Patient Invitations — Technical Architecture

## Overview
This feature adds an invite code system on top of the existing `ClinicianClient` model. A new `PatientInvitation` model stores invite codes with encrypted PII. The existing `addClient` flow is extended — not replaced — to generate codes and optionally queue email nudges via pg-boss. The mobile signup screen gets an invite code field. A new email service (SendGrid) is introduced behind a feature flag for COND-1 compliance.

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLINICIAN (Web)                          │
│                                                                 │
│  Patients Page ──► "Invite Patient" Modal                       │
│       │               │                                         │
│       │          POST /api/invitations                          │
│       ▼               ▼                                         │
│  Invite Status    Patient View Page                             │
│  (Pending/        ──► Invite Widget                             │
│   Expired/            (resend/revoke)                           │
│   Active)                                                       │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API SERVER (Express)                         │
│                                                                 │
│  routes/invitations.ts ──► services/invitations.ts              │
│       │                        │                                │
│       │                   ┌────┴────┐                           │
│       │                   │ Prisma  │──► PatientInvitation       │
│       │                   │         │──► ClinicianClient         │
│       │                   │         │──► User + Profile          │
│       │                   └─────────┘                           │
│       │                        │                                │
│       ▼                        ▼                                │
│  pg-boss queue ──► services/email.ts ──► SendGrid (BAA)         │
│  (send-invite-email)                                            │
│  (scrub-expired-invites) ◄── scheduled cron                    │
│                                                                 │
│  Audit Middleware (auto) ──► audit_logs                          │
│  Encryption Middleware ──► AES-256-GCM on name/email            │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PATIENT (Mobile)                             │
│                                                                 │
│  Signup Screen ──► Enter invite code + name/email/password      │
│       │                                                         │
│  POST /api/auth/register-with-invite                            │
│       │                                                         │
│       ▼                                                         │
│  Auto-login ──► Programs tab (or empty home if no program)      │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### PatientInvitation Service (`packages/api/src/services/invitations.ts`)
**Responsibility:** All business logic for invite lifecycle — create, redeem, resend, revoke, expiry checks.
**Interface:** `createInvitation()`, `redeemInvitation()`, `resendEmail()`, `revokeInvitation()`, `getInvitationsByClinicianId()`
**Dependencies:** Prisma, email service, pg-boss queue

### Invitations Route (`packages/api/src/routes/invitations.ts`)
**Responsibility:** HTTP layer for invitation endpoints. Parse input, call service, format output.
**Interface:** REST endpoints (see API Design below)
**Dependencies:** Invitation service, auth middleware

### Email Service (`packages/api/src/services/email.ts`)
**Responsibility:** Send transactional emails via SendGrid. Hardcoded templates only.
**Interface:** `sendInviteEmail(to, code)` — returns `{ success, messageId }`
**Dependencies:** SendGrid SDK, feature flag check

### Invite Email Worker (`packages/api/src/workers/invite-email.ts`)
**Responsibility:** pg-boss job handler for async email sending.
**Interface:** Processes `send-invite-email` jobs
**Dependencies:** Email service, queue

### PII Scrub Worker (`packages/api/src/workers/scrub-expired-invites.ts`)
**Responsibility:** Scheduled pg-boss job that scrubs PII from unredeemed invites older than 90 days.
**Interface:** Runs on `scrub-expired-invites` schedule (daily)
**Dependencies:** Prisma

## Data Model

### PatientInvitation (NEW)
| Field | Type | Constraints | Notes |
|-------|------|------------|-------|
| id | String | @id @default(cuid()) | Primary key |
| clinicianId | String | FK → ClinicianProfile | Who created the invite |
| code | String | @unique | Format: `STEADY-XXXX`, case-insensitive stored uppercase |
| patientName | String | max 200 | **Encrypted** (COND-2). Display name entered by clinician |
| patientEmail | String | max 200 | **Encrypted** (COND-2). Used for email nudge and duplicate checks |
| patientEmailHash | String | | SHA-256 hash of lowercased email for duplicate lookups (encrypted field can't be indexed for search) |
| programId | String? | FK → Program, nullable | Optional program to auto-enroll on redemption |
| status | InvitationStatus | enum | PENDING, ACCEPTED, REVOKED, EXPIRED |
| emailSent | Boolean | default false | Whether email nudge was sent |
| emailSendCount | Int | default 0 | Number of times email was sent/resent |
| expiresAt | DateTime | | createdAt + 30 days |
| acceptedAt | DateTime? | nullable | When patient redeemed the code |
| acceptedByUserId | String? | FK → User, nullable | The User created on redemption |
| revokedAt | DateTime? | nullable | When clinician revoked |
| piiScrubbed | Boolean | default false | True after 90-day PII scrub |
| createdAt | DateTime | @default(now()) | |
| updatedAt | DateTime | @updatedAt | |

**Indexes:** `code` (unique), `clinicianId` (for listing), `status` + `expiresAt` (for scrub job), `patientEmailHash` + `clinicianId` (for duplicate checks)

### InvitationStatus (NEW ENUM)
```
PENDING | ACCEPTED | REVOKED | EXPIRED
```

### Modifications to Existing Models

**ClinicianClient** — No changes. The existing `addClient` flow is NOT used for invitations. Invitation redemption creates the ClinicianClient record directly with `ACTIVE` status (the patient already accepted by entering the code).

**User** — No schema changes. New users are created during redemption via the existing pattern.

### Why a Separate Model (Not Extending ClinicianClient)

The existing `ClinicianClient` model represents a confirmed clinician-patient relationship. An invitation is a *pre-relationship* — it may never be redeemed, it has an expiry, it stores PII that must be scrubbed, and it needs its own lifecycle (revoke, resend, expire). Mixing these concerns into `ClinicianClient` would complicate queries and make the PII scrub job risky (might accidentally scrub active client data). The `PatientInvitation` is a clean boundary.

## API Design

### POST /api/invitations
- **Method:** POST
- **Path:** /api/invitations
- **Auth:** CLINICIAN (authenticate + requireRole)
- **Request:**
```json
{
  "patientName": "Jane Doe",
  "patientEmail": "jane@example.com",
  "programId": "prog_123",
  "sendEmail": true
}
```
- **Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "inv_abc",
    "code": "STEADY-7X2K",
    "patientName": "Jane Doe",
    "patientEmail": "jane@example.com",
    "programId": "prog_123",
    "status": "PENDING",
    "emailSent": true,
    "expiresAt": "2026-04-27T...",
    "createdAt": "2026-03-28T..."
  }
}
```
- **Errors:** 409 if active invitation already exists for this email+clinician, 400 validation

### GET /api/invitations
- **Method:** GET
- **Path:** /api/invitations
- **Auth:** CLINICIAN
- **Query:** `?status=PENDING&cursor=...&limit=50`
- **Response:** Paginated list of clinician's invitations. Used by patients page to merge with active clients.

### GET /api/invitations/:id
- **Method:** GET
- **Path:** /api/invitations/:id
- **Auth:** CLINICIAN (must own)
- **Response:** Single invitation detail for the invite widget.

### POST /api/invitations/:id/resend
- **Method:** POST
- **Path:** /api/invitations/:id/resend
- **Auth:** CLINICIAN (must own)
- **Precondition:** Status must be PENDING and not expired.
- **Response:** 200 with updated emailSendCount
- **Side effect:** Queues email job

### POST /api/invitations/:id/revoke
- **Method:** POST
- **Path:** /api/invitations/:id/revoke
- **Auth:** CLINICIAN (must own)
- **Precondition:** Status must be PENDING.
- **Response:** 200 with status: REVOKED
- **Side effect:** Sets revokedAt, status → REVOKED

### POST /api/auth/register-with-invite
- **Method:** POST
- **Path:** /api/auth/register-with-invite
- **Auth:** None (public, rate-limited: 10/hr/IP)
- **Request:**
```json
{
  "code": "STEADY-7X2K",
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "password": "securePass123"
}
```
- **Response (201):**
```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "user": { "id": "...", "email": "...", "role": "PARTICIPANT" }
  }
}
```
- **Errors:**
  - 400: "Invalid invite code. Please check and try again."
  - 410: "This invite code has expired. Please contact your clinician for a new one."
  - 409: "This invite code has already been used."
  - 409: "This email is already registered."
  - 429: Rate limited

**Redemption Logic (atomic transaction):**
1. Look up invitation by code (uppercase, status PENDING, not expired)
2. Check email not already registered
3. Create User (PARTICIPANT) + ParticipantProfile
4. Create ClinicianClient (status: ACTIVE, acceptedAt: now)
5. Create ClientConfig from clinician defaults
6. If programId, create Enrollment (status: ACTIVE)
7. Update invitation: status → ACCEPTED, acceptedAt, acceptedByUserId
8. Issue JWT tokens
9. Return auth response

## Data Flow

### Scenario 1: Clinician Creates Invite with Email
1. Clinician fills modal → `POST /api/invitations` with `sendEmail: true`
2. Route validates via Zod schema, calls `createInvitation()`
3. Service generates code: `STEADY-` + 4 random alphanumeric (crypto.randomBytes)
4. Service creates `PatientInvitation` record (Prisma encrypts name/email via middleware)
5. Audit middleware auto-logs CREATE
6. Service queues `send-invite-email` job via pg-boss
7. Returns invitation to clinician (code displayed prominently)
8. pg-boss worker picks up job → calls `sendInviteEmail()`
9. Email service checks feature flag → if enabled, sends via SendGrid
10. Worker updates `emailSent: true`, increments `emailSendCount`

### Scenario 2: Patient Redeems Code
1. Patient enters code on mobile signup → `POST /api/auth/register-with-invite`
2. Route rate-limit check (10/hr/IP)
3. Service looks up code (uppercased): `WHERE code = X AND status = PENDING`
4. If not found → 400. If expired → 410. If used → 409.
5. Check email not taken → 409 if exists
6. Prisma transaction: create User, Profile, ClinicianClient, ClientConfig, optional Enrollment, update invitation
7. Audit middleware logs all creates
8. Issue JWT tokens, return auth response
9. Mobile stores tokens in SecureStore, navigates to home

### Scenario 3: PII Scrub (Daily)
1. pg-boss scheduled job fires daily
2. Worker queries: `WHERE status IN (REVOKED, EXPIRED) AND piiScrubbed = false AND createdAt < (now - 90 days)`
3. Updates matching records: `patientName = '[scrubbed]', patientEmail = '[scrubbed]', piiScrubbed = true`
4. Audit middleware logs the updates

## Compliance Controls

| Condition | Implementation |
|-----------|---------------|
| COND-1: BAA with email provider | Email service checks `ENABLE_INVITE_EMAIL` env var. If false, `sendInviteEmail()` is a no-op that logs a warning. Invite codes work without email. |
| COND-2: Field-level encryption | Add `PatientInvitation: ["patientName", "patientEmail"]` to `ENCRYPTED_FIELDS` map in encryption middleware. |
| COND-3: Hardcoded email template | Email template is a string literal in `services/email.ts`. No clinician input in email body. Template: "Your clinician has invited you to Steady, an app to support your treatment. Download the app and enter your code: {code}." |
| COND-4: Audit trail | Prisma audit middleware auto-captures all CREATE/UPDATE/DELETE on PatientInvitation. Email send events logged explicitly by worker (logger.info with invitation ID only, no code — COND-6). |
| COND-5: PII retention | `scrub-expired-invites` pg-boss job runs daily. Scrubs name/email from unredeemed invites older than 90 days. |
| COND-6: Invite code not logged | Logger calls in invitation service/routes use invitation ID only, never the code value. Rate-limit failure logs use IP + hashed code prefix only. |

## Technology Choices

| Decision | Choice | Rationale | Alternatives Considered |
|----------|--------|-----------|------------------------|
| Email provider | SendGrid | BAA available, simple REST API, good deliverability, free tier for low volume | AWS SES (more complex setup), Postmark (more expensive) |
| Email SDK | @sendgrid/mail | Official SDK, minimal footprint | nodemailer (more generic but no BAA tracking) |
| Code format | `STEADY-` + 4 alphanumeric | 36^4 = 1.68M combos. With rate limiting (10/hr/IP), brute-force infeasible in 30-day window. Easy to read aloud. | UUID (too long to read), 6-char (unnecessary entropy for rate-limited system) |
| Code generation | crypto.randomBytes | Cryptographically secure per NFR-2 | Math.random (not cryptographic — rejected) |
| New model vs extend ClinicianClient | New `PatientInvitation` model | Clean separation of pre-relationship (invite) vs. confirmed relationship (client). PII scrub job is safer on isolated model. | Extending ClinicianClient (mixes concerns, complicates PII scrub) |
| Feature flag for email | Env var `ENABLE_INVITE_EMAIL` | Simplest approach, matches existing env-based config. No feature flag system exists yet — not worth building for one flag. | DB-backed feature flags (overengineered for this) |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 4-char code collision | Invite creation fails | Retry with new random code (up to 3 attempts). With ~1.68M possible codes and likely <10K active invites, collision probability is negligible. |
| Email deliverability (spam folder) | Patient never sees invite | Code is the primary mechanism — email is optional. Clinician can share code verbally. Resend available. |
| Encrypted email field breaks duplicate checks | Two invites for same patient | Store a `patientEmailHash` (SHA-256) alongside the encrypted email for lookups. Index on hash. |
| SendGrid BAA not signed at launch | Email feature blocked | Feature flag off by default. Invite codes ship independently. |
| Brute-force code guessing | Unauthorized account creation | Rate limit (10/hr/IP) + 30-day expiry + single-use = effectively impossible (1.68M codes / 10 per hour = 168K hours = 19 years) |

## File Structure

```
packages/db/prisma/schema.prisma          — Add PatientInvitation model, InvitationStatus enum
packages/db/src/encryption-middleware.ts   — Add PatientInvitation to ENCRYPTED_FIELDS

packages/shared/src/schemas/invitation.ts — Zod schemas for invitation endpoints
packages/shared/src/schemas/auth.ts       — Add RegisterWithInviteSchema
packages/shared/src/schemas/index.ts      — Re-export new schemas

packages/api/src/routes/invitations.ts    — CRUD + resend/revoke endpoints
packages/api/src/routes/auth.ts           — Add register-with-invite endpoint
packages/api/src/services/invitations.ts  — Invitation business logic
packages/api/src/services/email.ts        — SendGrid email service (NEW)
packages/api/src/workers/invite-email.ts  — pg-boss email worker (NEW)
packages/api/src/workers/scrub-expired-invites.ts — pg-boss PII scrub worker (NEW)

apps/web/src/components/invite-patient-modal.tsx     — Invite creation modal
apps/web/src/components/invite-status-badge.tsx      — Pending/Expired/Active badge
apps/web/src/components/invite-widget.tsx             — Patient view invite widget
apps/web/src/app/(dashboard)/participants/page.tsx   — Integrate invite status into list

apps/mobile/app/(auth)/register.tsx       — Add invite code field to signup
```
