# Self-Hosted LiveKit Telehealth Video — Technical Architecture

## Overview

This feature replaces the existing Daily.co `videoCallUrl` string pattern on Sessions with a fully integrated, self-hosted LiveKit video infrastructure for HIPAA-compliant 1-on-1 therapy sessions. The architecture introduces a new `TelehealthSession` database model to track room lifecycle, a LiveKit service layer for token generation and room management, a webhook ingestion endpoint for room/participant events, two new API routes (token and webhooks), and a multi-component frontend with pre-join device selection, waiting room, and in-call controls. LiveKit Server runs as a self-hosted Docker container on Railway alongside the existing API, with a future migration path to AWS for TURN/media relay at scale. All media is encrypted in transit (DTLS-SRTP); no PHI passes through LiveKit metadata — only opaque session IDs and role identifiers.

## System Boundary Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Web Frontend (Next.js)                                                      │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────────┐  │
│  │ PreJoinScreen    │ │ WaitingRoom      │ │ VideoCall                    │  │
│  │ (device select,  │ │ (patient waits   │ │ (LiveKit Room, controls,     │  │
│  │  mic/cam test)   │ │  for clinician)  │ │  screen share, disconnect)   │  │
│  └────────┬─────────┘ └────────┬─────────┘ └──────────────┬───────────────┘  │
│           │                    │                           │                  │
│  ┌────────┴────────────────────┴───────────────────────────┴───────────────┐  │
│  │ TelehealthSession (wrapper — state machine, token fetch, error UI)     │  │
│  └────────────────────────────────────┬───────────────────────────────────┘  │
└───────────────────────────────────────┼──────────────────────────────────────┘
                                        │
           ┌────────────────────────────┼─────────────────────────┐
           │ HTTPS                      │ HTTPS                   │ WebRTC (DTLS-SRTP)
           ▼                            ▼                         ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  Railway Infrastructure                                                      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  API Server (Express) — port 4000                                    │    │
│  │                                                                      │    │
│  │  ┌────────────────────────────────────────────────────────────────┐  │    │
│  │  │  /api/telehealth/webhooks  ← raw body, HMAC-SHA256 signature  │  │    │
│  │  │  (registered BEFORE express.json(), NO auth middleware)        │  │    │
│  │  └────────────────────────────────────────────────────────────────┘  │    │
│  │                                                                      │    │
│  │  ┌──────────────────────┐  ┌──────────────────────────────────────┐ │    │
│  │  │ POST /api/telehealth │  │ GET /api/telehealth/:sessionId       │ │    │
│  │  │      /token          │  │ (session status + room info)         │ │    │
│  │  │ (auth required)      │  │ (auth required)                      │ │    │
│  │  └──────────┬───────────┘  └───────────────────┬──────────────────┘ │    │
│  │             │                                   │                    │    │
│  │  ┌──────────┴───────────────────────────────────┴──────────────────┐ │    │
│  │  │  Services Layer                                                 │ │    │
│  │  │  ┌─────────────────────┐  ┌──────────────────────────────────┐  │ │    │
│  │  │  │ livekit-service.ts  │  │ telehealth-service.ts            │  │ │    │
│  │  │  │ (SDK wrapper,       │  │ (room lifecycle, session state,  │  │ │    │
│  │  │  │  token mint,        │  │  waiting room logic, duration    │  │ │    │
│  │  │  │  room create/close) │  │  tracking, webhook processing)  │  │ │    │
│  │  │  └─────────────────────┘  └──────────────────────────────────┘  │ │    │
│  │  └─────────────────────────────────────────────────────────────────┘ │    │
│  │                                                                      │    │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │    │
│  │  │  pg-boss Queue                                                   │ │    │
│  │  │  ┌────────────────────────────┐  ┌─────────────────────────────┐ │ │    │
│  │  │  │ telehealth-webhook-process │  │ telehealth-room-cleanup     │ │ │    │
│  │  │  │ (retry: 3x, exponential)  │  │ (cron: every 15 min,       │ │ │    │
│  │  │  │                            │  │  closes stale rooms)       │ │ │    │
│  │  │  └────────────────────────────┘  └─────────────────────────────┘ │ │    │
│  │  └──────────────────────────────────────────────────────────────────┘ │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  LiveKit Server (Docker) — port 7880 (HTTP) / 7881 (RTC)            │    │
│  │  ┌──────────────────────────────────────────────────────────────┐    │    │
│  │  │  Config: max_participants=2, empty_timeout=300s              │    │    │
│  │  │  Webhooks → https://<api-host>/api/telehealth/webhooks      │    │    │
│  │  │  TURN: built-in UDP relay (port 3478) + TLS fallback (443)  │    │    │
│  │  └──────────────────────────────────────────────────────────────┘    │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌──────────────────┐                                                        │
│  │  PostgreSQL 16   │                                                        │
│  │  (telehealth_    │                                                        │
│  │   sessions table)│                                                        │
│  └──────────────────┘                                                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Sequences

