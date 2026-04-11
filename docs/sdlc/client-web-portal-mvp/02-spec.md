# Client Web Portal MVP — Feature Specification

## Overview

Build a dedicated client web portal at `portal.steadymentalhealth.com` where clinician clients log in, view their calendar of appointments, and join telehealth sessions. As part of this feature, replace the existing code-based `PatientInvitation` system entirely with a new opaque-token invitation system, delete the mobile register screen (mobile becomes login-only), and integrate real Amazon SES email delivery with bounce/complaint handling. Single unified invitation path, subdomain-scoped auth for HIPAA tenant isolation.

**Load-bearing assumption verified by user:** This system is not yet live with real clients. Deletion (rather than migration) of legacy invitation and mobile onboarding code is explicitly permitted. **Pre-implementation gate (NFR-5.4) requires an empirical SQL confirmation against production RDS before any deletions land.**

## State Machine — PortalInvitation

```
PENDING ──(worker sends)──▶ SENT ──(redeem)──▶ ACCEPTED (terminal)
   │                         │
   │                         ├──(SNS bounce)──▶ BOUNCED (terminal)
   │                         │
   │                         ├──(SNS complaint)──▶ COMPLAINED (terminal)
   │                         │
   │                         ├──(SES send fails)──▶ SEND_FAILED ──(pg-boss retry)──▶ PENDING
   │                         │
   │                         └──(TTL elapses)──▶ EXPIRED ──(clinician renew)──▶ PENDING (new token)
   │
   ├──(clinician revoke)──▶ REVOKED (terminal)
   └──(TTL elapses)──▶ EXPIRED ──(clinician renew)──▶ PENDING (new token)
```

All terminal states are soft-deleted and preserved for audit per CLAUDE.md.

---

## Functional Requirements

### FR-1: Clinician creates a portal invitation

A clinician initiates a portal invitation for a client from the client detail page, either by selecting an existing `ClinicianClient` or typing a new email that creates a stub `ClinicianClient` on the spot.

**Acceptance Criteria:**

- **AC-1.1** GIVEN an authenticated clinician on a client detail page for an existing `ClinicianClient` with NO prior `PENDING` or `SENT` PortalInvitation — WHEN they click "Invite to portal" — THEN the system creates a new PortalInvitation row with a 48-byte URL-safe opaque token (SHA-256 hashed at rest), `recipientEmail` bound and encrypted-at-rest + SHA-256 hashed for lookup, `status=PENDING`, `expiresAt = now + 7 days`, `sendCount = 0`, `clinicianId` set — AND enqueues a `send-portal-invite-email` pg-boss job.

- **AC-1.2** GIVEN an authenticated clinician WHEN they click "Invite new client" with first name + last name + email NOT matching any existing User — THEN the system creates a new User row (`role=PARTICIPANT`, `passwordHash=NULL`, `cognitoId=NULL`, `emailVerified=false`), a new ParticipantProfile, a new ClinicianClient (`status=INVITED`, `clientId` pointing to the stub User), and a PortalInvitation bound to that email, all in one transaction — AND enqueues the email job.

- **AC-1.3** GIVEN an authenticated clinician WHEN they invite an email that matches an existing User (any role) — THEN the system creates a new ClinicianClient linking that User to this clinician (`status=INVITED`) AND creates a PortalInvitation with `existingUser=true` — AND the email body uses the existing-user template variant ("Dr. [LastName] has added you to their practice on STEADY. Click here to accept.").

- **AC-1.4** GIVEN a clinician WHEN they attempt to invite an email that already has a `PENDING` or `SENT` PortalInvitation from the same clinician — THEN the system returns `409 Conflict` with message "An active invitation already exists for this email. Resend or revoke the existing invitation first."

- **AC-1.5** GIVEN two different clinicians WHEN they invite the same email simultaneously — THEN both PortalInvitation rows are created successfully (clients can have multiple clinicians) — AND the DB unique index is `(clinicianId, recipientEmailHash, status WHERE status IN ('PENDING','SENT'))`.

- **AC-1.6** GIVEN a clinician WHEN they invite an email that is present in the `EmailSuppression` table — THEN the system returns `409 Conflict` with message "This email cannot receive invitations. Please verify the address with the client."

- **AC-1.7** GIVEN an authenticated non-clinician or unauthenticated request WHEN it hits the invite-create endpoint — THEN the system returns `401` or `403` per standard auth middleware.

- **AC-1.8** GIVEN a successful invitation creation WHEN the response returns — THEN the response body contains invitation id, status, expiresAt, sendCount, recipientEmail (decrypted), but NEVER contains the raw token — AND an AuditLog entry is written with `action=CREATE, resourceType=PortalInvitation, resourceId={invitation.id}`.

- **AC-1.9** GIVEN the existing `ClinicianClient.clientId` column is NOT NULL — WHEN the stub User is created in AC-1.2 — THEN the stub User row is a real User with `passwordHash=NULL` and `cognitoId=NULL`; no schema change is required.

---

### FR-2: SES email delivery with bounce/complaint handling

Portal invitation emails are delivered via Amazon SES. Bounces and complaints are processed via SNS webhooks and surface back to the clinician UI.

**Acceptance Criteria:**

- **AC-2.1** GIVEN a PortalInvitation row and a `send-portal-invite-email` pg-boss job — WHEN the worker runs — THEN it decrypts `recipientEmail`, constructs the email body from a hardcoded PHI-free template with the signup URL `https://portal.steadymentalhealth.com/signup?t={plaintextToken}` (plaintext token is passed into the worker in-process; never persisted), calls SES `SendEmail`, and on 2xx updates the invitation: `status=SENT`, `sendCount += 1`, `lastSentAt = now`.

- **AC-2.2** GIVEN an SES `SendEmail` failure — WHEN the worker exhausts pg-boss retries (default: 5 attempts with exponential backoff, architect may tune) — THEN the invitation is set `status=SEND_FAILED` and surfaced in the clinician UI with a "Retry" action that enqueues a new job.

- **AC-2.3** GIVEN an SES bounce event posted to the SNS bounce topic — WHEN the API receives the SNS webhook at `POST /api/internal/ses-bounce` — THEN the handler verifies the SNS signature (returning `403` on invalid) — AND looks up the invitation by the bounced email hash — AND marks `status=BOUNCED`, `bounceType={hard|soft}`, `bouncedAt=now` — AND inserts/updates the email in `EmailSuppression` with `reason=BOUNCE` (idempotent).

