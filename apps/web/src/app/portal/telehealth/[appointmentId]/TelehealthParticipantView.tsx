"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LiveKitRoom,
  VideoTrack,
  AudioTrack,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useTracks,
  useConnectionState,
  isTrackReference,
} from "@livekit/components-react";
import { ConnectionState, RoomEvent, Track } from "livekit-client";
import "@livekit/components-styles";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { logTelehealthEventAction } from "../../_actions/telehealth-events";
import {
  fetchRecordingStateAction,
  respondToRecordingConsentAction,
  stopRecordingAction,
} from "../../_actions/recording";

// FR-7 / AC-7.6 / COND-6 / COND-7
// Participant-only LiveKit view. Strips: transcript, AI summary,
// session prep, recording controls, end-for-all. Adds: consent modal.
//
// COND-7: emits POST /telehealth-events on room.connected and
// room.disconnected for HIPAA audit logging.
//
// Recording consent protocol (matches the clinician-side RecordingControls):
//   Server broadcasts via LiveKit data channel:
//     { type: "recording:consent:requested", consentId, timeoutMs }
//     { type: "recording:consent:timeout" }
//     { type: "recording:consent:declined" }
//     { type: "recording:started" }
//     { type: "recording:stopped", revoked? }
//
//   Participant POSTs response via /api/telehealth/:id/recording/consent
//   with { consentId, granted } — NOT via data channel.

interface RecordingConsentMessage {
  type: string;
  consentId?: string;
  timeoutMs?: number;
  revoked?: boolean;
}

interface Props {
  appointmentId: string;
  livekitToken: string;
  livekitUrl: string;
}

// Dev-only diagnostic logger. Gated so it never fires in production.
const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[telehealth]", ...args);
  }
};

export default function TelehealthParticipantView(props: Props) {
  // Skip SSR entirely for this component. The telehealth view is fully
  // interactive (LiveKit connection, getUserMedia, consent modal) and
  // doesn't benefit from server-rendering. Rendering null on the server
  // and deferring the mount until the client takes over eliminates any
  // hydration mismatch (React error #418) caused by differences between
  // server- and client-side time/intl formatting or LiveKit internals.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center text-white">
        <Loader2 className="h-8 w-8 animate-spin text-teal-300" />
      </div>
    );
  }
  return <TelehealthParticipantViewInner {...props} />;
}