### 1. Clinician Starts a Session

```
Clinician clicks "Start Video" on Session/Appointment
  │
  ▼
[Web] POST /api/telehealth/token
  Body: { sessionId: "sess_abc123" }
  │
  ▼
[API] authenticate → requireRole("CLINICIAN","ADMIN")
  │
  ├─ Verify clinician owns the Session (via enrollment → program → clinicianId)
  │
  ├─ Check for existing TelehealthSession
  │  ├─ If none or ENDED → Create new TelehealthSession (status: WAITING)
  │  │   └─ Call LiveKit API: createRoom({ name: "th_<telehealthSessionId>",
  │  │        emptyTimeout: 300, maxParticipants: 2 })
  │  │   └─ Store roomName, roomSid on TelehealthSession
  │  └─ If WAITING or ACTIVE → reuse existing room
  │
  ├─ Mint LiveKit access token:
  │   identity: "cli_<clinicianProfileId>"
  │   name: "Clinician"  (no real name — HIPAA)
  │   room: "th_<telehealthSessionId>"
  │   grants: { canPublish: true, canSubscribe: true, roomJoin: true,
  │             canPublishData: true, hidden: false }
  │   ttl: 4 hours
  │
  ├─ Update Session.videoCallUrl = internal room URL (for reference)
  │
  └─ Return { token, roomName, wsUrl, telehealthSessionId }

Clinician enters PreJoinScreen → selects devices → connects to LiveKit room
```

### 2. Patient Joins

```
Patient opens session link (from CalendarEvent / upcoming session)
  │
  ▼
[Web/Mobile] POST /api/telehealth/token
  Body: { sessionId: "sess_abc123" }
  │
  ▼
[API] authenticate → requireRole("PARTICIPANT")
  │
  ├─ Verify participant is enrolled in the Session's enrollment
  │
  ├─ Look up TelehealthSession for this Session
  │  ├─ If not found → 404 "Clinician has not started the session yet"
  │  └─ If ENDED → 409 "Session has already ended"
  │
  ├─ Check TelehealthSession.status:
  │  ├─ WAITING (clinician created room but isn't connected yet):
  │  │   → Patient gets token, enters WaitingRoom component
  │  └─ ACTIVE (clinician is connected):
  │      → Patient gets token, enters VideoCall directly
  │
  ├─ Mint LiveKit access token:
  │   identity: "par_<participantProfileId>"
  │   name: "Patient"  (no real name — HIPAA)
  │   room: "th_<telehealthSessionId>"
  │   grants: { canPublish: true, canSubscribe: true, roomJoin: true,
  │             canPublishData: false, hidden: false }
  │   ttl: 4 hours
  │
  └─ Return { token, roomName, wsUrl, telehealthSessionId, status }

Patient enters WaitingRoom or VideoCall depending on status
```

### 3. Session Ends

