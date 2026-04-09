# Self-Hosted LiveKit Telehealth Video -- Ideation & Feature Specification

---

## Part 1: Ideation

### Problem Statement

Steady currently has no integrated video calling. The `Session` model carries a `videoCallUrl` string field where clinicians paste external links (Zoom, Google Meet, etc.). This creates three problems:

1. **Fragmented workflow.** Clinicians must leave Steady to start/manage calls. Session context (prep data, trackers, homework status) is not visible during the call.
2. **No audit trail.** There is no server-side record of whether a video session actually occurred, how long it lasted, or who connected. This matters for insurance billing (place of service 02 = Telehealth) and for RTM interactive-communication time logging.
3. **Cost exposure on HIPAA-compliant alternatives.** Purpose-built telehealth APIs like Daily.co charge a $500/month HIPAA BAA fee plus per-minute usage. For a solo practitioner doing 20-30 sessions/week, that is $6,000-$10,000/year in video infrastructure alone.

LiveKit is an open-source, self-hostable WebRTC SFU (Selective Forwarding Unit) with built-in DTLS-SRTP encryption, a first-party React component library, and a server SDK for token generation. Self-hosting eliminates the recurring HIPAA BAA fee entirely and reduces per-session cost to infrastructure compute only.

### Who Benefits

| Stakeholder | Benefit |
|---|---|
| **Clinician** | One-click session start from inside Steady. Session prep data visible alongside video. Automatic audit logging satisfies telehealth documentation requirements. |
| **Participant** | Joins via link or from within the mobile app. Device preview (camera/mic check) before entering. No app download required on web. |
| **Practice (business)** | Eliminates $6,000+/year third-party video cost. Reduces clinician context-switching time (~2 min/session saved). Full control over video infrastructure. Enables future features (session recording, AI note-taking) without vendor lock-in. |
| **Compliance** | Server-side session duration logging closes the gap for telehealth billing documentation. DTLS-SRTP encryption satisfies HIPAA in-transit requirements. Self-hosted means PHI (video/audio streams) never transit a third-party SaaS. |

### Cost Analysis

| Item | Daily.co (HIPAA) | Self-Hosted LiveKit |
|---|---|---|
| HIPAA BAA fee | $500/month ($6,000/year) | $0 (self-hosted) |
| Usage (1-on-1, 30 sessions/week, 45 min avg) | ~$135/month (at $0.01/participant-min) | $0 (self-hosted compute) |
| Infrastructure (Railway or AWS) | N/A | ~$15-30/month (1 vCPU, 2GB RAM container) |
| TURN relay (Twilio or self-hosted coturn) | Included | ~$5-15/month (Twilio TURN or coturn on same host) |
| **Annual total** | **~$7,620/year** | **~$240-540/year** |
| **Annual savings** | -- | **~$7,000-7,400/year** |

For a multi-clinician practice (3 clinicians, 90 sessions/week), the savings scale to $15,000+/year.

### Risks of Migration vs. Staying on External Links

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| **WebRTC NAT traversal failures** — Some networks (corporate firewalls, symmetric NATs) block peer-to-peer UDP | Participant cannot connect; session falls back to phone | Medium | Deploy a TURN relay server. LiveKit supports configuring external TURN. Railway supports TCP fallback. |
| **Railway UDP port limitations** — Railway does not natively expose UDP ports; LiveKit needs UDP for optimal media transport | Higher latency if forced to TCP-only; degraded call quality | High | Phase 1: Run on Railway with TCP fallback (TURN over TCP/443). Phase 2: Migrate LiveKit to AWS EC2 with full UDP (Terraform config). Acceptable for 1-on-1 calls. |
| **Self-hosted uptime responsibility** — No vendor SLA; we own availability | Clinician cannot start a session if LiveKit is down | Medium | Health check monitoring. Auto-restart policy. Fallback: clinician can still paste an external link into `videoCallUrl`. LiveKit container is stateless and restarts in <10s. |
| **Browser compatibility edge cases** — WebRTC works in all modern browsers but older Safari/Firefox versions have quirks | ~2-5% of participants on old browsers may have issues | Low | LiveKit React SDK handles browser detection. Pre-join screen validates WebRTC support before entering room. Show fallback message with supported browser list. |
| **Complexity of self-hosting** — We become responsible for LiveKit upgrades, security patches, scaling | Engineering maintenance overhead | Medium | Pin to stable LiveKit version. Use official Docker image. Upgrade quarterly. For 1-on-1 sessions, scaling is trivial (each room uses minimal resources). |
| **No vendor support** — Open-source community support only | Slower issue resolution | Low | LiveKit has active GitHub and Slack community. 1-on-1 sessions are the simplest use case. LiveKit Cloud is available as paid fallback if self-hosting proves untenable. |

