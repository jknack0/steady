# Self-Hosted LiveKit Telehealth Video — Test Plan

## Test Strategy

**Framework:** Vitest (node environment for API, jsdom for web)
**API tests:** Supertest against Express app with mocked Prisma (`vi.hoisted()` mdb pattern, consistent with stripe-webhooks.test.ts and appointments.test.ts)
**Schema tests:** Direct Zod safeParse validation in packages/shared
**External SDK:** Mock `livekit-server-sdk` globally via `vi.mock("livekit-server-sdk")` — never call real LiveKit in tests
**Webhook body parsing:** Webhook tests send raw body with `Authorization` header bearing LiveKit webhook token; verify signature check logic (mirrors Stripe COND-4 pattern from stripe-webhooks.test.ts)
**Frontend tests:** React Testing Library + mocked api-client (consistent with AppointmentModal.test.tsx and use-programs.test.tsx patterns)
**E2E tests:** Manual checklist — WebRTC cannot be automated in headless browsers reliably
**Organization:** 3 API test files + 1 schema test file + 4 web component test files + 1 integration test file

---

## 1. Data Model Additions (Prisma)

**New model: `TelehealthSession`**

| Field | Type | Purpose |
|-------|------|---------|
| id | cuid | Primary key |
| appointmentId | String | FK to Appointment |
| roomName | String | LiveKit room identifier (e.g., `session-{appointmentId}`) |
| roomSid | String? | LiveKit server room SID (set by webhook) |
| status | Enum | WAITING / ACTIVE / ENDED |
| clinicianJoinedAt | DateTime? | When clinician connected |
| participantJoinedAt | DateTime? | When participant connected |
| endedAt | DateTime? | When session ended |
| durationSeconds | Int? | Computed on end |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

**New model: `TelehealthEvent`** (webhook-sourced audit log)

| Field | Type | Purpose |
|-------|------|---------|
| id | cuid | Primary key |
| telehealthSessionId | String | FK to TelehealthSession |
| eventType | String | LiveKit event name |
| participantIdentity | String? | Who triggered it |
| payload | Json | Raw event (stripped of PII) |
| receivedAt | DateTime | When webhook arrived |

---

## 2. API Unit Tests

### 2a. Token Generation — `telehealth-token.test.ts`

**File location:** `packages/api/src/__tests__/telehealth-token.test.ts`

**Setup:**
- Mock `@steady/db` (standard mdb pattern from setup.ts)
- Mock `livekit-server-sdk` — specifically `AccessToken` class
- Mock Prisma: appointment, clinicianClient, telehealthSession
- Use `authHeader()` and `participantAuthHeader()` from helpers.ts

| ID | Scenario | Input | Expected | Priority |
|----|----------|-------|----------|----------|
| TK-001 | Returns 401 without auth | No Authorization header | 401, `Missing authorization token` | P0 |
| TK-002 | Returns 403 for ADMIN role | Admin token + valid appointmentId | 403, `Insufficient permissions` | P0 |
| TK-003 | Clinician gets token with roomAdmin grant | Clinician token + owned appointmentId | 200, `{ token, roomName, isRoomAdmin: true }` | P0 |
| TK-004 | Participant gets token without roomAdmin | Participant token + enrolled appointmentId | 200, `{ token, roomName, isRoomAdmin: false }` | P0 |
| TK-005 | Returns 404 for non-existent appointment | Valid token + fake appointmentId | 404 | P0 |
| TK-006 | Returns 403 for unowned appointment (clinician) | Clinician token + other clinician appt | 403 | P0 |
| TK-007 | Returns 403 for unowned appointment (participant) | Participant token + other participant appt | 403 | P0 |
| TK-008 | Token includes correct identity (clinician) | Clinician token | identity = `clinician:{profileId}` | P0 |
| TK-009 | Token includes correct identity (participant) | Participant token | identity = `participant:{profileId}` | P0 |
| TK-010 | Token includes room name matching appointment | Any valid request | roomName = `session-{appointmentId}` | P0 |
| TK-011 | Token grants roomJoin + canPublish + canSubscribe | Any valid request | VideoGrant includes all three | P1 |
| TK-012 | Token TTL defaults to 6 hours | No ttl param | AccessToken with ttl=21600 | P1 |
| TK-013 | Returns 400 for missing appointmentId | No appointmentId in body | 400 validation error | P1 |
| TK-014 | Returns 409 if appointment is CANCELLED | status=CANCELLED | 409 | P1 |
| TK-015 | Returns 409 if appointment is past | endAt in past | 409 | P1 |
| TK-016 | Creates TelehealthSession on first request | No existing session | upsert called | P1 |
| TK-017 | Reuses TelehealthSession on subsequent requests | Existing session | Same roomName | P1 |
| TK-018 | Returns 403 for unlinked participant | Participant + wrong appointment | 403 | P0 |
| TK-019 | Returns 400 for IN_PERSON location | IN_PERSON appointment | 400 | P2 |