```
Clinician clicks "End Session" button
  │
  ├─[Client] Disconnect from LiveKit room (local)
  │
  ├─[Client] POST /api/telehealth/token (not needed — webhook handles it)
  │   OR simply disconnect; webhook detects empty room
  │
  ▼
[LiveKit Server] Fires webhook events:
  1. participant_left (clinician)
  2. participant_left (patient — if still connected, auto-disconnected)
  3. room_finished (when empty_timeout expires or all leave)
  │
  ▼
[API] POST /api/telehealth/webhooks
  │
  ├─ Verify webhook signature (HMAC-SHA256 with LIVEKIT_API_SECRET)
  │
  ├─ Queue "telehealth-webhook-process" via pg-boss
  │
  ▼
[pg-boss Worker] Processes events:
  │
  ├─ participant_joined:
  │   └─ Update TelehealthSession:
  │       status → ACTIVE (if first clinician join)
  │       clinicianJoinedAt / participantJoinedAt timestamps
  │
  ├─ participant_left:
  │   └─ Record clinicianLeftAt / participantLeftAt
  │   └─ If both have left: status → ENDED, calculate actualDurationSec
  │
  ├─ room_finished:
  │   └─ status → ENDED (idempotent)
  │   └─ Calculate actualDurationSec from join/leave timestamps
  │   └─ If linked to RTM enrollment: auto-log clinician time
  │   └─ Fire-and-forget: notify if session > scheduled duration
  │
  └─ Return 200 immediately (before processing)
```

## API Endpoint Design

### POST /api/telehealth/token

Generate a LiveKit access token and create/join a telehealth room.

**Auth**: Required (CLINICIAN, PARTICIPANT, ADMIN)

**Request**:
```json
{
  "sessionId": "string (required — existing Session ID)"
}
```

**Response (201 — room created, or 200 — room joined)**:
```json
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "roomName": "th_clxxxxxxxxx",
    "wsUrl": "wss://livekit.steady.app",
    "telehealthSessionId": "clxxxxxxxxx",
    "status": "WAITING | ACTIVE"
  }
}
```

**Error Responses**:
| Status | Condition |
|--------|-----------|
| 400 | Missing/invalid sessionId |
| 401 | Not authenticated |
| 403 | Not authorized for this session |
| 404 | Session not found / Room not started (participant) |
| 409 | Session already ended |
| 503 | LiveKit server unreachable |

### GET /api/telehealth/:telehealthSessionId

Get current telehealth session status (used for polling/reconnection).

**Auth**: Required (CLINICIAN, PARTICIPANT, ADMIN)

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "clxxxxxxxxx",
    "sessionId": "sess_abc123",
    "status": "WAITING | ACTIVE | ENDED",
    "roomName": "th_clxxxxxxxxx",
    "clinicianJoinedAt": "2026-04-07T14:00:00Z",
    "participantJoinedAt": "2026-04-07T14:01:00Z",
    "actualDurationSec": null,
    "createdAt": "2026-04-07T13:59:00Z"
  }
}
```

### POST /api/telehealth/webhooks

LiveKit server-to-server webhook receiver.

**Auth**: None (signature-verified via LIVEKIT_API_SECRET HMAC-SHA256)

**Registration**: BEFORE `express.json()` in `app.ts` (raw body required for signature verification), same pattern as Stripe webhooks.

**Request**: Raw body with `Authorization: Bearer <webhook-token>` header (LiveKit signs webhooks using the API key/secret pair).

**Response**: Always `200 { received: true }` (respond before processing).

**Events Handled**:
| Event | Action |
|-------|--------|
| `room_started` | Update TelehealthSession with roomSid |
| `participant_joined` | Set clinicianJoinedAt/participantJoinedAt, status → ACTIVE |
| `participant_left` | Set clinicianLeftAt/participantLeftAt |
| `room_finished` | status → ENDED, calculate duration, RTM time log |

## Database Model

### TelehealthSession (NEW)

```prisma
enum TelehealthSessionStatus {
  WAITING   // Room created, clinician hasn't connected yet
  ACTIVE    // At least one participant connected
  ENDED     // Room closed, session complete
}