### MVP Scope vs. Full Vision

**MVP (this sprint):**
- Token service endpoint for authenticated room access
- Pre-join screen with device selection (camera, microphone, speaker)
- Waiting room (participant joins first, clinician admits)
- 1-on-1 video call with mute/unmute audio, enable/disable video, screen share
- Session end with duration logged to audit trail
- "Start Session" button on appointment detail page that auto-creates LiveKit room
- Participant join link (deep link or web URL)
- LiveKit deployment config for Railway (TCP fallback)

**Full Vision (future sprints):**
- AWS deployment with full UDP support (Terraform)
- Session recording (stored in S3, encrypted at rest)
- AI-powered session notes (whisper transcription + summarization)
- In-call session prep sidebar (view trackers, homework, notes during call)
- Virtual whiteboard / screen annotation
- Breakout room support for group therapy
- Mobile app native integration (Expo + LiveKit React Native SDK)
- Bandwidth quality indicator and adaptive bitrate controls
- Chat/messaging within the call
- Integration with RTM billing (auto-log interactive communication time on session end)

### Technical Risks

| Risk | Detail | Mitigation |
|---|---|---|
| **Railway UDP** | LiveKit prefers UDP for media. Railway only exposes TCP. | LiveKit supports `--rtc.tcp-port` for TCP media transport. Performance is acceptable for 1-on-1. Plan AWS migration for group sessions. |
| **TURN server** | Participants behind restrictive NATs need TURN relay. | Option A: Twilio Network Traversal Service ($0.002/min, minimal cost). Option B: Self-host coturn alongside LiveKit. MVP uses Twilio for simplicity. |
| **Token security** | Leaked tokens could allow unauthorized room access. | Tokens are short-lived (2 hours), scoped to a single room, and tied to a specific participant identity. Room names are opaque (`session-{appointmentId}`). Tokens generated server-side only for authenticated users with verified ownership of the appointment. |
| **Webhook reliability** | LiveKit webhooks for session events may fail or arrive late. | Idempotent webhook handler. Deduplicate by event ID. Fallback: client-side session duration tracking as backup. |
| **Browser media permissions** | Users may deny camera/mic access or have no devices. | Pre-join screen detects available devices and prompts for permission before entering room. Clear error messages for denied permissions. Audio-only fallback if no camera. |

---

## Part 2: Product Owner Specification

### Overview

Clinicians and participants can conduct HIPAA-compliant 1-on-1 video therapy sessions directly within Steady, powered by a self-hosted LiveKit server. The clinician starts a session from the appointment page; the participant joins via a link. Both see a device preview before entering. The session is logged for billing and audit purposes. No PHI appears in room names or tokens.

### Functional Requirements

#### FR-1: LiveKit Token Generation

The API server generates short-lived, scoped LiveKit access tokens for authenticated users who have verified ownership of the appointment.

**Acceptance Criteria:**

- GIVEN an authenticated clinician who owns an appointment
  WHEN they call `POST /api/telehealth/token` with `{ appointmentId }`
  THEN they receive a LiveKit access token with identity `clinician-{clinicianProfileId}`, room name `session-{appointmentId}`, 2-hour TTL, and permissions for publish + subscribe + screen share

- GIVEN an authenticated participant who is the participant on the appointment
  WHEN they call `POST /api/telehealth/token` with `{ appointmentId }`
  THEN they receive a LiveKit access token with identity `participant-{participantProfileId}`, room name `session-{appointmentId}`, 2-hour TTL, and permissions for publish + subscribe (no screen share by default)

