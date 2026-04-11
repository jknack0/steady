"use client";

import { useCallback, useEffect, useState } from "react";
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
import type { TrackReference } from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import "@livekit/components-styles";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RecordingControls } from "./RecordingControls";
import { useSessionTimer } from "@/hooks/use-session-timer";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorX,
  PhoneOff,
  Loader2,
  Wifi,
  WifiOff,
  Clock,
} from "lucide-react";

interface VideoCallProps {
  token: string;
  url: string;
  roomName: string;
  role: string;
  participantName: string;
  appointmentId: string;
  onSessionEnd: () => void;
}

export function VideoCall({
  token,
  url,
  roomName,
  role,
  participantName,
  appointmentId,
  onSessionEnd,
}: VideoCallProps) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={url}
      connect={true}
      audio={true}
      video={true}
      className="h-full w-full"
      onDisconnected={onSessionEnd}
    >
      <VideoCallInner
        role={role}
        participantName={participantName}
        appointmentId={appointmentId}
        onSessionEnd={onSessionEnd}
      />
    </LiveKitRoom>
  );
}

// ── Inner Component (inside LiveKitRoom context) ──

interface VideoCallInnerProps {
  role: string;
  participantName: string;
  appointmentId: string;
  onSessionEnd: () => void;
}

function VideoCallInner({
  role,
  participantName,
  appointmentId,
  onSessionEnd,
}: VideoCallInnerProps) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const connectionState = useConnectionState();
  const timer = useSessionTimer();
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.Microphone, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  // Start the session timer
  useEffect(() => {
    timer.start();
    return () => {
      timer.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "m" || e.key === "M") {
        toggleMic();
      } else if (e.key === "v" || e.key === "V") {
        toggleCamera();
      } else if (e.ctrlKey && e.shiftKey && (e.key === "E" || e.key === "e")) {
        e.preventDefault();
        setShowEndConfirm(true);
      } else if (
        e.ctrlKey &&
        e.shiftKey &&
        (e.key === "S" || e.key === "s") &&
        role === "therapist"
      ) {
        e.preventDefault();
        toggleScreenShare();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micEnabled, cameraEnabled, screenSharing, role]);

  const toggleMic = useCallback(async () => {
    try {
      await localParticipant.setMicrophoneEnabled(!micEnabled);
      setMicEnabled(!micEnabled);
    } catch {
      // Permission error
    }
  }, [localParticipant, micEnabled]);

  const toggleCamera = useCallback(async () => {
    try {
      await localParticipant.setCameraEnabled(!cameraEnabled);
      setCameraEnabled(!cameraEnabled);
    } catch {
      // Permission error
    }
  }, [localParticipant, cameraEnabled]);

  const toggleScreenShare = useCallback(async () => {
    try {
      await localParticipant.setScreenShareEnabled(!screenSharing);
      setScreenSharing(!screenSharing);
    } catch {
      // User cancelled or permission denied
    }
  }, [localParticipant, screenSharing]);

  const handleEndCall = useCallback(() => {
    room.disconnect();
    onSessionEnd();
  }, [room, onSessionEnd]);

  // Separate tracks by participant
  const remoteParticipant = participants.find(
    (p) => p.identity !== localParticipant.identity,
  );

  // Filter to real TrackReferences (not placeholders) using the type guard
  const realTracks = tracks.filter(isTrackReference);

  const remoteCameraTracks = realTracks.filter(
    (t) =>
      t.participant.identity !== localParticipant.identity &&
      t.source === Track.Source.Camera,
  );

  const remoteScreenTracks = realTracks.filter(
    (t) =>
      t.participant.identity !== localParticipant.identity &&
      t.source === Track.Source.ScreenShare,
  );

  const localCameraTracks = realTracks.filter(
    (t) =>
      t.participant.identity === localParticipant.identity &&
      t.source === Track.Source.Camera,
  );

  const localScreenTracks = realTracks.filter(
    (t) =>
      t.participant.identity === localParticipant.identity &&
      t.source === Track.Source.ScreenShare,
  );

  const remoteAudioTracks = realTracks.filter(
    (t) =>
      t.participant.identity !== localParticipant.identity &&
      t.source === Track.Source.Microphone,
  );

  const isReconnecting = connectionState === ConnectionState.Reconnecting;
  const isConnected = connectionState === ConnectionState.Connected;

  // Connection quality display
  const connectionQualityText =
    connectionState === ConnectionState.Connected
      ? "Connected"
      : connectionState === ConnectionState.Reconnecting
        ? "Reconnecting..."
        : connectionState === ConnectionState.Connecting
          ? "Connecting..."
          : "Disconnected";

  const connectionQualityColor =
    connectionState === ConnectionState.Connected
      ? "text-green-400"
      : connectionState === ConnectionState.Reconnecting
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <div className="relative flex h-full w-full flex-col bg-[var(--steady-warm-500)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/30">
        <div className="flex items-center gap-4">
          {/* Session timer */}
          <div className="flex items-center gap-1.5 text-sm text-white/80">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-mono">{timer.formatted}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Recording controls — clinician gets a button, both see indicator */}
          <RecordingControls
            appointmentId={appointmentId}
            role={role === "therapist" ? "therapist" : "patient"}
          />

          {/* Connection indicator */}
          <div className={`flex items-center gap-1.5 text-xs ${connectionQualityColor}`}>
            {isConnected ? (
              <Wifi className="h-3.5 w-3.5" />
            ) : (
              <WifiOff className="h-3.5 w-3.5" />
            )}
            <span>{connectionQualityText}</span>
          </div>
        </div>
      </div>

      {/* Main video area */}
      <div className="relative flex-1 overflow-hidden">
        {/* Reconnecting overlay */}
        {isReconnecting && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
            <div className="flex flex-col items-center gap-3 text-white">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm font-medium">Reconnecting...</p>
            </div>
          </div>
        )}

        {/* Remote participant main view */}
        <div className="h-full w-full">
          {remoteScreenTracks.length > 0 ? (
            // Show screen share as main view
            <VideoTrack
              trackRef={remoteScreenTracks[0]}
              className="h-full w-full object-contain"
            />
          ) : remoteCameraTracks.length > 0 ? (
            <VideoTrack
              trackRef={remoteCameraTracks[0]}
              className="h-full w-full object-contain"
            />
          ) : remoteParticipant ? (
            // Remote participant has camera off
            <div className="flex h-full w-full items-center justify-center bg-[var(--steady-warm-500)]">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--steady-teal)] text-3xl font-bold text-white">
                {(remoteParticipant.name || "?")
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            </div>
          ) : (
            // No remote participant yet
            <div className="flex h-full w-full flex-col items-center justify-center bg-[var(--steady-warm-500)]">
              <div className="mb-4 h-20 w-20 rounded-full bg-[var(--steady-teal)]/20 flex items-center justify-center animate-pulse">
                <div className="h-12 w-12 rounded-full bg-[var(--steady-teal)]/40 flex items-center justify-center">
                  <div className="h-6 w-6 rounded-full bg-[var(--steady-teal)]" />
                </div>
              </div>
              <p className="text-sm text-white/60">
                Waiting for the other participant to join...
              </p>
            </div>
          )}
        </div>

        {/* Remote audio - always render to play audio */}
        {remoteAudioTracks.map((trackRef) => (
          <AudioTrack
            key={trackRef.participant?.identity}
            trackRef={trackRef}
          />
        ))}

        {/* Self PiP (floating bottom-right) */}
        <div className="absolute bottom-4 right-4 z-20 w-48 overflow-hidden rounded-xl border-2 border-[var(--steady-teal)]/30 shadow-lg">
          {localCameraTracks.length > 0 && cameraEnabled ? (
            <VideoTrack
              trackRef={localCameraTracks[0]}
              className="aspect-[4/3] w-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center bg-[var(--steady-warm-400)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--steady-teal)] text-sm font-bold text-white">
                {participantName
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            </div>
          )}
          {/* Muted indicator on PiP */}
          {!micEnabled && (
            <div className="absolute top-1.5 right-1.5 rounded-full bg-red-500 p-1">
              <MicOff className="h-2.5 w-2.5 text-white" />
            </div>
          )}
        </div>

        {/* Screen share PiP (when local user is sharing) */}
        {localScreenTracks.length > 0 && (
          <div className="absolute bottom-4 left-4 z-20 w-48 overflow-hidden rounded-xl border-2 border-blue-400/30 shadow-lg">
            <VideoTrack
              trackRef={localScreenTracks[0]}
              className="aspect-[16/9] w-full object-contain bg-black"
            />
            <div className="absolute bottom-1 left-1 rounded bg-blue-500/80 px-1.5 py-0.5 text-[10px] text-white">
              Sharing
            </div>
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="flex items-center justify-center gap-3 bg-black/40 px-4 py-3">
        {/* Mic toggle */}
        <button
          onClick={toggleMic}
          className={`rounded-full p-3.5 transition-colors ${
            micEnabled
              ? "bg-white/15 text-white hover:bg-white/25"
              : "bg-red-500 text-white hover:bg-red-600"
          }`}
          aria-label={micEnabled ? "Mute microphone (M)" : "Unmute microphone (M)"}
          title={micEnabled ? "Mute (M)" : "Unmute (M)"}
        >
          {micEnabled ? (
            <Mic className="h-5 w-5" />
          ) : (
            <MicOff className="h-5 w-5" />
          )}
        </button>

        {/* Camera toggle */}
        <button
          onClick={toggleCamera}
          className={`rounded-full p-3.5 transition-colors ${
            cameraEnabled
              ? "bg-white/15 text-white hover:bg-white/25"
              : "bg-red-500 text-white hover:bg-red-600"
          }`}
          aria-label={cameraEnabled ? "Turn off camera (V)" : "Turn on camera (V)"}
          title={cameraEnabled ? "Camera off (V)" : "Camera on (V)"}
        >
          {cameraEnabled ? (
            <Video className="h-5 w-5" />
          ) : (
            <VideoOff className="h-5 w-5" />
          )}
        </button>

        {/* Screen share (therapist only) */}
        {role === "therapist" && (
          <button
            onClick={toggleScreenShare}
            className={`rounded-full p-3.5 transition-colors ${
              screenSharing
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-white/15 text-white hover:bg-white/25"
            }`}
            aria-label={
              screenSharing
                ? "Stop sharing screen (Ctrl+Shift+S)"
                : "Share screen (Ctrl+Shift+S)"
            }
            title={screenSharing ? "Stop sharing" : "Share screen"}
          >
            {screenSharing ? (
              <MonitorX className="h-5 w-5" />
            ) : (
              <MonitorUp className="h-5 w-5" />
            )}
          </button>
        )}

        {/* Spacer */}
        <div className="w-4" />

        {/* End call */}
        <button
          onClick={() => setShowEndConfirm(true)}
          className="rounded-full bg-red-500 p-3.5 text-white transition-colors hover:bg-red-600"
          aria-label="End call (Ctrl+Shift+E)"
          title="End call"
        >
          <PhoneOff className="h-5 w-5" />
        </button>
      </div>

      {/* End call confirmation dialog */}
      <ConfirmDialog
        open={showEndConfirm}
        onOpenChange={setShowEndConfirm}
        title="End this session?"
        description="This will end the video session for both you and the other participant."
        confirmLabel="End Session"
        variant="danger"
        onConfirm={handleEndCall}
      />
    </div>
  );
}