model TelehealthSession {
  id                   String                    @id @default(cuid())
  sessionId            String
  session              Session                   @relation(fields: [sessionId], references: [id])
  roomName             String                    @unique
  roomSid              String?                   // LiveKit room SID (set on room_started webhook)
  status               TelehealthSessionStatus   @default(WAITING)
  clinicianJoinedAt    DateTime?
  participantJoinedAt  DateTime?
  clinicianLeftAt      DateTime?
  participantLeftAt    DateTime?
  actualDurationSec    Int?                      // Calculated on ENDED
  endedReason          String?                   // "clinician_left" | "room_timeout" | "api_closed"
  createdAt            DateTime                  @default(now())
  updatedAt            DateTime                  @updatedAt

  @@index([sessionId])
  @@index([status])
  @@index([createdAt])
  @@map("telehealth_sessions")
}
```

### Session Model (MODIFIED)

```prisma
model Session {
  // ... existing fields ...
  telehealthSessions  TelehealthSession[]   // One Session can have multiple TelehealthSession
                                             // records (reconnections, retries)
}
```

**Design Decision — One-to-Many**: A single `Session` (therapy appointment) may result in multiple `TelehealthSession` records if there are disconnections/reconnections. The most recent non-ENDED record is the "active" one. Total session duration is the sum of all ENDED records' `actualDurationSec`.

### Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| telehealth_sessions | sessionId | Find telehealth records for a session |
| telehealth_sessions | roomName (unique) | Webhook lookup by room name |
| telehealth_sessions | status | Cleanup cron finds non-ENDED rooms |
| telehealth_sessions | createdAt | Stale room detection |

## Zod Schemas

### packages/shared/src/schemas/telehealth.ts

```typescript
import { z } from "zod";

export const TelehealthTokenRequestSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
});

export const TelehealthTokenResponseSchema = z.object({
  token: z.string(),
  roomName: z.string().max(200),
  wsUrl: z.string().url().max(500),
  telehealthSessionId: z.string(),
  status: z.enum(["WAITING", "ACTIVE"]),
});

export type TelehealthTokenRequest = z.infer<typeof TelehealthTokenRequestSchema>;
export type TelehealthTokenResponse = z.infer<typeof TelehealthTokenResponseSchema>;
```

## Services

### livekit-service.ts

SDK wrapper for all LiveKit Server API interactions. Handles connection pooling and error translation.

```typescript
// Key functions:
createRoom(roomName: string, options?: { emptyTimeout?: number; maxParticipants?: number }): Promise<Room>
deleteRoom(roomName: string): Promise<void>
listParticipants(roomName: string): Promise<ParticipantInfo[]>
removeParticipant(roomName: string, identity: string): Promise<void>
generateToken(identity: string, roomName: string, grants: VideoGrant, ttlSeconds?: number): string
verifyWebhookSignature(body: string | Buffer, authHeader: string): WebhookEvent | null
```

Uses `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` from environment. Never logs token values.

### telehealth-service.ts

Business logic for telehealth session lifecycle.

```typescript
// Key functions:
startOrJoinRoom(sessionId: string, user: AuthUser): Promise<TelehealthTokenResponse>
  // Clinician: creates room + TelehealthSession if needed, mints token
  // Participant: verifies room exists, mints token with appropriate grants

getSessionStatus(telehealthSessionId: string, user: AuthUser): Promise<TelehealthSessionStatus>
  // Verifies ownership, returns current status

processWebhookEvent(event: WebhookEvent): Promise<void>
  // Dispatches to handlers based on event type
  // Updates TelehealthSession state machine
  // Auto-logs RTM time on room_finished

cleanupStaleRooms(): Promise<number>
  // Finds WAITING/ACTIVE rooms older than 5 hours
  // Closes via LiveKit API, marks ENDED
  // Returns count of rooms cleaned
```

## Frontend Component Hierarchy

```
apps/web/src/components/telehealth/
├── TelehealthSession.tsx       ← Top-level wrapper (state machine)
│   ├── PreJoinScreen.tsx       ← Device selection + camera preview
│   ├── WaitingRoom.tsx         ← Patient waiting state
│   ├── VideoCall.tsx           ← Main call view
│   │   ├── ParticipantTile.tsx ← Single video tile (local or remote)
│   │   ├── ControlBar.tsx      ← Mic, camera, screen share, end call
│   │   └── ConnectionStatus.tsx← Quality indicator + reconnection UI
│   └── SessionEndedScreen.tsx  ← Post-call summary
├── hooks/
│   └── use-telehealth.ts       ← Token fetch, status polling, mutations
└── lib/
    └── livekit-config.ts       ← LiveKit client configuration defaults