---

### 2b. Webhook Handler — `telehealth-webhooks.test.ts`

**File location:** `packages/api/src/__tests__/telehealth-webhooks.test.ts`

**Setup:**
- Mock `@steady/db` (standard mdb pattern)
- Mock `livekit-server-sdk` — specifically `WebhookReceiver` class
- Set `process.env.LIVEKIT_API_KEY` and `process.env.LIVEKIT_API_SECRET` in `beforeEach`
- Follows the same pattern as stripe-webhooks.test.ts for raw body + signature verification

| ID | Scenario | Input | Expected | Priority |
|----|----------|-------|----------|----------|
| WH-001 | Returns 401 for missing Authorization header | No auth header | 401, `Missing webhook authorization` | P0 |
| WH-002 | Returns 401 for invalid webhook signature | Bad Authorization token | 401, `Invalid webhook signature` | P0 |
| WH-003 | Returns 200 for valid signature | Valid signature + body | 200, `{ received: true }` | P0 |
| WH-004 | Logs room_started event | `room_started` with room.name | TelehealthEvent created, session status=ACTIVE | P0 |
| WH-005 | Logs participant_joined (clinician) | `participant_joined`, identity=`clinician:{id}` | clinicianJoinedAt set | P0 |
| WH-006 | Logs participant_joined (participant) | `participant_joined`, identity=`participant:{id}` | participantJoinedAt set | P0 |
| WH-007 | Logs participant_left event | `participant_left` | TelehealthEvent created | P1 |
| WH-008 | Logs room_finished event | `room_finished` | status=ENDED, endedAt set, durationSeconds computed | P0 |
| WH-009 | Computes durationSeconds on room_finished | Started at T, finished at T+30min | durationSeconds = 1800 | P1 |
| WH-010 | Handles unknown event type gracefully | `track_published` | 200, event logged, no state change | P1 |
| WH-011 | Returns 200 for unmatched room | Room name not matching any session | 200, no-op | P1 |
| WH-012 | Idempotent duplicate event handling | Same room_started twice | No error, no corruption | P1 |
| WH-013 | Does not log PII in TelehealthEvent payload | Event with participant metadata | Only identity stored, no names/emails | P0 |
| WH-014 | Webhook route registered BEFORE express.json() | Raw body received | WebhookReceiver gets raw string | P0 |
| WH-015 | Returns 500 when LIVEKIT_API_KEY not configured | Unset env var | 500 | P1 |

---

### 2c. Telehealth Session CRUD — `telehealth-sessions.test.ts`

**File location:** `packages/api/src/__tests__/telehealth-sessions.test.ts`

| ID | Scenario | Input | Expected | Priority |
|----|----------|-------|----------|----------|
| TS-001 | GET status returns WAITING when nobody joined | GET /api/telehealth/sessions/:appointmentId | `{ status: WAITING, clinicianJoined: false }` | P0 |
| TS-002 | GET status returns ACTIVE when both joined | Both joinedAt set | `{ status: ACTIVE, clinicianJoined: true }` | P0 |
| TS-003 | GET status returns ENDED after room_finished | status=ENDED | `{ status: ENDED, durationSeconds: 1800 }` | P0 |
| TS-004 | Returns 401 without auth | No token | 401 | P0 |
| TS-005 | Returns 403 for unowned appointment | Other clinician appt | 403 | P0 |
| TS-006 | Participant can read own session status | Participant token + their appt | 200 | P0 |
| TS-007 | End session manually clinician only | POST /api/telehealth/sessions/:id/end | status=ENDED | P1 |
| TS-008 | End session returns 403 for participant | Participant tries end | 403 | P1 |
| TS-009 | End session returns 409 if already ENDED | Already ENDED | 409 | P2 |
| TS-010 | Returns 404 for non-existent session | Fake appointmentId | 404 | P1 |

