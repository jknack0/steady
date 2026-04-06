# Clinician Patient Invitations — Implementation Plan

## Task Order

Implementation follows bottom-up: database → shared schemas → API service → API routes → web frontend → mobile.

### Task 1: Prisma Schema — PatientInvitation Model

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

- [ ] Add `InvitationStatus` enum: PENDING, ACCEPTED, REVOKED, EXPIRED
- [ ] Add `PatientInvitation` model with all fields from architecture doc
- [ ] Add indexes: code (unique), clinicianId, patientEmailHash+clinicianId, status+expiresAt
- [ ] Add relations: clinician → ClinicianProfile, program → Program, acceptedByUser → User
- [ ] Run `npm run db:generate` to regenerate Prisma client
- [ ] Commit: "feat(db): add PatientInvitation model and InvitationStatus enum"

### Task 2: Encryption Middleware — Add PatientInvitation Fields

**Files:**
- Modify: `packages/db/src/encryption-middleware.ts`

- [ ] Add `PatientInvitation: ["patientName", "patientEmail"]` to ENCRYPTED_FIELDS map
- [ ] Commit: "feat(db): add PatientInvitation PII fields to encryption middleware (COND-2)"

### Task 3: Zod Schemas — Invitation Validation

**Files:**
- Create: `packages/shared/src/schemas/invitation.ts`
- Modify: `packages/shared/src/schemas/auth.ts`
- Modify: `packages/shared/src/schemas/index.ts`
- Test: `packages/shared/src/__tests__/invitation.test.ts`

- [ ] Write failing tests for CreateInvitationSchema (valid/invalid payloads)
- [ ] Write failing tests for RegisterWithInviteSchema (valid/invalid payloads, code format)
- [ ] Implement CreateInvitationSchema: patientName (1-200), patientEmail (email, max 200), programId (optional string), sendEmail (optional boolean, default false)
- [ ] Implement RegisterWithInviteSchema: code (string, matches STEADY-XXXX pattern), firstName (1-100), lastName (1-100), email (email), password (min 8)
- [ ] Add exports to index.ts
- [ ] Verify all tests pass
- [ ] Commit: "feat(shared): add invitation and register-with-invite Zod schemas"

### Task 4: Email Service

**Files:**
- Create: `packages/api/src/services/email.ts`

- [ ] Implement `sendInviteEmail(to: string, code: string)` function
- [ ] Check `ENABLE_INVITE_EMAIL` env var — no-op with warning if disabled (COND-1)
- [ ] Hardcoded template string (COND-3): "Your clinician has invited you to Steady..."
- [ ] Use @sendgrid/mail SDK
- [ ] Never log the invite code (COND-6) — log invitation ID or "email queued" only
- [ ] Return `{ success: boolean, messageId?: string }`
- [ ] Commit: "feat(api): add email service with SendGrid behind feature flag (COND-1, COND-3)"

### Task 5: Test Setup — Add PatientInvitation Mocks

**Files:**
- Modify: `packages/api/src/__tests__/setup.ts`
- Modify: `packages/api/src/__tests__/helpers.ts`

- [ ] Add `patientInvitation` mock model to setup.ts (create, findMany, findFirst, findUnique, update, delete, upsert, count)
- [ ] Add `mockInvitation()` helper to helpers.ts
- [ ] Commit: "test(api): add PatientInvitation mock setup and test helpers"

### Task 6: Invitation Service — Core Business Logic

**Files:**
- Create: `packages/api/src/services/invitations.ts`

- [ ] Write failing test: createInvitation generates STEADY-XXXX code, creates record, returns invitation
- [ ] Write failing test: createInvitation rejects duplicate email+clinician with active invite
- [ ] Write failing test: createInvitation queues email job when sendEmail=true
- [ ] Write failing test: createInvitation does NOT queue email when sendEmail=false
- [ ] Implement createInvitation() — code generation via crypto.randomBytes, SHA-256 email hash, 30-day expiry
- [ ] Write failing test: redeemInvitation creates user, profile, clinicianClient, updates invitation
- [ ] Write failing test: redeemInvitation auto-enrolls in program if programId set
- [ ] Write failing test: redeemInvitation rejects expired code (410)
- [ ] Write failing test: redeemInvitation rejects used code (409)
- [ ] Write failing test: redeemInvitation rejects invalid code (400)
- [ ] Write failing test: redeemInvitation rejects existing email (409)
- [ ] Implement redeemInvitation() — atomic transaction per architecture
- [ ] Write failing test: revokeInvitation sets status REVOKED
- [ ] Write failing test: resendEmail increments emailSendCount, queues job
- [ ] Write failing test: getInvitationsByClinicianId returns paginated results
- [ ] Implement remaining service functions
- [ ] Verify all tests pass
- [ ] Commit: "feat(api): add invitation service with full lifecycle management"

### Task 7: Invitation Routes

**Files:**
- Create: `packages/api/src/routes/invitations.ts`
- Modify: `packages/api/src/app.ts`
- Test: `packages/api/src/__tests__/invitations.test.ts`

