# Self-Hosted LiveKit Telehealth Video -- UX Design

## Design Principles

- **Calming healthcare aesthetic**: Soft teal/sage palette from the existing STEADY brand. Rounded corners (`rounded-2xl` on video containers). No harsh borders or clinical white backgrounds during calls.
- **Dark mode for video**: The video room itself uses a dark background (`bg-warm-500` / `#2D2D2D`) so faces are the brightest element. Controls use semi-transparent overlays.
- **Prominent device selection**: Therapists and patients frequently have microphone/camera issues. Device pickers are always one click away -- never buried in a submenu.
- **Clear error states**: Every failure (camera blocked, network lost, room expired) shows a specific cause and a concrete next action. No generic "something went wrong."
- **Keyboard navigable**: All controls reachable via Tab. Mute/unmute via `M`, camera via `V`, end call via `Ctrl+Shift+E`. Focus ring uses `ring-teal/50`.
- **HIPAA context**: No recording indicator in v1 (recording not yet implemented). Session content never leaves the LiveKit server. No screenshots or screen capture warnings needed at the transport layer.

---

## User Flows

### Flow 1: Clinician Starts a Session

**Entry point:** Calendar page -> appointment card (SCHEDULED status, VIRTUAL location) -> click card -> AppointmentModal  
**Success state:** Clinician is in the video room, seeing the patient (or seeing the waiting state if patient has not yet joined)

**Steps:**
1. Clinician views the calendar. Appointments with a VIRTUAL location display a small `Video` icon (lucide `Video`) beside the time range on the `AppointmentCard`.
2. Clinician clicks the appointment card to open `AppointmentModal` in edit mode.
3. For SCHEDULED appointments with a VIRTUAL location whose start time is within a 15-minute window (up to 15 min before through end time), a teal "Start Video Session" button appears in the modal footer, to the left of the standard Save/Cancel buttons.
4. Clinician clicks "Start Video Session". The modal closes and the browser navigates to `/video/[appointmentId]`.
5. The **PreJoinScreen** loads:
   - Camera preview (mirrored, `rounded-2xl`, dark background)
   - Microphone level meter (animated bar showing input level)
   - Device selectors: Camera dropdown, Microphone dropdown, Speaker dropdown
   - "Test Audio" button plays a short tone through the selected speaker
   - Display name shown (read-only, from clinician profile)
   - "Join Session" primary button (teal) and "Back to Calendar" ghost link
6. Clinician clicks "Join Session".
7. The API creates a LiveKit token with the clinician's identity and room name derived from the appointment ID.
8. The **VideoRoom** component connects to the LiveKit room. The clinician sees:
   - If patient has not joined: a centered message "Waiting for [patient first name]..." with a subtle pulse animation
   - If patient is already in the room: the patient's video as the main view

**Error paths:**
- Camera/mic permission denied by browser -> amber alert on PreJoinScreen: "Camera access blocked. Check your browser's address bar and allow camera access for this site." with a "Retry Permissions" button.
- No camera detected -> camera preview shows a teal avatar circle with clinician initials. Mic still works. Info text: "No camera found -- you can join with audio only."
- No microphone detected -> red alert: "No microphone found. You need a working microphone to join the session." Join button disabled.
- LiveKit server unreachable -> red alert on join attempt: "Unable to connect to the video server. Check your internet connection and try again." with "Retry" button.
- Appointment not SCHEDULED or not VIRTUAL -> "Start Video Session" button not rendered.
- Appointment time window not active -> button disabled with tooltip: "Available 15 minutes before the session starts."

**Edge cases:**
- Clinician refreshes the `/video/[appointmentId]` page -> PreJoinScreen loads fresh, previous connection is not resumed (stateless).
- Clinician has multiple browser tabs -> only one can connect to the room at a time. Second tab shows: "You are already connected to this session in another tab."
- Clinician's internet drops after joining -> reconnection handled in Flow 3.

---

### Flow 2: Patient Joins a Session

**Entry point:** Mobile app appointments screen -> appointment card with "Join Video" button OR direct deep link  
**Success state:** Patient is in the video room seeing the therapist

**Steps:**
1. On the mobile appointments screen, SCHEDULED appointments with a VIRTUAL location whose start time is within a 15-minute window show a teal "Join Video" button on the `AppointmentCard` (replaces the "Complete Review" button position).
2. Patient taps "Join Video".
3. The app navigates to the **PatientPreJoinScreen** (full-screen modal route `/video/[appointmentId]`):
   - Camera preview (mirrored, rounded corners, dark background)
   - Mic level indicator
   - Camera toggle and mic toggle buttons below the preview
   - Device selector (simplified: just a "Switch Camera" button for front/back on mobile)
   - Text: "Your therapist will be with you shortly"
   - "Ready to Join" button (teal) -- connects the patient to the waiting room
   - "Cancel" link returns to appointments
4. Patient taps "Ready to Join".
5. Patient enters the **WaitingRoom** state:
   - Self-preview remains visible (small, bottom-right)
   - Center of screen: calming illustration (abstract wave pattern in teal/sage), therapist name, "Waiting for [therapist name] to start the session..."
   - Elapsed wait time displayed subtly: "Waiting 0:32"
   - "Leave" button (ghost, top-left)
