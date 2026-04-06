# Clinician Patient Invitations — UX Design

## User Flows

### Flow 1: Clinician Creates Invitation (Web)

**Entry point:** Patients page, "Invite Patient" button (top-right)
**Success state:** Invite code displayed in success screen, ready to share

**Steps:**
1. Clinician clicks "Invite Patient" → modal opens
2. Step 1 (form): Enters patient name, email. Optionally selects program from dropdown ("No program" default). Optionally checks "Send email notification" (unchecked default). Clicks "Continue."
3. API creates invitation → spinner on button
4. Step 2 (success): Modal shows large invite code (mono font, 24px+) with copy button. If email sent: "Email sent to jane@example.com". If no email: "Share this code with your patient."
5. Clinician copies code or notes it, clicks "Done" to close modal
6. Pending invite appears in patient list immediately

**Error paths:**
- Duplicate email+clinician: Inline alert below email field, form stays open
- Server error: Toast notification, form stays filled for retry

### Flow 2: Patient Redeems Code (Mobile)

**Entry point:** Register screen, invite code field at top
**Success state:** Logged in, navigated to Programs tab (or home if no program)

**Steps:**
1. Patient opens app → Login screen → taps "Create Account"
2. Register screen: enters invite code, first name, last name, email, password, confirm password
3. Taps "Create Account" → spinner, fields disabled
4. Success → tokens stored in SecureStore, navigates to home

**Error paths:**
- Invalid code: Alert "Invalid invite code. Please check and try again." Code field red.
- Expired code: Alert "This invite code has expired. Please contact your clinician for a new one." Code field red.
- Used code: Alert "This invite code has already been used." Code field red.
- Email taken: Alert "This email is already registered. Try logging in instead." with "Log in" link. Email field red.
- Network error: Alert "Something went wrong. Check your connection and try again." Fields remain filled.

### Flow 3: Clinician Resends Email (Web)

**Entry point:** Patient view page, invite widget "Resend Email" button
**Success state:** Toast confirmation, email count incremented

**Steps:**
1. Clinician clicks "Resend Email" → button shows spinner
2. Email queued → button returns to normal
3. Toast: "Email resent"
4. Email send count increments in widget

**Error path:** Toast: "Failed to send email. Try again."

### Flow 4: Clinician Revokes Invitation (Web)

**Entry point:** Patient view page, invite widget "Revoke Invite" button
**Success state:** Widget shows Revoked state

**Steps:**
1. Clinician clicks "Revoke Invite"
2. Confirmation dialog: "Revoke this invitation? The code will stop working." [Cancel] [Revoke]
3. Clinician confirms → widget transitions to Revoked state
4. Patient list row updates on next load

**Error path:** Toast: "Failed to revoke. Try again."

## Component Specifications

### Invite Patient Modal

**Purpose:** Two-step flow for creating an invitation and displaying the code.

**States:**
| State | Appearance | Behavior |
|-------|-----------|----------|
| Default (Step 1) | Form: name, email, program dropdown, email checkbox | Continue enabled when name + email filled |
| Submitting | Spinner on Continue, fields disabled | Prevents double-submit |
| Success (Step 2) | Large code in mono font, copy button, confirmation text | Only actions: Copy, Done |
| Error: Duplicate | Inline alert below email: "An active invitation already exists for this email" | Email field highlighted, user can edit |
| Error: Server | Toast: "Something went wrong. Please try again." | Form remains filled |

**Interactions:**
| Action | Feedback | Result | Error |
|--------|----------|--------|-------|
| Fill name + email | Continue button enables | — | — |
| Click Continue | Spinner on button, fields disabled | Transitions to Step 2 with code | Inline or toast error |
| Click Copy (Step 2) | Button text → "Copied!" for 2s | Code on clipboard | Falls back to text selection |
| Click Done (Step 2) | Modal closes | Patients list refreshes | — |

### Patients Page — Invite Status Rows

**Purpose:** Show pending/expired invites alongside active patients in one list.

**Row variants:**
| State | Badge | Code Column | Additional |
|-------|-------|-------------|------------|
| Active patient | Green "Active" | — | Existing behavior, no changes |
| Pending invite | Yellow "Pending" | Code + copy button (mono) | "Invited Mar 28" |
| Expired invite | Red "Expired" | — (code hidden) | "Invited Feb 26" |

**Sorting:** Pending invites sort to top by default.
**Filtering:** Status filter dropdown: All, Active, Pending, Expired. Search works on name/email for invites too.

