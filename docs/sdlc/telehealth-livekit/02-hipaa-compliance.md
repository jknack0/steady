# Self-Hosted LiveKit Telehealth Video - HIPAA Compliance Assessment

## Overall Verdict: PASS_WITH_CONDITIONS

The self-hosted LiveKit architecture is a strong choice for HIPAA-compliant telehealth. Because LiveKit runs on infrastructure the organization controls (no vendor SaaS), the primary Business Associate risk is eliminated for the media server itself. Media streams are encrypted in transit via DTLS-SRTP (a standard WebRTC encryption layer), and no recording means no PHI at rest in the media plane. The design avoids PHI in room names, limits room occupancy to 2, and uses short-lived tokens.

The conditions below address gaps that must be closed before production deployment. The most critical are: ensuring the LiveKit server configuration disables recording and room metadata exposure, implementing explicit telehealth audit logging (beyond what Prisma middleware captures), securing the webhook endpoint against forgery, and executing an AWS BAA when migrating from Railway.

**Disclaimer:** This document is technical guidance for the engineering team, not legal advice. Final compliance decisions must involve qualified legal counsel and the designated Privacy Officer.

## Regulatory Frameworks Assessed

- HIPAA Privacy Rule (45 CFR Part 160 and Subparts A, E of Part 164)
- HIPAA Security Rule (45 CFR Part 164 Subpart C)
- HIPAA Breach Notification Rule (45 CFR Part 164 Subpart D)
- HHS Telehealth Guidance (OCR FAQ on telehealth and HIPAA)
- NIST SP 800-66 (Implementing the HIPAA Security Rule)

## Data Classification

### PHI Inventory

| Data Element | PHI Type | Storage Location | Encrypted at Rest | Encrypted in Transit | Sensitivity |
|---|---|---|---|---|---|
| Video/audio stream content | Health data (clinical encounter) | None (real-time only, no recording) | N/A | Yes (DTLS-SRTP) | Critical |
| Room name (session-{appointmentId}) | Indirect identifier | LiveKit server memory (ephemeral) | N/A (in-memory) | Yes (WSS/TLS) | Low |
| LiveKit JWT token (room access) | Access credential | Client memory (ephemeral) | N/A | Yes (TLS) | High |
| Appointment ID (in token claims) | Indirect identifier | JWT payload | N/A (ephemeral) | Yes (TLS) | Low |
| Session metadata in DB | Operational data linked to patient | PostgreSQL sessions table | Yes (PostgreSQL + field-level for notes) | Yes (TLS to DB) | Medium |
| Clinician notes (post-session) | Health data (clinical documentation) | PostgreSQL sessions.clinicianNotes | Yes (AES-256-GCM field-level) | Yes (TLS) | Critical |
| Participant summary (post-session) | Health data | PostgreSQL sessions.participantSummary | Yes (AES-256-GCM field-level) | Yes (TLS) | Critical |
| Webhook event payloads | Operational metadata | Application logs (transient) | Depends on implementation | Yes (TLS) | Medium |
| Client IP address (in webhook events) | Indirect identifier | Webhook payload | Depends on implementation | Yes (TLS) | Medium |
| LiveKit API key + secret | Infrastructure credential | Environment variable | Yes (env var, not DB) | N/A | Critical |
| TURN server credentials | Infrastructure credential | LiveKit server config | Yes (env var) | Yes (TLS to TURN) | Critical |

### PHI Flow Diagram (Logical)

```
Clinician Browser --DTLS-SRTP--> LiveKit Server --DTLS-SRTP--> Participant Browser/App
       |                              |                                |
       | WSS (signaling)              | Webhook (HTTPS)                | WSS (signaling)
       |                              v                                |
       +------ HTTPS ------> Steady API (token service) <-- HTTPS -----+
                              |
                              v
                         PostgreSQL
                    (session metadata only,
                     no media stored)
```

## Assessment by Area

### 1. Token Generation and Access Control

**Status:** CONDITIONAL PASS