6. When the therapist joins the LiveKit room, the patient is automatically transitioned to the **VideoRoom** view -- no additional tap required.

**Error paths:**
- Camera/mic permission denied on mobile -> OS-level settings prompt: "STEADY needs camera and microphone access for video sessions. Tap Settings to enable." with "Open Settings" button.
- Therapist does not join within 10 minutes of patient entering waiting room -> amber notice: "Your therapist hasn't joined yet. They may be running a few minutes late." with "Keep Waiting" and "Leave" options.
- Network lost in waiting room -> "Connection lost. Trying to reconnect..." with spinner. After 30 seconds: "Unable to reconnect. Check your internet and try again." with "Retry" button.
- Appointment is not SCHEDULED -> "Join Video" button not shown.
- Patient tries to join from web browser (future) -> same PreJoinScreen flow as mobile but rendered in the web app.

**Edge cases:**
- Patient joins before therapist -> waits in WaitingRoom; therapist join triggers auto-transition.
- Patient's app goes to background -> LiveKit connection maintained for 60 seconds, then gracefully disconnected. On foreground resume within 60s, reconnects silently. After 60s, shows reconnection prompt.
- Deep link from push notification -> opens directly to PatientPreJoinScreen with appointmentId pre-filled.

---

### Flow 3: During the Call

**Entry point:** Both participants have joined the LiveKit room  
**Success state:** Stable video/audio call with visible controls

**Layout -- Clinician (Web):**
```
+------------------------------------------------------------------+
| [Session Timer: 12:34]     [Connection: Good]          [End Call] |
+------------------------------------------------------------------+
|                                                                    |
|                                                                    |
|                   REMOTE PARTICIPANT VIDEO                         |
|                    (patient's camera feed)                          |
|                      fills main area                               |
|                                                                    |
|                                                    +----------+    |
|                                                    | Self PiP |    |
|                                                    | (draggable)   |
|                                                    +----------+    |
+------------------------------------------------------------------+
|     [Mic]    [Camera]    [Screen Share]    [More]    [End Call]   |
+------------------------------------------------------------------+
```

**Layout -- Patient (Mobile):**
```
+----------------------------------+
| 12:34          [signal]   [End]  |
+----------------------------------+
|                                  |
|     REMOTE PARTICIPANT VIDEO     |
|      (therapist camera feed)     |
|         fills main area          |
|                                  |
|                     +---------+  |
|                     | Self PiP|  |
|                     +---------+  |
+----------------------------------+
|   [Mic]    [Camera]    [Flip]    |
+----------------------------------+
```

**Control bar behaviors:**
- **Mic toggle**: Tap to mute/unmute. Icon changes: `Mic` (active, white) / `MicOff` (muted, red background). When muted, a subtle red dot appears on the self-PiP.
- **Camera toggle**: Tap to enable/disable camera. Icon changes: `Video` (active, white) / `VideoOff` (disabled, red background). When camera is off, self-PiP shows avatar circle with initials.
- **Screen share (clinician only)**: Tap to share screen. Browser's native screen picker opens. While sharing, the patient sees the shared screen as main view, and the clinician's camera moves to a secondary tile. Button shows `MonitorUp` icon, changes to `MonitorX` (active, blue background) while sharing.
- **More menu (clinician only)**: Opens dropdown with:
  - "Mute patient's microphone" -- sends a mute request to the patient's track. Patient sees a toast: "Your therapist has muted your microphone. Tap unmute when you are ready."
  - "Device settings" -- opens inline device selector panel (camera, mic, speaker dropdowns)
- **Flip camera (mobile only)**: Toggles between front and rear camera.
- **End Call**: Red button, always visible. Behavior described in Flow 4.

**Self PiP (Picture-in-Picture):**
- Default position: bottom-right corner, 160x120px (web) / 120x90px (mobile)
- Draggable to any corner (snaps to nearest corner on release)
- Shows own camera feed (mirrored) or avatar when camera is off
- Tap on mobile to temporarily enlarge to 50% of screen for 3 seconds (useful for checking appearance), then shrinks back
- Rounded corners (`rounded-xl`), subtle shadow, 2px teal border when speaking

**Indicators:**
- **Session timer**: Top-left, counts up from 00:00 since both participants connected. Format `MM:SS`, rolls to `H:MM:SS` after 1 hour. Uses `text-warm-200` on the dark header bar.
- **Connection quality**: Top-right, 3-bar signal indicator. Green (3 bars) = excellent, Yellow (2 bars) = fair, Red (1 bar) = poor. Tooltip shows latency in ms. On mobile, just the bar icon without tooltip.
- **Speaking indicator**: Thin teal border glow (`ring-2 ring-teal/40`) animates around the video tile of whoever is currently speaking. Uses LiveKit's audio level API.
- **Patient name overlay**: On the remote video tile (clinician view), patient's first name appears as a semi-transparent label at the bottom-left of the tile. Fades out after 5 seconds, reappears on hover.
- **Reconnecting overlay**: If connection quality drops to disconnected, a centered overlay appears on the affected tile: "Reconnecting..." with a spinner. After 15 seconds: "Connection lost. Attempting to reconnect..." After 30 seconds: drops to the disconnected state (Flow 4 variant).