- GIVEN an authenticated user who is NOT the clinician or participant on the appointment
  WHEN they call `POST /api/telehealth/token` with `{ appointmentId }`
  THEN they receive a 403 Forbidden response

- GIVEN an appointment that is not in SCHEDULED status
  WHEN a user calls `POST /api/telehealth/token`
  THEN they receive a 409 Conflict with message "Appointment is not in a joinable state"

- GIVEN the maximum of 2 participants already connected to the room
  WHEN a third token request is made
  THEN the room's `maxParticipants` setting (configured at 2 in the token grant) prevents additional joins at the LiveKit level

- GIVEN no `appointmentId` or an invalid one
  WHEN a user calls `POST /api/telehealth/token`
  THEN they receive a 400 or 404 response

#### FR-2: Pre-Join Screen

Before entering a video call, both clinician and participant see a pre-join screen to verify their camera, microphone, and speaker are working.

**Acceptance Criteria:**

- GIVEN a user navigating to the telehealth session page
  WHEN the page loads (before connecting to the room)
  THEN they see a live camera preview, a microphone level indicator, and dropdowns for camera/microphone/speaker selection

- GIVEN a user on the pre-join screen
  WHEN they toggle the camera or microphone off
  THEN the preview updates accordingly and the preference is carried into the call (e.g., joining with mic muted)

- GIVEN a user on the pre-join screen
  WHEN they click "Join Session"
  THEN the client requests a LiveKit token (FR-1) and connects to the room

- GIVEN a user whose browser does not support WebRTC or whose camera/mic permissions are denied
  WHEN they view the pre-join screen
  THEN they see a clear error message explaining what is wrong and how to fix it (e.g., "Please allow camera access in your browser settings")

- GIVEN a user with no camera (e.g., desktop without webcam)
  WHEN they view the pre-join screen
  THEN they can still join in audio-only mode with a placeholder avatar displayed

#### FR-3: Waiting Room

Participants who join before the clinician see a waiting room UI. The clinician does not need to explicitly "admit" participants for MVP; the waiting room is a UX affordance, not a gate.

**Acceptance Criteria:**

- GIVEN a participant who has joined the LiveKit room
  WHEN the clinician has NOT yet joined
  THEN the participant sees a "Waiting for your therapist..." screen with their own camera preview and a countdown or appointment time display

- GIVEN the clinician who then joins the room
  WHEN the participant is waiting
  THEN both participants automatically see each other's video/audio (no manual admit step for MVP)

- GIVEN a participant in the waiting room for more than 15 minutes past the appointment start time
  WHEN the clinician has not joined
  THEN the participant sees a message "Your therapist may be running late. You can continue waiting or contact them directly."

- GIVEN the clinician joins the room first (before the participant)
  WHEN they are alone in the room
  THEN they see a "Waiting for your client to join..." screen with their own camera preview

#### FR-4: Video Call (In-Session Experience)

The core 1-on-1 video call with standard telehealth controls.

**Acceptance Criteria:**

- GIVEN both participants connected to the LiveKit room
  WHEN the session is active
  THEN they see each other's video in a layout with the remote participant large and local participant in a small corner pip (picture-in-picture)

- GIVEN an active session
  WHEN the clinician or participant clicks the microphone button
  THEN their audio is muted/unmuted and the other participant sees a mute indicator

- GIVEN an active session
  WHEN the clinician or participant clicks the camera button
  THEN their video is disabled/enabled and the other participant sees an avatar placeholder when video is off

- GIVEN an active session
  WHEN the clinician clicks the screen share button
  THEN they can select a screen/window/tab to share and the participant sees the shared screen as the primary view

- GIVEN the clinician is sharing their screen
  WHEN they click "Stop Sharing"
  THEN screen share ends and the view returns to camera video

- GIVEN a participant in an active session
  WHEN they click the screen share button
  THEN screen share is allowed (both roles can share)

