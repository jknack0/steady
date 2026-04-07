# Self-Hosted LiveKit Telehealth Video -- Engineering Plan

## Overview

Integrate self-hosted LiveKit for 1-on-1 therapy video sessions into Steady. The clinician launches a video call from an appointment; the participant joins from a waiting room. The API server generates short-lived LiveKit access tokens scoped per room/participant, and a webhook endpoint receives room lifecycle events to update session state and duration. No video data touches Steady servers -- all media is peer-to-peer through the LiveKit SFU.

**Scope**: Clinician web app only (Phase 1). Mobile participant video is a future phase -- participants join via browser link for now.

---

## Phase 1: Infrastructure (Day 1)

### 1.1 Docker Compose -- Local LiveKit Server

**File**: `docker-compose.yml` (MODIFY)

Add a `livekit` service alongside the existing `postgres` service.

```yaml
  livekit:
    image: livekit/livekit-server:latest
    restart: unless-stopped
    ports:
      - "7880:7880"   # HTTP API + WebSocket signaling
      - "7881:7881"   # RTC (WebRTC over TCP fallback)
      - "7882:7882"   # TURN/TLS
    volumes:
      - ./livekit.yaml:/etc/livekit.yaml
    command: ["--config", "/etc/livekit.yaml"]
```

**Estimated time**: 15 minutes

### 1.2 LiveKit Config File

**File**: `livekit.yaml` (CREATE)

```yaml
# LiveKit server configuration -- local development
port: 7880
rtc:
  port_range_start: 50000
  port_range_end: 50200
  tcp_port: 7881
  use_external_ip: false
keys:
  devkey: secret   # API key:secret pair for local dev
logging:
  level: info
room:
  max_participants: 2          # 1-on-1 therapy sessions
  empty_timeout: 300           # 5 min auto-close after last participant leaves
  departure_timeout: 30        # 30s grace before empty_timeout starts
turn:
  enabled: true
  tls_port: 7882
webhook:
  urls:
    - "http://host.docker.internal:4000/api/telehealth/webhooks"
  api_key: devkey
```

**Estimated time**: 15 minutes

### 1.3 Environment Variables

**File**: `.env.example` (MODIFY) -- add to end:

```env
# LiveKit (telehealth video)
LIVEKIT_URL="ws://localhost:7880"
LIVEKIT_API_KEY="devkey"
LIVEKIT_API_SECRET="secret"
LIVEKIT_WEBHOOK_API_KEY="devkey"
```

**File**: `packages/api/src/lib/env.ts` (MODIFY) -- add:

```typescript
export const LIVEKIT_API_KEY = requireEnv("LIVEKIT_API_KEY", "devkey");
export const LIVEKIT_API_SECRET = requireEnv("LIVEKIT_API_SECRET", "secret");
export const LIVEKIT_URL = process.env.LIVEKIT_URL || "ws://localhost:7880";
```

**Estimated time**: 10 minutes

### 1.4 Add .gitignore Entry