**Keyboard shortcuts (web only):**

| Key | Action |
|-----|--------|
| `M` | Toggle microphone |
| `V` | Toggle camera |
| `Ctrl+Shift+E` | End call (opens confirmation) |
| `Ctrl+Shift+S` | Toggle screen share (clinician only) |
| `Escape` | Close any open dropdown/panel |

**Responsive behavior (web):**
- Desktop (>1024px): Main video fills available space minus sidebar. Self-PiP is 200x150px.
- Tablet (768-1024px): Full width, no sidebar. Self-PiP is 160x120px.
- Mobile web (<768px): Full screen, controls at bottom. Self-PiP is 120x90px. Screen share disabled.
- The video room page does NOT render inside the dashboard sidebar layout. It is a full-screen route (escapes the `(dashboard)` layout group) to maximize screen real estate for the video feed.

---

### Flow 4: Session Ends

**Entry point:** Either participant clicks "End Call"  
**Success state:** Both participants see the session summary and return to their respective home screens

**Steps -- Initiator (either role):**
1. Participant clicks the red "End Call" button.
2. **ConfirmEndDialog** appears (uses existing `ConfirmDialog` pattern):
   - Title: "End this session?"
   - Body: "This will end the video session for both you and [other participant name]."
   - Buttons: "Cancel" (outline) and "End Session" (destructive red)
3. Participant clicks "End Session".
4. LiveKit room is disconnected. Both participants transition to the **SessionEndedScreen**.

**SessionEndedScreen layout:**
```
+--------------------------------------------+
|                                            |
|         [checkmark circle icon]            |
|                                            |
|          Session Ended                     |
|                                            |
|     Duration: 45 minutes, 12 seconds       |
|     With: [other participant name]          |
|     Date: April 7, 2026                    |
|                                            |
|     [Return to Calendar]  (clinician)      |
|     [Back to Appointments] (patient)       |
|                                            |
+--------------------------------------------+
```

5. Clinician clicks "Return to Calendar" -> navigates to `/appointments`.
6. Patient clicks "Back to Appointments" -> navigates to the mobile appointments tab.

**Alternative endings:**
- **Other participant leaves first**: The remaining participant sees a notification toast: "[Name] has left the session." The video room persists for 30 seconds (in case it was accidental), then auto-navigates to SessionEndedScreen.
- **Network disconnect (unrecoverable)**: After 30 seconds of failed reconnection, the participant transitions to SessionEndedScreen with modified text: "Session disconnected. Duration: [time]." and a "Reconnect" button that attempts to rejoin the room. If the room is still active, they rejoin. If the room was closed, they see the standard ended screen.
- **Browser tab closed**: The remaining participant sees "[Name] has left the session." Same 30-second grace period.

**Error paths:**
- End call API fails (e.g., network issue while signaling) -> LiveKit client-side disconnect still occurs. Session duration is calculated client-side from the timer. The API-side session record update is retried via pg-boss.

---

## Component Specifications

### VideoSessionButton

**Purpose:** Conditional "Start Video Session" or "Join Video" button that appears on appointment cards and modals when the appointment is virtual and within the joinable time window.

**Props interface:**
```typescript
interface VideoSessionButtonProps {
  appointmentId: string;
  appointmentStatus: AppointmentStatus;
  locationType: LocationType | null;
  startAt: string;           // ISO datetime
  endAt: string;             // ISO datetime
  role: "CLINICIAN" | "PARTICIPANT";
  variant?: "card" | "modal"; // card = compact, modal = full-width
  className?: string;
}
```

**Visual layout:**
- `card` variant: Small teal pill button with Video icon + "Start Video" / "Join Video" text. Fits inline on AppointmentCard.
- `modal` variant: Full-width teal button in AppointmentModal footer. Icon + "Start Video Session" / "Join Video Session".

**States:**

| State | Appearance | Behavior |
|-------|-----------|----------|
| Not applicable | Not rendered | Non-VIRTUAL location or non-SCHEDULED status |
| Too early | Disabled button, muted colors | Tooltip: "Available 15 minutes before session" |
| Joinable | Teal button, Video icon, slight pulse animation on border | Click navigates to `/video/[appointmentId]` |
| Session ended | Not rendered | Appointment status is terminal |
| Loading | Spinner replaces icon | While checking room availability |

**Accessibility:**
- `aria-label="Start video session with [participant name]"` (clinician) or `aria-label="Join video session with [clinician name]"` (patient)
- Disabled state uses `aria-disabled="true"` with tooltip explanation
- Focus ring: `focus-visible:ring-2 focus-visible:ring-teal/50 focus-visible:ring-offset-2`

**Tailwind approach:**
```
// Joinable state
bg-teal text-white hover:bg-teal-dark rounded-lg px-4 py-2 text-sm font-medium
inline-flex items-center gap-2 transition-colors

// Disabled state
bg-muted text-muted-foreground cursor-not-allowed opacity-60

// Pulse animation (joinable, card variant)
animate-pulse ring-2 ring-teal/20
```

---

### PreJoinScreen

**Purpose:** Camera/mic preview and device selection before entering the video room. Serves as a "green room" to ensure AV is working.

