# Client Web Portal MVP — UX Design

## Design Principles

1. **Calendar is the destination.** No home page, no dashboard — the moment a client is authenticated they see their schedule.
2. **The Join button is the hero.** Every other affordance exists to get a client to the Join button and into their session.
3. **Minimize clinical cognitive load.** Clients have ADHD. Short sentences, visible labels, obvious next steps, no jargon.
4. **Errors are never dead ends.** Every error state names what's wrong AND what the user can do next ("contact your clinician" is acceptable as a terminal action).
5. **Accessibility is not a phase.** All interactive elements are keyboard-reachable; all states are announced; contrast meets WCAG AA.
6. **Quiet by default.** Muted palette, generous whitespace, one action per screen.

---

## Visual Foundations

- **Tone:** Calm, warm, clinical-but-not-cold. The clinician app sidebar is teal-accented; the portal uses the same palette muted down 10-15%.
- **Typography:** Same Plus Jakarta Sans stack. Larger base font size (18px) for readability on any device.
- **Hierarchy:** H1 only on auth pages. Calendar uses date headings as H2, clinician names as H3 labels on cards.
- **Whitespace:** Generous. Anti-density. Cards have breathing room.
- **Motion:** Minimal. 200ms fades. No bouncing. Skeleton placeholders for loading.
- **Color semantics:** SCHEDULED = primary teal. ATTENDED = muted neutral. All canceled statuses = muted red + strikethrough. Join button = primary filled when enabled, outlined when disabled.

---

## User Flows

### Flow 1: New client onboarding (primary happy path)

1. Client clicks "Accept your invitation" in email
2. Lands on `/portal/signup?t=<token>`
3. Server fetches invitation status (public portal-invite-status endpoint)
4. Signup form rendered: STEADY logo + "Welcome to your STEADY portal" + fields (first name pre-filled if stub has it, last name pre-filled, email empty for binding check, password, confirm) + privacy policy link footer
5. Client submits → loading state ("Setting up your account...") → success flash ("Welcome, [FirstName]!") → `/portal/calendar` week view

**Target:** under 2 minutes click-to-calendar.

### Flow 2: Signup error branches

- **Email mismatch:** inline error below email field, token NOT burned, client can retry
- **Password policy fail:** inline error below password field with specific Cognito reason, token NOT burned
- **Passwords don't match:** client-side only, no server call
- **Rate limit (10/hr IP):** full-page error with recovery instruction
- **Server 500:** top-of-form error banner, form data preserved

### Flow 3: Invalid/expired/used/revoked tokens

All four use the same center-aligned card layout, differing only in copy:

- **Invalid:** "This link isn't valid" / "Please contact your clinician for a new invitation." / no CTA
- **Expired:** "This invitation has expired" / "Please contact your clinician for a new one." / no CTA
- **Used:** "This invitation has already been used" / "If this is your account, please sign in." / Sign in CTA
- **Revoked:** "This invitation is no longer valid" / "Please contact your clinician." / no CTA

Test hooks: `invitation-invalid-error`, `invitation-expired-error`, `invitation-used-error`, `invitation-revoked-error`.

### Flow 4: Existing-user invitation acceptance

1. Email uses existing-user template variant ("Dr. Smith has added you to their practice on STEADY")
2. `/portal/signup?t=<token>` — server sees `existingUser=true`
3. Instead of signup form, show: "You already have an account" + "Please sign in to accept Dr. Smith's invitation to their practice." + Sign in CTA
4. Click Sign in → `/portal/login` with token preserved in short-lived signed cookie
5. Successful login → server auto-accepts invitation in background transaction → `/portal/calendar` with new clinician's appointments visible

**Exception:** Cognito account in state ≠ CONFIRMED → "Your account needs to be set up. Please contact your clinician."

### Flow 5: Returning client login

Form: email, password, "Forgot password?" link, Sign in button, privacy policy link footer.

**Error branches:**
- Invalid credentials: "Invalid email or password" (single generic message)
- CLINICIAN: "This login is for clients only. Please use the clinician app at steadymentalhealth.com."
- ADMIN: same wrong-role message
- Cognito unconfirmed: "Your account needs to be set up. Please contact your clinician."
- Rate limited: "Too many login attempts. Please try again in 15 minutes."
- Idle return: flash "You've been signed out due to inactivity."
- Sign-out return: flash "You've been signed out."

### Flow 6: Forgot password

