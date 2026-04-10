"use client";

import { useCallback, useState } from "react";
import {
  LiveKitRoom,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { PreJoinScreen } from "./PreJoinScreen";
import { WaitingRoom } from "./WaitingRoom";
import { VideoCall } from "./VideoCall";
import { useTelehealthToken } from "@/hooks/use-telehealth-token";
import { useSessionTimer } from "@/hooks/use-session-timer";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";

type SessionPhase =
  | "IDLE"
  | "PRE_JOIN"
  | "CONNECTING"
  | "WAITING"
  | "IN_CALL"
  | "ENDED"
  | "ERROR";

interface TelehealthSessionProps {
  appointmentId: string;
  participantName: string;
  role: "therapist" | "patient";
  onSessionEnd?: () => void;
}

export function TelehealthSession({
  appointmentId,
  participantName,
  role,
  onSessionEnd,
}: TelehealthSessionProps) {
  const [phase, setPhase] = useState<SessionPhase>("PRE_JOIN");
  const [token, setToken] = useState<string>("");
  const [serverUrl, setServerUrl] = useState<string>("");
  const [roomName, setRoomName] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const sessionTimer = useSessionTimer();

  const tokenMutation = useTelehealthToken();

  const handleJoin = useCallback(async () => {
    setPhase("CONNECTING");
    setErrorMessage("");

    try {
      const result = await tokenMutation.mutateAsync(appointmentId);
      setToken(result.token);
      setServerUrl(result.url);
      setRoomName(result.roomName);

      // Clinicians go straight to the call; patients may go to waiting room
      if (role === "patient") {
        setPhase("WAITING");
      } else {
        setPhase("IN_CALL");
        sessionTimer.start();
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to connect to video session";
      setErrorMessage(message);
      setPhase("ERROR");
    }
  }, [appointmentId, role, tokenMutation, sessionTimer]);

  const handleTherapistJoined = useCallback(() => {
    setPhase("IN_CALL");
    sessionTimer.start();
  }, [sessionTimer]);

  const handleSessionEnd = useCallback(() => {
    sessionTimer.pause();
    setPhase("ENDED");
    onSessionEnd?.();
  }, [sessionTimer, onSessionEnd]);

  const handleRetry = useCallback(() => {
    setErrorMessage("");
    setPhase("PRE_JOIN");
  }, []);

  // Format duration for the ended screen
  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts: string[] = [];
    if (h > 0) parts.push(`${h} hour${h !== 1 ? "s" : ""}`);
    if (m > 0) parts.push(`${m} minute${m !== 1 ? "s" : ""}`);
    if (s > 0 || parts.length === 0) parts.push(`${s} second${s !== 1 ? "s" : ""}`);
    return parts.join(", ");
  };

  // ── PRE_JOIN Phase ──
  if (phase === "PRE_JOIN") {
    return (
      <PreJoinScreen
        onJoin={handleJoin}
        appointmentId={appointmentId}
        participantName={participantName}
        role={role}
        isLoading={false}
      />
    );
  }

  // ── CONNECTING Phase ──
  if (phase === "CONNECTING") {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[var(--steady-warm-50)]">
        <Loader2 className="mb-4 h-10 w-10 animate-spin text-[var(--steady-teal)]" />
        <p className="text-sm font-medium text-[var(--steady-warm-400)]">
          Connecting to session...
        </p>
      </div>
    );
  }

  // ── WAITING Phase (patient only, wrapped in LiveKitRoom for participant events) ──
  if (phase === "WAITING" && token && serverUrl) {
    return (
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        audio={false}
        video={false}
        className="h-screen w-full"
      >
        <WaitingRoom
          roomName={roomName}
          token={token}
          onTherapistJoined={handleTherapistJoined}
        />
      </LiveKitRoom>
    );
  }

  // ── IN_CALL Phase ──
  if (phase === "IN_CALL" && token && serverUrl) {
    return (
      <div className="h-screen w-full">
        <VideoCall
          token={token}
          url={serverUrl}
          roomName={roomName}
          role={role}
          participantName={participantName}
          appointmentId={appointmentId}
          onSessionEnd={handleSessionEnd}
        />
      </div>
    );
  }

  // ── ENDED Phase ──
  if (phase === "ENDED") {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[var(--steady-warm-50)] p-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--steady-teal-bg)]">
              <CheckCircle className="h-8 w-8 text-[var(--steady-teal)]" />
            </div>
          </div>

          <h1 className="mb-2 text-2xl font-bold text-[var(--steady-warm-500)]">
            Session Ended
          </h1>

          <div className="mb-6 space-y-1">
            <p className="text-sm text-[var(--steady-warm-400)]">
              Duration: {formatDuration(sessionTimer.elapsed)}
            </p>
            <p className="text-sm text-[var(--steady-warm-300)]">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <Link href="/appointments">
            <Button className="bg-[var(--steady-teal)] text-white hover:bg-[var(--steady-teal-dark)]">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Calendar
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── ERROR Phase ──
  if (phase === "ERROR") {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[var(--steady-warm-50)] p-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <h1 className="mb-2 text-xl font-bold text-[var(--steady-warm-500)]">
            Unable to connect
          </h1>

          <p className="mb-6 text-sm text-[var(--steady-warm-300)]">
            {errorMessage || "An unexpected error occurred while connecting to the video session."}
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              onClick={handleRetry}
              className="bg-[var(--steady-teal)] text-white hover:bg-[var(--steady-teal-dark)]"
            >
              Try Again
            </Button>
            <Link href="/appointments">
              <Button variant="outline" className="w-full sm:w-auto">
                Return to Calendar
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}