- GIVEN an active session with degraded network quality
  WHEN connection quality drops below a threshold
  THEN a non-intrusive connection quality indicator appears (e.g., signal bars icon turning yellow/red)

- GIVEN an active session
  WHEN either participant's connection drops temporarily
  THEN LiveKit auto-reconnects and the call resumes without requiring a page refresh (up to 30 seconds of disconnection)

#### FR-5: Session End and Duration Logging

Either participant can leave the call. The clinician can end the session for both participants. Session duration is logged.

**Acceptance Criteria:**

- GIVEN an active session
  WHEN the clinician clicks "End Session"
  THEN both participants are disconnected from the room, the room is closed, and both see a "Session ended" screen

- GIVEN an active session
  WHEN the participant clicks "Leave"
  THEN the participant disconnects but the room stays open for the clinician (in case the participant reconnects)

- GIVEN both participants have disconnected from the room
  WHEN the LiveKit server detects the room is empty
  THEN a `room_finished` webhook fires to `POST /api/telehealth/webhooks`

- GIVEN a `room_finished` webhook is received
  WHEN the webhook is processed
  THEN the system logs an audit entry with: appointment ID (extracted from room name), session duration (from webhook payload), number of participants who connected, and timestamps (room created, room finished)

- GIVEN a session that was started but no participant ever joined (clinician waited alone)
  WHEN the room closes
  THEN the webhook still fires and is logged, but no duration credit is recorded

- GIVEN a `room_finished` webhook for a room with both participants
  WHEN the appointment is of type INDIVIDUAL and location type VIRTUAL
  THEN no automatic status change occurs on the appointment (clinician marks status manually as they do today)

#### FR-6: Appointment Integration (Start Session Button)

The "Start Session" button appears on appointments that are VIRTUAL / INDIVIDUAL / SCHEDULED.

**Acceptance Criteria:**

- GIVEN a clinician viewing an appointment detail page for a SCHEDULED appointment with location type VIRTUAL
  WHEN the appointment start time is within 15 minutes from now OR has already started (and not more than 2 hours past)
  THEN a "Start Video Session" button is prominently displayed

- GIVEN a clinician clicking "Start Video Session"
  WHEN they click the button
  THEN they are navigated to `/appointments/{id}/session` which renders the pre-join screen (FR-2)

- GIVEN an appointment that is not SCHEDULED, or location is IN_PERSON, or it is more than 15 minutes before the start time
  WHEN the clinician views the appointment
  THEN no "Start Video Session" button is shown (or it is disabled with a tooltip explaining why)

- GIVEN a participant viewing their appointments in the mobile app
  WHEN a VIRTUAL appointment is within the joinable time window
  THEN a "Join Session" button appears that opens the web-based telehealth page in the device browser (no native video for MVP)

#### FR-7: Participant Join via Link

Participants join the session via a URL. No LiveKit-specific app or plugin is required.

**Acceptance Criteria:**

- GIVEN a SCHEDULED VIRTUAL appointment
  WHEN the clinician or system generates a join link
  THEN the link format is `{WEB_APP_URL}/session/{appointmentId}/join`

- GIVEN a participant navigating to the join link
  WHEN they are not authenticated
  THEN they are redirected to login first, then back to the join page

- GIVEN a participant navigating to the join link
  WHEN they are authenticated AND they are the participant on the appointment
  THEN they see the pre-join screen (FR-2)

- GIVEN a user navigating to the join link
  WHEN they are authenticated but are NOT the clinician or participant on the appointment
  THEN they see a 403 error page

#### FR-8: Webhook Handler for Audit Logging

LiveKit server sends webhooks to the API for room lifecycle events. The handler validates, deduplicates, and logs events.

**Acceptance Criteria:**

- GIVEN the LiveKit server sends a webhook to `POST /api/telehealth/webhooks`
  WHEN the webhook signature is valid (verified using LiveKit API secret)
  THEN the event is processed

- GIVEN a webhook with an invalid or missing signature
  WHEN the handler receives it
  THEN it returns 401 Unauthorized and does not process the event