**Positive findings:**
- The token endpoint (POST /api/telehealth/token) sits behind the existing authenticate + requireRole() middleware, which is well-implemented (see packages/api/src/middleware/auth.ts).
- 2-hour token expiry is reasonable for therapy sessions (typical 50-minute session + buffer).
- Room name uses session-{appointmentId} which contains no PHI (no patient name, no clinical data).

**Required conditions:**

- **COND-1a (Appointment ownership verification):** The token endpoint MUST verify that the requesting user is an authorized participant in the appointment. Specifically:
  - If the requester is a CLINICIAN: verify appointment.clinicianId matches req.user.clinicianProfileId.
  - If the requester is a PARTICIPANT: verify appointment.participantId matches req.user.participantProfileId.
  - Return 403 if ownership check fails. Never issue a token for an appointment the user does not own.
  - This follows the existing pattern in packages/api/src/routes/sessions.ts (verifySessionOwnership()).

- **COND-1b (Appointment status validation):** Only issue tokens for appointments in SCHEDULED or IN_PROGRESS status. Do not issue tokens for CANCELLED, COMPLETED, or NO_SHOW appointments.

- **COND-1c (Token claims minimization):** The LiveKit JWT must contain only:
  - roomName: session-{appointmentId}
  - participantIdentity: user ID (CUID, not email or name)
  - participantName: first name only or role label (e.g., Clinician, Participant) -- never full name + clinical context
  - Room permissions (publish audio/video, subscribe)
  - No diagnosis codes, insurance info, clinical notes, or other PHI in token metadata.

- **COND-1d (Max participants enforcement):** Set maxParticipants: 2 in the LiveKit room creation options. This prevents unauthorized third parties from joining even if they obtain a valid token.

- **COND-1e (Rate limiting):** Apply rate limiting to the token endpoint (recommend 10 requests per user per 15-minute window) to prevent token farming.

### 2. Media Transport Encryption

**Status:** PASS

**Analysis:**
LiveKit uses DTLS-SRTP for all media transport, which is built into the WebRTC standard. This provides:
- **DTLS** (Datagram Transport Layer Security): Key exchange and authentication for the media channel.
- **SRTP** (Secure Real-time Transport Protocol): Encryption of audio and video media packets.

This is end-to-end encrypted between each client and the LiveKit SFU (Selective Forwarding Unit). The SFU decrypts and re-encrypts when forwarding between participants -- this is standard SFU architecture and is acceptable under HIPAA because the SFU is self-hosted on controlled infrastructure.

**Positive findings:**
- DTLS-SRTP is mandatory in WebRTC and cannot be disabled -- there is no configuration to accidentally turn it off.
- Signaling (WebSocket) connections to LiveKit use WSS (WebSocket Secure / TLS).
- The API token endpoint is served over HTTPS (enforced by the existing Strict-Transport-Security header in production, line 84 of app.ts).

**No conditions required.** DTLS-SRTP meets the HIPAA Security Rule transmission security requirement (45 CFR 164.312(e)(1)).

### 3. Webhook Event Logging

**Status:** CONDITIONAL PASS

**PHI exposure analysis for LiveKit webhook events:**

| Event Type | Payload Contents | PHI Risk | Notes |
|---|---|---|---|
| room_started | Room name, room ID | Low | Room name contains appointmentId (opaque CUID) |
| room_finished | Room name, room ID, duration | Low | Duration is session metadata |
| participant_joined | Room name, participant identity, metadata | Medium | Identity is user ID; metadata MUST NOT contain PHI |
| participant_left | Room name, participant identity, duration | Medium | Same as above |
| track_published | Room name, participant identity, track type | Low | No PHI in track type |
| egress_started | Full egress configuration | High | Only if recording is enabled -- MUST be disabled |
| egress_ended | Egress output location, duration | High | Only if recording is enabled -- MUST be disabled |

**Required conditions:**

- **COND-3a (Webhook payload sanitization):** The webhook handler MUST NOT log raw webhook payloads at any log level. Extract only: event type, room name, participant identity (user ID), and timestamp. Use the existing logger from packages/api/src/lib/logger.ts which sanitizes error objects.