---

## 3. Schema Validation Tests — `telehealth.schema.test.ts`

**File location:** `packages/shared/src/__tests__/telehealth.schema.test.ts`

| ID | Scenario | Input | Expected | Priority |
|----|----------|-------|----------|----------|
| ZS-001 | TelehealthTokenRequestSchema accepts valid body | `{ appointmentId: "appt-1" }` | parse succeeds | P0 |
| ZS-002 | Rejects missing appointmentId | `{}` | parse fails | P0 |
| ZS-003 | Rejects empty appointmentId | `{ appointmentId: "" }` | parse fails | P0 |
| ZS-004 | Rejects oversized appointmentId | 300-char string | parse fails (max 200) | P1 |
| ZS-005 | TelehealthSessionStatusEnum accepts WAITING | `"WAITING"` | valid | P0 |
| ZS-006 | TelehealthSessionStatusEnum accepts ACTIVE | `"ACTIVE"` | valid | P0 |
| ZS-007 | TelehealthSessionStatusEnum accepts ENDED | `"ENDED"` | valid | P0 |
| ZS-008 | TelehealthSessionStatusEnum rejects INVALID | `"INVALID"` | parse fails | P1 |
| ZS-009 | WebhookEventSchema accepts room_started payload | Full webhook payload | parse succeeds | P1 |
| ZS-010 | WebhookEventSchema strips unknown fields | Extra fields | Unknown fields removed | P1 |
| ZS-011 | EndSessionSchema accepts empty body | `{}` | parse succeeds | P2 |
| ZS-012 | TokenResponseSchema validates response shape | `{ token, roomName, isRoomAdmin }` | valid | P1 |

---

## 4. Frontend Component Tests

### 4a. `PreJoinScreen.test.tsx`

**File location:** `apps/web/src/__tests__/telehealth/PreJoinScreen.test.tsx`

**Setup:**
- Mock `navigator.mediaDevices.enumerateDevices` and `getUserMedia`
- Mock api-client
- `QueryClientProvider` wrapper (same pattern as AppointmentModal.test.tsx)

| ID | Scenario | Expected | Priority |
|----|----------|----------|----------|
| PJ-001 | Renders camera preview container | Video element present | P0 |
| PJ-002 | Lists available audio input devices | Microphone dropdown populated | P0 |
| PJ-003 | Lists available video input devices | Camera dropdown populated | P0 |
| PJ-004 | Toggle camera off disables video track | Camera button toggles | P0 |
| PJ-005 | Toggle microphone off mutes audio | Mic button toggles to muted state | P0 |
| PJ-006 | Join Session button calls onJoin | `onJoin` called with selected devices | P0 |
| PJ-007 | Join Session button disabled until devices ready | Button disabled during enumeration | P1 |
| PJ-008 | Shows error when camera permission denied | `getUserMedia` rejects with NotAllowedError | P0 |
| PJ-009 | Shows error when microphone permission denied | `getUserMedia` rejects | P0 |
| PJ-010 | Camera switching updates preview | `getUserMedia` called with new deviceId | P1 |
| PJ-011 | Audio level indicator shows activity | Mock audio track with non-zero levels | P2 |
| PJ-012 | Shows participant name and appointment info | Name and time from props | P1 |

---

### 4b. `WaitingRoom.test.tsx`

**File location:** `apps/web/src/__tests__/telehealth/WaitingRoom.test.tsx`

**Setup:**
- Mock api-client (polling session status)
- `vi.useFakeTimers()` for deterministic polling