- **AC-2.4** GIVEN an SES complaint event on the complaint SNS topic — WHEN the handler receives it — THEN it verifies signature, marks the invitation `status=COMPLAINED`, and adds the email to `EmailSuppression` with `reason=COMPLAINT`.

- **AC-2.5** GIVEN an SNS bounce or complaint event arriving on an already-`ACCEPTED` invitation — WHEN the handler processes it — THEN the invitation status is NOT changed — AND the email IS still added to `EmailSuppression`.

- **AC-2.6** GIVEN the PHI-free template — WHEN rendered — THEN the email body contains: generic greeting, signup URL, a short explanation of STEADY, a contact-support line. The body contains ZERO PHI: no clinician name (except the existing-user variant which includes last name only), no client name, no session times, no practice name, no diagnosis codes. Subject line is static. Exact copy is authored in the UX phase; the spec asserts presence via `data-testid='invitation-email-body'` and a compliance test that fails on a denylist of tokens (first name, DOB, diagnosis code patterns).

- **AC-2.7** GIVEN any log message related to invitation email delivery — WHEN it is logged — THEN the log never contains the token, the recipient email, the recipient name, or any PHI — only the invitation ID and operation name (per CLAUDE.md). A unit test scans `logger.*` calls in the new worker and service code for forbidden variable references.

- **AC-2.8** GIVEN the current `services/email.ts` stub — WHEN this feature ships — THEN an audit of all callers is performed and documented, and either: (a) the SES implementation preserves the existing `sendEmail(to, subject, body)` interface, or (b) all callers are updated. The PR description lists every callsite and its disposition.

---

### FR-3: Client redeems portal invitation

A client clicks the invitation email link, lands on the signup page, enters their email (binding check), sets a password, and is logged into the portal.

**Acceptance Criteria:**