- **COND-3b (No PHI in participant metadata):** When generating LiveKit tokens, do NOT set participant metadata to any value containing PHI (patient name, diagnosis, session notes, etc.). If metadata is needed for the client UI, use only the user role (CLINICIAN or PARTICIPANT) and user ID.

- **COND-3c (Webhook signature verification):** LiveKit webhooks must be verified using the API key and secret (LiveKit provides a WebhookReceiver class for this). Follow the same pattern as the Stripe webhook handler in packages/api/src/routes/stripe-webhooks.ts -- verify before processing, reject with 401 on failure. The webhook endpoint MUST use raw body parsing (not JSON-parsed) for signature verification.

- **COND-3d (Webhook endpoint authentication):** The webhook endpoint (POST /api/telehealth/webhooks) must NOT use the standard authenticate middleware (LiveKit server sends these, not a logged-in user). Instead, authenticate via LiveKit webhook signature verification only. Do NOT expose this endpoint without any authentication.

### 4. Room Naming Conventions

**Status:** PASS

**Analysis:**
The proposed room naming convention session-{appointmentId} is compliant. The appointmentId is a CUID (e.g., clx1abc2def3ghi4jkl) -- an opaque identifier that reveals nothing about the patient, clinician, diagnosis, or treatment.

**Verified against existing schema:** The Appointment model (line 608, schema.prisma) uses @id @default(cuid()), confirming IDs are opaque strings.

**Positive findings:**
- No patient name, email, or clinical data in room names.
- No sequential numeric IDs that could be enumerated.
- Room names are ephemeral (only exist while the room is active in LiveKit in-memory state).

**No conditions required.** This meets the HIPAA Minimum Necessary standard.

### 5. Infrastructure Security

**Status:** CONDITIONAL PASS

**Required conditions:**

- **COND-5a (Network isolation):** The LiveKit server must run in the same Railway project/environment as the API server. Use Railway private networking for API-to-LiveKit communication (webhook delivery, admin API calls). Only the WebRTC media ports and signaling WebSocket should be publicly accessible.

- **COND-5b (AWS BAA):** When migrating to AWS, execute a BAA with AWS before deploying the LiveKit server. AWS provides a standard BAA through AWS Artifact. The LiveKit EC2 instance (or ECS task) must run within a VPC with: security groups limiting ingress to required ports only, no public SSH access (use SSM Session Manager), encrypted EBS volumes, and CloudWatch logging with no PHI in log content.

- **COND-5c (LiveKit server hardening):**
  - Disable all recording/egress features in the LiveKit server configuration (room_composite and track_composite must be disabled or not configured).
  - Set max_participants: 2 as a server-level default.
  - Enable require_auth: true so all room joins require a valid token.
  - Disable the LiveKit Dashboard/admin UI in production (or restrict to VPN/private network only).
  - Set log_level: info (not debug, which may log participant details).

- **COND-5d (Environment variable management):** LiveKit API key and secret must be stored as environment variables, never in code, config files committed to git, or database. Follow the existing pattern where JWT_SECRET is loaded via requireEnv() in packages/api/src/lib/env.ts.

- **COND-5e (TLS for signaling):** LiveKit signaling endpoint (WebSocket) MUST use WSS (TLS). If self-hosting, this means either: terminating TLS at a reverse proxy (e.g., Caddy, nginx, or AWS ALB) in front of LiveKit, or configuring LiveKit built-in TLS with a valid certificate. Self-signed certificates are NOT acceptable in production.

### 6. Audit Logging Requirements

**Status:** CONDITIONAL PASS

**Analysis of existing audit infrastructure:**
The codebase has a solid audit foundation:
- Prisma middleware (packages/db/src/audit-middleware.ts) automatically logs CREATE/UPDATE/DELETE mutations with user ID, action, resource type, resource ID, and changed field names -- never values.
- AsyncLocalStorage (runWithAuditUser) propagates user context without parameter threading.
- The AuditAction enum currently supports: CREATE, UPDATE, DELETE.
- The AuditLog model stores: userId, action, resourceType, resourceId, metadata (JSON), timestamp.