```

### TelehealthSession (State Machine)

```
  ┌─────────┐    user clicks    ┌─────────────┐   token received   ┌──────────────┐
  │  IDLE   │ ──────────────► │  PRE_JOIN    │ ─────────────────► │  CONNECTING  │
  └─────────┘   "Start Video"  └─────────────┘   devices selected  └──────┬───────┘
                                                                          │
                              ┌───────────────┐                           │
                              │  WAITING_ROOM │ ◄─── (participant only,   │
                              │  (patient)    │      clinician not in     │
                              └───────┬───────┘      room yet)            │
                                      │                                   │
                                      │ clinician joins                   │ connected
                                      ▼                                   ▼
                              ┌───────────────┐                   ┌───────────────┐
                              │   IN_CALL     │ ◄────────────────│   IN_CALL     │
                              └───────┬───────┘                   └───────┬───────┘
                                      │                                   │
                                      │ disconnect / end                  │
                                      ▼                                   │
                              ┌───────────────┐                           │
                              │    ENDED      │ ◄─────────────────────────┘
                              └───────────────┘
```

### Component Details

**PreJoinScreen**:
- Camera preview using `@livekit/components-react` `usePreviewTracks`
- Microphone level meter (audio analyzer)
- Device dropdowns (camera, mic, speaker) via `MediaDeviceSelect`
- "Join" button disabled until at least one device is available
- Uses shadcn Dialog, Select, Button components

**WaitingRoom** (Participant only):
- Shows "Your clinician will be with you shortly" messaging
- Polls `GET /api/telehealth/:id` every 5 seconds for status change
- Auto-transitions to VideoCall when status becomes ACTIVE
- Camera preview still active (patient can adjust before clinician sees them)
- 15-minute timeout with "Session may have been cancelled" message

**VideoCall**:
- `@livekit/components-react` `LiveKitRoom` provider wrapping the call
- Two-participant layout (side-by-side or picture-in-picture)
- ControlBar: mic toggle, camera toggle, screen share, end call button
- Screen share replaces main video tile, camera moves to PiP
- ConnectionStatus shows quality indicator (excellent/good/poor)
- Auto-reconnection with exponential backoff (LiveKit SDK handles this)
- End call button: clinician sees confirmation dialog, participant leaves immediately

**SessionEndedScreen**:
- Shows "Session ended" with duration
- "Return to Dashboard" button
- Clinician sees link to complete session notes (existing `/sessions/:id/complete` flow)

### React Hooks — use-telehealth.ts

```typescript
useTelehealthToken(sessionId: string)
  // Mutation: POST /api/telehealth/token
  // Returns { token, roomName, wsUrl, telehealthSessionId, status }

useTelehealthStatus(telehealthSessionId: string, enabled: boolean)
  // Query: GET /api/telehealth/:id
  // refetchInterval: 5000 (when in WAITING state)
  // Stops polling when ACTIVE or ENDED
```

### Package Dependencies (Frontend)

```json
{
  "@livekit/components-react": "^2.x",
  "livekit-client": "^2.x"
}
```

These are the official LiveKit React SDK packages. They provide `LiveKitRoom`, `VideoTrack`, `AudioTrack`, `useParticipants`, `useRoomContext`, `useConnectionState`, `MediaDeviceSelect`, `usePreviewTracks`, and connection state management including automatic reconnection.

### Package Dependencies (Backend)

```json
{
  "livekit-server-sdk": "^2.x"
}
```

Provides `RoomServiceClient`, `AccessToken`, `VideoGrant`, `WebhookReceiver` for server-side room management, token minting, and webhook verification.

## Infrastructure

### Local Development (docker-compose.yml)

```yaml
services:
  # ... existing postgres service ...

  livekit:
    image: livekit/livekit-server:latest
    ports:
      - "7880:7880"   # HTTP API + WebSocket signaling
      - "7881:7881"   # RTC (WebRTC media)
      - "3478:3478/udp"  # Built-in TURN (UDP)
    environment:
      - LIVEKIT_KEYS=devkey:devsecret
    volumes:
      - ./livekit-dev.yaml:/etc/livekit.yaml
    command: ["--config", "/etc/livekit.yaml"]