**Empty state (no patients or invites):**
```
No patients yet
Invite your first patient to get started.
[Invite Patient]
```

### Invite Widget (Patient View Page)

**Purpose:** Show invite lifecycle status and actions for a specific patient.

**States:**
| State | Content | Actions |
|-------|---------|---------|
| Pending | Status, code + copy, invite date, expiry + days remaining, email send count | [Resend Email] [Revoke Invite] |
| Accepted | Status, invite date, join date, linked program (if any) | None |
| Expired | Status, invite date, expiry date | [Send New Invite] |
| Revoked | Status, invite date, revoke date | [Send New Invite] |

**Interactions:**
| Action | Feedback | Result | Error |
|--------|----------|--------|-------|
| Click Copy | "Copied!" for 2s | Code on clipboard | Text selection fallback |
| Click Resend Email | Spinner on button | Toast: "Email resent", count increments | Toast: "Failed to send email. Try again." |
| Click Revoke Invite | Confirmation dialog | Widget → Revoked state | Toast: "Failed to revoke. Try again." |
| Click Send New Invite | Opens modal pre-filled with patient name/email | Normal invite creation flow | Normal modal errors |

### Mobile Signup Screen

**Purpose:** Patient creates account using invite code.

**Field order:** Invite code → First name → Last name → Email → Password → Confirm password

**Invite code field behavior:**
- Placeholder: "STEADY-" in light gray
- Auto-prefix: typing "7X2K" formats to "STEADY-7X2K"
- Auto-uppercase all input
- Default alphanumeric keyboard

**States:**
| State | Appearance | Behavior |
|-------|-----------|----------|
| Default | All fields empty, placeholder on code | Create Account disabled until all filled |
| Filling | Fields populate | Real-time password match validation only |
| Submitting | Button: "Creating account..." + spinner, fields disabled | Prevents double-submit |
| Success | Brief flash → navigate to Programs tab | Tokens in SecureStore |
| Error | Alert banner above form, relevant field highlighted red | All fields remain filled, user can fix and retry |

## Information Hierarchy

**Patients page:** Patient name (primary) → email → status badge → invite code (if pending) → date
**Invite modal Step 2:** Invite code (dominant, large mono font) → confirmation text → copy button → done
**Invite widget:** Status (primary) → code + copy (if pending) → dates → actions
**Mobile signup:** Invite code (first field, sets context) → personal details → password → submit

## Content & Copy

| Element | Copy | Notes |
|---------|------|-------|
| Invite button | "Invite Patient" | Top-right on patients page |
| Modal title | "Invite Patient" | Step 1 |
| Program dropdown default | "No program" | Not "Select a program" — makes it clear it's optional |
| Email checkbox | "Send email notification" | Unchecked by default |
| Modal success (email sent) | "Email sent to {email}" | Confirms the action |
| Modal success (no email) | "Share this code with your patient" | Guides next step |
| Copy button | "Copy" → "Copied!" | 2s transition |
| Revoke confirmation | "Revoke this invitation? The code will stop working." | Clear consequence |
| Empty patients page | "No patients yet — Invite your first patient to get started." | CTA to invite |
| Mobile screen title | "Join Steady" | Warm, not clinical |
| Mobile code placeholder | "STEADY-" | Guides format |
| Mobile submit button | "Create Account" | Consistent with existing |
| Error: invalid code | "Invalid invite code. Please check and try again." | No info leak |
| Error: expired code | "This invite code has expired. Please contact your clinician for a new one." | Directs to recovery |
| Error: used code | "This invite code has already been used." | Clear |
| Error: email taken | "This email is already registered. Try logging in instead." | Links to login |

## Accessibility Notes

- **Modal:** Focus trapped inside modal when open. ESC closes. Focus returns to "Invite Patient" button on close.
- **Copy button:** `aria-label="Copy invite code"`, live region announces "Copied to clipboard" on success.
- **Status badges:** Use both color AND text ("Pending", "Expired") — never color alone.
- **Code display:** Mono font with letter-spacing for readability. `aria-label` reads code with spaces between characters.
- **Mobile alerts:** Error alerts are `role="alert"` for screen reader announcement.
- **Revoke confirmation:** Focus moves to dialog, Cancel is default focus (destructive action requires deliberate choice).
- **Keyboard nav:** All actions reachable via Tab. Copy, Resend, Revoke are buttons (not links).

## Deferred to v2

- **Deep links** (e.g., `steady://invite/STEADY-7X2K`) that pre-fill the code on mobile — adds complexity, not needed for v1 since the code field is simple enough.