**Gap:** Telehealth session events (join, leave, media state changes) do not go through Prisma -- they come from LiveKit webhooks and client-side actions. These MUST be explicitly audit-logged, following the same pattern as the Stripe payment audit logging requirement (COND-6 in docs/sdlc/stripe-private-pay/03-compliance.md).

**Required conditions:**

- **COND-6a (Extend AuditAction enum):** Add a new audit action to capture telehealth-specific events. Options:
  - Add ACCESS to the AuditAction enum (covers "viewed PHI" / "joined session") -- this is the recommended approach as it has broader utility.
  - Alternatively, use the existing CREATE action with a resourceType of TelehealthSession and encode event details in metadata.

- **COND-6b (Required audit events):** The following events MUST be logged to the audit_logs table:

  | Event | Trigger | userId | resourceType | resourceId | metadata |
  |---|---|---|---|---|---|
  | Token issued | Token endpoint called | Requesting user ID | TelehealthToken | appointmentId | { role: CLINICIAN or PARTICIPANT } |
  | Participant joined | Webhook: participant_joined | User ID (from identity) | TelehealthSession | appointmentId | { event: joined } |
  | Participant left | Webhook: participant_left | User ID (from identity) | TelehealthSession | appointmentId | { event: left, durationSeconds: N } |
  | Room closed | Webhook: room_finished | null (system event) | TelehealthSession | appointmentId | { event: room_closed, totalDurationSeconds: N } |
  | Token denied | Ownership check failed | Requesting user ID | TelehealthToken | appointmentId | { event: denied, reason: ownership or status } |

- **COND-6c (No PHI in audit metadata):** Audit metadata must contain only IDs, event names, durations, and role labels. Never log: participant names, IP addresses, user agents, or clinical content in audit metadata.

- **COND-6d (Audit log retention):** Telehealth audit logs must follow the same retention policy as other audit records. HIPAA requires a minimum of 6 years for most records. Ensure the audit_logs table is not subject to automated cleanup shorter than 6 years.

### 7. Business Associate Agreement Requirements

**Status:** CONDITIONAL PASS

| Entity | Handles PHI? | BAA Required? | Status |
|---|---|---|---|
| LiveKit (self-hosted) | Media transits through it, but under org control | No -- self-hosted is not a business associate | N/A |
| Railway (current hosting) | Hosts the server that processes PHI | Yes | Must verify |
| AWS (future hosting) | Will host LiveKit server + API | Yes | Must execute before migration |
| Third-party TURN (if used) | TURN relays media | Yes (if third-party) | Must execute if applicable |

**Required conditions:**

- **COND-7a (Railway BAA verification):** Confirm that a BAA is in place with Railway for the current hosting arrangement. Railway processes PHI (database, API server). If Railway does not offer a BAA, this is a pre-existing gap that affects the entire platform, not just telehealth.

- **COND-7b (AWS BAA before migration):** Execute a BAA with AWS through AWS Artifact before deploying any LiveKit infrastructure on AWS.

- **COND-7c (TURN server BAA):** If using a third-party TURN relay service (e.g., Twilio TURN, Xirsys), a BAA is required because TURN servers relay the actual media stream (audio/video of therapy sessions). If using LiveKit built-in TURN (co-located on the same server), no additional BAA is needed. Self-hosted TURN on controlled infrastructure is the recommended approach.

### 8. Data at Rest

**Status:** PASS (with recording disabled)

**Analysis:**
With no recording planned, the only data at rest related to telehealth is session metadata in PostgreSQL:

| Data | Table | Field-Level Encryption |
|---|---|---|
| Session schedule/status | sessions | No (operational data) |
| Clinician notes | sessions.clinicianNotes | Yes (AES-256-GCM, already in ENCRYPTED_FIELDS) |
| Participant summary | sessions.participantSummary | Yes (AES-256-GCM, already in ENCRYPTED_FIELDS) |
| Appointment details | appointments | No (operational data) |
| Video call URL | sessions.videoCallUrl | No (will be replaced by LiveKit room URL) |