```

### livekit-dev.yaml (Local Config)

```yaml
port: 7880
rtc:
  port_range_start: 50000
  port_range_end: 50200
  use_external_ip: false
  tcp_port: 7881
keys:
  devkey: devsecret
room:
  empty_timeout: 300       # 5 minutes
  max_participants: 2
webhook:
  urls:
    - "http://host.docker.internal:4000/api/telehealth/webhooks"
  api_key: devkey
logging:
  level: info
turn:
  enabled: true
  udp_port: 3478
  tls_port: 5349
```

### Railway Deployment (Production)

LiveKit Server runs as a separate Railway service within the same project, deployed from the official Docker image.

**Railway Service Configuration**:
- **Image**: `livekit/livekit-server:latest`
- **Internal networking**: API server reaches LiveKit via Railway private networking (`livekit.railway.internal:7880`)
- **External access**: Public domain assigned for WebRTC client connections (e.g., `livekit.steady.app`)
- **Ports**: 7880 (signaling), 7881 (RTC), 3478/udp (TURN)
- **Config**: Mounted via Railway config file or environment variable
- **Health check**: `GET /` on port 7880

**Railway Production Config (livekit.yaml)**:
```yaml
port: 7880
rtc:
  port_range_start: 50000
  port_range_end: 50200
  use_external_ip: true
  tcp_port: 7881
keys:
  ${LIVEKIT_API_KEY}: ${LIVEKIT_API_SECRET}
room:
  empty_timeout: 300
  max_participants: 2
webhook:
  urls:
    - "https://<api-domain>/api/telehealth/webhooks"
  api_key: ${LIVEKIT_API_KEY}
logging:
  level: warn
  json: true
turn:
  enabled: true
  domain: livekit.steady.app
  udp_port: 3478
  tls_port: 5349
  cert_file: ""   # Railway handles TLS termination
  key_file: ""
```

### Future AWS Deployment (Terraform Outline)

For production scale beyond Railway (50+ concurrent sessions), migrate LiveKit to AWS:

```
┌────────────────────────────────────────────────────────┐
│  AWS VPC                                                │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ECS Fargate / EC2                               │   │
│  │  ┌───────────────────────────────────────────┐   │   │
│  │  │  LiveKit Server (1+ instances)             │   │   │
│  │  │  - c5.xlarge (4 vCPU, 8GB RAM)            │   │   │
│  │  │  - Auto-scaling group: 1-4 instances       │   │   │
│  │  │  - Scale trigger: CPU > 70% for 3 min      │   │   │
│  │  └───────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────┐  ┌────────────────────────────┐   │
│  │  ALB             │  │  NLB (WebRTC/TURN)         │   │
│  │  (HTTPS :443     │  │  (UDP :3478, TCP :7881)    │   │
│  │   → :7880)       │  │  → LiveKit RTC ports       │   │
│  └─────────────────┘  └────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  TURN Server (coturn) — optional                 │   │
│  │  - For clients behind strict NAT/firewalls       │   │
│  │  - c5.large, 1-2 instances                       │   │
│  │  - UDP :3478, TCP :443 (TLS)                     │   │
│  │  - LiveKit built-in TURN may suffice initially   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Security Groups:                                       │
│  - LiveKit SG: inbound 7880/tcp, 7881/tcp,             │
│    50000-50200/udp, 3478/udp from 0.0.0.0/0            │
│  - API SG: inbound 7880/tcp from LiveKit SG only       │
│    (webhook callback)                                   │
└────────────────────────────────────────────────────────┘
```

**Terraform Resources** (outline):
```hcl
# ECS cluster + service for LiveKit
aws_ecs_cluster, aws_ecs_task_definition, aws_ecs_service

# Load balancers
aws_lb (ALB for signaling), aws_lb (NLB for media)
aws_lb_target_group, aws_lb_listener

# Networking
aws_security_group (livekit_sg, api_callback_sg)
aws_vpc_endpoint (for ECR image pull)

# Auto-scaling
aws_appautoscaling_target, aws_appautoscaling_policy

# DNS
aws_route53_record (livekit.steady.app → ALB)