- GIVEN a `room_started` event
  WHEN processed
  THEN an audit log entry is created: action = "TELEHEALTH_ROOM_STARTED", resourceType = "Appointment", resourceId = appointmentId (parsed from room name `session-{appointmentId}`)

- GIVEN a `participant_joined` event
  WHEN processed
  THEN an audit log entry is created: action = "TELEHEALTH_PARTICIPANT_JOINED", with participant identity from the token

- GIVEN a `room_finished` event
  WHEN processed
  THEN an audit log entry is created: action = "TELEHEALTH_ROOM_FINISHED", with duration metadata

- GIVEN the same webhook event ID is received twice (duplicate delivery)
  WHEN the handler processes the second delivery
  THEN it is ignored (idempotent -- deduplicate by event ID stored in a short-lived cache or DB lookup)

### Non-Functional Requirements

#### NFR-1: Performance

- Token generation must respond within 200ms (local JWT signing, no external API call)
- Pre-join device enumeration must complete within 2 seconds
- Time to first video frame after clicking "Join" must be under 3 seconds on broadband connections
- LiveKit server must handle at least 10 concurrent 1-on-1 rooms (20 participants) on a single Railway container (1 vCPU, 2GB RAM)

#### NFR-2: Security and HIPAA

- All media transport encrypted via DTLS-SRTP (built into LiveKit, no configuration needed)
- LiveKit API key and secret stored as environment variables, never in code or database
- Room names contain no PHI -- format is `session-{appointmentId}` (opaque CUID)
- Token identities contain no PHI -- format is `clinician-{id}` / `participant-{id}` (opaque CUIDs)
- Tokens are single-room, single-identity, 2-hour TTL, non-renewable
- Webhook handler validates signatures before processing any event
- No session recording in MVP (recording introduces PHI storage obligations)
- Video/audio streams are ephemeral -- LiveKit does not persist media unless recording is enabled (it is not)
- Audit logs capture session events (join, leave, duration) without capturing media content
- The LiveKit server must be deployed behind HTTPS (TLS termination at the load balancer / Railway proxy)

#### NFR-3: Reliability

- LiveKit container auto-restarts on failure (Railway restart policy, already configured for the API)
- If LiveKit server is unreachable, the "Start Video Session" button shows "Video service unavailable" and the clinician can fall back to pasting an external link in `videoCallUrl`
- Client-side auto-reconnect on temporary network drops (LiveKit SDK built-in, up to 30s)
- Webhook delivery failures do not block the session -- duration can be reconstructed from client-side timestamps as a fallback

#### NFR-4: Accessibility

- All call controls are keyboard-navigable
- Mute/unmute and camera toggle buttons have ARIA labels
- Screen reader announces participant join/leave events
- High contrast mode for call controls
- Pre-join screen works on mobile browsers (responsive layout)

### Scope

#### In Scope

- `POST /api/telehealth/token` -- LiveKit token generation with appointment ownership verification
- `POST /api/telehealth/webhooks` -- LiveKit webhook handler for audit logging
- Pre-join screen with device selection (camera, mic, speaker)
- Waiting room UX (participant waits for clinician; clinician waits for participant)
- 1-on-1 video call with mute, camera toggle, screen share, leave, end session
- Connection quality indicator
- "Start Video Session" button on appointment detail page (time-windowed)
- Participant join link (`/session/{appointmentId}/join`)
- LiveKit server Docker config for Railway deployment (TCP fallback)
- `livekit.yaml` configuration file
- `docker-compose.yml` additions for local development
- Environment variables: `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`

#### Out of Scope

- Session recording and playback
- AI transcription / note-taking
- In-call chat / messaging
- Group sessions (max 2 participants enforced)
- Mobile app native video integration (participants use web browser for MVP)
- In-call session prep sidebar (viewing trackers/homework during call)
- Virtual whiteboard / screen annotation
- AWS Terraform deployment (future sprint)
- Automatic appointment status change on session end
- TURN server self-hosting (use Twilio TURN for MVP)
- LiveKit Cloud fallback (self-hosted only for MVP)
- Calendar integration for session links (clinician manually shares link or participant uses the app)