**Props interface:**
```typescript
interface PreJoinScreenProps {
  appointmentId: string;
  participantName: string;       // Other participant's display name
  selfName: string;              // Current user's display name
  role: "CLINICIAN" | "PARTICIPANT";
  onJoin: (settings: DeviceSettings) => void;
  onBack: () => void;
}

interface DeviceSettings {
  videoDeviceId: string | null;  // null = camera off
  audioDeviceId: string;
  audioOutputDeviceId: string;
  videoEnabled: boolean;
  audioEnabled: boolean;
}
```

**Visual layout (web):**
```
+------------------------------------------------------------------+
|                                                                    |
|  STEADY logo (small, top-left)              "Back to Calendar" ->  |
|                                                                    |
|  +--------------------------------------------+  +-------------+  |
|  |                                            |  | Camera       |  |
|  |          CAMERA PREVIEW                    |  | [dropdown]   |  |
|  |          (mirrored, 16:9)                  |  |              |  |
|  |          dark bg if no camera              |  | Microphone   |  |
|  |                                            |  | [dropdown]   |  |
|  |                                            |  | [===---] lvl |  |
|  |                                            |  |              |  |
|  +--------------------------------------------+  | Speaker      |  |
|                                                   | [dropdown]   |  |
|  Joining as: Dr. Sarah Miller                     | [Test Audio] |  |
|  Session with: John D.                            |              |  |
|                                                   +-------------+  |
|                                                                    |
|              [ Join Session ]  (teal, primary, large)              |
|                                                                    |
+------------------------------------------------------------------+
```

**Visual layout (mobile):**
```
+----------------------------------+
| <- Back                          |
|                                  |
| +------------------------------+|
| |                              ||
| |      CAMERA PREVIEW          ||
| |      (mirrored, fills width) ||
| |                              ||
| +------------------------------+|
|                                  |
|  [Cam toggle] [Mic toggle]      |
|  [==---] mic level               |
|                                  |
|  Joining as: John                |
|  Session with: Dr. Miller        |
|                                  |
|  [Switch Camera]                 |
|                                  |
|  [ Ready to Join ]              |
+----------------------------------+
```

**States:**

| State | Appearance | Behavior |
|-------|-----------|----------|
| Loading devices | Skeleton preview area, "Detecting devices..." text, spinners on dropdowns | Auto-resolves in 1-3 seconds |
| Devices ready | Camera preview live, mic level animating, dropdowns populated | Join button enabled |
| Camera denied | Dark preview with lock icon, amber alert below: "Camera access blocked..." | Join still enabled (audio-only). Camera dropdown disabled. |
| Mic denied | Camera preview works, mic level flat, red alert: "Microphone access is required..." | Join button disabled |
| No camera found | Dark preview with avatar circle (user initials), info text | Join enabled, audio-only indicated |
| No mic found | Red alert, all controls for mic disabled | Join disabled |
| Camera off (user toggled) | Dark preview with avatar, camera toggle shows `VideoOff` | Join enabled |
| Joining | "Join Session" button shows spinner, text changes to "Connecting..." | All device controls disabled |
| Join failed | Red alert: connection error message, "Retry" button | Device controls re-enabled |

**Accessibility:**
- Camera preview has `aria-label="Camera preview"` and `role="img"`
- Mic level meter has `role="meter"` with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label="Microphone input level"`
- Device dropdowns use the existing `Select` component with proper labeling
- "Test Audio" button announces "Playing test tone" via `aria-live="polite"` region
- Focus order: Camera preview (informational, skipped) -> Camera dropdown -> Mic dropdown -> Speaker dropdown -> Test Audio -> Join button -> Back link

**Tailwind approach:**
```
// Container
min-h-screen bg-warm-50 dark:bg-warm-500 flex items-center justify-center p-6

// Preview area
bg-warm-500 rounded-2xl overflow-hidden aspect-video relative

// Device panel
bg-card rounded-xl border p-5 space-y-4

// Mic level bar
h-2 rounded-full bg-warm-100 overflow-hidden
// Inner fill: bg-teal transition-all duration-100