- [ ] Write failing test: POST /api/invitations — creates invitation, returns 201 with code
- [ ] Write failing test: POST /api/invitations — returns 401 without auth
- [ ] Write failing test: POST /api/invitations — returns 403 for non-clinician
- [ ] Write failing test: POST /api/invitations — returns 400 for invalid payload
- [ ] Write failing test: POST /api/invitations — returns 409 for duplicate
- [ ] Write failing test: GET /api/invitations — returns paginated list
- [ ] Write failing test: GET /api/invitations/:id — returns single invitation
- [ ] Write failing test: GET /api/invitations/:id — returns 404 for wrong owner
- [ ] Write failing test: POST /api/invitations/:id/resend — queues email, returns 200
- [ ] Write failing test: POST /api/invitations/:id/revoke — revokes, returns 200
- [ ] Implement all routes
- [ ] Register router in app.ts: `app.use("/api/invitations", invitationsRouter)`
- [ ] Verify all tests pass
- [ ] Commit: "feat(api): add invitation routes with auth and validation"

### Task 8: Auth Route — Register With Invite

**Files:**
- Modify: `packages/api/src/routes/auth.ts`
- Test: `packages/api/src/__tests__/auth-invite.test.ts`

- [ ] Write failing test: POST /api/auth/register-with-invite — creates account, returns tokens
- [ ] Write failing test: returns 400 for invalid code
- [ ] Write failing test: returns 410 for expired code
- [ ] Write failing test: returns 409 for used code
- [ ] Write failing test: returns 409 for existing email
- [ ] Write failing test: returns 429 when rate limited
- [ ] Implement register-with-invite endpoint with rate limiter (10/hr/IP)
- [ ] Verify all tests pass
- [ ] Commit: "feat(api): add register-with-invite auth endpoint with rate limiting"

### Task 9: Workers — Email and PII Scrub

**Files:**
- Create: `packages/api/src/workers/invite-email.ts`
- Create: `packages/api/src/workers/scrub-expired-invites.ts`

- [ ] Implement invite-email worker: picks up `send-invite-email` jobs, calls email service, updates invitation record
- [ ] Implement scrub-expired-invites worker: daily schedule, scrubs PII from unredeemed invites > 90 days (COND-5)
- [ ] Never log invite codes in workers (COND-6)
- [ ] Commit: "feat(api): add invite email and PII scrub workers (COND-5, COND-6)"

### Task 10: Web — Invite Patient Modal

**Files:**
- Create: `apps/web/src/components/invite-patient-modal.tsx`

- [ ] Implement 2-step modal: form → success with code display
- [ ] Form: patient name, email, program dropdown, send email checkbox
- [ ] Success: large mono code, copy button, confirmation text
- [ ] Error handling: inline for duplicate, toast for server error
- [ ] Copy-to-clipboard with "Copied!" feedback
- [ ] Commit: "feat(web): add invite patient modal with 2-step flow"

### Task 11: Web — Invite Status Badge

**Files:**
- Create: `apps/web/src/components/invite-status-badge.tsx`

- [ ] Implement badge component: Pending (yellow), Expired (red), Active (green)
- [ ] Color AND text — never color alone (accessibility)
- [ ] Commit: "feat(web): add invite status badge component"

### Task 12: Web — Invite Widget

**Files:**
- Create: `apps/web/src/components/invite-widget.tsx`

- [ ] Implement widget with 4 states: Pending, Accepted, Expired, Revoked
- [ ] Pending: code + copy, dates, resend/revoke actions
- [ ] Accepted: dates, linked program
- [ ] Expired/Revoked: dates, "Send New Invite" action
- [ ] Resend: spinner, toast feedback, count increment
- [ ] Revoke: confirmation dialog, state transition
- [ ] Commit: "feat(web): add invite widget for patient view page"

### Task 13: Web — Patients Page Integration

**Files:**
- Modify: `apps/web/src/app/(dashboard)/participants/page.tsx`

- [ ] Fetch invitations alongside patients (GET /api/invitations)
- [ ] Merge into patient list with invite status rows
- [ ] Pending invites sort to top
- [ ] Status filter dropdown: All, Active, Pending, Expired
- [ ] Empty state with "Invite Patient" CTA
- [ ] "Invite Patient" button in page header
- [ ] Commit: "feat(web): integrate invite status into patients page"

### Task 14: Mobile — Register Screen with Invite Code

**Files:**
- Modify: `apps/mobile/app/(auth)/register.tsx`

- [ ] Add invite code field at top of form
- [ ] Placeholder: "STEADY-" in light gray
- [ ] Auto-prefix: typing "7X2K" formats to "STEADY-7X2K"
- [ ] Auto-uppercase input
- [ ] Change title to "Join Steady"
- [ ] Call POST /api/auth/register-with-invite instead of /api/auth/register
- [ ] Error handling per UX spec (alert banners, field highlighting)
- [ ] Commit: "feat(mobile): add invite code to signup screen"

## Compliance Checklist

- [ ] **COND-1**: Email service behind `ENABLE_INVITE_EMAIL` env var (Task 4)
- [ ] **COND-2**: PatientInvitation name/email in ENCRYPTED_FIELDS (Task 2)
- [ ] **COND-3**: Hardcoded email template in services/email.ts (Task 4)
- [ ] **COND-4**: Audit trail via existing Prisma middleware — automatic (Task 1, verified in Task 7)
- [ ] **COND-5**: PII scrub worker for unredeemed invites > 90 days (Task 9)
- [ ] **COND-6**: Invite codes never logged at INFO level (Tasks 4, 6, 7, 8, 9)