### User Stories

#### US-1: Clinician Starts a Video Session

> As a clinician, I want to start a video session directly from an appointment page so that I do not need to switch to an external video tool.

**Acceptance criteria:** See FR-6.

**Priority:** P0 (core flow)

#### US-2: Participant Joins a Video Session

> As a participant, I want to join my therapy session via a link so that I can connect from any device with a browser.

**Acceptance criteria:** See FR-7, FR-2.

**Priority:** P0 (core flow)

#### US-3: Device Preview Before Joining

> As a user (clinician or participant), I want to preview my camera and microphone before joining the session so that I can verify my setup is working.

**Acceptance criteria:** See FR-2.

**Priority:** P0 (table stakes for telehealth)

#### US-4: Waiting Room Experience

> As a participant who arrives early, I want to see a waiting screen so that I know the session has not started yet and I am in the right place.

**Acceptance criteria:** See FR-3.

**Priority:** P1 (UX polish, not blocking)

#### US-5: In-Session Controls

> As a clinician or participant, I want standard call controls (mute, camera, screen share, leave) so that I can manage the session like any video call.

**Acceptance criteria:** See FR-4.

**Priority:** P0 (core flow)

#### US-6: End Session

> As a clinician, I want to end the session for both participants so that the room is cleanly closed and duration is logged.

**Acceptance criteria:** See FR-5.

**Priority:** P0 (core flow)

#### US-7: Session Audit Trail

> As a practice owner, I want video session events (start, join, end, duration) logged automatically so that I have documentation for telehealth billing compliance.

**Acceptance criteria:** See FR-8, FR-5.

**Priority:** P0 (HIPAA/billing requirement)

#### US-8: Graceful Degradation

> As a clinician, I want to fall back to an external video link if the LiveKit server is unavailable so that I can still conduct the session.

**Acceptance criteria:** The existing `videoCallUrl` field on sessions/appointments remains functional. If the LiveKit health check fails, the "Start Video Session" button is replaced with a note to use an external link.

**Priority:** P1 (reliability)

### Success Metrics

| Metric | Target | Measurement |
|---|---|---|
| **Connection success rate** | >= 95% of attempted sessions result in both participants connecting | Webhook logs: `room_started` events where 2 `participant_joined` events follow |
| **Time to first frame** | < 3 seconds (p50), < 5 seconds (p95) | Client-side performance instrumentation |
| **Cost reduction** | $6,000+/year savings vs. Daily.co HIPAA plan | Infrastructure cost tracking (Railway billing) |
| **Adoption rate** | > 50% of VIRTUAL appointments use integrated video within 30 days of launch | Count of appointments where telehealth audit logs exist vs. total VIRTUAL appointments |
| **Session completion rate** | > 98% of started sessions complete without technical disconnection requiring a new room | Webhook logs: `room_finished` with duration > 5 min / total `room_started` |
| **Clinician satisfaction** | Qualitative: clinicians prefer integrated video over external links | User feedback (post-launch survey) |

### Dependencies

| Dependency | Type | Status | Notes |
|---|---|---|---|
| LiveKit server (Docker image `livekit/livekit-server`) | Infrastructure | Available | Official Docker image, MIT licensed |
| `livekit-server-sdk` (Node.js) | npm package | Available | Token generation, webhook verification |
| `@livekit/components-react` | npm package | Available | Pre-built React components for video UI |
| `livekit-client` | npm package | Available | Core client SDK, dependency of components-react |
| Railway TCP port exposure | Infrastructure | Available | Railway supports custom TCP ports. UDP not available. |
| Twilio Network Traversal (TURN) | External service | Available | $0.002/min. Needed for participants behind restrictive NATs. |
| Appointment model | Existing code | Done | `model Appointment` in schema.prisma with `status`, `participantId`, `clinicianId`, location relation |
| Auth middleware | Existing code | Done | `authenticate` + `requireRole()` in `packages/api/src/middleware/auth.ts` |
| Audit logging | Existing code | Done | `audit-middleware.ts` with `runWithAuditUser()` for HIPAA-compliant logging |
| Practice context middleware | Existing code | Done | `requirePracticeCtx` for multi-tenant isolation |