1. `/portal/login` → click "Forgot password?"
2. `/portal/forgot-password` — email field + Send reset code button + Back link
3. Submit → success state "Check your email" / "If an account exists with that email, we've sent a reset code." / CTA to reset page (regardless of whether email exists)
4. `/portal/reset-password` — email (pre-filled), code, new password, confirm
5. Submit → success flash → `/portal/login`

Errors: invalid code, expired code, password policy fail, rate limited.

### Flow 7: Calendar view + join session

1. `/portal/calendar` — first load detects timezone via `Intl.DateTimeFormat()`, fire-and-forget PATCH profile
2. Server returns appointments with `isJoinable` pre-computed
3. Week view renders with header (logo, date range, view switcher, name, sign out)
4. Appointment cards: clinician name (primary), type (secondary), time in client tz, status chip, Join button (if SCHEDULED)
5. Hover/focus → tooltip with clinician timezone (if different)
6. Click Join on enabled card → `/portal/telehealth/[id]`
7. Pre-join device check (camera preview, mic test) → Join session CTA
8. LiveKit room (full-screen takeover): remote video, local PiP, mute/camera/leave controls, connection indicator, recording indicator if applicable
9. Leave or session ends → back to `/portal/calendar`

### Flow 8: Empty calendar

Grid still renders (empty cells) with overlay card: "No appointments scheduled" / "Your clinician will let you know when your next session is booked." (test hook: `calendar-empty-state`). View switcher and navigation remain functional.

### Flow 9: Appointment canceled while watching

Calendar polls every 60s (per AC-7.5). Cancel detected → card transitions in place (strikethrough, muted red, Join button disappears, cancel reason shown if present). If user was staring at a joinable appointment, subtle bottom toast: "Your session with Dr. Smith was canceled. Check with them for details."

### Flow 10: Session canceled between click and token issuance

Click Join → navigate → `/api/telehealth/token` returns 409 SessionUnavailable → error view: "This session is no longer available" / "It may have been canceled or ended. Please contact your clinician." / Back to calendar CTA.

### Flow 11: Recording consent during session

Clinician initiates recording → data channel event → modal appears over video: "Recording request" / "Your clinician would like to record this session. Do you consent?" / "You can decline, and the session will continue without recording." / Accept + Decline buttons. Focus trapped in modal, Escape does NOT dismiss (forced decision). Accept → recording indicator appears. Decline → clinician-side stops recording, brief toast.

If participant joins AFTER recording already active, modal appears immediately on `room.connected`.

### Flow 12: Sign out

Click Sign out in header → portal logout action → Cognito GlobalSignOut → cookies cleared → `/portal/login?signedOut=1` with flash.

### Flow 13: Idle timeout

30 min of no input (mouse, keyboard, touch, scroll) AND not in active LiveKit session → client-side timer fires → logout → `/portal/login?idle=1`.

**Grace period:** At 28 minutes, a gentle warning toast: "You'll be signed out in 2 minutes. Move your mouse to stay signed in."

### Flow 14: Cross-role redirect

CLINICIAN hits portal.* → server layout redirects to clinician app.
PARTICIPANT hits clinician routes → server layout redirects to portal calendar.
ADMIN hits portal.* → server layout redirects to admin surface.
No error shown — immediate redirect.

### Flow 15: Clinician creates portal invitation (from client detail)

1. Client detail page → "Invite to portal" button (visible when no existing PENDING/SENT invitation)
2. Click → confirmation modal: "Invite [Client Name] to their portal" / "They'll receive an email with instructions to set up their account." / Send invitation / Cancel
3. Send → toast "Invitation sent to [email]" → client detail page now shows InvitationStatusCard

### Flow 16: Clinician creates invitation for new client (from clients list)

1. "Invite new client" button on clients list
2. Modal: First name, Last name, Email fields
3. Submit branches:
   - Success → toast + new client row with "Invited" status
   - Duplicate pending invite → inline error on email field
   - Email in suppression list → modal error "This email can't receive invitations. Please verify with the client."
   - Network failure → banner at top of modal, form data preserved

---

## Component Specifications

### Portal header

Minimal top bar. Present on all authenticated portal pages except full-screen telehealth.

**Layout:** Logo left, empty center, "Hi, [FirstName]" + Sign out button right.

**States:**

| State | Appearance | Behavior |
|---|---|---|
| Default (auth) | Logo + greeting + Sign out | Sign out → flow 12 |
| Unauth (login/signup) | Logo only | Logo links to `/portal/login` |
| Loading user info | Logo + name skeleton | 200ms max, falls back to "Welcome" |

### Signup form

**Fields (tab order):** First name, Last name, Email (empty for binding), Password (with show/hide toggle), Confirm password.