**Positive findings:**
- clinicianNotes and participantSummary are already in the ENCRYPTED_FIELDS map (line 8, encryption-middleware.ts), meaning they are encrypted with AES-256-GCM via the Prisma encryption middleware.
- No media is stored. No recording. No screenshots. No transcripts.
- Room state exists only in LiveKit in-memory store and is destroyed when the room closes.

**Recommendation (non-blocking):** Consider adding videoCallUrl to the ENCRYPTED_FIELDS map if it will contain LiveKit room URLs that encode room identifiers.

### 9. Client-Side Concerns

**Status:** CONDITIONAL PASS

**Required conditions:**

- **COND-9a (No PHI caching):** The existing Cache-Control: no-store header (line 81, app.ts) applies to all API responses. Verify that the token endpoint response is not cached by service workers or browser HTTP cache.

- **COND-9b (No PHI in browser storage):** The LiveKit access token must NOT be stored in localStorage or sessionStorage. Hold it only in JavaScript memory (React state or ref). If the user refreshes the page, request a new token from the API.

- **COND-9c (Camera/microphone permission handling):** The client must handle permission denial gracefully with a clear user-facing message. Do not log the specific browser permission error details to the server -- these may contain device identifiers. Log only camera_denied or microphone_denied event types.

- **COND-9d (Session timeout alignment):** The existing 30-minute inactivity timeout (Steady session) must not interrupt an active video call. Implement a heartbeat or activity signal from the video call component to prevent session timeout during active calls.

- **COND-9e (Secure teardown):** When the video call ends, the client must: disconnect from the LiveKit room, release all media tracks (camera, microphone), and clear the LiveKit token from memory. Use room.disconnect() and track.stop() from the LiveKit client SDK. Add a beforeunload event listener as a safety net.

- **COND-9f (Mobile app -- Expo):** For the mobile participant app (Expo 54 / React Native 0.81):
  - Use expo-camera and expo-av permissions APIs (not raw getUserMedia).
  - Store the LiveKit token in memory only (not Expo Secure Store -- tokens are ephemeral).
  - Handle app backgrounding: disconnect from the room when the app enters background state.

### 10. TURN Server Security

**Status:** CONDITIONAL PASS

**Analysis:**
TURN (Traversal Using Relays around NAT) servers are necessary when direct peer-to-peer or SFU connections fail due to firewalls or symmetric NAT. In a therapy context, many participants connect from corporate networks or restrictive home networks where TURN is required.

TURN is a critical security surface because it relays the actual encrypted media stream.

**Required conditions:**

- **COND-10a (Self-hosted TURN preferred):** Use LiveKit built-in TURN server (co-located on the same host/container as the SFU) rather than a third-party TURN service. This eliminates the need for an additional BAA and keeps media within controlled infrastructure.

- **COND-10b (Short-lived TURN credentials):** TURN credentials must be short-lived (generated per-session, not static). LiveKit handles this automatically when using its built-in TURN -- the JWT token includes TURN credentials.

- **COND-10c (TURN port restrictions):** Configure TURN to use a specific port range for relay allocation (e.g., UDP 50000-60000). Do not use the full ephemeral port range. Restrict TURN relay to the LiveKit SFU IP address only -- do not allow open relay.

- **COND-10d (TLS for TURN signaling):** Use TURNS (TURN over TLS, port 443) as the primary TURN transport. This provides an additional encryption layer on the TURN control channel and allows traversal through firewalls that block non-443 traffic.

## Risk Assessment