### Migration Plan from External Video Links

This is an **additive feature**, not a replacement migration. The existing `videoCallUrl` field remains fully functional.

**Phase 1 -- Parallel operation (this sprint):**
- Deploy LiveKit server alongside existing API on Railway.
- Add "Start Video Session" button to VIRTUAL appointment pages.
- Existing `videoCallUrl` field remains editable and functional.
- Clinicians choose: use integrated video OR paste an external link.
- No data migration needed. No breaking changes.

**Phase 2 -- Default to integrated (2-4 weeks post-launch, based on metrics):**
- Make "Start Video Session" the primary CTA on VIRTUAL appointments.
- Move `videoCallUrl` field to a secondary "Use External Link" option.
- Monitor connection success rate and clinician feedback.

**Phase 3 -- Full integration (future):**
- Auto-generate session links when VIRTUAL appointments are created.
- Include join link in appointment reminder notifications (push + email).
- Add mobile app native video support.
- Consider deprecating manual `videoCallUrl` if adoption is high enough.

**Rollback plan:** If LiveKit self-hosting proves unreliable, the feature can be disabled by removing the "Start Video Session" button. No data is lost. The `videoCallUrl` external link flow continues to work as it does today. Alternatively, swap self-hosted LiveKit for LiveKit Cloud (paid, managed) with zero client-side code changes -- only the `LIVEKIT_URL` environment variable changes.

### Open Questions

1. **Railway UDP timeline** -- Is Railway planning to support UDP port exposure? This would eliminate the need for TCP fallback and improve call quality. If not, the AWS migration (Phase 2 infra) becomes higher priority.
2. **TURN server choice** -- Twilio TURN is simplest for MVP ($0.002/min, ~$2-5/month for 30 sessions/week). Should we self-host coturn to eliminate the external dependency, or is the Twilio cost acceptable long-term?
3. **Mobile app integration timeline** -- Participants currently join via web browser. When should we invest in native video via `@livekit/react-native`? This depends on mobile app usage patterns.
4. **Session recording requirements** -- Some states require client consent for recording. If/when we add recording, what consent flow is needed? This is explicitly out of scope for MVP but shapes the data model if we want to future-proof.
5. **Appointment reminder integration** -- Should session join links be included in push notification reminders (15 min before appointment)? This is a quick win post-MVP but needs the notification service to know the session URL format.
6. **RTM auto-logging** -- The existing `completeSession` service auto-logs 20 minutes of interactive communication time for RTM. Should `room_finished` webhooks also trigger RTM time logging with the actual measured duration? This would be more accurate than the current flat 20-minute estimate.

### Glossary

| Term | Definition |
|---|---|
| **LiveKit** | Open-source WebRTC infrastructure (SFU) for real-time video/audio. MIT licensed. |
| **SFU** | Selective Forwarding Unit -- server that receives media from each participant and forwards it to others (vs. peer-to-peer or MCU). Scales better than P2P for multi-party calls. |
| **DTLS-SRTP** | Datagram Transport Layer Security + Secure Real-time Transport Protocol. The standard encryption for WebRTC media streams. Built into LiveKit. |
| **TURN** | Traversal Using Relays around NAT. A relay server that forwards media when direct peer-to-peer connections fail due to firewalls or NAT. |
| **NAT** | Network Address Translation. Routers that share one public IP among multiple devices. Can block incoming WebRTC connections. |
| **ICE** | Interactive Connectivity Establishment. The protocol WebRTC uses to find the best connection path (direct, STUN, or TURN). |
| **Room** | A LiveKit concept representing a virtual space where participants connect. Maps 1:1 to an appointment. |
| **Token Grant** | The permissions embedded in a LiveKit access token (which room, what actions -- publish, subscribe, screen share). |
| **PIP** | Picture-in-Picture. The small self-view overlay showing your own camera during a call. |
| **BAA** | Business Associate Agreement. Required under HIPAA when a third party handles PHI. Self-hosting eliminates the need for a BAA with the video provider. |