| ID | Scenario | Expected | Priority |
|----|----------|----------|----------|
| WR-001 | Shows waiting for therapist message | Message visible on render | P0 |
| WR-002 | Polls session status every 5 seconds | `api.get` called after timer advance | P0 |
| WR-003 | Auto-joins when clinician present | clinicianJoined=true triggers onReady | P0 |
| WR-004 | Shows elapsed wait time | After 2 min, "2:00" displayed | P1 |
| WR-005 | Leave button calls onLeave | Click leave, callback fired | P0 |
| WR-006 | Shows therapist name | Name displayed from props | P1 |
| WR-007 | Stops polling after 30 min | Timeout message shown | P1 |
| WR-008 | Stops polling on unmount | Interval cleared | P0 |
| WR-009 | Shows ended message if status=ENDED | Ended message shown | P1 |
| WR-010 | Handles poll failure | Error state, retries | P1 |

---

### 4c. `VideoCall.test.tsx`

**File location:** `apps/web/src/__tests__/telehealth/VideoCall.test.tsx`

**Setup:**
- Mock `@livekit/components-react` hooks (`useLocalParticipant`, `useRoomContext`, `useTracks`)
- Mock api-client

| ID | Scenario | Expected | Priority |
|----|----------|----------|----------|
| VC-001 | Renders local and remote video tiles | Two video elements visible | P0 |
| VC-002 | Camera toggle button works | `setCameraEnabled(false)` called | P0 |
| VC-003 | Microphone toggle button works | `setMicrophoneEnabled(false)` called | P0 |
| VC-004 | Screen share button starts sharing | `setScreenShareEnabled(true)` called | P0 |
| VC-005 | Screen share button stops sharing | `setScreenShareEnabled(false)` called | P0 |
| VC-006 | End call button prompts confirmation | Confirmation dialog appears | P0 |
| VC-007 | Confirm end call disconnects | `room.disconnect()` called, onEnd fired | P0 |
| VC-008 | Shows participant name on video tile | Name label visible | P1 |
| VC-009 | Shows reconnecting overlay | Room state=reconnecting, overlay visible | P0 |
| VC-010 | Shows disconnected state | Disconnected message, rejoin option | P0 |
| VC-011 | Duration timer shows elapsed time | "05:00" after 5 minutes | P1 |
| VC-012 | Screen share shows larger layout | Shared screen primary position | P1 |
| VC-013 | Muted microphone shows indicator | Muted icon on tile | P1 |
| VC-014 | Camera off shows avatar placeholder | Avatar/initials shown | P1 |
| VC-015 | Controls bar is always visible | Control bar at bottom | P1 |
| VC-016 | Network quality indicator | Low quality warning visible | P2 |

---

### 4d. `TelehealthSession.test.tsx` (Orchestrator)

**File location:** `apps/web/src/__tests__/telehealth/TelehealthSession.test.tsx`

**Setup:**
- Mock api-client for token fetch
- Mock `@livekit/components-react` `LiveKitRoom` component

| ID | Scenario | Expected | Priority |
|----|----------|----------|----------|
| TO-001 | Fetches token on mount | `api.post` to `/api/telehealth/token` called | P0 |
| TO-002 | Shows loading state while fetching token | Spinner/loading visible | P0 |
| TO-003 | Shows PreJoinScreen after token fetched | PreJoinScreen rendered | P0 |
| TO-004 | Transitions to WaitingRoom for participant | WaitingRoom shown | P0 |
| TO-005 | Transitions directly to VideoCall for clinician | VideoCall rendered | P0 |
| TO-006 | Transitions from WaitingRoom to VideoCall | Clinician joins, VideoCall rendered | P0 |
| TO-007 | Shows error state on token fetch failure | Error message + back button | P0 |
| TO-008 | Re-fetches token on 401 from LiveKit | Token re-fetch triggered | P1 |
| TO-009 | Shows session-ended screen after call ends | Session ended + duration | P0 |
| TO-010 | Passes serverUrl from env to LiveKitRoom | Correct URL passed | P1 |
| TO-011 | Disconnects room on unmount | room.disconnect called | P0 |
| TO-012 | Handles appointment not found (404) | Error displayed | P1 |