// Join button
bg-teal hover:bg-teal-dark text-white rounded-xl px-8 py-3 text-base font-semibold
```

---

### VideoRoom

**Purpose:** The main video call interface. Renders remote participant video, self PiP, controls, and status indicators.

**Props interface:**
```typescript
interface VideoRoomProps {
  appointmentId: string;
  token: string;                 // LiveKit JWT token
  livekitUrl: string;            // LiveKit server WebSocket URL
  role: "CLINICIAN" | "PARTICIPANT";
  selfName: string;
  remoteName: string;
  onSessionEnd: (duration: number) => void;
}
```

**Visual layout (described in Flow 3 above).**

**States:**

| State | Appearance | Behavior |
|-------|-----------|----------|
| Connecting | Dark screen, centered spinner, "Connecting to session..." | Auto-transitions to connected or error |
| Connected -- waiting | Dark screen, centered text: "Waiting for [name]..." with pulse animation, self PiP visible | Auto-transitions when remote joins |
| Connected -- active | Remote video fills main area, self PiP in corner, controls visible | Full interaction available |
| Remote camera off | Remote tile shows large avatar circle with initials on dark bg, name label visible | Audio still flows |
| Remote disconnected | Remote tile shows "Reconnecting..." overlay with spinner | 30-second timeout before treating as ended |
| Screen sharing (clinician) | Screen share fills main area, remote video and self video become small tiles in a top bar | Screen share controls replace normal controls |
| Poor connection | Yellow connection indicator, potential video quality reduction | Automatic quality adaptation by LiveKit |
| Disconnected (self) | Full-screen overlay: "Connection lost. Reconnecting..." with progress indicator | 3 auto-retry attempts over 30 seconds, then error state |
| Error (unrecoverable) | Full-screen overlay: "Unable to reconnect." with "Try Again" and "Leave Session" buttons | Manual retry or graceful exit |

**Sub-components within VideoRoom:**

#### RemoteVideoTile
```typescript
interface RemoteVideoTileProps {
  track: RemoteTrackPublication | null;
  participantName: string;
  isSpeaking: boolean;
  className?: string;
}
```
- Fills the main content area with `object-cover`
- Speaking indicator: `ring-2 ring-teal/40 transition-shadow duration-200`
- Name label: absolute bottom-left, semi-transparent bg (`bg-black/40`), `text-white text-sm px-3 py-1 rounded-tr-lg`
- Camera off state: centered avatar (64x64 circle, gradient background matching sidebar avatar style, white initials)

#### SelfPiP
```typescript
interface SelfPiPProps {
  track: LocalTrackPublication | null;
  name: string;
  isMuted: boolean;
  isCameraOff: boolean;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  onPositionChange: (pos: SelfPiPProps["position"]) => void;
}
```
- Default size: `w-[200px] h-[150px]` (desktop), `w-[120px] h-[90px]` (mobile)
- Draggable via pointer events, snaps to nearest corner
- Muted indicator: small red dot (`w-3 h-3 bg-red-500 rounded-full absolute top-2 right-2`)
- Camera off: avatar circle with initials, same style as RemoteVideoTile
- Border: `border-2 border-white/20 rounded-xl shadow-lg`
- Speaking: `border-teal/60`

#### ControlBar
```typescript
interface ControlBarProps {
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  role: "CLINICIAN" | "PARTICIPANT";
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
  onOpenMore: () => void;
}
```
- Fixed to bottom of the video room
- Centered row of circular icon buttons
- Background: `bg-black/60 backdrop-blur-sm rounded-full px-4 py-3 mx-auto` (floating pill shape)
- Button styling:

| Button | Default | Active/On | Muted/Off |
|--------|---------|-----------|-----------|
| Mic | `bg-white/20 text-white` | (same) | `bg-red-500/90 text-white` |
| Camera | `bg-white/20 text-white` | (same) | `bg-red-500/90 text-white` |
| Screen Share | `bg-white/20 text-white` | `bg-blue-500/90 text-white` | -- |
| End Call | `bg-red-600 text-white hover:bg-red-700` | -- | -- |
| More | `bg-white/20 text-white` | -- | -- |

- Each button: `w-12 h-12 rounded-full flex items-center justify-center transition-colors`
- Lucide icons: `Mic`, `MicOff`, `Video`, `VideoOff`, `MonitorUp`, `MonitorX`, `Phone` (rotated 135deg for "hang up"), `MoreVertical`
- Gap between buttons: `gap-3`

#### SessionTimer
```typescript
interface SessionTimerProps {
  startedAt: Date;  // When both participants connected
}
```
- Top-left of the video room, over the video
- `text-white/80 text-sm font-mono bg-black/30 rounded-full px-3 py-1`
- Updates every second via `setInterval`
- Format: `MM:SS` -> `H:MM:SS` after 1 hour

#### ConnectionIndicator
```typescript
interface ConnectionIndicatorProps {
  quality: "excellent" | "good" | "fair" | "poor" | "disconnected";
}
```
- Top-right of video room
- Three vertical bars of increasing height
- Color mapping: excellent/good = `text-green-400`, fair = `text-yellow-400`, poor/disconnected = `text-red-400`
- Tooltip (web): "Connection: [quality] ([latency]ms)"
- `bg-black/30 rounded-full px-3 py-1`

---

### WaitingRoom

**Purpose:** Intermediate state for the patient after joining but before the therapist connects. Provides a calming holding experience.

**Props interface:**
```typescript
interface WaitingRoomProps {
  therapistName: string;
  selfPreviewTrack: LocalTrackPublication | null;
  waitingSince: Date;
  onLeave: () => void;
  onTherapistJoined: () => void;  // Called by LiveKit room events
}
```

**Visual layout:**
```
+--------------------------------------------------+
| [Leave]                                           |
|                                                    |
|                                                    |
|              ~~ calming wave graphic ~~            |
|                                                    |
|          Your therapist will be with               |
|              you shortly                           |
|                                                    |
|          Dr. Sarah Miller                          |
|                                                    |
|          Waiting 1:23                              |
|                                                    |
|                                   +-----------+    |
|                                   | Self      |    |
|                                   | preview   |    |
|                                   +-----------+    |
+--------------------------------------------------+
```

**States:**

| State | Appearance | Behavior |
|-------|-----------|----------|
| Waiting | Calming graphic, therapist name, elapsed timer, self preview | Auto-transitions on therapist join |
| Long wait (>10 min) | Amber notice appears: "Your therapist hasn't joined yet..." | "Keep Waiting" dismisses notice, "Leave" exits |
| Therapist joined | Brief flash: "Dr. Miller has joined!" (1.5s) then transition to VideoRoom | Automatic, no user action |
| Connection lost | "Connection lost. Trying to reconnect..." with spinner | 30s timeout then error |

**Accessibility:**
- `role="status"` on the waiting message so screen readers announce changes
- Elapsed timer has `aria-live="off"` (too noisy to announce every second) but the "long wait" notice uses `aria-live="polite"`
- "Leave" button is always keyboard-focusable and first in tab order

**Tailwind approach:**
```
// Container
min-h-screen bg-gradient-to-b from-warm-50 to-white dark:from-warm-500 dark:to-warm-500/80
flex flex-col items-center justify-center p-8