| ID | Risk | Likelihood | Impact | Mitigation | HIPAA Rule |
|---|---|---|---|---|---|
| RISK-1 | Unauthorized room join (token theft or crafting) | Low | Critical | COND-1a, COND-1d, short token expiry | Security Rule 164.312(d) |
| RISK-2 | PHI in webhook logs (participant names, IP addresses) | Medium | High | COND-3a, COND-3b | Security Rule 164.312(b) |
| RISK-3 | Webhook forgery (fake session events injected) | Medium | High | COND-3c | Security Rule 164.312(e)(1) |
| RISK-4 | Session recording enabled accidentally | Low | Critical | COND-5c | Security Rule 164.312(c)(1) |
| RISK-5 | Missing audit trail for video session access | High (if not implemented) | High | COND-6a, COND-6b | Security Rule 164.312(b) |
| RISK-6 | LiveKit token persisted in browser storage | Medium | Medium | COND-9b | Security Rule 164.312(a)(2)(iv) |
| RISK-7 | TURN server used as open relay | Low | Medium | COND-10c | Security Rule 164.312(e)(1) |
| RISK-8 | Session timeout during active video call | High (if not handled) | Low | COND-9d | Security Rule 164.312(a)(2)(iii) |
| RISK-9 | LiveKit API key/secret exposure in logs or code | Low | Critical | COND-5d | Security Rule 164.312(a)(1) |
| RISK-10 | No BAA with hosting provider | Medium | Critical | COND-7a, COND-7b | Administrative Safeguards 164.308(b)(1) |
| RISK-11 | Media stream interception via compromised TURN | Very Low | Critical | DTLS-SRTP (inherent), COND-10a | Security Rule 164.312(e)(1) |
| RISK-12 | PHI in LiveKit token claims | Medium (if not specified) | Medium | COND-1c | Privacy Rule 164.502(b) |

## Mandatory Conditions Summary

| ID | Condition | Category | Blocking? |
|---|---|---|---|
| COND-1a | Appointment ownership verification on token endpoint | Access Control | Yes |
| COND-1b | Appointment status validation before token issuance | Access Control | Yes |
| COND-1c | Token claims minimization (no PHI in JWT metadata) | Privacy / Minimum Necessary | Yes |
| COND-1d | Max 2 participants enforced in room creation | Access Control | Yes |
| COND-1e | Rate limiting on token endpoint | Security | Yes |
| COND-3a | No raw webhook payload logging | Audit / Privacy | Yes |
| COND-3b | No PHI in LiveKit participant metadata | Privacy / Minimum Necessary | Yes |
| COND-3c | Webhook signature verification | Integrity / Authentication | Yes |
| COND-3d | Webhook endpoint uses LiveKit auth, not user JWT | Authentication | Yes |
| COND-5a | Network isolation between API and LiveKit | Infrastructure Security | Yes |
| COND-5b | AWS BAA before migration | Administrative Safeguards | Yes (before AWS) |
| COND-5c | Recording/egress disabled in LiveKit server config | Privacy / Data Minimization | Yes |
| COND-5d | LiveKit credentials in environment variables only | Credential Management | Yes |
| COND-5e | TLS on LiveKit signaling endpoint | Transmission Security | Yes |
| COND-6a | Extend AuditAction or use existing actions for telehealth | Audit Controls | Yes |
| COND-6b | Log all required telehealth audit events | Audit Controls | Yes |
| COND-6c | No PHI in audit metadata | Audit / Privacy | Yes |
| COND-6d | 6-year minimum audit log retention | Retention | Yes |
| COND-7a | Verify Railway BAA is in place | Administrative Safeguards | Yes |
| COND-7b | AWS BAA before migration | Administrative Safeguards | Yes (before AWS) |
| COND-7c | BAA for third-party TURN (if used) | Administrative Safeguards | Yes (if applicable) |
| COND-9a | No caching of token endpoint responses | Client Security | Yes |
| COND-9b | LiveKit token in memory only, not browser storage | Client Security | Yes |
| COND-9c | Graceful camera/mic permission handling | Client Security / Privacy | Yes |
| COND-9d | Session timeout suppressed during active video call | Availability | Yes |
| COND-9e | Secure teardown on call end | Client Security | Yes |
| COND-9f | Mobile app: memory-only token, background disconnect | Client Security | Yes |
| COND-10a | Self-hosted TURN preferred over third-party | Infrastructure | Recommended |
| COND-10b | Short-lived TURN credentials | Authentication | Yes |
| COND-10c | TURN port range restrictions | Network Security | Yes |
| COND-10d | TURNS (TLS) for TURN signaling | Transmission Security | Recommended |