---

## 5. Integration Tests (Real Database)

**File location:** `packages/api/src/__tests__/integration/telehealth.test.ts`

These tests run against the `steady_adhd_test` database using `testPrisma` from `integration/setup.ts`.

| ID | Scenario | Expected | Priority |
|----|----------|----------|----------|
| IT-001 | Full token flow: create appointment, request token, verify TelehealthSession | DB contains TelehealthSession with correct appointmentId | P0 |
| IT-002 | Clinician token has roomAdmin, participant does not | Decode both, verify grants differ | P0 |
| IT-003 | Webhook creates TelehealthEvent records | Query TelehealthEvent table | P0 |
| IT-004 | room_finished updates session status and duration | status=ENDED, durationSeconds > 0 | P0 |
| IT-005 | Session status endpoint reflects webhook state | GET returns current status | P0 |
| IT-006 | Cross-tenant isolation | Clinician B appointment returns 403 | P0 |
| IT-007 | Cross-participant isolation | Wrong participant returns 403 | P0 |
| IT-008 | Audit log records telehealth mutations | audit_logs entries exist | P1 |

---

## 6. E2E Manual Test Checklist

WebRTC sessions cannot be reliably automated in headless browsers. Execute manually before release.

### Happy Path — Clinician Starts, Patient Joins

- [ ] Clinician navigates to appointment detail, clicks "Start Video Session"
- [ ] PreJoinScreen loads with camera preview and device dropdowns
- [ ] Clinician selects preferred camera and microphone
- [ ] Clinician toggles camera off and on — preview updates
- [ ] Clinician clicks "Join Session" — enters VideoCall directly
- [ ] Participant navigates to session link, sees PreJoinScreen
- [ ] Participant clicks "Join Session" — enters WaitingRoom
- [ ] Participant sees "Waiting for your therapist..." message
- [ ] Within 5 seconds, WaitingRoom auto-transitions to VideoCall
- [ ] Both participants see each other video and hear audio
- [ ] Duration timer is running and accurate
- [ ] Clinician clicks "End Call" — confirmation dialog appears
- [ ] Clinician confirms — both see "Session Ended" with duration
- [ ] Appointment status reflects completed telehealth session

### Device Switching During Call

- [ ] Clinician switches camera mid-call — video updates for both
- [ ] Participant switches microphone mid-call — audio continues
- [ ] Switching to a failing device shows error toast, reverts

### Screen Sharing

- [ ] Clinician clicks screen share — browser picker appears
- [ ] Remote participant sees shared screen in large view
- [ ] Camera feed moves to small pip during screen share
- [ ] Clinician stops sharing — layout reverts to camera-only
- [ ] Participant screen share — button present and functional

### Network Resilience

- [ ] Network drop (5 sec) — "Reconnecting" overlay appears
- [ ] Re-enable network — reconnects within 10 seconds
- [ ] Extended disconnect (30+ sec) — "Disconnected" with rejoin option
- [ ] Click "Rejoin" — new token fetched, reconnects to same room

### Error Scenarios

- [ ] Camera permission denied — error message, can join audio-only
- [ ] Microphone permission denied — error message with instructions
- [ ] Expired appointment link — "This session has ended" message
- [ ] Cancelled appointment — "Appointment cancelled" message
- [ ] Two tabs same session — second tab works or shows warning

### Waiting Room Timeout

- [ ] Clinician never arrives — after 30 min, "Session timeout" message
- [ ] "Leave" button returns to appointment page

### Mobile Browser (Responsive)

- [ ] iPhone Safari — layout is usable
- [ ] Android Chrome — layout is usable
- [ ] Controls reachable on small screens
- [ ] Camera switching works on mobile (front/back)

---

## 7. Security Test Scenarios