// Calming graphic area
w-48 h-48 mx-auto mb-8 opacity-40
// SVG wave pattern using teal and sage colors

// Therapist name
text-xl font-semibold text-foreground

// Waiting timer
text-sm text-muted-foreground font-mono mt-2

// Self preview
fixed bottom-6 right-6 w-[140px] h-[105px] rounded-xl border-2 border-white/20 shadow-lg overflow-hidden
```

---

### ConfirmEndDialog

**Purpose:** Confirmation before ending the video session. Prevents accidental disconnections.

**Props interface:**
```typescript
interface ConfirmEndDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  otherParticipantName: string;
  onConfirmEnd: () => void;
}
```

Uses the existing `ConfirmDialog` component with:
- `title`: "End this session?"
- `description`: "This will end the video session for both you and [name]."
- `confirmLabel`: "End Session"
- `variant`: "danger"

No custom component needed -- reuses `ConfirmDialog` from `@/components/ui/confirm-dialog`.

---

### SessionEndedScreen

**Purpose:** Post-call summary showing session duration and navigation back to the main app.

**Props interface:**
```typescript
interface SessionEndedScreenProps {
  duration: number;              // Total seconds
  otherParticipantName: string;
  sessionDate: string;           // ISO date
  role: "CLINICIAN" | "PARTICIPANT";
  appointmentId: string;
  disconnectReason: "ended" | "network" | "remote_left";
}
```

**Visual layout:**
```
+--------------------------------------------+
|                                            |
|      [teal circle with checkmark]          |
|                                            |
|         Session Ended                      |
|                                            |
|    Duration: 45 minutes, 12 seconds        |
|    With: John Davis                        |
|    April 7, 2026                           |
|                                            |
|    [ Return to Calendar ]  (clinician)     |
|                                            |
|    or                                      |
|                                            |
|    [ Back to Appointments ] (patient)      |
|                                            |
+--------------------------------------------+
```

**States:**

| State | Appearance | Behavior |
|-------|-----------|----------|
| Normal end | Teal checkmark, "Session Ended", duration summary | Navigation button |
| Network disconnect | Amber warning icon, "Session Disconnected", duration, "Reconnect" + "Leave" buttons | Reconnect attempts to rejoin room |
| Remote left | Teal checkmark, "Session Ended", "[Name] left the session", duration | Navigation button |

**Tailwind approach:**
```
// Container
min-h-screen bg-warm-50 dark:bg-warm-500 flex items-center justify-center

// Card
bg-card rounded-2xl border shadow-sm p-10 max-w-md mx-auto text-center space-y-4

// Checkmark circle
w-16 h-16 rounded-full bg-teal/10 flex items-center justify-center mx-auto
// Inner: Check icon, text-teal, w-8 h-8

// Duration text
text-2xl font-bold text-foreground

// Detail lines
text-sm text-muted-foreground

// Return button
bg-teal text-white rounded-xl px-6 py-3 font-medium hover:bg-teal-dark
```

**Accessibility:**
- Page title changes to "Session Ended -- STEADY" for screen readers
- Auto-focus on the navigation button
- Duration announced via `aria-label` on the duration element: "Session lasted 45 minutes and 12 seconds"

---

### DeviceSelector

**Purpose:** Dropdown pickers for camera, microphone, and speaker. Used on PreJoinScreen and accessible during the call via the "More" menu.

**Props interface:**
```typescript
interface DeviceSelectorProps {
  kind: "videoinput" | "audioinput" | "audiooutput";
  devices: MediaDeviceInfo[];
  selectedDeviceId: string | null;
  onSelect: (deviceId: string) => void;
  disabled?: boolean;
  label: string;
}
```

Uses the existing `Select`, `SelectTrigger`, `SelectContent`, `SelectItem` components.

**States:**

| State | Appearance | Behavior |
|-------|-----------|----------|
| Loading | Skeleton select trigger, "Detecting..." text | Auto-resolves on `enumerateDevices` |
| Populated | Select with device names, selected device highlighted | Change triggers track switch |
| Single device | Select shows device name, dropdown shows single option | Functional but limited |
| No devices | Select trigger shows "No [camera/microphone/speaker] found", disabled | Red text styling |
| Permission denied | Select trigger shows "Access denied", disabled | Amber text, link to help |

**Tailwind approach:** Reuses existing `Select` component styling. Label uses existing `Label` component. Adds an icon prefix inside the trigger:
- Camera: `Camera` (lucide)
- Microphone: `Mic` (lucide)
- Speaker: `Volume2` (lucide)

---

### MicLevelMeter

**Purpose:** Visual indicator of microphone input level. Helps users confirm their mic is working before joining.

**Props interface:**
```typescript
interface MicLevelMeterProps {
  level: number;     // 0-100, from LiveKit audio level API
  className?: string;
}
```

**Visual layout:**
```
[=========------]  (horizontal bar, filled portion = green/teal)
```

**Accessibility:**
- `role="meter"`, `aria-valuenow={level}`, `aria-valuemin={0}`, `aria-valuemax={100}`
- `aria-label="Microphone input level"`

**Tailwind approach:**
```
// Container
h-2 w-full rounded-full bg-warm-100 dark:bg-warm-400 overflow-hidden