# Secrets
aws_secretsmanager_secret (LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
```

### TURN Server Considerations

**When built-in TURN is sufficient** (Phase 1):
- Most clients on residential/business networks
- LiveKit's embedded TURN handles ~90% of NAT traversal scenarios
- UDP port 3478 is rarely blocked

**When dedicated TURN is needed** (Phase 2, if metrics show):
- Clients behind enterprise firewalls that block UDP entirely
- Connection failure rate > 5% in production metrics
- Need TCP/TLS relay on port 443 (bypasses all firewalls)

**Decision**: Start with LiveKit built-in TURN on Railway. Monitor `connection_failed` webhook events. If failure rate exceeds 5%, deploy dedicated coturn on AWS with TCP/443 relay.

## Environment Variables

### API Server (packages/api)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `LIVEKIT_API_KEY` | Yes | LiveKit API key for token signing | `APIxxxxxxxx` |
| `LIVEKIT_API_SECRET` | Yes | LiveKit API secret for token signing + webhook verification | `secret_xxxxxxxx` |
| `LIVEKIT_WS_URL` | Yes | WebSocket URL for client connections (public) | `wss://livekit.steady.app` |
| `LIVEKIT_API_URL` | Yes | HTTP URL for server-to-server API calls (internal) | `http://livekit.railway.internal:7880` |

### LiveKit Server

| Variable | Required | Description |
|----------|----------|-------------|
| `LIVEKIT_KEYS` | Yes | Colon-separated key:secret pairs |

### Web Frontend (apps/web)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_LIVEKIT_WS_URL` | Yes | Public WebSocket URL for LiveKit | `wss://livekit.steady.app` |

### Local Development (.env additions)

```env
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret
LIVEKIT_WS_URL=ws://localhost:7880
LIVEKIT_API_URL=http://localhost:7880
NEXT_PUBLIC_LIVEKIT_WS_URL=ws://localhost:7880
```

## Error Handling Strategy

### Service Layer Errors

| Error | HTTP | Handling |
|-------|------|----------|
| Session not found | 404 | Check ownership chain: Session → Enrollment → Program → clinicianId |
| Participant not enrolled | 403 | Verify participantProfileId matches Session's enrollment |
| Room not started (participant) | 404 | Clinician must start room first; patient sees friendly message |
| Session already ended | 409 | Return status; frontend shows SessionEndedScreen |
| LiveKit unreachable | 503 | Log error, return "Video service temporarily unavailable" |
| LiveKit room creation failed | 500 | Log, retry once, then fail with user-friendly message |
| Token generation failed | 500 | Log (never log the token itself), return generic error |
| Webhook signature invalid | 400 | Log warning (potential attack), return 400 |
| Webhook event for unknown room | 200 | Log info, acknowledge (room may have been cleaned up) |

### Client-Side Error Handling

| Scenario | Behavior |
|----------|----------|
| Token fetch fails (network) | Retry 3x with exponential backoff, then show error with "Try Again" button |
| WebRTC connection fails | LiveKit SDK auto-reconnects (up to 7 attempts). Show "Reconnecting..." overlay |
| Participant disconnects briefly | Auto-reconnect. Other side sees "Reconnecting..." on their tile |
| Browser denies camera/mic | Show instructions to grant permissions. Allow joining with no video/audio |
| LiveKit server goes down mid-call | SDK detects disconnect. Show "Connection lost" with "Rejoin" button. Token re-fetch creates new room if needed |
| Stale room (>5 hours) | pg-boss cleanup cron closes room, marks ENDED. Client reconnect gets 409 |

### Logging Rules (HIPAA)

- **Log**: Session IDs, room names, participant identity tokens (opaque IDs), connection state changes, error codes
- **Never log**: LiveKit access tokens, participant real names, session content, audio/video data references
- Use `logger` from `packages/api/src/lib/logger.ts` exclusively — never `console.log`

## Security Controls

### Authentication & Authorization

| Control | Implementation |
|---------|---------------|
| Token endpoint auth | Standard JWT `authenticate` middleware — same as all other routes |
| Role-based access | Clinician: can create/join any room for their sessions. Participant: can only join rooms for their enrollments |
| Ownership verification | Clinician → Session → Enrollment → Program → clinicianId chain. Participant → Session → Enrollment → participantId chain |
| Token TTL | LiveKit tokens expire in 4 hours (covers longest sessions). No refresh — request new token |
| Room isolation | Room name includes unique TelehealthSession ID. MaxParticipants=2 enforced server-side |
| Webhook auth | HMAC-SHA256 signature verification using LIVEKIT_API_SECRET. Raw body parsing (same pattern as Stripe webhooks) |

### Data Security

| Control | Implementation |
|---------|---------------|
| Transport encryption | All WebRTC media encrypted with DTLS-SRTP (LiveKit default, cannot be disabled) |
| Signaling encryption | WSS (TLS) for all signaling traffic |
| No recording | LiveKit recording/egress features NOT enabled. No session audio/video is stored |
| No PHI in metadata | Room names use opaque IDs (`th_<cuid>`). Participant identities use role prefixes + profile IDs (`cli_xxx`, `par_xxx`). Display names are generic ("Clinician", "Patient") |
| Secret management | `LIVEKIT_API_SECRET` stored in Railway encrypted env vars. Never logged. Never sent to client |
| Room auto-cleanup | Rooms auto-close after 5 minutes empty (`empty_timeout: 300`). Stale room cron runs every 15 minutes |
| Audit trail | TelehealthSession records provide full lifecycle audit: who joined when, duration, how session ended. Prisma audit middleware auto-logs all mutations |

### Network Security

| Control | Implementation |
|---------|---------------|
| LiveKit internal access | Server-to-server calls use Railway private networking (not exposed to internet) |
| LiveKit public access | Only WebRTC signaling port (7880/WSS) and media ports exposed publicly |
| API webhook endpoint | No auth middleware (signature-verified), registered before `express.json()` |
| CORS | LiveKit client connects directly to LiveKit server (not proxied through API). CORS not needed for WebRTC |

## File Structure

### New Files

```
packages/api/src/routes/telehealth.ts
packages/api/src/routes/telehealth-webhooks.ts
packages/api/src/services/livekit-service.ts
packages/api/src/services/telehealth-service.ts
packages/shared/src/schemas/telehealth.ts
apps/web/src/components/telehealth/TelehealthSession.tsx
apps/web/src/components/telehealth/PreJoinScreen.tsx
apps/web/src/components/telehealth/WaitingRoom.tsx
apps/web/src/components/telehealth/VideoCall.tsx
apps/web/src/components/telehealth/ParticipantTile.tsx
apps/web/src/components/telehealth/ControlBar.tsx
apps/web/src/components/telehealth/ConnectionStatus.tsx
apps/web/src/components/telehealth/SessionEndedScreen.tsx
apps/web/src/hooks/use-telehealth.ts
apps/web/src/lib/livekit-config.ts
livekit-dev.yaml
packages/api/src/__tests__/telehealth.test.ts
packages/api/src/__tests__/telehealth-webhooks.test.ts
packages/shared/src/__tests__/telehealth.test.ts
```

### Modified Files

```
packages/db/prisma/schema.prisma          — Add TelehealthSession model + enum
packages/api/src/app.ts                   — Register telehealth routes (webhooks before json parser)
packages/api/src/services/queue.ts        — Add telehealth-webhook-process worker + cleanup cron
packages/shared/src/schemas/index.ts      — Export telehealth schemas
docker-compose.yml                        — Add livekit service
apps/web/package.json                     — Add @livekit/components-react, livekit-client
packages/api/package.json                 — Add livekit-server-sdk
```

## Implementation Phases

### Phase 1 — Core (MVP)
- Database model + migration
- LiveKit service (token + room management)
- Token endpoint (clinician + participant)
- Webhook endpoint + pg-boss worker
- TelehealthSession component (PreJoin + VideoCall + Ended)
- Docker Compose for local dev
- Railway deployment of LiveKit server

### Phase 2 — Polish
- WaitingRoom for participants
- Connection quality indicator
- Screen sharing
- Stale room cleanup cron
- Session duration display in session history

### Phase 3 — Scale
- AWS migration (Terraform)
- Dedicated TURN server (if connection failure rate > 5%)
- Multi-region LiveKit deployment
- Connection analytics dashboard