Ensure `livekit.yaml` is NOT gitignored (it's a dev config, not a secret -- keys are dev-only). Production keys come from env vars.

**Phase 1 total**: ~40 minutes

---

## Phase 2: Backend (Day 1--2)

### 2.1 Prisma Schema -- TelehealthSession Model

**File**: `packages/db/prisma/schema.prisma` (MODIFY)

New enum and model, placed after the `Session` model block:

```prisma
enum TelehealthSessionStatus {
  WAITING        // Room created, waiting for participants
  IN_PROGRESS    // Both participants connected
  COMPLETED      // Session ended normally
  FAILED         // Connection failure or timeout
}

model TelehealthSession {
  id              String                   @id @default(cuid())
  appointmentId   String                   @unique
  appointment     Appointment              @relation(fields: [appointmentId], references: [id])
  roomName        String                   @unique
  status          TelehealthSessionStatus  @default(WAITING)
  startedAt       DateTime?
  endedAt         DateTime?
  durationSeconds Int?
  clinicianJoinedAt  DateTime?
  participantJoinedAt DateTime?
  createdAt       DateTime                 @default(now())
  updatedAt       DateTime                 @updatedAt

  @@index([appointmentId])
  @@index([roomName])
  @@index([status])
  @@map("telehealth_sessions")
}
```

Also add to the `Appointment` model:

```prisma
  telehealthSession TelehealthSession?
```

**Run after**: `npm run db:generate` then `npm run db:push`

**Estimated time**: 20 minutes

### 2.2 Install Server SDK

**File**: `packages/api/package.json` (MODIFY)

```bash
cd packages/api && npm install livekit-server-sdk
```

Adds `livekit-server-sdk` to dependencies. This package provides:
- `AccessToken` -- JWT token generation for room access
- `WebhookReceiver` -- signature verification for incoming webhooks
- `RoomServiceClient` -- room management API

**Estimated time**: 5 minutes

### 2.3 Zod Schemas -- Telehealth

**File**: `packages/shared/src/schemas/telehealth.ts` (CREATE)

```typescript
import { z } from "zod";

// POST /api/telehealth/token
export const CreateTelehealthTokenSchema = z.object({
  appointmentId: z.string().min(1, "Appointment ID is required"),
});

// Response shape (not used for validation, just type export)
export const TelehealthTokenResponseSchema = z.object({
  token: z.string(),
  url: z.string(),
  roomName: z.string(),
});

export type CreateTelehealthTokenInput = z.infer<typeof CreateTelehealthTokenSchema>;
export type TelehealthTokenResponse = z.infer<typeof TelehealthTokenResponseSchema>;
```

**File**: `packages/shared/src/schemas/index.ts` (MODIFY) -- add:

```typescript
export * from "./telehealth";
```

**Estimated time**: 15 minutes

### 2.4 Service Layer -- Telehealth

**File**: `packages/api/src/services/telehealth.ts` (CREATE)

```typescript
import { AccessToken, WebhookReceiver, RoomServiceClient } from "livekit-server-sdk";
import { prisma } from "@steady/db";
import { logger } from "../lib/logger";
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL } from "../lib/env";

// ── Types ────────────────────────────────────────────

interface TokenResult {
  token: string;
  url: string;
  roomName: string;
  telehealthSessionId: string;
}

// ── Room Naming ─────────────────────────────────────

function generateRoomName(appointmentId: string): string {
  // Deterministic: one room per appointment
  return `steady-${appointmentId}`;
}

// ── Token Generation ────────────────────────────────

export async function generateToken(
  appointmentId: string,
  userId: string,
  participantName: string,
  role: "CLINICIAN" | "PARTICIPANT"
): Promise<TokenResult> {
  // 1. Verify appointment exists and user has access
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      clinician: { include: { user: { select: { id: true } } } },
      participant: { include: { user: { select: { id: true } } } },
    },
  });

  if (!appointment) {
    throw new AppError("Appointment not found", 404);
  }

  // Verify ownership
  const clinicianUserId = appointment.clinician.user.id;
  const participantUserId = appointment.participant.user.id;

  if (role === "CLINICIAN" && userId !== clinicianUserId) {
    throw new AppError("Not authorized for this appointment", 403);
  }
  if (role === "PARTICIPANT" && userId !== participantUserId) {
    throw new AppError("Not authorized for this appointment", 403);
  }

  // 2. Verify appointment is in a joinable state
  if (!["SCHEDULED", "ATTENDED"].includes(appointment.status)) {
    throw new AppError("Appointment is not in a joinable state", 409);
  }

  // 3. Get or create TelehealthSession
  const roomName = generateRoomName(appointmentId);

  let telehealthSession = await prisma.telehealthSession.findUnique({
    where: { appointmentId },
  });

  if (!telehealthSession) {
    telehealthSession = await prisma.telehealthSession.create({
      data: {
        appointmentId,
        roomName,
        status: "WAITING",
      },
    });
  }

  // 4. Generate LiveKit access token
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: userId,
    name: participantName,
    metadata: JSON.stringify({ role, appointmentId }),
    ttl: "2h",    // Token valid for 2 hours
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  return {
    token,
    url: LIVEKIT_URL,
    roomName,
    telehealthSessionId: telehealthSession.id,
  };
}

// ── Webhook Processing ──────────────────────────────

const webhookReceiver = new WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

export async function processWebhook(body: string, authHeader: string): Promise<void> {
  // Verify webhook signature
  const event = await webhookReceiver.receive(body, authHeader);

  logger.info("LiveKit webhook received", event.event);

  switch (event.event) {
    case "participant_joined":
      await handleParticipantJoined(event);
      break;
    case "participant_left":
      await handleParticipantLeft(event);
      break;
    case "room_finished":
      await handleRoomFinished(event);
      break;
    default:
      logger.info("Unhandled LiveKit webhook event", event.event);
  }
}

async function handleParticipantJoined(event: any): Promise<void> {
  const roomName = event.room?.name;
  if (!roomName) return;

  const metadata = parseMetadata(event.participant?.metadata);
  const role = metadata?.role;

  const session = await prisma.telehealthSession.findUnique({
    where: { roomName },
  });
  if (!session) return;

  const now = new Date();
  const updates: Record<string, any> = {};

  if (role === "CLINICIAN" && !session.clinicianJoinedAt) {
    updates.clinicianJoinedAt = now;
  }
  if (role === "PARTICIPANT" && !session.participantJoinedAt) {
    updates.participantJoinedAt = now;
  }

  // Transition to IN_PROGRESS when both are present
  const clinicianPresent = session.clinicianJoinedAt || updates.clinicianJoinedAt;
  const participantPresent = session.participantJoinedAt || updates.participantJoinedAt;

  if (clinicianPresent && participantPresent && session.status === "WAITING") {
    updates.status = "IN_PROGRESS";
    updates.startedAt = now;
  }

  if (Object.keys(updates).length > 0) {
    await prisma.telehealthSession.update({
      where: { id: session.id },
      data: updates,
    });
  }
}

async function handleParticipantLeft(event: any): Promise<void> {
  // No-op for now; room_finished handles cleanup.
  // Could be extended for "reconnecting" UI state.
}

async function handleRoomFinished(event: any): Promise<void> {
  const roomName = event.room?.name;
  if (!roomName) return;

  const session = await prisma.telehealthSession.findUnique({
    where: { roomName },
  });
  if (!session) return;

  const now = new Date();
  const startedAt = session.startedAt || session.createdAt;
  const durationSeconds = Math.round((now.getTime() - startedAt.getTime()) / 1000);

  await prisma.telehealthSession.update({
    where: { id: session.id },
    data: {
      status: "COMPLETED",
      endedAt: now,
      durationSeconds,
    },
  });
}

function parseMetadata(raw: string | undefined): Record<string, any> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ── Error Class ─────────────────────────────────────

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "AppError";
  }
}
```

**Key design decisions**:
- Room name is deterministic from appointmentId (one room per appointment, idempotent re-joins)
- Token TTL is 2 hours (covers longest therapy session + buffer)
- `WebhookReceiver` verifies LiveKit signature (prevents spoofed events)
- Webhook updates are idempotent (checks for existing timestamps before setting)
- `AppError` with statusCode for clean route handler mapping
- No PII in logs -- only room names and event types

**Estimated time**: 2 hours

### 2.5 Routes -- Telehealth

**File**: `packages/api/src/routes/telehealth.ts` (CREATE)

```typescript
import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { CreateTelehealthTokenSchema } from "@steady/shared";
import { generateToken, processWebhook, AppError } from "../services/telehealth";
import { logger } from "../lib/logger";

const router = Router();

// POST /api/telehealth/token
// Both clinicians and participants can request a token
router.post(
  "/token",
  authenticate,
  requireRole("CLINICIAN", "PARTICIPANT", "ADMIN"),
  validate(CreateTelehealthTokenSchema),
  async (req: Request, res: Response) => {
    try {
      const { appointmentId } = req.body;
      const userId = req.user!.userId;
      const role = req.user!.role === "PARTICIPANT" ? "PARTICIPANT" : "CLINICIAN";

      // Fetch user name for LiveKit display
      const { prisma } = await import("@steady/db");
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      const displayName = user
        ? `${user.firstName} ${user.lastName}`.trim()
        : "Unknown";

      const result = await generateToken(appointmentId, userId, displayName, role);

      res.json({ success: true, data: result });
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ success: false, error: err.message });
        return;
      }
      logger.error("Telehealth token generation error", err);
      res.status(500).json({ success: false, error: "Failed to generate video token" });
    }
  }
);

// POST /api/telehealth/webhooks
// LiveKit sends room/participant events here -- NO auth middleware (signature verified in service)
router.post(
  "/webhooks",
  async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers["authorization"] as string;
      if (!authHeader) {
        res.status(401).json({ error: "Missing authorization header" });
        return;
      }

      // Body arrives as parsed JSON from express.json() middleware.
      // WebhookReceiver.receive() expects the raw string body.
      const body = JSON.stringify(req.body);

      await processWebhook(body, authHeader);

      res.json({ success: true });
    } catch (err) {
      logger.error("LiveKit webhook processing error", err);
      // Always return 200 to LiveKit to prevent retries on unrecoverable errors
      // Only return non-200 for signature verification failures
      if (err instanceof Error && err.message.includes("signature")) {
        res.status(401).json({ error: "Invalid webhook signature" });
        return;
      }
      res.json({ success: true });
    }
  }
);

export default router;
```

### 2.6 Register Routes

**File**: `packages/api/src/app.ts` (MODIFY)

Add import and registration:

```typescript
// After existing imports:
import telehealthRoutes from "./routes/telehealth";

// In route registration block (after stripe routes):
app.use("/api/telehealth", telehealthRoutes);
```

**Estimated time**: 30 minutes

### 2.7 Webhook Body Handling

**Important**: Unlike Stripe webhooks which need `express.raw()`, LiveKit webhooks use standard JSON bodies with an `Authorization` header for HMAC verification. The existing `express.json()` middleware works -- we just need to re-serialize the body for the `WebhookReceiver`. If this causes signature issues in practice, we would add a `express.raw()` route registered before `express.json()`, following the same pattern as `stripe-webhooks.ts`.

**Phase 2 total**: ~3.5 hours

---

## Phase 3: Frontend (Day 2--4)

### 3.1 Install Frontend Dependencies

**File**: `apps/web/package.json` (MODIFY)

```bash
cd apps/web && npm install @livekit/components-react @livekit/components-styles livekit-client
```

Dependencies:
- `livekit-client` -- Core WebRTC SDK, room/track management
- `@livekit/components-react` -- Pre-built React components (VideoTrack, AudioTrack, ControlBar, etc.)
- `@livekit/components-styles` -- Default CSS for LiveKit components

**Estimated time**: 10 minutes

### 3.2 Hook: useTelehealthToken

**File**: `apps/web/src/hooks/use-telehealth.ts` (CREATE)

```typescript
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface TelehealthTokenResponse {
  token: string;
  url: string;
  roomName: string;
  telehealthSessionId: string;
}

export function useTelehealthToken() {
  return useMutation({
    mutationFn: (appointmentId: string) =>
      api.post<TelehealthTokenResponse>("/api/telehealth/token", { appointmentId }),
  });
}
```

**Estimated time**: 15 minutes

### 3.3 Hook: useSessionTimer

**File**: `apps/web/src/hooks/use-session-timer.ts` (CREATE)

```typescript
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseSessionTimerReturn {
  elapsed: number;          // seconds
  formattedTime: string;    // "MM:SS" or "H:MM:SS"
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
}

export function useSessionTimer(): UseSessionTimerReturn {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback(() => {
    setIsRunning(false);
    setElapsed(0);
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const formattedTime = formatTime(elapsed);

  return { elapsed, formattedTime, isRunning, start, pause, reset };
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
```

**Estimated time**: 20 minutes

### 3.4 Component: PreJoinScreen

**File**: `apps/web/src/components/telehealth/PreJoinScreen.tsx` (CREATE)

Renders before joining the room. Shows:
- Camera preview (local video)
- Microphone level indicator
- Device selection dropdowns (camera, microphone, speakers)
- "Join Session" button
- Participant name display

```typescript
interface PreJoinScreenProps {
  participantName: string;
  onJoin: () => void;
  isConnecting: boolean;
}
```

Uses `@livekit/components-react` `PreJoin` component as a base, wrapped with Steady styling (Tailwind, shadcn/ui card layout).

**Key behaviors**:
- Requests camera/microphone permissions on mount
- Stores device preferences in localStorage
- Shows error state if permissions denied
- "Join Session" button disabled until camera preview loads

**Estimated time**: 1.5 hours

### 3.5 Component: WaitingRoom

**File**: `apps/web/src/components/telehealth/WaitingRoom.tsx` (CREATE)

Shown to participants after joining if clinician has not yet connected.

```typescript
interface WaitingRoomProps {
  clinicianName: string;
  appointmentTime: string;
}
```

- Animated waiting indicator
- "Your clinician will be with you shortly" message
- Session details (appointment time, clinician name)
- Auto-transitions to video call when clinician connects (detected via LiveKit room participant event)

**Estimated time**: 45 minutes

### 3.6 Component: VideoCall

**File**: `apps/web/src/components/telehealth/VideoCall.tsx` (CREATE)

The main video call component. Wraps LiveKit's `LiveKitRoom` + `VideoConference` components.

```typescript
interface VideoCallProps {
  token: string;
  serverUrl: string;
  roomName: string;
  onDisconnect: () => void;
  onSessionStarted: () => void;
}
```

**Sub-components** (defined within the file or as separate files if large):

1. **ControlBar** -- custom control bar replacing LiveKit default:
   - Mute/unmute microphone (toggle)
   - Camera on/off (toggle)
   - Screen share (toggle)
   - End call (red button, with confirmation dialog)
   - Session timer display
   - Connection quality indicator

2. **ParticipantTile** -- video tile for each participant:
   - Video track render
   - Name overlay
   - Mute indicator icon
   - Connection quality dot (green/yellow/red)

**Layout**: Side-by-side for desktop (clinician left, participant right), stacked for narrow viewports. Active speaker gets the larger tile.

**Key behaviors**:
- Uses `@livekit/components-react` hooks: `useRoomContext`, `useParticipants`, `useLocalParticipant`, `useTracks`
- Fires `onSessionStarted` when second participant joins
- Fires `onDisconnect` when call ends
- Handles reconnection states gracefully (shows "Reconnecting..." overlay)
- "End call" requires confirmation dialog to prevent accidental disconnection

**Estimated time**: 3 hours

### 3.7 Component: TelehealthSession (Wrapper)

**File**: `apps/web/src/components/telehealth/TelehealthSession.tsx` (CREATE)

State machine wrapper that orchestrates the full video session flow.

```typescript
interface TelehealthSessionProps {
  appointmentId: string;
  onClose: () => void;
}
```

**State machine**:
```
IDLE -> PRE_JOIN -> CONNECTING -> CONNECTED -> DISCONNECTED
                        |
                        v
                      ERROR
```

- **IDLE**: Initial state, fetches token
- **PRE_JOIN**: Shows PreJoinScreen for device check
- **CONNECTING**: Shows loading spinner while LiveKit connects
- **CONNECTED**: Shows VideoCall component
- **DISCONNECTED**: Shows post-call summary (duration, option to return to appointment)
- **ERROR**: Shows error message with retry button

Uses `useTelehealthToken` hook for token generation. Passes token + serverUrl to `VideoCall`.

**Estimated time**: 1.5 hours

### 3.8 Page: Telehealth Session Page

**File**: `apps/web/src/app/(dashboard)/telehealth/[appointmentId]/page.tsx` (CREATE)

```typescript
"use client";

import { use } from "react";
import { TelehealthSession } from "@/components/telehealth/TelehealthSession";
import { useRouter } from "next/navigation";

interface Props {
  params: Promise<{ appointmentId: string }>;
}

export default function TelehealthPage({ params }: Props) {
  const { appointmentId } = use(params);
  const router = useRouter();

  return (
    <div className="h-screen bg-gray-950">
      <TelehealthSession
        appointmentId={appointmentId}
        onClose={() => router.push("/appointments")}
      />
    </div>
  );
}
```

This page uses a full-screen dark layout (no sidebar) for the video call experience. The `(dashboard)` layout wraps it but the component itself fills the viewport.

**Estimated time**: 30 minutes

### 3.9 Integration: "Start Video Session" Button on AppointmentModal

**File**: `apps/web/src/components/appointments/AppointmentModal.tsx` (MODIFY)

Add a "Start Video Session" button in the edit mode for VIRTUAL-location appointments with SCHEDULED or ATTENDED status.

```typescript
// Inside the modal footer or header area, when mode === "edit" and appointment is virtual:
const isVirtual = existing?.location?.type === "VIRTUAL";
const isJoinable = existing && ["SCHEDULED", "ATTENDED"].includes(existing.status);

{isVirtual && isJoinable && (
  <Button
    variant="default"
    onClick={() => router.push(`/telehealth/${existing.id}`)}
    className="bg-emerald-600 hover:bg-emerald-700"
  >
    <Video className="mr-2 h-4 w-4" />
    Start Video Session
  </Button>
)}
```

Also add a "Start Video Session" button to the appointment day view / calendar event card for quick access.

**Estimated time**: 45 minutes

### 3.10 LiveKit CSS Import

**File**: `apps/web/src/app/globals.css` (MODIFY) -- or a dedicated telehealth layout:

```css
@import "@livekit/components-styles";
```

Alternatively, import in the TelehealthSession component file to scope it:

```typescript
import "@livekit/components-styles";
```

**Estimated time**: 10 minutes

### 3.11 Component File Summary

```
apps/web/src/
  components/telehealth/
    PreJoinScreen.tsx        # Camera/mic preview + device selection
    WaitingRoom.tsx          # "Waiting for clinician" state
    VideoCall.tsx            # Main video UI with controls
    TelehealthSession.tsx    # State machine wrapper
  hooks/
    use-telehealth.ts        # useTelehealthToken mutation hook
    use-session-timer.ts     # Timer hook for session duration display
  app/(dashboard)/telehealth/
    [appointmentId]/
      page.tsx               # Route page
```

**Phase 3 total**: ~8.5 hours

---

## Phase 4: Testing (Day 4--5)

### 4.1 API Integration Tests -- Token Endpoint

**File**: `packages/api/src/__tests__/telehealth.test.ts` (CREATE)

Test cases following existing patterns (supertest + vi.mocked prisma):

```typescript
describe("POST /api/telehealth/token", () => {
  // Auth tests
  it("returns 401 without auth");
  it("returns 403 for unauthorized role (if applicable)");

  // Validation tests
  it("returns 400 for missing appointmentId");
  it("returns 400 for empty appointmentId");

  // Ownership tests
  it("returns 404 for non-existent appointment");
  it("returns 403 when clinician does not own appointment");
  it("returns 403 when participant does not own appointment");
  it("returns 409 for cancelled appointment");

  // Happy path
  it("generates token for clinician with valid appointment");
  it("generates token for participant with valid appointment");
  it("creates TelehealthSession on first token request");
  it("reuses existing TelehealthSession on subsequent requests");
  it("returns correct LiveKit URL and room name");
});
```

Mock setup:
- `vi.mock("livekit-server-sdk")` -- mock `AccessToken`, `WebhookReceiver`
- Mock `prisma.appointment.findUnique` with ownership data
- Mock `prisma.telehealthSession.findUnique` and `create`
- Mock `prisma.user.findUnique` for display name

**Estimated time**: 2 hours

### 4.2 API Integration Tests -- Webhook Endpoint

```typescript
describe("POST /api/telehealth/webhooks", () => {
  // Signature tests
  it("returns 401 for missing authorization header");
  it("returns 401 for invalid signature");

  // Event handling tests
  it("handles participant_joined -- clinician");
  it("handles participant_joined -- participant");
  it("transitions to IN_PROGRESS when both join");
  it("handles room_finished -- sets COMPLETED status and duration");
  it("ignores unknown event types gracefully");

  // Idempotency tests
  it("does not overwrite clinicianJoinedAt on re-join");
  it("does not overwrite participantJoinedAt on re-join");
  it("handles room_finished for non-existent room gracefully");
});
```

**Estimated time**: 1.5 hours

### 4.3 Zod Schema Tests

**File**: `packages/shared/src/__tests__/telehealth.test.ts` (CREATE)

```typescript
describe("CreateTelehealthTokenSchema", () => {
  it("accepts valid appointmentId");
  it("rejects empty appointmentId");
  it("rejects missing appointmentId");
  it("strips unknown fields");
});
```

**Estimated time**: 30 minutes

### 4.4 Component Tests

**File**: `apps/web/src/__tests__/telehealth/PreJoinScreen.test.tsx` (CREATE)

```typescript
describe("PreJoinScreen", () => {
  it("renders camera preview area");
  it("renders Join Session button");
  it("disables Join button while connecting");
  it("calls onJoin when button clicked");
  it("shows error when camera permission denied");
});
```

**File**: `apps/web/src/__tests__/telehealth/TelehealthSession.test.tsx` (CREATE)

```typescript
describe("TelehealthSession", () => {
  it("fetches token on mount");
  it("shows PreJoinScreen initially");
  it("transitions to connecting state");
  it("shows error state on token failure");
  it("calls onClose when session ends");
});
```

Mock LiveKit components since they require WebRTC APIs not available in jsdom:
```typescript
vi.mock("@livekit/components-react", () => ({
  LiveKitRoom: ({ children }: any) => <div data-testid="livekit-room">{children}</div>,
  VideoConference: () => <div data-testid="video-conference" />,
  useRoomContext: vi.fn(),
  useParticipants: vi.fn(() => []),
  // etc.
}));
```

**Estimated time**: 2 hours

### 4.5 Hook Tests

**File**: `apps/web/src/__tests__/telehealth/use-session-timer.test.ts` (CREATE)

```typescript
describe("useSessionTimer", () => {
  it("starts at 0:00");
  it("increments every second when running");
  it("pauses correctly");
  it("resets to 0:00");
  it("formats hours correctly for long sessions");
});
```

**Estimated time**: 30 minutes

### 4.6 Manual E2E Testing Checklist

No automated E2E for video (requires real WebRTC). Manual checklist:

- [ ] Docker `livekit` service starts without errors
- [ ] LiveKit admin dashboard accessible at `http://localhost:7880`
- [ ] Create appointment with VIRTUAL location
- [ ] Click "Start Video Session" from appointment modal
- [ ] PreJoinScreen loads with camera preview
- [ ] Device selection works (switch camera/mic)
- [ ] Click "Join Session" -- connects to LiveKit room
- [ ] Open second browser tab as participant -- joins same room
- [ ] Both video feeds visible
- [ ] Mute/unmute audio works
- [ ] Camera toggle works
- [ ] Screen share works
- [ ] Session timer displays correctly
- [ ] End call with confirmation dialog
- [ ] TelehealthSession record shows COMPLETED with correct duration
- [ ] Webhook events logged correctly (check server logs)
- [ ] Reconnection works (disable/enable network briefly)
- [ ] Token refresh works for sessions > 30min (JWT auto-refresh)

**Phase 4 total**: ~6.5 hours

---

## Integration Points with Existing Code

| Existing System | Integration | Changes Required |
|----------------|-------------|-----------------|
| **Appointment model** | `TelehealthSession` has 1:1 relation via `appointmentId` | Add relation field to Appointment model |
| **AppointmentModal** | "Start Video Session" button for virtual appointments | Add conditional button in modal footer |
| **Auth middleware** | Token endpoint uses `authenticate` + `requireRole` | None -- existing middleware works as-is |
| **Audit logging** | TelehealthSession creates/updates auto-logged by audit middleware | None -- existing middleware covers it |
| **Session model** | Appointment already links to Session via `appointmentId` | No changes -- telehealth is parallel to clinical session |
| **Location model** | VIRTUAL location type triggers video button visibility | No changes -- use existing `type` field |
| **RTM system** | Future: video duration could count as engagement time | Not in Phase 1 scope |
| **pg-boss queue** | Future: webhook processing could be queued for reliability | Not in Phase 1 (sync processing is fine for 1:1) |

---

## Dependency Summary

### packages/api (server)

| Package | Version | Purpose |
|---------|---------|---------|
| `livekit-server-sdk` | `^2.x` | Token generation, webhook verification, room management |

### apps/web (frontend)

| Package | Version | Purpose |
|---------|---------|---------|
| `livekit-client` | `^2.x` | WebRTC room/track management |
| `@livekit/components-react` | `^2.x` | Pre-built React UI components |
| `@livekit/components-styles` | `^2.x` | Default CSS for LiveKit components |

---

## Files Created/Modified Summary

### New Files (10)

| File | Description |
|------|-------------|
| `livekit.yaml` | LiveKit server config for local dev |
| `packages/shared/src/schemas/telehealth.ts` | Zod schemas for telehealth endpoints |
| `packages/api/src/services/telehealth.ts` | Token generation, webhook processing service |
| `packages/api/src/routes/telehealth.ts` | Express routes for token + webhook |
| `apps/web/src/hooks/use-telehealth.ts` | `useTelehealthToken` mutation hook |
| `apps/web/src/hooks/use-session-timer.ts` | Session duration timer hook |
| `apps/web/src/components/telehealth/PreJoinScreen.tsx` | Camera/mic preview + device selection |
| `apps/web/src/components/telehealth/WaitingRoom.tsx` | Waiting state for participants |
| `apps/web/src/components/telehealth/VideoCall.tsx` | Main video call UI with controls |
| `apps/web/src/components/telehealth/TelehealthSession.tsx` | State machine session wrapper |
| `apps/web/src/app/(dashboard)/telehealth/[appointmentId]/page.tsx` | Route page |

### Modified Files (6)

| File | Change |
|------|--------|
| `docker-compose.yml` | Add `livekit` service |
| `.env.example` | Add LiveKit env vars |
| `packages/api/src/lib/env.ts` | Add LiveKit env var exports |
| `packages/db/prisma/schema.prisma` | Add `TelehealthSession` model + enum |
| `packages/shared/src/schemas/index.ts` | Export telehealth schemas |
| `packages/api/src/app.ts` | Register telehealth routes |
| `apps/web/src/components/appointments/AppointmentModal.tsx` | Add "Start Video Session" button |

### Test Files (5)

| File | Coverage |
|------|----------|
| `packages/api/src/__tests__/telehealth.test.ts` | Token + webhook route integration tests |
| `packages/shared/src/__tests__/telehealth.test.ts` | Zod schema validation tests |
| `apps/web/src/__tests__/telehealth/PreJoinScreen.test.tsx` | Pre-join component tests |
| `apps/web/src/__tests__/telehealth/TelehealthSession.test.tsx` | State machine component tests |
| `apps/web/src/__tests__/telehealth/use-session-timer.test.ts` | Timer hook tests |

---

## Timeline Summary

| Phase | Description | Estimated Time |
|-------|-------------|---------------|
| Phase 1 | Infrastructure (Docker, config, env) | 0.5 day |
| Phase 2 | Backend (Prisma, service, routes) | 0.5 day |
| Phase 3 | Frontend (hooks, components, page) | 2 days |
| Phase 4 | Testing (API, component, manual) | 1 day |
| **Total** | | **4 days** |

---

## Production Deployment Notes

For production, the self-hosted LiveKit server runs as a separate Railway service (or dedicated VM):

1. **LiveKit server**: Deploy `livekit/livekit-server` Docker image on a dedicated instance with public IP and ports 7880--7882 open.
2. **TURN server**: LiveKit's built-in TURN handles NAT traversal. For enterprise, consider deploying dedicated TURN servers.
3. **Environment variables**: Set `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` on the API service. Generate production keys via `livekit-server generate-keys`.
4. **TLS**: LiveKit requires WSS in production. Use a reverse proxy (nginx/Caddy) or Railway's built-in TLS termination.
5. **Webhook URL**: Point LiveKit's webhook config to `https://api.steady.app/api/telehealth/webhooks`.
6. **Monitoring**: LiveKit exposes Prometheus metrics at `/metrics`. Configure Grafana dashboards for room count, participant count, and bandwidth usage.
7. **HIPAA**: All media is encrypted in transit (DTLS-SRTP). LiveKit server processes media through the SFU but does not record or store it. No recording is enabled in Phase 1. If recording is needed later, it requires a dedicated compliance review.

---

## Future Phases (Out of Scope)

- **Phase 2**: Mobile participant video (Expo + `@livekit/react-native`)
- **Phase 3**: Session recording with S3 storage + HIPAA BAA
- **Phase 4**: Virtual waiting room queue for group sessions
- **Phase 5**: RTM integration -- auto-log video session duration as engagement time
- **Phase 6**: AI-powered session notes (real-time transcription via LiveKit Agents)