// Fill
h-full rounded-full transition-all duration-75
// 0-50: bg-teal
// 51-80: bg-sage
// 81-100: bg-yellow-400 (clipping warning)
```

---

## Page Routing

### Web (Next.js)

| Route | Layout | Component | Auth |
|-------|--------|-----------|------|
| `/video/[appointmentId]` | **No sidebar layout** (full-screen) | `VideoSessionPage` | `requireRole("CLINICIAN")` |

The video page intentionally breaks out of the `(dashboard)` route group. It lives at `apps/web/src/app/video/[appointmentId]/page.tsx` to avoid the sidebar/header chrome and maximize video real estate.

Page component responsibilities:
1. Fetch appointment details (verify ownership, VIRTUAL location, SCHEDULED status)
2. Request LiveKit token from API (`POST /api/video/token`)
3. Render `PreJoinScreen` initially
4. On join, render `VideoRoom`
5. On end, render `SessionEndedScreen`

### Mobile (Expo Router)

| Route | Component | Auth |
|-------|-----------|------|
| `/(app)/video/[appointmentId]` | `VideoSessionScreen` | Participant auth |

Full-screen modal presentation (no tab bar). Same state machine as web: PreJoin -> WaitingRoom/VideoRoom -> SessionEnded.

---

## Integration Points with Existing UI

### AppointmentCard Enhancement

The existing `AppointmentCard` component (`apps/web/src/components/appointments/AppointmentCard.tsx`) gains a video icon for VIRTUAL appointments:

```
// Existing: time range + status dot + recurring icon + conflict icon
// New: Video icon appears after the time range for VIRTUAL locations