function TelehealthParticipantViewInner({
  appointmentId,
  livekitToken,
  livekitUrl,
}: Props) {
  const router = useRouter();
  // Two-phase join flow — the user MUST click "Join session" to produce
  // a user gesture before we attempt to connect. Without a user gesture,
  // the browser blocks AudioContext.start() and getUserMedia prompts can
  // be denied silently. This matches UX spec Flow 7: "Pre-join: brief
  // device check → Join session button → connect".
  const [phase, setPhase] = useState<"pre-join" | "connecting" | "connected" | "error">(
    "pre-join"
  );
  const [connectError, setConnectError] = useState<string | null>(null);

  devLog("render phase=", phase, "url=", livekitUrl, "tokenLen=", livekitToken?.length);

  const handleJoinClick = useCallback(async () => {
    devLog("Join clicked — requesting getUserMedia");
    setConnectError(null);
    // Ask for permissions up-front so the user sees the browser prompt
    // as a direct consequence of their click. LiveKit will try to reuse
    // these tracks when it connects a moment later.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      devLog("getUserMedia granted, tracks=", stream.getTracks().length);
      // Release the tracks immediately — LiveKit will re-acquire them
      // on connect. We only wanted the permission grant.
      stream.getTracks().forEach((t) => t.stop());
    } catch (err) {
      devLog("getUserMedia failed", err);
      const name = (err as Error & { name?: string })?.name ?? "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setConnectError(
          "Camera and microphone access is blocked for this site. Click the lock icon in your address bar, set Camera and Microphone to Allow (or Ask), then reload this page and try again."
        );
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setConnectError(
          "We couldn't find a camera or microphone. Please connect a device and try again."
        );
      } else {
        setConnectError(
          "We couldn't access your camera or microphone. Please check your browser settings and try again."
        );
      }
      setPhase("error");
      return;
    }
    devLog("transitioning to connecting phase");
    setPhase("connecting");
  }, []);

  const handleDisconnected = useCallback(() => {
    devLog("LiveKitRoom onDisconnected fired");
    logTelehealthEventAction({ appointmentId, event: "disconnected" }).catch(
      () => {}
    );
    router.push("/portal/calendar");
  }, [appointmentId, router]);

  const handleError = useCallback((err: Error) => {
    devLog("LiveKitRoom onError fired", err);
    setConnectError(err.message || "Unable to connect to your session.");
    setPhase("error");
  }, []);

  const handleConnected = useCallback(() => {
    devLog("LiveKitRoom onConnected fired — setting phase to connected");
    setPhase("connected");
  }, []);

  const handleBack = useCallback(() => {
    router.push("/portal/calendar");
  }, [router]);

  const handleRetry = useCallback(() => {
    setConnectError(null);
    setPhase("pre-join");
  }, []);

  if (phase === "pre-join") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-900 text-white p-6">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-teal-700 items-center justify-center text-white text-2xl font-bold mb-4">
            S
          </div>
          <h1 className="text-2xl font-semibold mb-2">Ready to join?</h1>
          <p className="text-stone-400 mb-8">
            We&apos;ll ask for access to your camera and microphone so you can
            see and hear your clinician.
          </p>
          <button
            onClick={handleJoinClick}
            className="w-full px-6 py-3 bg-teal-700 text-white font-semibold rounded-lg hover:bg-teal-800 mb-3"
          >
            Join session
          </button>
          <button
            onClick={handleBack}
            className="w-full px-6 py-3 border border-stone-700 text-stone-300 font-medium rounded-lg hover:bg-stone-800"
          >
            Back to calendar
          </button>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold mb-3">Couldn&apos;t connect</h1>
          <p className="text-stone-400 mb-6">
            {connectError ?? "We hit an unexpected error."}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="px-5 py-2.5 border border-stone-700 text-stone-200 font-semibold rounded-lg hover:bg-stone-800"
            >
              Try again
            </button>
            <button
              onClick={handleBack}
              className="px-5 py-2.5 bg-teal-700 text-white font-semibold rounded-lg hover:bg-teal-800"
            >
              Back to calendar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Visible connecting overlay — the LiveKitRoom children don't
          render anything until the context is established, so we layer
          a spinner on top while phase === "connecting". Dismissed
          automatically when onConnected fires. */}
      {phase === "connecting" && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 pointer-events-none">
          <Loader2 className="h-10 w-10 animate-spin text-teal-300 mb-3" />
          <p className="text-sm font-medium">Connecting to your session...</p>
          <p className="text-xs text-stone-500 mt-2">
            {livekitUrl?.replace(/^wss?:\/\//, "")}
          </p>
        </div>
      )}
      <LiveKitRoom
        token={livekitToken}
        serverUrl={livekitUrl}
        connect={true}
        audio={true}
        video={true}
        className="h-screen w-full"
        onConnected={handleConnected}
        onDisconnected={handleDisconnected}
        onError={handleError}
      >
        <ParticipantRoomInner appointmentId={appointmentId} />
      </LiveKitRoom>
    </div>
  );
}

interface InnerProps {
  appointmentId: string;
}