## Implementation Checklist

### Token Service (POST /api/telehealth/token)
- [ ] Endpoint uses authenticate + requireRole(CLINICIAN, PARTICIPANT) middleware
- [ ] Appointment ownership verified (clinician owns appointment OR participant is the patient)
- [ ] Appointment status checked (SCHEDULED or IN_PROGRESS only)
- [ ] LiveKit JWT contains only: room name (opaque), participant identity (user ID), participant name (first name or role), room permissions
- [ ] No PHI in token metadata fields
- [ ] maxParticipants: 2 set in room creation grant
- [ ] Rate limiting applied (10 requests / 15 minutes / user)
- [ ] Audit log entry created on token issuance (user ID, appointmentId, role)
- [ ] Audit log entry created on token denial (user ID, appointmentId, reason)
- [ ] LiveKit API key and secret loaded from environment variables via requireEnv()
- [ ] Token expiry set to 2 hours

### Webhook Handler (POST /api/telehealth/webhooks)
- [ ] Endpoint does NOT use authenticate middleware
- [ ] LiveKit webhook signature verified using API key + secret
- [ ] Raw body parsing used for signature verification (same pattern as Stripe webhooks)
- [ ] Raw webhook payloads are never logged
- [ ] Only extracted fields logged: event type, room name, participant identity (user ID), timestamp
- [ ] Audit log entries created for: participant_joined, participant_left, room_finished
- [ ] No PHI in audit metadata (no names, IPs, user agents)
- [ ] 401 returned on invalid signature
- [ ] 200 returned on success (even if processing fails -- to prevent LiveKit retry storms)

### LiveKit Server Configuration
- [ ] require_auth: true (all room joins require JWT)
- [ ] Recording/egress features disabled
- [ ] max_participants default set to 2
- [ ] log_level: info (not debug)
- [ ] Admin UI disabled in production or restricted to private network
- [ ] TLS configured for signaling (WSS)
- [ ] TURN server co-located (built-in TURN)
- [ ] TURN relay port range restricted (e.g., 50000-60000)
- [ ] API key and secret generated with sufficient entropy (minimum 32 bytes)

### Client-Side (Web)
- [ ] LiveKit token stored in React state/ref only (not localStorage/sessionStorage)
- [ ] Cache-Control: no-store header verified on token endpoint response
- [ ] Camera/microphone permission errors handled gracefully
- [ ] No device identifiers or permission error details sent to server
- [ ] Session timeout heartbeat active during video call
- [ ] room.disconnect() called on call end
- [ ] All media tracks stopped on call end (track.stop())
- [ ] beforeunload listener disconnects from room

### Client-Side (Mobile -- Expo)
- [ ] LiveKit token stored in memory only (not Expo Secure Store)
- [ ] Camera/microphone permissions requested via Expo APIs
- [ ] App background handler disconnects from room
- [ ] All media tracks released on disconnect
- [ ] No PHI in push notification content for call-starting notifications (if implemented)

### Infrastructure
- [ ] Railway BAA verified (or risk accepted and documented)
- [ ] AWS BAA executed before AWS deployment
- [ ] LiveKit server in same network/project as API
- [ ] Private networking for API-to-LiveKit communication
- [ ] Only WebRTC ports + signaling WebSocket publicly accessible
- [ ] No public SSH access to LiveKit server
- [ ] Server environment variables for all secrets

### Database
- [ ] No new PHI columns needed (existing sessions table is sufficient)
- [ ] clinicianNotes and participantSummary already field-level encrypted (verified)
- [ ] Consider adding videoCallUrl to ENCRYPTED_FIELDS if it will contain LiveKit room URLs
- [ ] Audit logs table has appropriate indexes (verified: userId, resourceType, action, timestamp)

## Positive Findings (Things the Design Gets Right)