[status dot] 2:00 PM - 2:45 PM [video icon] [recurring icon]
Client Name
90834 · Telehealth
```

The video icon uses `Video` from lucide-react, `h-3.5 w-3.5 text-teal`, and is only rendered when `appointment.location?.type === "VIRTUAL"`.

### AppointmentModal Enhancement

The existing `AppointmentModal` (`apps/web/src/components/appointments/AppointmentModal.tsx`) gains the `VideoSessionButton` in its footer when viewing a VIRTUAL SCHEDULED appointment within the joinable time window. The button is placed to the left of the existing Cancel/Save buttons with `mr-auto` to push it to the far left:

```
[Start Video Session]                    [Cancel] [Save]
```

### Mobile AppointmentCard Enhancement

The existing mobile `AppointmentCard` (in `apps/mobile/app/(app)/appointments.tsx`) gains a "Join Video" button that renders below the appointment details, in the same position as the existing "Complete Review" button. When both are applicable (review due + video joinable), the "Join Video" button takes priority and "Complete Review" is hidden (joining the session is more time-sensitive).

---

## Dark Mode Support

The video room is inherently dark-themed (dark background for optimal video viewing). However, the PreJoinScreen, WaitingRoom, and SessionEndedScreen respect the system/app dark mode toggle:

| Component | Light Mode | Dark Mode |
|-----------|-----------|-----------|
| PreJoinScreen | `bg-warm-50`, `bg-card` panels | `bg-warm-500`, `bg-warm-500/80` panels |
| WaitingRoom | `bg-gradient warm-50 to white` | `bg-gradient warm-500 to warm-500/80` |
| VideoRoom | Always dark (`bg-warm-500`) | Always dark (`bg-warm-500`) |
| SessionEndedScreen | `bg-warm-50`, `bg-card` card | `bg-warm-500`, `bg-card` card |
| ControlBar | Always `bg-black/60 backdrop-blur` | Same |

---

## Content & Copy

| Element | Copy | Notes |
|---------|------|-------|
| Video button (clinician, card) | "Start Video" | Compact for card |
| Video button (clinician, modal) | "Start Video Session" | Full text for modal |
| Video button (patient) | "Join Video" | Card and modal |
| Button disabled tooltip | "Available 15 minutes before session" | When outside time window |
| PreJoin heading (clinician) | "Get ready for your session" | Above device selectors |
| PreJoin heading (patient) | "Get ready for your session" | Same for both roles |
| PreJoin join button | "Join Session" (clinician) / "Ready to Join" (patient) | |
| PreJoin back link | "Back to Calendar" (clinician) / "Cancel" (patient) | |
| Camera blocked alert | "Camera access blocked. Check your browser's address bar and allow camera access for this site." | Amber alert |
| Mic blocked alert | "Microphone access is required for video sessions. Check your browser permissions." | Red alert |
| No camera info | "No camera found -- you can join with audio only." | Info text, not blocking |
| No mic alert | "No microphone found. You need a working microphone to join the session." | Red, blocks join |
| Test audio button | "Test Audio" | Plays tone |
| Test audio playing | "Playing..." | During tone playback |
| Device selector labels | "Camera" / "Microphone" / "Speaker" | |
| No device found | "No [device type] found" | In select trigger |
| Connecting state | "Connecting to session..." | With spinner |
| Waiting for remote | "Waiting for [first name]..." | Clinician waiting for patient |
| Waiting room heading | "Your therapist will be with you shortly" | Patient waiting |
| Waiting room therapist | "Dr. [last name]" | Or full name if no Dr. prefix |
| Long wait notice | "Your therapist hasn't joined yet. They may be running a few minutes late." | After 10 min |
| Long wait keep button | "Keep Waiting" | Dismisses notice |
| Therapist joined flash | "[Name] has joined!" | 1.5s display |
| Remote left toast | "[Name] has left the session." | Toast notification |
| Muted by therapist toast | "Your therapist has muted your microphone. Tap unmute when you are ready." | Patient-side |
| Connection lost | "Connection lost. Trying to reconnect..." | With spinner |
| Reconnect failed | "Unable to reconnect. Check your internet and try again." | With retry button |
| End call dialog title | "End this session?" | |
| End call dialog body | "This will end the video session for both you and [name]." | |
| End call confirm | "End Session" | Red/destructive |
| Session ended heading | "Session Ended" | |
| Session disconnected heading | "Session Disconnected" | Network drop variant |
| Duration format | "[X] minutes, [Y] seconds" or "[H] hour, [M] minutes" | Human-readable |
| Return button (clinician) | "Return to Calendar" | |
| Return button (patient) | "Back to Appointments" | |
| Reconnect button | "Reconnect" | On disconnect screen |
| Already connected error | "You are already connected to this session in another tab." | Duplicate tab |
| Session timer | "12:34" / "1:12:34" | Top-left of video room |
| Connection quality tooltip | "Connection: [quality] ([latency]ms)" | Web only |

---

## Information Hierarchy

### PreJoinScreen
1. **Primary:** Camera preview -- immediate visual confirmation of what others will see
2. **Secondary:** Mic level meter -- confirms audio is working
3. **Tertiary:** Device selectors -- fix issues if defaults are wrong
4. **Action:** Join button -- prominent, teal, large

### VideoRoom
1. **Primary:** Remote participant video -- the reason for the call
2. **Secondary:** Controls (mic, camera, end) -- always accessible
3. **Tertiary:** Self PiP -- awareness of own appearance
4. **Background:** Timer, connection indicator -- glanceable, not distracting

### WaitingRoom
1. **Primary:** Status message -- "Your therapist will be with you shortly"
2. **Secondary:** Therapist name -- who you are waiting for
3. **Tertiary:** Self preview -- check your appearance while waiting
4. **Background:** Elapsed time -- low priority, subtle

---

## Accessibility Summary

- **Focus management:** When transitioning between states (PreJoin -> VideoRoom -> SessionEnded), focus moves to the first interactive element of the new view. When the end call dialog opens, focus moves to the Cancel button (safe default). When dialog closes, focus returns to the End Call button.
- **Screen reader:** All video tiles have `aria-label` describing who is shown. Mute states announced via `aria-pressed` on toggle buttons. Connection quality changes announced via `aria-live="polite"` region. Timer is NOT announced (too noisy) -- but can be queried by navigating to it.
- **Keyboard navigation:** All controls reachable via Tab. Shortcuts listed in Flow 3 table. PiP dragging is mouse/touch only (keyboard users can ignore -- PiP position is cosmetic).
- **Color contrast:** Control bar buttons use white icons on dark semi-transparent backgrounds (>7:1 contrast). Red mute indicators use icon shape change (MicOff/VideoOff) in addition to color. Connection quality uses bar count in addition to color.
- **Reduced motion:** Users with `prefers-reduced-motion` skip the pulse animation on joinable buttons, the speaking indicator glow animation, and the waiting room pulse. Transitions use instant `duration-0` instead of animated.
- **Touch targets:** All control bar buttons are minimum 48x48px touch targets (the `w-12 h-12` = 48px spec). Spacing between buttons meets the 8px minimum.

---

## Open Questions

1. **Recording indicator:** Not in v1 scope, but the UI should be designed with space for a recording badge (top-center of video room, next to the timer) for future implementation. No component spec needed yet.
2. **Group sessions:** Current design is strictly 1-on-1. Group therapy would require a grid layout. Flagged for future consideration but not designed here.
3. **Virtual backgrounds:** LiveKit supports virtual backgrounds. Consider adding a "Background" option to the PreJoinScreen device panel in a future iteration. Not in v1.
4. **Chat/messaging during call:** Not in v1. Could be added as a slide-out panel from the "More" menu in a future iteration.