**States:**

| State | Appearance | Behavior |
|---|---|---|
| Default | All fields enabled, submit enabled when non-empty | Enter submits |
| Submitting | Read-only + spinner + "Setting up your account..." | No nav prompt |
| Email mismatch | Inline error below field, focus email | Token not burned |
| Password policy fail | Inline error with specific reason | Token not burned |
| Server error | Red banner top | Form data preserved |
| Success | "Welcome, [Name]!" flash | 1.5s max before redirect |

**Accessibility:** Visible labels, `aria-describedby` for errors, password toggle has `aria-label`, submit button has `aria-busy` in loading state.

### Login form

Fields: email, password, Forgot password link, Sign in button, privacy policy footer.

Additional states beyond signup form:

| State | Appearance | Behavior |
|---|---|---|
| Signed-out flash | Blue banner | "You've been signed out." |
| Idle-out flash | Blue banner | "You've been signed out due to inactivity." |
| Wrong role (clinician) | Amber banner | "This login is for clients only..." |
| Rate limited | Red banner | Submit disabled |

### Forgot password form

Single email field + Send reset code button + Back to sign in link. Response identical regardless of email existence.

### Reset password form

Fields: email (pre-filled), code, new password, confirm. Shows specific Cognito errors for code invalid/expired/password policy.

### Portal calendar grid

**Top bar:** Date range label, Previous/Today/Next buttons, Day/Week/Month view switcher.

**Grid:** Week view default. Days as columns. Appointments positioned by time.

**States:**

| State | Appearance | Behavior |
|---|---|---|
| Loading | Skeleton shimmer | Block interaction 500ms max |
| Loaded with data | Cards rendered | Click → details/join |
| Loaded empty | Grid + overlay empty card | Empty card non-blocking |
| Error | Red banner + retry button | Retry re-fetches |
| Nav boundary (90 fwd / 30 back) | Nav button disabled | Silent |
| Poll update (cancel detected) | Card transitions in place | See flow 9 |

**Keyboard:** Tab cards, arrow keys navigate days/weeks, Enter triggers Join.

**Screen reader:** `role="grid"` on container, `role="gridcell"` on days, cards are `role="button"` with full `aria-label`.

### Appointment card

**Content:** Clinician name (primary), type (secondary), time in client tz, duration, location chip, Join button (if SCHEDULED), status badge (if not SCHEDULED).

**Visual treatment per status:**

| Status | Card color | Join button |
|---|---|---|
| SCHEDULED, joinable | Primary filled | Enabled |
| SCHEDULED, not yet | Primary filled | Disabled, time-until hint |
| SCHEDULED, past window | Primary filled | Disabled, "Session has ended" |
| ATTENDED | Muted neutral | None, "Attended" badge |
| CLIENT_CANCELED | Muted red strikethrough | None, "You canceled" badge |
| CLINICIAN_CANCELED | Muted red strikethrough | None, "Clinician canceled" badge |
| LATE_CANCELED | Muted red strikethrough | None, "Late cancel" badge |

**Timezone popover:** Keyboard-accessible via focus (not hover-only). `aria-describedby` linking to visible helper text.

### Join button

| State | Appearance | Behavior |
|---|---|---|
| Enabled | Primary filled | Click → telehealth page |
| Disabled — too early | Primary outlined, greyed | `aria-disabled`, describedby "You can join 15 minutes before your session starts" |
| Disabled — too late | Same | describedby "This session has ended" |
| Not scheduled | Hidden | — |

Never hover-only tooltips. Helper text visible adjacent when disabled.

### Telehealth participant view

**Layout:** Full-screen takeover, no portal header, black background.

**Elements:**
- Remote video (clinician) — dominant center
- Local PiP video — bottom right
- Control bar (bottom center): mute, camera, leave
- Connection indicator (top-left): green/amber/red dot + label
- Recording indicator (top-right): "● Recording"

**States:**

| State | Appearance | Behavior |
|---|---|---|
| Pre-join device check | Local preview + "Join session" CTA | Click → connect |
| Connecting | Spinner + "Connecting..." | 5s timeout |
| Connected | Normal view | Session active |
| Reconnecting | Amber indicator + banner | Auto-reconnect |
| Connection failed | Error + Retry + Back to calendar | — |
| Mic muted | Crossed icon + red | — |
| Camera off | Avatar + "Camera off" label | — |
| Recording active | "● Recording" indicator | — |
| Recording consent pending | Modal blocks controls | See recording consent modal |
| Session unavailable (409) | Replacing view entirely | See flow 10 |