- **AC-3.1** GIVEN a client clicking `https://portal.steadymentalhealth.com/signup?t={plaintextToken}` where the token is valid (status `PENDING` or `SENT`, not expired, not used) — WHEN they arrive — THEN the page renders a signup form with: email field (empty, must be entered by the client), first name (pre-filled from invitation's stub User if present), last name (same), password, confirm password — AND the token travels as a hidden `<input type=hidden name=t>`, never to localStorage/sessionStorage — AND the token value is NEVER rendered visibly.

- **AC-3.2** GIVEN the signup form — WHEN the client submits with email that matches the token's bound email (canonicalized: lowercase + trim) AND password matches confirm password AND password meets Cognito pool policy — THEN the system:
  1. `BEGIN TRANSACTION`
  2. `SELECT ... FROM PortalInvitation WHERE id = ? FOR UPDATE`
  3. Re-verify status ∈ {`PENDING`, `SENT`} AND not expired AND `recipientEmailHash` matches
  4. If any re-check fails, abort with `409` and a specific error code
  5. Create or update the Cognito user (via existing helper). If Cognito user already exists (returns `UsernameExistsException`), treat as resume: fetch Cognito sub and continue (idempotent path)
  6. Promote the stub User: set `cognitoId`, `firstName`, `lastName`, `emailVerified=true`
  7. Update ClinicianClient `status=ACTIVE`, `acceptedAt=now`
  8. Update PortalInvitation `status=ACCEPTED`, `acceptedAt=now`, `acceptedByUserId={user.id}`, burn token (`tokenHash` cleared or a `tokenBurnedAt` timestamp set — architect chooses)
  9. `COMMIT`
  10. Call Cognito login to get real tokens; set auth cookies scoped per architect's mechanism (see NFR-2.2)
  11. Write AuditLog entries for User create/update and PortalInvitation update
  12. Redirect to `/portal/calendar` OR to the value of the `redirect` query param if it is a same-origin `/portal/` path (open-redirect guard)

- **AC-3.3** GIVEN the redeem transaction commits but the browser dies before the client sees the response — WHEN the client retries with the same token URL — THEN AC-3.2 step 5 (Cognito exists) and step 2-4 (invitation already ACCEPTED) combine to produce a friendly outcome: if the ACCEPTED invitation's `acceptedByUserId` matches the logged-in user via session re-auth, redirect to `/portal/calendar`; otherwise display "This invitation has already been used. Please sign in." with a link to `/portal/login`.

- **AC-3.4** GIVEN an invitation with `existingUser=true` — WHEN the client clicks the link — THEN instead of a signup form, the page displays "You already have an account. Please sign in to accept this invitation." with a Sign In button — AND clicking Sign In navigates to `/portal/login` with the token preserved in a signed, short-lived cookie scoped to `/portal/login` — AND after successful login, the server automatically accepts the pending invitation (ClinicianClient `status=ACTIVE`, PortalInvitation `status=ACCEPTED`) in a single transaction — AND if the existing Cognito user is in a state other than `CONFIRMED`, displays "Your account needs to be set up. Please contact your clinician." (403).

- **AC-3.5** GIVEN an expired token (> 7 days past `expiresAt`) — WHEN the client clicks the link — THEN the page displays "This invitation has expired. Please contact your clinician for a new one." (test hook: `data-testid='invitation-expired-error'`) — AND no Cognito user is created.

- **AC-3.6** GIVEN an already-used token (`status=ACCEPTED` or `tokenBurnedAt` set) — WHEN the client clicks the link — THEN the page displays "This invitation has already been used. If this is your account, please sign in." with a link to `/portal/login` (test hook: `data-testid='invitation-used-error'`).

- **AC-3.7** GIVEN a revoked token (`status=REVOKED`) — WHEN the client clicks the link — THEN the page displays "This invitation is no longer valid. Please contact your clinician." (test hook: `data-testid='invitation-revoked-error'`).

- **AC-3.8** GIVEN the signup form — WHEN the client submits an email that does NOT match the token's bound email (after canonicalization) — THEN the server returns a generic error "The email you entered doesn't match the invitation. Please check and try again." — AND does NOT reveal the correct email — AND the token is NOT burned.

- **AC-3.9** GIVEN the signup form — WHEN the client submits a password failing Cognito policy — THEN the page displays the specific Cognito error message — AND the token is NOT burned.

- **AC-3.10** GIVEN the clinician associated with the invitation is suspended/deactivated (`User.deletedAt IS NOT NULL` or `role != CLINICIAN`) between invite creation and redemption — WHEN the client attempts to redeem — THEN the server returns `410 Gone` with "This invitation is no longer valid."

- **AC-3.11** GIVEN a redeem request — WHEN the IP (resolved via `X-Forwarded-For` first hop after CloudFront) has made more than 10 redeem attempts in the last hour — THEN the system returns `429 Too Many Requests`.

- **AC-3.12** GIVEN a successful redeem — WHEN the flow completes — THEN two AuditLog entries exist: one with `action=UPDATE, resourceType=User` for the promotion, one with `action=UPDATE, resourceType=PortalInvitation, metadata.changedFields=["status","acceptedAt","tokenBurnedAt"]`.

---

### FR-4: Client logs in to the portal

**Acceptance Criteria:**

- **AC-4.1** GIVEN a client at `portal.steadymentalhealth.com/login` — WHEN they submit valid email + password — THEN the system authenticates via the existing Cognito-backed `/api/auth/login` flow — AND verifies `user.role = PARTICIPANT` — AND sets auth cookies per NFR-2.2 — AND redirects to the `redirect` query param (if same-origin `/portal/*`) or `/portal/calendar`.

- **AC-4.2** GIVEN a CLINICIAN user on the portal login page — WHEN they submit valid credentials — THEN login is rejected with "This login is for clients only. Please use the clinician app at steadymentalhealth.com." (test hook: `data-testid='portal-wrong-role-error'`) — AND no portal cookies are set — AND an AuditLog entry is written.

- **AC-4.3** GIVEN an ADMIN user on the portal login page — WHEN they submit valid credentials — THEN login is rejected with the same wrong-role message as AC-4.2 — AND they are NOT redirected anywhere (they can navigate to the admin surface manually).

- **AC-4.4** GIVEN the portal login — WHEN email or password is invalid — THEN the page displays "Invalid email or password" (no enumeration between user-not-found and wrong-password).

- **AC-4.5** GIVEN 5 failed login attempts within 15 minutes from the same email — WHEN a 6th attempt occurs — THEN the system returns `429` with "Too many login attempts. Please try again in 15 minutes."

- **AC-4.6** GIVEN a Cognito account in state ≠ `CONFIRMED` — WHEN the client attempts to log in — THEN `403` with "Your account needs to be set up. Please contact your clinician."

- **AC-4.7** GIVEN a successful login — WHEN the response returns — THEN an AuditLog entry is written with `action=LOGIN, resourceType=User` AND `User.lastLoginAt` (or ParticipantProfile — architect chooses) is updated.

---

### FR-5: Client forgot / reset password

**Acceptance Criteria:**

- **AC-5.1** GIVEN a client at `portal.steadymentalhealth.com/forgot-password` — WHEN they submit an email — THEN the client calls the existing `/api/auth/forgot-password` endpoint — AND the page displays "If an account exists with that email, we've sent a reset code. Check your email." regardless of whether the email exists (no enumeration).

- **AC-5.2** GIVEN the Cognito pool is configured to send password reset emails — WHEN `ForgotPasswordCommand` fires — THEN the reset email is delivered via SES (verified by compliance) with a From header of `no-reply@portal.steadymentalhealth.com` (or the SES-verified equivalent, architect confirms SPF/DKIM alignment).

- **AC-5.3** GIVEN a client at `/reset-password` — WHEN they submit email + code + new password — THEN the client calls `/api/auth/confirm-reset-password` and on success displays "Password reset. Please sign in." with a link to `/portal/login`.

- **AC-5.4** GIVEN an invalid or expired reset code — WHEN submitted — THEN the page displays the specific Cognito error message.

- **AC-5.5** GIVEN a successful password reset — WHEN confirmed — THEN an AuditLog entry is written AND Cognito `GlobalSignOut` is called on that user to invalidate all sessions.

- **AC-5.6** GIVEN 5 forgot or reset requests from the same IP in 15 minutes — WHEN a 6th occurs — THEN `429 Too Many Requests`.

---

### FR-6: Client portal calendar view

**Acceptance Criteria:**

- **AC-6.1** GIVEN an authenticated participant at `/portal/calendar` — WHEN the page loads — THEN the client calls a new endpoint extending `routes/participant-portal.ts`: `GET /api/participant-portal/appointments?from={iso}&to={iso}&cursor={id}&limit={n}` — AND the endpoint returns appointments WHERE `participantId = req.user.participantProfileId` AND `deletedAt IS NULL` AND `status IN ('SCHEDULED','ATTENDED','CLIENT_CANCELED','CLINICIAN_CANCELED','LATE_CANCELED')` AND `startTime BETWEEN (now - 30 days) AND (now + 90 days)` — AND the endpoint applies cursor pagination capped at 100 rows per CLAUDE.md convention.

- **AC-6.2** GIVEN the calendar renders — WHEN displayed — THEN the default view is week, starting on today's week, with a view switcher supporting day/week/month. The selected view persists to `localStorage` or a URL query param (architect decides).

- **AC-6.3** GIVEN the calendar is displayed — WHEN the client navigates — THEN they can move up to 90 days forward from today and 30 days backward. Beyond those bounds, nav controls are disabled with no error.

- **AC-6.4** GIVEN a participant with appointments from multiple clinicians (same or different practices) — WHEN the calendar loads — THEN ALL their appointments are merged into one view — AND each card displays the clinician's first + last name prominently (e.g., "Dr. Jane Smith") — AND no practice-scoped filtering is applied.

- **AC-6.5** GIVEN appointment status visual treatments:
  - `SCHEDULED` — default/primary color, Join button subject to FR-7
  - `ATTENDED` — muted past-color with "Attended" label, no Join
  - `CLIENT_CANCELED` / `CLINICIAN_CANCELED` / `LATE_CANCELED` — strikethrough or muted-red with labels "You canceled" / "Clinician canceled" / "Late cancel" + `cancelReason` if present, no Join
  - `NO_SHOW` — EXCLUDED from the response, never rendered

- **AC-6.6** GIVEN a participant with zero appointments in the visible range — WHEN the calendar loads — THEN the calendar displays an empty state: "No appointments scheduled. Your clinician will let you know when your next session is booked." (test hook: `data-testid='calendar-empty-state'`).

- **AC-6.7** GIVEN a participant without a stored `timezone` on their ParticipantProfile — WHEN they first load the calendar — THEN the client-side JS detects timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone` and sends it via `PATCH /api/participant-portal/profile { timezone }` — AND the calendar renders in the detected timezone immediately.

- **AC-6.8** GIVEN the participant's stored timezone differs from the currently-detected one — WHEN the page loads — THEN a one-time toast displays "Showing times in [newZone]. Update your profile?" with an Update button that PATCHes the profile.

- **AC-6.9** GIVEN a participant whose clinician is in a different timezone — WHEN the participant hovers (or focuses) an appointment card — THEN a tooltip/popover displays "3:00 PM your time / 12:00 PM clinician's time". The popover is keyboard-accessible and screen-reader friendly (aria-describedby, not hover-only).

- **AC-6.10** GIVEN the calendar grid — WHEN rendered — THEN axe-core reports zero violations; appointment cards have `role=button`, `aria-label='{type} with {clinician} on {date} at {time}'`; Join button announces disabled state via `aria-disabled` + text (no hover-only tooltips).

- **AC-6.11** GIVEN an unauthenticated user — WHEN they hit `/portal/calendar` — THEN they are redirected to `/portal/login?redirect=/portal/calendar`.

---

### FR-7: Client joins telehealth session

**Acceptance Criteria:**

- **AC-7.1** GIVEN an appointment with `status=SCHEDULED` AND `(startTime - now) ≤ 15 minutes` AND `now ≤ endTime` — WHEN the calendar renders the card — THEN the Join button is enabled. Outside those bounds, Join is disabled (visually greyed, `aria-disabled=true`, `aria-describedby` hint "You can join 15 minutes before your session starts" or "This session has ended").

- **AC-7.2** GIVEN a shared `isAppointmentJoinable(appointment, now)` pure function — WHEN the clinician and participant calendars both render — THEN both use the SAME function (exported from `@steady/shared` or a well-known location). A unit test asserts both sides import from the same module.

- **AC-7.3** GIVEN the client clicks Join — WHEN the click fires — THEN they navigate to `/portal/telehealth/[appointmentId]`.

- **AC-7.4** GIVEN `/portal/telehealth/[appointmentId]` loads — WHEN the page renders — THEN it calls `/api/telehealth/token` with the authenticated participant JWT — AND the token endpoint verifies `appointment.participantId = req.user.participantProfileId` (returns `403` on mismatch) — AND re-verifies `appointment.status = SCHEDULED` (returns `409 SessionUnavailable` with message "This session is no longer available" on any canceled state) — AND issues a LiveKit token with PARTICIPANT-scoped grants: `canPublish=true, canSubscribe=true, canPublishData=true, canUpdateOwnMetadata=true`, NO recording control, NO room admin, NO end-for-all.

- **AC-7.5** GIVEN the calendar is open — WHEN more than 60 seconds elapse — THEN the calendar polls the appointments endpoint to detect cancellations, and if a currently-visible appointment has been canceled, the UI updates immediately.

- **AC-7.6** GIVEN the participant telehealth view — WHEN rendered — THEN it shows: LiveKit video room, mute/unmute toggle, camera on/off toggle, connection status, Leave button — AND it does NOT show: transcript, AI session summary, session prep notes, recording controls, end-session-for-all control, clinician-only controls. It is a new component, not a refactor of the clinician telehealth page.

- **AC-7.7** GIVEN the clinician initiates recording via their side — WHEN the LiveKit data channel delivers the consent request to the participant — THEN the participant sees a modal "Your clinician would like to record this session. Do you consent?" with Accept/Decline buttons — AND the response is persisted server-side via the existing recording-control service — AND if the participant joins AFTER recording is already active, the modal displays on `room.connected`.

- **AC-7.8** GIVEN the participant declines recording — WHEN the Decline handler fires — THEN the clinician-side control reflects the denial and stops recording via the existing recording-control backend.

- **AC-7.9** GIVEN the participant clicks "Leave session" — WHEN LiveKit disconnect fires — THEN the participant is navigated to `/portal/calendar` and the LiveKit room remains open server-side.

- **AC-7.10** GIVEN the participant is in an active telehealth session — WHEN the idle timer would otherwise fire — THEN it is paused from `room.connected` until 60 seconds after `room.disconnected`. Merely opening `/portal/telehealth/[id]` without successfully joining does NOT pause the timer.

---

### FR-8: Client logs out + idle timeout

**Acceptance Criteria:**

- **AC-8.1** GIVEN an authenticated client anywhere in the portal — WHEN they click "Sign out" in the header — THEN the client calls `POST /api/auth/logout` — AND the server calls Cognito `GlobalSignOut` — AND clears all portal-scoped cookies — AND the client is redirected to `/portal/login?signedOut=1` with a flash message "You've been signed out."

- **AC-8.2** GIVEN an authenticated client — WHEN 30 minutes pass with no keyboard, mouse, or touch events AND they are NOT in an active LiveKit session (per AC-7.10) — THEN the idle timer fires, calls `/api/auth/logout`, and redirects to `/portal/login?idle=1` with message "You've been signed out due to inactivity."

- **AC-8.3** The idle timer is a client-side activity detector distinct from the access-token TTL. The access token expiry and silent refresh continue to work independently. An auth-refresh that succeeds does NOT reset the idle timer.

---

### FR-9: Cross-role authorization guard

**Acceptance Criteria:**

- **AC-9.1** GIVEN an authenticated CLINICIAN — WHEN they navigate to any `portal.steadymentalhealth.com/*` route — THEN Next.js middleware/layout detects the role mismatch (via the mechanism chosen by the architect per NFR-2.2) and redirects to `https://steadymentalhealth.com/`.

- **AC-9.2** GIVEN an authenticated PARTICIPANT — WHEN they navigate to any clinician-surface route on `steadymentalhealth.com/` — THEN middleware/layout detects the mismatch and redirects to `https://portal.steadymentalhealth.com/calendar`.

- **AC-9.3** GIVEN an authenticated ADMIN — WHEN they hit a portal route — THEN they are redirected to the admin surface (wherever ADMIN lives; no portal access granted). ADMIN cannot redeem PortalInvitations (`role != PARTICIPANT` returns `403` in the redeem handler).

- **AC-9.4** GIVEN a PARTICIPANT JWT — WHEN it calls any clinician-scoped API endpoint — THEN `requireRole("CLINICIAN")` returns `403`.

- **AC-9.5** GIVEN a CLINICIAN JWT — WHEN it calls `/api/participant-portal/*` or `/api/participant/*` — THEN `requireRole("PARTICIPANT")` returns `403`.

- **AC-9.6** GIVEN an unauthenticated user on a protected portal route — WHEN they navigate — THEN they are redirected to `/portal/login?redirect={originalPath}`, with an open-redirect guard: the `redirect` value MUST begin with `/portal/` and MUST NOT contain `://` or CR/LF.

- **AC-9.7** The role-check mechanism (whatever the architect chooses) is a UI-routing convenience ONLY. Every sensitive API endpoint re-verifies the role server-side from the Cognito-verified user record in the DB. A forged or manipulated role hint cookie cannot grant access to any PHI.

- **AC-9.8** GIVEN a legacy orphan PARTICIPANT User (exists from a prior test, no ClinicianClient relationships) — WHEN they log in to the portal — THEN they are allowed in (no per-user `portalAccessEnabled` flag in v1). Their calendar is empty, they have no clinicians to join with, and they cannot reach any telehealth page (no appointments).

---

### FR-10: Clinician manages sent invitations

**Acceptance Criteria:**

- **AC-10.1** GIVEN a clinician on a client detail page — WHEN the page loads — THEN any PortalInvitation for that client is displayed showing: status (PENDING / SENT / ACCEPTED / BOUNCED / COMPLAINED / SEND_FAILED / EXPIRED / REVOKED), createdAt, lastSentAt, sendCount, expiresAt. The raw token is NEVER displayed or returned by any API.

- **AC-10.2** GIVEN a PENDING or SENT invitation — WHEN the clinician clicks "Resend" — THEN: (a) if `lastSentAt` is within the last 5 minutes, the button is disabled with tooltip "Please wait 5 minutes between resends"; (b) if `sendCount >= 5`, the button is disabled with tooltip "Maximum resends reached. Revoke and create a new invitation."; (c) otherwise, the system enqueues a new `send-portal-invite-email` job REUSING the same token — AND on pg-boss worker success, updates `lastSentAt=now`, `sendCount += 1`. Automated pg-boss retries within a single send attempt do NOT increment `sendCount`.

- **AC-10.3** GIVEN an EXPIRED invitation — WHEN the clinician clicks "Renew" — THEN the system generates a NEW 48-byte token, updates the row: `status=PENDING`, new `tokenHash`, `expiresAt = now + 7 days`, `sendCount = 0`, `lastSentAt = null` — AND enqueues a new send job — AND the old token URL is permanently invalid (old hash overwritten).

- **AC-10.4** GIVEN a BOUNCED or COMPLAINED invitation — WHEN the clinician views the card — THEN a banner displays "Delivery failed — the email address may be incorrect. Verify with the client." — AND Resend is disabled (the email is in `EmailSuppression`) — AND Renew returns `422` with explanation that the email must be corrected first (which is a new-client-record flow, not a renew flow) — AND Revoke is still available.

- **AC-10.5** GIVEN a PENDING or SENT invitation — WHEN the clinician clicks "Revoke" — THEN the system marks `status=REVOKED`, `revokedAt=now`, soft-deletes per CLAUDE.md — AND the token URL immediately returns the "invitation no longer valid" error (AC-3.7) — AND an AuditLog entry is written.

- **AC-10.6** GIVEN a race between clinician revoke and client redeem — WHEN the client submits the signup form while the revoke transaction is in flight — THEN the redeem transaction's `SELECT ... FOR UPDATE` + status re-check (AC-3.2 step 3) catches the REVOKED state and returns `409 InvitationRevoked`. The client sees the revoked error page and is NOT logged in.

- **AC-10.7** GIVEN a clinician attempting to resend/revoke/renew an invitation from another clinician — WHEN the API receives the request — THEN it returns `404 Not Found` (not 403) to prevent enumeration. This policy applies to all PortalInvitation endpoints.

- **AC-10.8** Every action in FR-10 writes an AuditLog entry.

---

### FR-11: Mobile register deletion + mobile is login-only

**Acceptance Criteria:**

- **AC-11.1** GIVEN the mobile app codebase — WHEN this feature ships — THEN the following are deleted: `apps/mobile/app/(auth)/register.tsx`, the `register()` function in `apps/mobile/lib/auth-context.tsx`, the `register()` API client in `apps/mobile/lib/api.ts`, and the "Sign up" link on the mobile login screen.

- **AC-11.2** GIVEN the mobile app build — WHEN run — THEN it passes with no unreferenced symbols or dead imports.

- **AC-11.3** GIVEN the mobile login screen — WHEN a user submits valid credentials for an existing Cognito PARTICIPANT account — THEN login succeeds and the user enters the app (behavior unchanged).

- **AC-11.4** GIVEN a client who signed up via the web portal — WHEN they install the mobile app and log in with those credentials — THEN login succeeds and they see their existing profile.

- **AC-11.5** GIVEN a codebase-wide grep of `apps/mobile/**` — WHEN searching for `INVITE_PREFIX`, `STEADY-`, `inviteCode`, `register-with-invite` — THEN all matches return zero results.

---

### FR-12: Deletion of old code-based invitation system

**Acceptance Criteria:**

- **AC-12.1** GIVEN the API codebase — WHEN this feature ships — THEN the following files are deleted:
  - `packages/api/src/services/invitations.ts`
  - `packages/api/src/routes/invitations.ts`
  - `packages/api/src/workers/invite-email.ts`
  - `packages/api/src/workers/scrub-expired-invites.ts`
  - `packages/api/src/__tests__/invitations.test.ts`
  - `packages/api/src/__tests__/auth-invite.test.ts`

- **AC-12.2** GIVEN `routes/auth.ts` — WHEN the feature ships — THEN the `/api/auth/register-with-invite` endpoint is deleted. Any test referencing it is deleted or rewritten against the new token redeem endpoint.

- **AC-12.3** GIVEN the Prisma schema — WHEN the migration runs — THEN it drops the `PatientInvitation` table, creates a new `PortalInvitation` table, and creates a new `EmailSuppression` table. No data is migrated. The migration includes a `RAISE NOTICE` (or equivalent) that will fail the deploy if `PatientInvitation` has any rows at run time — enforcing the "not live" precondition.

- **AC-12.4** GIVEN a codebase-wide grep across `packages/api/src`, `apps/web/src`, and `apps/mobile` — WHEN searching for `PatientInvitation`, `generateInviteCode`, `hashEmail` from the old invitations service — THEN all matches return zero results.

- **AC-12.5** GIVEN `CLAUDE.md` — WHEN this feature ships — THEN the Authentication & Authorization section is updated to correctly describe the Cognito-based flow (currently describes the legacy `JWT_SECRET` + `RefreshToken` table fallback). All mentions of STEADY-XXXX codes are removed. This is a documentation correction; the code has already been Cognito-backed in production.

- **AC-12.6** GIVEN `services/email.ts` — WHEN this feature ships — THEN the stub with its SendGrid TODO is replaced with the real SES implementation. Every caller of the current `sendEmail(to, subject, body)` (if the interface exists) is audited and either preserved or migrated, with the list of callers in the PR description.

- **AC-12.7** GIVEN the web app at `apps/web/src/app/register/*` — WHEN this feature ships — THEN the web clinician registration route is RETAINED unchanged. It is not part of the portal surface; it serves clinician self-signup and is not touched.

- **AC-12.8** GIVEN `/portal/404` and `/portal/error` routes — WHEN deployed — THEN they render portal-branded error pages that do not leak stack traces or PHI.

---

## Non-Functional Requirements

### NFR-1: Performance

- **NFR-1.1** `/portal/login`, `/portal/signup`, `/portal/forgot-password` — server-rendered in ≤ 500ms p95 at the Amplify edge.
- **NFR-1.2** `/portal/calendar` initial load including appointment fetch — ≤ 1.5s p95 for a participant with ≤ 100 appointments.
- **NFR-1.3** `GET /api/participant-portal/appointments` — ≤ 300ms p95 under 1000 concurrent clients on production RDS.
- **NFR-1.4** LiveKit token issuance — ≤ 400ms p95 (parity with existing clinician side).
- **NFR-1.5** Invite email delivery (pg-boss job pickup → SES `SendEmail` 200 response) — ≤ 60 seconds p95.
- **NFR-1.6** The appointment query MUST use existing or new indexes on `Appointment.participantId`, `Appointment.startTime`, `Appointment.deletedAt`. The Prisma migration adds any missing indexes.

### NFR-2: Security

- **NFR-2.1** Auth cookies are `httpOnly`, `secure` in production. `sameSite` setting decided by architect based on cookie scoping choice.
- **NFR-2.2** **Cookie scoping principle (load-bearing):** Auth cookies MUST NOT be settable with a shared parent-domain scope (`Domain=.steadymentalhealth.com`) because it would defeat the HIPAA tenant isolation that is the primary justification for the subdomain split. The architect picks ONE of: (a) portal Next.js server actions proxy to the API (cookies live on `portal.steadymentalhealth.com` only); (b) deploy the API on a portal-scoped hostname for portal routes (`api.portal.steadymentalhealth.com`) so cookies are isolated; (c) Same-origin cookies with explicit per-subdomain scoping via distinct cookie names. Whichever is chosen MUST prevent a clinician-app XSS from stealing portal cookies and vice versa. This decision is the #1 architectural decision for this feature.
- **NFR-2.3** PortalInvitation tokens are 48 bytes from `crypto.randomBytes()`, base64url encoded (384 bits of entropy).
- **NFR-2.4** Raw tokens are stored ONLY as SHA-256 hashes. Plaintext exists only in the email body, briefly in-process during the worker, and in the client's URL.
- **NFR-2.5** Tokens are bound to the recipient email. Binding is verified on redemption by comparing `sha256(canonical(enteredEmail))` with the stored `recipientEmailHash`.
- **NFR-2.6** Tokens burn on successful consumption and cannot be reused.
- **NFR-2.7** Email canonicalization is consistent everywhere: `.toLowerCase().trim()`, applied at the Zod validation boundary. Cognito usernames and email hashes use the same canonical form.
- **NFR-2.8** Rate limits:
  - `POST /api/portal-invitations` — 20/hour per clinician
  - Token redeem endpoint — 10/hour per client IP (first hop after CloudFront)
  - Portal login — 5/15min per email
  - Forgot/reset password — 5/15min per IP
  - Resend — 5-minute cooldown per invitation, max 5 clinician-initiated sends per invitation
  - Rate-limit storage is backed by the DB or Redis, NOT in-memory (per CLAUDE.md stateless rule). pg-boss-backed counters are acceptable.
- **NFR-2.9** NO PHI in logs. A unit test scans all `logger.*` calls in new portal code and fails on references to variables named `email`, `firstName`, `lastName`, `dob`, `diagnosis`, `notes`, `token`, `plaintextToken`.
- **NFR-2.10** SNS webhook handlers verify SNS message signatures; invalid signatures return `403`.
- **NFR-2.11** CSP header on portal responses: `default-src 'self'; connect-src 'self' wss://live-kit.steadymentalhealth.com https://api.steadymentalhealth.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'`. Architect may tune specific src lists. HSTS: `max-age=31536000; includeSubDomains; preload`. `X-Frame-Options: DENY`. `Referrer-Policy: same-origin`.
- **NFR-2.12** Cross-role guard is enforced at BOTH middleware AND API layers. Middleware is UI routing; API is the security boundary.
- **NFR-2.13** Open-redirect guard on the `redirect` query param: MUST begin with `/portal/`, MUST NOT contain `://`, CR, or LF.
- **NFR-2.14** Cognito password policy is at least 8 characters with uppercase, lowercase, and a number. Architect verifies the pool configuration matches.
- **NFR-2.15** **Launch blocker — security review:** Before GA, a security review covering (a) redeem flow + email binding, (b) cross-role middleware, (c) SNS webhook signature verification, (d) cookie scoping, (e) open-redirect guards must be completed and signed off. A third-party pentest is recommended but not required.

### NFR-3: Accessibility

- **NFR-3.1** All portal pages meet WCAG 2.1 Level AA.
- **NFR-3.2** All interactive elements are keyboard-navigable in a logical tab order. Escape closes modals.
- **NFR-3.3** Form inputs have visible labels, not placeholder-only. Error messages are linked via `aria-describedby`.
- **NFR-3.4** Color contrast: 4.5:1 for normal text, 3:1 for large text and UI components.
- **NFR-3.5** The calendar grid is keyboard-navigable; axe-core reports zero violations.
- **NFR-3.6** Join button enabled/disabled state is announced with the reason (`aria-describedby` points to a visible helper text, NOT a hover-only tooltip).
- **NFR-3.7** Telehealth controls (mute, camera, leave) are keyboard-accessible and labeled.

### NFR-4: HIPAA Compliance

- **NFR-4.1** Every portal-relevant mutation emits an AuditLog entry. Cognito user creation and password reset (which happen outside Prisma) write AuditLog entries explicitly in the route handler, not through audit-middleware.
- **NFR-4.2** Session idle timeout is 30 minutes, paused during LiveKit-connected sessions per AC-7.10.
- **NFR-4.3** Invite emails contain ZERO PHI (validated via AC-2.6 compliance test).
- **NFR-4.4** Soft deletes applied to all new tables.
- **NFR-4.5** PHI fields encrypted at rest via existing `encryption-middleware`. `recipientEmail` on PortalInvitation is encrypted; `recipientEmailHash` is a deterministic SHA-256 for lookup.
- **NFR-4.6** Minimum-necessary: all participant-scoped queries use explicit Prisma `select` blocks. PR review enforces this.
- **NFR-4.7** The decision to retain a single Cognito user pool (with cross-role guard) instead of two pools is a documented risk acceptance. Compliance phase can escalate to require two pools; if so, that becomes a separate prerequisite feature.

### NFR-5: Reliability

- **NFR-5.1** pg-boss retry policy: 5 attempts, exponential backoff from 5s to 5min. On exhaustion, invitation is `SEND_FAILED` and surfaced to the clinician UI.
- **NFR-5.2** SNS handlers are idempotent. Receiving the same bounce/complaint notification twice does not create duplicate state.
- **NFR-5.3** CI deploy gate: before deploy, verify via `aws sesv2 get-account` that SES is in production mode. If sandbox, deploy fails with explicit error.
- **NFR-5.4** **Pre-implementation gate:** Before any deletions (FR-11, FR-12) land on `dev` or `main`, the following queries must be run against production RDS and return zero results: `SELECT COUNT(*) FROM "PatientInvitation" WHERE status IN ('PENDING','SENT')` and `SELECT COUNT(*) FROM "User" WHERE role='PARTICIPANT' AND "cognitoId" IS NOT NULL AND "createdAt" > NOW() - INTERVAL '90 days'`. A screenshot or log of the zero-result query is attached to the feature-ship PR.
- **NFR-5.5** The portal subdomain infrastructure (Route 53, ACM, Amplify host config, CloudFront cache policy with Host forwarding) is provisioned via infrastructure-as-code where possible, documented in a runbook otherwise.
- **NFR-5.6** pg-boss workers run in the existing `steady-api` PM2 process on production EC2. Worker restart is transparent via pg-boss job persistence.

### NFR-6: Observability

- **NFR-6.1** CloudWatch metrics: `portal_invitations_created`, `portal_invitations_sent`, `portal_invitations_accepted`, `portal_invitations_bounced`, `portal_invitations_complained`, `portal_logins_total`, `portal_login_failures_total`, `token_redeem_failures_by_reason`.
- **NFR-6.2** CloudWatch alarms (paging on-call where indicated):
  - Bounce rate > 5% rolling 24h → **page**
  - Complaint rate > 0.1% → **page**
  - SEND_FAILED count > 10/hr → warning
  - Redeem endpoint 5xx > 1% → **page**
- **NFR-6.3** All portal-relevant code uses `logger` from `packages/api/src/lib/logger.ts`, never `console.*`.

### NFR-7: Data Retention

- **NFR-7.1** PortalInvitation and EmailSuppression rows are retained indefinitely via soft-delete. DR/backup inherits from RDS PITR + snapshot policy; EmailSuppression is priority-1 for recovery (loss would re-enable sends to bounced addresses).
- **NFR-7.2** AuditLog follows the existing retention policy, unchanged.

### NFR-8: Browser / Runtime Support

- **NFR-8.1** Portal supports last 2 major versions of Chrome, Firefox, Safari, Edge Chromium; iOS Safari 16+; Android Chrome last 2 majors. IE11 NOT supported.
- **NFR-8.2** English only in v1. All user-facing strings live in a single strings file to enable future i18n without refactor.

---

## Scope

### In Scope (v1)

- New subdomain `portal.steadymentalhealth.com` on the existing Next.js app, host-based routing, Route 53 record, ACM certificate (new or wildcard reuse), Amplify host config update, CloudFront cache-policy update with Host-header forwarding.
- New Prisma tables: `PortalInvitation`, `EmailSuppression`.
- New API routes for portal invitation create/list/resend/revoke/renew (clinician auth).
- New API route for portal invitation redemption (unauthenticated + rate-limited), replacing `/api/auth/register-with-invite`.
- New API route extending `routes/participant-portal.ts`: `GET /api/participant-portal/appointments` and `PATCH /api/participant-portal/profile` (timezone update).
- New API routes for SNS webhooks: `POST /api/internal/ses-bounce`, `POST /api/internal/ses-complaint`.
- Real Amazon SES integration replacing `services/email.ts` stub; SES SendEmail, bounce/complaint handling, suppression list management.
- One hardcoded PHI-free invitation email template (two variants: new-user, existing-user). Exact copy authored in UX phase.
- Clinician-side UI: "Invite to portal" button + "Invite new client" flow on the clinicians client list, invitation status card with Resend/Revoke/Renew actions, bounce banner.
- Client-side portal pages: `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/calendar`, `/telehealth/[appointmentId]`, `/404`, `/error`.
- New participant-specific telehealth view (distinct from clinician view, shares LiveKit room primitive only).
- Cross-role middleware/layout guard on the portal subdomain (mechanism decided by architect per NFR-2.2).
- Deletion of the entire legacy code-based invitation system (FR-12) and mobile register (FR-11).
- Update of `CLAUDE.md` auth section to accurately describe Cognito.
- Client-side idle timer (30 min, paused during LiveKit sessions).
- Timezone detection and persistence on first calendar load.
- Shared `isAppointmentJoinable()` function used by both clinician and participant sides.
- Cross-role authorization tests.
- Full integration test of the invite → signup → login → calendar → join flow.
- Compliance test asserting email templates contain zero PHI from a denylist.
- Seed script creating a verified portal test user and a pre-accepted invitation for local dev.
- Pre-implementation SQL verification gate per NFR-5.4.
- Security review launch gate per NFR-2.15.

### Out of Scope (v1)

- Messaging, agreements, billing, homework, programs, journals, or any non-calendar client-side feature on web.
- Calendar editing by the client (view-only).
- Client self-registration without a clinician invite.
- SMS invitations.
- Email beyond the portal invitation (no reminders, no receipts, no notifications).
- White-label subdomains (`portal.{clinician}.com`).
- Mobile onboarding — permanently. No deep links, no universal links, no Expo linking.
- Two Cognito user pools — single pool retained, compliance may escalate.
- Clinician bulk invite (CSV).
- Clinician-customizable invite copy.
- Portal dashboard above the calendar (calendar IS the home).
- Client profile or settings page (timezone PATCH is infrastructure, not a profile UI).
- Client notification preferences page.
- Password change from within the portal (reset only).
- Viewing past transcripts, recordings, or AI summaries from the client side.
- Feature flag `ENABLE_PORTAL` — user confirmed not-live, branch-based development is sufficient.
- Data migration of existing PatientInvitation rows (none exist per assumption + NFR-5.4 gate).
- Client-side analytics (no Segment, no GA, no Mixpanel in v1).
- i18n beyond strings-file preparation.
- Third-party pentest (recommended but not required).
- Clinician web register route (`apps/web/src/app/register`) is RETAINED and untouched.

---

## Dependencies

**External:**
- Amazon SES (production mode, BAA, verified sending domain) — must be verified before engineering.
- Amazon SNS (bounce and complaint topics).
- AWS Cognito (existing pool, unchanged).
- AWS Amplify (updated host config).
- Route 53 (new CNAME/A record).
- ACM (new cert or wildcard reuse).
- LiveKit (unchanged).
- RDS PostgreSQL (two new tables via Prisma migration).

**Internal:**
- `@steady/db` — new Prisma models, migrations, index additions.
- `@steady/shared` — new Zod schemas for PortalInvitation, EmailSuppression, participant appointment list, profile timezone patch.
- `packages/api` — new routes/services/workers/tests.
- `apps/web` — new `/portal/*` route tree, middleware/layouts, components.
- `apps/mobile` — deletions only.
- pg-boss (existing) — new worker `send-portal-invite-email` + scrubber for expired portal invites.

---

## Assumptions

1. **System is NOT live with real clients.** Verified via NFR-5.4 gate before any deletion lands.
2. **AWS SES is in production mode with active BAA and verified sending domain.** Verified via NFR-5.3 deploy gate.
3. **Cognito is the production auth provider** (verified via code inspection in `routes/auth.ts` — `isCognitoEnabled()` guards the primary paths; the legacy JWT + bcrypt path is a dev-only fallback). CLAUDE.md documentation is stale and is corrected as part of FR-12.
4. **The clinician calendar grid components support a `readOnly` variant without a large rewrite.** Verified by a spike during architect phase; if not, scope includes a new dedicated participant calendar component.
5. **`routes/participant-portal.ts` has no mobile or web consumers that would break when extended.** Verified by architect grep before extension.
6. **Cognito User Pool password policy is at least 8 chars + uppercase + lowercase + number.** Verified by architect against actual pool settings.
7. **`audit-middleware` captures Prisma CREATE/UPDATE/DELETE automatically.** Explicitly does NOT cover Cognito operations — those are audit-logged manually in route handlers.
8. **No existing `EmailSuppression` table or equivalent.** Verified by architect.
9. **Cognito `ForgotPasswordCommand` delivers reset emails via SES (or is configurable to).** Architect verifies and configures if needed.
10. **CloudFront can forward the `Host` header to Amplify.** Architect verifies and configures custom cache policy if needed.
11. **Single Cognito pool is acceptable under HIPAA.** Compliance phase confirms or escalates.

---

## Glossary

- **PortalInvitation** — new DB model for a portal signup invitation. Bound to an email, 48-byte opaque token (SHA-256 hashed), 7-day TTL, single-use burn.
- **EmailSuppression** — new DB model tracking emails that cannot receive invitations due to bounce or complaint events.
- **Token binding** — cryptographic linkage between an invitation token and its recipient email. Redemption fails if the submitted email doesn't match.
- **Burn** — token invalidation upon first successful consumption.
- **Portal** — the client-facing web application at `portal.steadymentalhealth.com`. Distinct from the "clinician app" at `steadymentalhealth.com`.
- **Participant / Client** — used interchangeably. DB role is `PARTICIPANT`; UI language is "client."
- **Cross-role authorization guard** — middleware + API mechanism preventing clinicians from accessing portal routes and participants from accessing clinician routes.
- **Canonical email** — `email.toLowerCase().trim()`. Applied uniformly before hashing, Cognito username generation, or DB lookup.
- **Idle timer** — client-side inactivity detector, distinct from access-token expiry. Fires a logout after 30 minutes of no user input, paused during active LiveKit sessions.
- **Not-live gate (NFR-5.4)** — the pre-implementation SQL verification against production RDS confirming no pending invitations and no recent mobile participant registrations exist.

---

## Adversarial Review Summary

This spec was reviewed by a Spec Critic which found **23 critical, 35 major, 14 minor** issues in the first draft. Critical issues addressed in this revision:

1. **AppointmentStatus enum corrected** — FR-6 rewritten against real Prisma values (`SCHEDULED`, `ATTENDED`, `CLIENT_CANCELED`, `CLINICIAN_CANCELED`, `LATE_CANCELED`).
2. **Stub User decision pinned** — FR-1 AC-1.2 creates a real User row with null `cognitoId` and null `passwordHash`; no schema change to `ClinicianClient.clientId` NOT NULL constraint.
3. **Race conditions covered** — redeem SELECT FOR UPDATE + status re-check, Cognito user idempotency, double-click recovery, appointment-canceled-between-click-and-join polling.
4. **State machine documented** — transition table in the Overview.
5. **Cookie scoping principle pinned** — NFR-2.2 makes it load-bearing, mechanism deferred to architect.
6. **Rate limit storage** — non-in-memory per CLAUDE.md, IP keyed on `X-Forwarded-For` first hop.
7. **Pagination cap** reduced to 100 per CLAUDE.md convention.
8. **ADMIN role handling** specified (AC-4.3, AC-9.3).
9. **CSP and security headers** specified in NFR-2.11.
10. **Monitoring alarm thresholds** specified in NFR-6.2.
11. **"Not live" verification gate** added as NFR-5.4 with explicit SQL.
12. **services/email.ts caller audit** added as AC-2.8 and AC-12.6.
13. **Email templates** deferred to UX with test hooks + PHI denylist compliance test.
14. **ClinicianClientStatus transition** specified (INVITED → ACTIVE on redeem).
15. **/api/telehealth/token role grants** specified per AC-7.4.
16. **Idle timer semantics** specified in AC-7.10, AC-8.3.
17. **Error pages** added to scope.
18. **Web /register route** explicitly out-of-scope (untouched).
19. **Email normalization** canonicalized at Zod boundary (NFR-2.7).
20. **Cognito audit logging** called out in NFR-4.1.
21. **Security review launch gate** in NFR-2.15.
22. **Appointment re-verification on telehealth token request** (AC-7.4 with `409 SessionUnavailable`).
23. **Shared `isAppointmentJoinable()` function** enforced by test (AC-7.2).

Residual risks flagged to downstream phases:
- Cookie scoping mechanism (architect decides between three options in NFR-2.2).
- Calendar grid readOnly variant feasibility (architect spike).
- CloudFront Host header forwarding config (architect infra task).
- Single Cognito pool HIPAA acceptability (compliance decides).
- Token storage field naming / exact hash column layout (architect).
- pg-boss retry tuning (architect).
