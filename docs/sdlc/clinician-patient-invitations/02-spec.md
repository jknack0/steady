# Clinician Patient Invitations — Feature Specification

## Overview
Clinicians have no way to bring patients into the Steady app, creating a complete gap in the onboarding funnel. This feature introduces a hybrid invite system: clinicians generate unique invite codes they can share however they choose, with an optional PHI-free email nudge. Patients redeem codes during mobile app signup. Invite status is tracked on the existing patients page and individual patient view — no new dashboards.

## Functional Requirements

### FR-1: Create Patient Invitation
The clinician can create an invitation from the web app, providing the patient's name and email, optionally selecting a program, and optionally triggering an email nudge.

**Acceptance Criteria:**
- GIVEN an authenticated clinician on the patients page
  WHEN they click "Invite Patient" and enter a patient name and email
  THEN the system generates a unique alphanumeric invite code (format: `STEADY-XXXX`, 4 alphanumeric characters, case-insensitive)

- GIVEN a clinician creating an invitation
  WHEN they optionally select a program from their program list
  THEN the invitation is linked to that program so the patient is auto-enrolled on signup

- GIVEN a clinician creating an invitation
  WHEN they check "Send email notification"
  THEN the system sends a PHI-free email to the patient containing the invite code, app download link, and one line of context ("Your clinician has invited you to Steady...")

- GIVEN a clinician creating an invitation
  WHEN they do NOT check "Send email notification"
  THEN no email is sent and the code is displayed on-screen for the clinician to share manually

- GIVEN the invite is created
  THEN the invite code is displayed prominently so the clinician can copy or read it to the patient

### FR-2: Patient Redeems Invite Code
The patient downloads the mobile app, enters the invite code during signup, and creates their account.

**Acceptance Criteria:**
- GIVEN a new user on the mobile app signup screen
  WHEN they enter a valid, unexpired invite code along with their name, email, and password
  THEN their account is created, they are linked to the inviting clinician, and they are logged in

- GIVEN an invite code linked to a program
  WHEN the patient completes signup with that code
  THEN they are automatically enrolled in the linked program and see it on their home screen

- GIVEN an invite code NOT linked to a program
  WHEN the patient completes signup
  THEN they have an account linked to the clinician but no program enrollment (clinician assigns later)

- GIVEN an expired invite code (older than 30 days)
  WHEN the patient enters it during signup
  THEN they see an error: "This invite code has expired. Please contact your clinician for a new one."

- GIVEN an already-used invite code
  WHEN someone enters it during signup
  THEN they see an error: "This invite code has already been used."

- GIVEN an invalid/nonexistent invite code
  WHEN someone enters it during signup
  THEN they see an error: "Invalid invite code. Please check and try again."

- GIVEN the signup screen
  WHEN the patient does NOT have an invite code
  THEN there is no way to create an account (invite code is required for all signups)

### FR-3: Invite Status on Patients Page
Pending invitations appear alongside active patients on the existing patients page.

**Acceptance Criteria:**
- GIVEN a clinician on the patients page
  WHEN they have pending invitations
  THEN pending invites appear in the patient list with a "Pending" status badge, showing the patient name, email, and when the invite was created

- GIVEN a clinician on the patients page
  WHEN a patient has accepted an invitation
  THEN that entry transitions from "Pending" to a normal active patient row

- GIVEN a clinician on the patients page
  WHEN an invitation has expired (30 days, not accepted)
  THEN the entry shows an "Expired" status badge

### FR-4: Invite Widget on Patient View Page
The individual patient view page includes a widget showing that patient's invite/onboarding status.

**Acceptance Criteria:**
- GIVEN a clinician viewing a patient who signed up via invite
  WHEN the invite widget loads
  THEN it shows: invite date, code used, acceptance date, and linked program (if any)

- GIVEN a clinician viewing a patient with a pending invite
  WHEN the invite widget loads
  THEN it shows: invite date, invite code, expiry date, and actions to "Resend Email" or "Revoke Invite"

- GIVEN a clinician viewing a patient with an expired invite
  WHEN the invite widget loads
  THEN it shows the expired status and a "Send New Invite" action

### FR-5: Resend Email Nudge
Clinicians can resend the email notification for a pending invite.

**Acceptance Criteria:**
- GIVEN a pending invitation on the patient view page
  WHEN the clinician clicks "Resend Email"
  THEN the system sends the same PHI-free email with the existing invite code (does not generate a new code)

- GIVEN a pending invitation
  WHEN the clinician resends the email
  THEN the resend count is tracked and displayed (e.g., "Email sent 2 times")

### FR-6: Revoke Invitation
Clinicians can revoke a pending invitation.

**Acceptance Criteria:**
- GIVEN a pending invitation
  WHEN the clinician clicks "Revoke Invite" and confirms
  THEN the invite code is invalidated and the pending entry is removed from the patients page

- GIVEN a revoked invite code
  WHEN a patient tries to use it during signup
  THEN they see: "This invite code is no longer valid. Please contact your clinician."

## Non-Functional Requirements

### NFR-1: Performance
- Invite code generation must complete in under 500ms
- Patients page must load pending invites alongside active patients without noticeable delay (pagination already exists)
- Email nudge is sent asynchronously (queued via pg-boss, not in request path)

### NFR-2: Security
- Invite codes must be cryptographically random (not sequential or guessable)
- Invite codes contain zero PHI — only a code, app download link, and generic context in emails
- Invite code redemption is rate-limited to prevent brute-force (max 10 attempts per IP per hour)
- Invite codes are single-use — one code, one patient
- Revoked/expired codes are rejected immediately

### NFR-3: Data Integrity
- Each invite code is globally unique
- One clinician per patient in v1 — if a patient's email already exists in the system, code redemption fails with "This email is already registered"
- Design the data model so multi-clinician support can be added later without migration headaches

## Scope

### In Scope
- Invite creation with optional program and optional email nudge
- Invite code entry on mobile app signup
- Invite status on existing patients page (pending/expired/accepted)
- Invite widget on patient view page
- Resend email nudge
- Revoke invitation
- 30-day fixed expiry
- Invite code format: `STEADY-XXXX` (4 alphanumeric, case-insensitive)

### Out of Scope
- Dedicated invite dashboard (uses existing patients page)
- SMS notifications
- Patient self-registration without invite code
- Bulk import from EHR/CSV
- In-app messaging
- Multi-clinician per patient (v1 is single clinician, data model supports future expansion)
- Configurable expiry periods
- Invite analytics/reporting beyond status tracking

## Dependencies
- pg-boss job queue (exists) — for async email sending
- Email service — need an email sending capability (e.g., SendGrid, AWS SES, or similar)
- Mobile app signup flow — needs modification to accept invite codes

## Assumptions
- An email sending service will be available (or will be set up as part of this feature)
- The existing patients page supports adding new row types (pending invites alongside active patients)
- The mobile app currently has no signup flow (this creates it)

## Glossary
- **Invite code**: A unique, cryptographically random alphanumeric string (format: `STEADY-XXXX`) used to link a patient to a clinician during signup
- **Email nudge**: An optional, PHI-free email sent to the patient containing the invite code and app download instructions
- **Pending invite**: An invitation that has been created but not yet redeemed by the patient
- **Revoked invite**: An invitation manually invalidated by the clinician