function ParticipantRoomInner({ appointmentId }: InnerProps) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const connectionState = useConnectionState();

  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const hasEmittedConnectedRef = useRef(false);

  // Recording consent state — driven by server data channel messages
  const [isRecording, setIsRecording] = useState(false);
  const [activeConsentId, setActiveConsentId] = useState<string | null>(null);
  const [consentTimeRemaining, setConsentTimeRemaining] = useState(60);
  const [isRespondingConsent, setIsRespondingConsent] = useState(false);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.Microphone, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  // Log connection state transitions in dev so we can see where it stalls
  useEffect(() => {
    devLog("connectionState changed:", connectionState);
  }, [connectionState]);

  // COND-7: emit connected event exactly once per room session.
  useEffect(() => {
    if (
      connectionState === ConnectionState.Connected &&
      !hasEmittedConnectedRef.current
    ) {
      hasEmittedConnectedRef.current = true;
      logTelehealthEventAction({ appointmentId, event: "connected" }).catch(
        () => {}
      );
    }
  }, [connectionState, appointmentId]);

  // Fetch initial recording state on mount — in case the participant
  // joined after recording was already started. The state endpoint is
  // authoritative; data channel messages update state going forward.
  useEffect(() => {
    fetchRecordingStateAction(appointmentId)
      .then((result) => {
        if (result.ok && result.data) {
          setIsRecording(result.data.isRecording);
          if (result.data.pendingConsentId) {
            setActiveConsentId(result.data.pendingConsentId);
            setConsentTimeRemaining(60);
          }
        }
      })
      .catch(() => {});
  }, [appointmentId]);

  // Listen for server-broadcast recording state messages on the LiveKit
  // data channel. Same protocol as clinician RecordingControls.
  useEffect(() => {
    const handleData = (payload: Uint8Array) => {
      try {
        const text = new TextDecoder().decode(payload);
        const msg = JSON.parse(text) as RecordingConsentMessage;

        if (msg.type === "recording:consent:requested" && msg.consentId) {
          setActiveConsentId(msg.consentId);
          setConsentTimeRemaining(Math.floor((msg.timeoutMs ?? 60000) / 1000));
        } else if (msg.type === "recording:consent:timeout") {
          setActiveConsentId(null);
        } else if (msg.type === "recording:consent:declined") {
          setActiveConsentId(null);
        } else if (msg.type === "recording:started") {
          setActiveConsentId(null);
          setIsRecording(true);
        } else if (msg.type === "recording:stopped") {
          setIsRecording(false);
        }
      } catch {
        // Ignore non-JSON data packets (LiveKit uses the channel for
        // other things too)
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room]);

  // Countdown the consent-request window so the participant sees a
  // clear "responding in Xs" indicator.
  useEffect(() => {
    if (!activeConsentId) return;
    const interval = setInterval(() => {
      setConsentTimeRemaining((t) => {
        if (t <= 1) {
          setActiveConsentId(null);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeConsentId]);

  const handleAcceptRecording = useCallback(async () => {
    if (!activeConsentId) return;
    setIsRespondingConsent(true);
    try {
      const result = await respondToRecordingConsentAction({
        appointmentId,
        consentId: activeConsentId,
        granted: true,
      });
      if (!result.ok) {
        devLog("consent accept failed", result.error);
      }
      setActiveConsentId(null);
    } finally {
      setIsRespondingConsent(false);
    }
  }, [appointmentId, activeConsentId]);

  const handleDeclineRecording = useCallback(async () => {
    if (!activeConsentId) return;
    setIsRespondingConsent(true);
    try {
      await respondToRecordingConsentAction({
        appointmentId,
        consentId: activeConsentId,
        granted: false,
      });
      setActiveConsentId(null);
    } finally {
      setIsRespondingConsent(false);
    }
  }, [appointmentId, activeConsentId]);

  const handleRevokeRecording = useCallback(async () => {
    if (
      !window.confirm(
        "Stop recording this session? Your clinician will no longer be able to record."
      )
    ) {
      return;
    }
    await stopRecordingAction(appointmentId);
  }, [appointmentId]);

  const toggleMic = useCallback(async () => {
    try {
      await localParticipant.setMicrophoneEnabled(!micEnabled);
      setMicEnabled(!micEnabled);
    } catch {
      // permission denied; leave state as-is
    }
  }, [localParticipant, micEnabled]);

  const toggleCamera = useCallback(async () => {
    try {
      await localParticipant.setCameraEnabled(!cameraEnabled);
      setCameraEnabled(!cameraEnabled);
    } catch {
      // permission denied
    }
  }, [localParticipant, cameraEnabled]);

  const handleLeave = useCallback(() => {
    // onDisconnected handler emits the audit event + redirect
    room.disconnect().catch(() => {});
  }, [room]);

  const realTracks = tracks.filter(isTrackReference);
  const remoteCameraTracks = realTracks.filter(
    (t) =>
      t.participant.identity !== localParticipant.identity &&
      t.source === Track.Source.Camera
  );
  const localCameraTracks = realTracks.filter(
    (t) =>
      t.participant.identity === localParticipant.identity &&
      t.source === Track.Source.Camera
  );
  const remoteAudioTracks = realTracks.filter(
    (t) =>
      t.participant.identity !== localParticipant.identity &&
      t.source === Track.Source.Microphone
  );

  const remoteParticipant = participants.find(
    (p) => p.identity !== localParticipant.identity
  );

  const isConnected = connectionState === ConnectionState.Connected;
  const isReconnecting = connectionState === ConnectionState.Reconnecting;

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Connection status */}
      <div
        className="absolute top-4 left-4 z-20 flex items-center gap-2 text-sm"
        aria-live="polite"
      >
        {isConnected ? (
          <Wifi className="h-4 w-4 text-green-400" />
        ) : (
          <WifiOff className="h-4 w-4 text-amber-400" />
        )}
        <span>
          {connectionState === ConnectionState.Connected
            ? "Connected"
            : connectionState === ConnectionState.Reconnecting
              ? "Reconnecting..."
              : connectionState === ConnectionState.Connecting
                ? "Connecting..."
                : "Disconnected"}
        </span>
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div
          className="absolute top-4 right-4 z-20 flex items-center gap-2 text-sm bg-red-600/90 rounded-full px-3 py-1.5"
          aria-live="polite"
        >
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="font-medium">Recording</span>
          <button
            onClick={handleRevokeRecording}
            className="ml-1 text-[10px] underline hover:no-underline"
            aria-label="Stop recording"
          >
            Stop
          </button>
        </div>
      )}

      {/* Reconnecting overlay */}
      {isReconnecting && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70">
          <Loader2 className="h-10 w-10 animate-spin text-teal-300 mb-3" />
          <p className="text-sm">Reconnecting to your session...</p>
        </div>
      )}

      {/* Main video area */}
      <div className="relative h-screen w-full">
        {remoteCameraTracks.length > 0 ? (
          <VideoTrack
            trackRef={remoteCameraTracks[0]}
            className="h-full w-full object-contain"
          />
        ) : remoteParticipant ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-teal-700 text-3xl font-bold text-white">
              {(remoteParticipant.name || remoteParticipant.identity)
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-stone-400">
            <div className="text-center">
              <p className="text-lg mb-2">
                Waiting for your clinician to join...
              </p>
              <p className="text-sm">You&apos;ll see them here once they connect.</p>
            </div>
          </div>
        )}

        {/* Remote audio — always rendered so audio plays */}
        {remoteAudioTracks.map((trackRef) => (
          <AudioTrack
            key={trackRef.participant?.identity}
            trackRef={trackRef}
          />
        ))}

        {/* Self PiP */}
        <div className="absolute bottom-24 right-4 w-40 overflow-hidden rounded-xl border-2 border-teal-700/60 shadow-lg z-10">
          {localCameraTracks.length > 0 && cameraEnabled ? (
            <VideoTrack
              trackRef={localCameraTracks[0]}
              className="aspect-[4/3] w-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center bg-stone-800">
              <VideoOff className="h-6 w-6 text-stone-500" />
            </div>
          )}
          {!micEnabled && (
            <div className="absolute top-1.5 right-1.5 rounded-full bg-red-500 p-1">
              <MicOff className="h-2.5 w-2.5 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Control bar */}
      <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-3">
        <button
          onClick={toggleMic}
          className={`rounded-full p-4 transition-colors ${
            micEnabled
              ? "bg-white/15 text-white hover:bg-white/25"
              : "bg-red-600 text-white hover:bg-red-700"
          }`}
          aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"}
          aria-pressed={!micEnabled}
        >
          {micEnabled ? (
            <Mic className="h-5 w-5" />
          ) : (
            <MicOff className="h-5 w-5" />
          )}
        </button>
        <button
          onClick={toggleCamera}
          className={`rounded-full p-4 transition-colors ${
            cameraEnabled
              ? "bg-white/15 text-white hover:bg-white/25"
              : "bg-red-600 text-white hover:bg-red-700"
          }`}
          aria-label={cameraEnabled ? "Turn off camera" : "Turn on camera"}
          aria-pressed={!cameraEnabled}
        >
          {cameraEnabled ? (
            <Video className="h-5 w-5" />
          ) : (
            <VideoOff className="h-5 w-5" />
          )}
        </button>
        <div className="w-4" />
        <button
          onClick={handleLeave}
          className="rounded-full bg-red-600 p-4 text-white transition-colors hover:bg-red-700"
          aria-label="Leave session"
        >
          <PhoneOff className="h-5 w-5" />
        </button>
      </div>

      {/* Recording consent modal */}
      {activeConsentId && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="consent-title"
        >
          <div className="bg-white text-stone-800 max-w-md w-full p-6 rounded-2xl">
            <h2 id="consent-title" className="text-xl font-semibold mb-2">
              Recording request
            </h2>
            <p className="text-stone-600 mb-2">
              Your clinician would like to record this session. The recording
              will be transcribed and used to help them generate clinical notes.
              All data is encrypted and stored securely.
            </p>
            <p className="text-sm text-stone-500 mb-4">
              You can decline, and the session will continue without recording.
              You may also stop recording at any time.
            </p>
            <p className="text-xs text-stone-500 mb-6">
              Responding in {consentTimeRemaining} seconds...
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDeclineRecording}
                disabled={isRespondingConsent}
                className="px-4 py-2 border border-stone-300 rounded-lg font-medium disabled:opacity-60"
              >
                Decline
              </button>
              <button
                onClick={handleAcceptRecording}
                disabled={isRespondingConsent}
                aria-busy={isRespondingConsent}
                className="px-4 py-2 bg-teal-700 text-white rounded-lg font-semibold disabled:opacity-60"
              >
                {isRespondingConsent ? "Responding..." : "I consent"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