| ID | Scenario | Attack Vector | Expected Defense | Priority |
|----|----------|---------------|------------------|----------|
| SEC-001 | Unauthenticated token request | No auth header | 401 | P0 |
| SEC-002 | Forged JWT for token request | Invalid JWT secret | 401 | P0 |
| SEC-003 | Expired JWT for token request | Token with exp in past | 401 | P0 |
| SEC-004 | Clinician accessing other clinician appt | Valid token, wrong appointment | 403 ownership check | P0 |
| SEC-005 | Participant accessing other participant appt | Valid token, wrong appointment | 403 ownership check | P0 |
| SEC-006 | Forged webhook signature | Invalid Authorization header | 401, event not processed | P0 |
| SEC-007 | Replay webhook event | Same event sent twice | Idempotent — no corruption | P1 |
| SEC-008 | Room name guessing | Token for room-A, connect to room-B | LiveKit rejects (room-scoped token) | P0 |
| SEC-009 | Token reuse after session ended | Old token, room closed | LiveKit rejects | P1 |
| SEC-010 | LIVEKIT_API_SECRET in response | Any API response | Secret never in response body or logs | P0 |
| SEC-011 | PII in webhook payload storage | Webhook with participant metadata | Only identity stored, no names/emails | P0 |
| SEC-012 | Room name enumeration | Sequential appointment IDs | Room names use cuid (not sequential) | P1 |
| SEC-013 | Cross-practice session access | Clinician from practice A, appt from B | 403 via practice membership check | P0 |
| SEC-014 | Token TTL limits | Token used after 6 hours | Connection rejected by LiveKit | P1 |

---

## 8. Performance Benchmarks

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Token generation latency | < 200ms p99 | API response time for POST /api/telehealth/token |
| Time to PreJoinScreen | < 2 seconds | Page load to camera preview visible |
| Time to video connection | < 3 seconds | "Join" click to first video frame |
| Waiting room poll interval | 5 seconds | Verify in component code |
| Auto-join from waiting room | < 2 seconds | Clinician join to participant VideoCall |
| Reconnection after network drop | < 10 seconds | Re-enable to video restored |
| Screen share start latency | < 2 seconds | Share click to remote seeing screen |
| Webhook processing time | < 100ms | Webhook receipt to DB write |
| Max concurrent sessions | Measure at 10, 25, 50 | CPU/memory on self-hosted LiveKit |

---

## 9. Test Architecture Recommendations

### Test File Organization

```
packages/api/src/__tests__/
  telehealth-token.test.ts          (19 tests)
  telehealth-webhooks.test.ts       (15 tests)
  telehealth-sessions.test.ts       (10 tests)
  integration/
    telehealth.test.ts              (8 tests)

packages/shared/src/__tests__/
  telehealth.schema.test.ts         (12 tests)

apps/web/src/__tests__/telehealth/
  PreJoinScreen.test.tsx            (12 tests)
  WaitingRoom.test.tsx              (10 tests)
  VideoCall.test.tsx                (16 tests)
  TelehealthSession.test.tsx        (12 tests)
```

### Shared Test Utilities Needed

Add to `packages/api/src/__tests__/helpers.ts`:

```typescript
export function mockTelehealthSession(overrides: Record<string, any> = {}) {
  return {
    id: "th-session-1",
    appointmentId: "appt-1",
    roomName: "session-appt-1",
    roomSid: null,
    status: "WAITING",
    clinicianJoinedAt: null,
    participantJoinedAt: null,
    endedAt: null,
    durationSeconds: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function mockTelehealthEvent(overrides: Record<string, any> = {}) {
  return {
    id: "th-event-1",
    telehealthSessionId: "th-session-1",
    eventType: "room_started",
    participantIdentity: null,
    payload: {},
    receivedAt: new Date(),
    ...overrides,
  };
}
```

Add to `packages/api/src/__tests__/setup.ts` Prisma mock:

```typescript
telehealthSession: {
  create: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  upsert: vi.fn(),
},
telehealthEvent: {
  create: vi.fn(),
  findMany: vi.fn(),
},
```

### Mock Strategy