**Accessibility:** All controls keyboard-accessible, visible on focus, mute/unmute announced via `aria-live=polite`, control bar doesn't auto-hide from keyboard users.

### Recording consent modal

**Layout:** Center-screen modal over video. Video continues behind, audio continues.

**Elements:**
- Title: "Recording request"
- Body: "Your clinician would like to record this session. Do you consent?"
- Secondary: "You can decline, and the session will continue without recording."
- Accept (primary) + Decline (secondary) buttons

**Behavior:** Focus trapped, Escape does NOT dismiss, forced decision required.

### InvitationStatusCard (clinician side)

**Content:** Status badge, recipient email, send count, last sent time, expiration, contextual actions.

**Per-status actions:**

| Status | Primary | Secondary | Banner |
|---|---|---|---|
| PENDING | — | Revoke | "Invitation created. Email will be sent shortly." |
| SENT | Resend | Revoke | — |
| ACCEPTED | — | — | Green: "Client accepted on [date]" |
| BOUNCED | — | Revoke | Red: "Delivery failed. Verify the email with your client." |
| COMPLAINED | — | Revoke | Red: "Client marked as spam. Use a different email." |
| SEND_FAILED | Retry | Revoke | Amber: "Delivery failed. Try again or contact support." |
| EXPIRED | Renew | Revoke | Amber: "This invitation has expired." |
| REVOKED | New invitation | — | Grey: "This invitation was revoked on [date]." |

**Resend button states:**
- Enabled
- Cooldown-locked (5-min window): disabled + "Please wait 5 minutes between resends"
- Max reached (sendCount >= 5): disabled + "Maximum resends reached. Revoke and create a new invitation."

### "Invite new client" form (clinician side)

Modal on clients list. Fields: First name, Last name, Email. Submit enqueues invitation.

**Errors:** Duplicate pending → inline email error. Suppression list → modal error. Network → banner + preserved data.

---

## Information Hierarchy

**/portal/calendar priority:**
1. Next joinable appointment's Join button (highest visual weight)
2. Date range context
3. Navigation controls
4. Upcoming appointments
5. Past appointments (muted, secondary)
6. Header (quiet but always present)
7. Empty state (only if nothing else)

**Signup page:** Headline → form → CTA → small sign-in link → privacy footer.

**Login page:** Headline → email + password + Sign in → Forgot password link → privacy footer.

---

## Content & Copy

### Auth pages

| Element | Copy |
|---|---|
| Signup headline | "Welcome to your STEADY portal" |
| Signup subhead | "Set up your account to start joining your sessions." |
| Signup submit | "Create your account" |
| Signup loading | "Setting up your account..." |
| Signup success flash | "Welcome, [FirstName]!" |
| Login headline | "Sign in to STEADY" |
| Login submit | "Sign in" |
| Forgot password link | "Forgot password?" |
| Forgot password headline | "Reset your password" |
| Forgot password submit | "Send reset code" |
| Forgot password success | "Check your email" |
| Forgot password body | "If an account exists with that email, we've sent a reset code." |
| Reset password headline | "Set a new password" |
| Reset password submit | "Reset password" |
| Privacy policy link | "Privacy policy" |

### Existing-user variant

| Element | Copy |
|---|---|
| Headline | "You already have an account" |
| Body | "Please sign in to accept [Dr. LastName]'s invitation to their practice." |
| CTA | "Sign in" |

### Invitation errors

| Scenario | Headline | Body | CTA |
|---|---|---|---|
| Invalid token | "This link isn't valid" | "Please contact your clinician for a new invitation." | None |
| Expired | "This invitation has expired" | "Please contact your clinician for a new one." | None |
| Used | "This invitation has already been used" | "If this is your account, please sign in." | Sign in |
| Revoked | "This invitation is no longer valid" | "Please contact your clinician." | None |

### Calendar

| Element | Copy |
|---|---|
| Empty headline | "No appointments scheduled" |
| Empty body | "Your clinician will let you know when your next session is booked." |
| Join button (enabled) | "Join session" |
| Join disabled — too early | "You can join 15 minutes before your session starts" |
| Join disabled — too late | "This session has ended" |
| Load error | "Couldn't load your schedule. Try again?" |

### Telehealth