1. **Self-hosted architecture eliminates vendor BAA complexity** for the media server itself. This is the strongest compliance decision in the design.
2. **No recording** means no PHI at rest in the media plane. This dramatically reduces the data protection surface.
3. **Opaque room naming** (session-{cuid}) avoids PHI exposure in room identifiers, logs, and network traffic metadata.
4. **2-participant limit** prevents unauthorized observers in therapy sessions.
5. **DTLS-SRTP is mandatory and non-configurable** in WebRTC -- encryption cannot be accidentally disabled.
6. **Existing field-level encryption** already covers clinicianNotes and participantSummary with AES-256-GCM.
7. **Existing audit middleware** automatically captures session metadata changes (CREATE/UPDATE/DELETE on the sessions table).
8. **Existing security headers** (Cache-Control: no-store, Strict-Transport-Security, X-Frame-Options: DENY) apply to the token endpoint without additional work.
9. **Existing HIPAA-safe logger** sanitizes error objects and never logs full request/response bodies.
10. **Short token expiry (2hr)** limits the window of token misuse.

## Recommendations (Non-Blocking)

1. **Connection quality monitoring without PHI:** If implementing connection quality metrics (packet loss, jitter, bitrate), log these as aggregate statistics per session, not per-participant. Do not include IP addresses or network topology details in quality metrics.

2. **Waiting room pattern:** Consider implementing a waiting room where the clinician admits the participant. This adds a human verification layer on top of the technical access controls. LiveKit supports this via room permissions (participant joins with canPublish: false, clinician grants publish permission).

3. **Session duration limits:** Consider implementing a server-side maximum session duration (e.g., 3 hours) that automatically disconnects both participants. This prevents abandoned sessions from consuming server resources and creates a natural audit boundary.

4. **Penetration testing:** Before production launch, conduct a targeted penetration test of: the token endpoint (attempt to get tokens for other users appointments), the webhook endpoint (attempt to forge events), and the LiveKit server (port scanning, unauthorized room join attempts).

5. **Disaster recovery for session continuity:** Document the behavior when the LiveKit server restarts mid-session. Both participants should be able to reconnect by requesting new tokens. The client should implement automatic reconnection with exponential backoff.

6. **Future recording considerations:** If session recording is ever added, it will require a separate, full compliance assessment covering: patient consent (written authorization under HIPAA), encryption at rest for recordings (AES-256), access controls for recordings (more restrictive than session metadata), retention and disposal policies, and state-specific recording consent laws (two-party consent states). Do not add recording without a dedicated compliance review.

7. **Participant identity display:** In the video call UI, display only the participant first name or role label. Do not display full name + clinical context (e.g., John Smith -- ADHD Treatment Program) as this could be captured in screenshots.

## Items Requiring Legal/Privacy Officer Review

1. **Telehealth consent language:** Confirm that the existing patient consent/intake process covers telehealth video sessions. Some states require specific telehealth consent disclosures.
2. **State telehealth licensure:** Verify that clinicians using the platform are licensed to provide telehealth services in the patient state of residence. This is a regulatory requirement, not a technical one, but the platform should document it.
3. **Railway BAA status:** The Privacy Officer should confirm whether a BAA is in place with Railway. If not, this is a platform-wide compliance gap that predates the telehealth feature.
4. **Recording prohibition documentation:** Document in the platform policies that session recording is prohibited and that the LiveKit server is configured to prevent it. This protects against future scope creep.
5. **Breach notification scope:** Confirm with counsel that a compromised LiveKit server (if it were to occur) would constitute a breach of PHI requiring notification, given that media streams transit through it. The answer is likely yes (audio/video of therapy sessions is unquestionably PHI), which underscores the importance of server hardening (COND-5c).

---

*Assessment prepared: 2026-04-07*
*Status: FINDINGS_READY*
*Assessor: HIPAA Compliance Engineer (technical guidance -- not legal advice)*
*Next step: Engineering team reviews conditions, Privacy Officer reviews legal items, then proceed to architecture spec*