| Dependency | Strategy | Rationale |
|-----------|----------|-----------|
| `livekit-server-sdk` (AccessToken) | Mock globally | Never generate real LiveKit tokens in tests |
| `livekit-server-sdk` (WebhookReceiver) | Mock globally | Cannot generate real webhook signatures |
| `@livekit/components-react` | Mock hooks | WebRTC not available in jsdom |
| `navigator.mediaDevices` | Mock per-test | Device enumeration not in jsdom |
| Prisma | Mock via setup.ts (unit) / real DB (integration) | Standard project pattern |
| `api-client` | Mock via `vi.mock` | Standard frontend pattern |

### CI/CD Integration

| Stage | What Runs | When |
|-------|-----------|------|
| PR checks | Unit tests (token, webhooks, sessions, schema) | Every PR |
| PR checks | Frontend component tests | Every PR |
| Merge to dev | Integration tests against test DB | On merge |
| Pre-release | Full manual E2E checklist (Section 6) | Before production deploy |
| Nightly | All unit + integration + security scenarios | Scheduled |

### Flakiness Prevention

- **Polling tests (WaitingRoom):** Use `vi.useFakeTimers()` and `vi.advanceTimersByTime()` — never real timers.
- **Media device tests:** Mock `navigator.mediaDevices` deterministically with fixed device lists.
- **Token expiry tests:** Use `vi.setSystemTime()` to avoid timing races.
- **Webhook ordering:** Set up events in explicit sequence, never rely on timing.
- **LiveKit Room mock:** Mock connection state as synchronous property, not async event listener.

---

## 10. Coverage Gap Analysis

### Currently Covered (existing infrastructure)

- [x] Auth middleware — unit tests (auth.test.ts)
- [x] Role-based access — unit tests (auth.test.ts)
- [x] Webhook signature verification pattern — Stripe tests (stripe-webhooks.test.ts)
- [x] Appointment CRUD — unit + integration tests
- [x] Frontend component testing — RTL + QueryClient pattern
- [x] API client with 401 retry — unit tests (api-client.test.ts)

### Critical Gaps — P0 (Must Have Before Launch)

- [ ] `POST /api/telehealth/token` — no tests exist
- [ ] `POST /api/telehealth/webhooks` — no tests exist
- [ ] `GET /api/telehealth/sessions/:appointmentId` — no tests exist
- [ ] Telehealth Zod schemas — no tests exist
- [ ] PreJoinScreen component — no tests exist
- [ ] WaitingRoom component — no tests exist
- [ ] VideoCall controls component — no tests exist
- [ ] TelehealthSession orchestrator — no tests exist
- [ ] Ownership verification for telehealth endpoints — no tests exist
- [ ] Cross-practice isolation for telehealth — no tests exist

### Important Gaps — P1

- [ ] Integration tests with real database
- [ ] Webhook idempotency verification
- [ ] Token TTL validation
- [ ] Reconnection state handling in frontend
- [ ] Device switching during call
- [ ] Audit log entries for telehealth events

### Nice to Have — P2

- [ ] Network quality indicator tests
- [ ] Audio level meter component test
- [ ] Performance benchmarks automated in CI
- [ ] Visual regression for video call layout
- [ ] Load testing for concurrent sessions on self-hosted LiveKit

---

## 11. Domain-to-Test-File Summary

| Domain | Test File | Test Count |
|--------|-----------|------------|
| Token generation + auth + ownership | telehealth-token.test.ts | 19 |
| Webhook signature + event processing | telehealth-webhooks.test.ts | 15 |
| Session status CRUD | telehealth-sessions.test.ts | 10 |
| Zod schemas | telehealth.schema.test.ts | 12 |
| PreJoinScreen (devices, preview) | PreJoinScreen.test.tsx | 12 |
| WaitingRoom (polling, auto-join) | WaitingRoom.test.tsx | 10 |
| VideoCall (controls, layout) | VideoCall.test.tsx | 16 |
| TelehealthSession (orchestrator) | TelehealthSession.test.tsx | 12 |
| Integration (real DB) | integration/telehealth.test.ts | 8 |
| Security scenarios | Distributed across token + webhook tests | 14 |
| E2E manual checklist | Section 6 | 28 |
| **Total automated** | **9 files** | **~114** |
| **Total manual** | **1 checklist** | **~28** |

---

Status: IN_REVIEW