| Element | Copy |
|---|---|
| Pre-join CTA | "Join session" |
| Connecting | "Connecting..." |
| Connected indicator | "Connected" |
| Reconnecting | "Reconnecting..." |
| Connection failed headline | "Couldn't connect" |
| Connection failed body | "Check your internet and try again, or contact your clinician." |
| Retry | "Try again" |
| Leave button | "Leave session" |
| Recording indicator | "● Recording" |
| Recording consent title | "Recording request" |
| Recording consent body | "Your clinician would like to record this session. Do you consent?" |
| Recording consent secondary | "You can decline, and the session will continue without recording." |
| Recording Accept | "Accept" |
| Recording Decline | "Decline" |
| Session unavailable headline | "This session is no longer available" |
| Session unavailable body | "It may have been canceled or ended. Please contact your clinician." |
| Session unavailable CTA | "Back to calendar" |

### Idle / logout flashes

| Scenario | Copy |
|---|---|
| Signed out | "You've been signed out." |
| Idle timeout | "You've been signed out due to inactivity." |
| Idle warning (at 28min) | "You'll be signed out in 2 minutes. Move your mouse to stay signed in." |

### Clinician invitation management

| Element | Copy |
|---|---|
| Invite button | "Invite to portal" |
| Invite modal title | "Invite [Client Name] to their portal" |
| Invite modal body | "They'll receive an email with instructions to set up their account." |
| Invite new client button | "Invite new client" |
| Invite sent toast | "Invitation sent to [email]" |
| Resend cooldown tooltip | "Please wait 5 minutes between resends" |
| Max resends tooltip | "Maximum resends reached. Revoke and create a new invitation." |
| Bounced banner | "Delivery failed. Verify the email with your client." |
| Complained banner | "Client marked as spam. Use a different email." |
| Revoked banner | "This invitation was revoked on [date]." |

---

## Accessibility

### Keyboard navigation
- Logical tab order
- All interactive elements Tab-reachable
- Escape closes modals (except forced-decision recording consent)
- Enter submits forms
- Arrow keys navigate calendar grid cells

### Screen readers
- Page titles on every route change
- `aria-live="polite"` for flashes, toasts, poll updates
- `aria-live="assertive"` for telehealth connection status changes
- `aria-describedby` for field helpers, error messages
- `aria-invalid` on erring fields
- `role="status"` on empty states
- `aria-busy="true"` on loading states

### Color contrast
- WCAG AA: 4.5:1 normal text, 3:1 large text
- Status colors paired with icons or text (never color-only)
- Focus rings visible, meet 3:1 contrast

### Focus management
- Route change → focus to H1
- Modal open → focus to first focusable
- Modal close → focus returns to trigger
- Form error → focus to first invalid field
- Error page → focus to headline

### Motion
- `prefers-reduced-motion` respected: transitions 0ms
- No parallax, no auto-playing animations
- Skeleton static under reduced motion

---

## Open Questions for UX Researcher

1. **Calendar grid vs. next-session card** — v1 uses grid. Research validates with ADHD personas whether grid is noisy.
2. **Timezone display** — tooltip v1. Research validates discoverability vs. inline dual-time.
3. **Recording consent copy** — "Do you consent?" is clinical; research may prefer "Is it OK?"
4. **Idle warning timing** — 2 min arbitrary; research may suggest more for slow-reading users.
5. **Pre-join device check** — v1 includes; research validates it reduces frustration.
6. **Existing-user email tone** — "Dr. LastName has added you" may feel impersonal.
7. **Sign out prominence** — v1 always-visible; research may prefer menu.
8. **Mobile calendar view** — v1 uses week view; day view may be better on small screens.
9. **Privacy policy placement** — v1 footer only; may need more prominence on signup.

---

## Compliance Touchpoints

- **COND-28** Privacy policy link: footer on `/portal/login`, `/portal/signup`, `/portal/forgot-password`, `/portal/reset-password`. Text: "Privacy policy".
- **COND-12** Privacy policy update: non-UX but UX confirms link target ready before launch.
- **COND-1** Email template PHI denylist: existing-user variant uses last name only; UX copy confirms.
- **Audit log visibility:** clients never see audit trail; clinicians see invitation events via InvitationStatusCard.
- **Recording consent:** flow explicitly designed around participant-initiated decline.

---

## Notes for Engineer

- All strings live in a single strings file (NFR-8.2 i18n prep)
- `data-testid` hooks must match exactly for QA keying
- Timezone tooltip keyboard-accessible (focus triggers it), use popover not `title`
- Idle timer: reuse existing hook or write small one debouncing `mousemove`, `keydown`, `touchstart`, `scroll` on document
- No `alert()`/`confirm()` — all confirmations in-page modals
- Recording consent modal uses `@radix-ui/react-dialog` if available
- All CTAs use existing `Button` component with portal's muted palette variant
