"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logTelehealthEventAction } from "../../_actions/telehealth-events";

// FR-7 / AC-7.6 / COND-6 / COND-7
// Participant-only LiveKit view. Strips: transcript, AI summary,
// session prep, recording controls, end-for-all. Adds: consent modal.
//
// COND-7: emits POST /telehealth-events on room.connected and
// room.disconnected for HIPAA audit logging.
//
// NOTE: This is a minimal scaffold. The actual @livekit/client
// integration mirrors the existing clinician TelehealthSession
// component but with the participant-only feature set.

interface Props {
  appointmentId: string;
  livekitToken: string;
  livekitUrl: string;
}

export default function TelehealthParticipantView({
  appointmentId,
  livekitToken: _livekitToken,
  livekitUrl: _livekitUrl,
}: Props) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [showRecordingConsent, setShowRecordingConsent] = useState(false);
  const [recording, setRecording] = useState(false);

  // ── LiveKit connection lifecycle ────────────────────────────────
  // The actual `@livekit/client` integration is left to the engineer.
  // The contract is:
  //   1. On `room.connected`, call logTelehealthEventAction("connected")
  //   2. On `room.disconnected`, call logTelehealthEventAction("disconnected")
  //   3. On data channel "recording-request", show consent modal
  //   4. On consent decline, send decline signal back via data channel
  //
  // The skeleton below simulates connection so the page renders during
  // implementation. Replace with real LiveKit integration.
  useEffect(() => {
    const t = setTimeout(() => {
      setConnected(true);
      logTelehealthEventAction({ appointmentId, event: "connected" }).catch(
        () => {}
      );
    }, 500);
    return () => {
      clearTimeout(t);
      logTelehealthEventAction({
        appointmentId,
        event: "disconnected",
      }).catch(() => {});
    };
  }, [appointmentId]);

  function handleLeave() {
    setConnected(false);
    logTelehealthEventAction({ appointmentId, event: "disconnected" }).catch(
      () => {}
    );
    router.push("/portal/calendar");
  }

  function handleAcceptRecording() {
    setRecording(true);
    setShowRecordingConsent(false);
    // TODO: emit accept signal back via LiveKit data channel
  }

  function handleDeclineRecording() {
    setRecording(false);
    setShowRecordingConsent(false);
    // TODO: emit decline signal back via LiveKit data channel
  }

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Connection status */}
      <div className="absolute top-4 left-4 flex items-center gap-2 text-sm">
        <span
          className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-amber-400"}`}
          aria-hidden="true"
        />
        <span aria-live="polite">{connected ? "Connected" : "Connecting..."}</span>
      </div>

      {/* Recording indicator */}
      {recording && (
        <div
          className="absolute top-4 right-4 flex items-center gap-2 text-sm"
          aria-live="polite"
        >
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>Recording</span>
        </div>
      )}

      {/* Video area placeholder */}
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-stone-400 text-center">
          {connected ? (
            <p>LiveKit room — engineer to wire @livekit/client integration</p>
          ) : (
            <p>Connecting to your session...</p>
          )}
        </div>
      </div>

      {/* Control bar */}
      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-4">
        <button className="px-4 py-2 bg-stone-800 rounded-lg" aria-label="Toggle microphone">
          Mute
        </button>
        <button className="px-4 py-2 bg-stone-800 rounded-lg" aria-label="Toggle camera">
          Camera
        </button>
        <button
          onClick={handleLeave}
          className="px-4 py-2 bg-red-700 rounded-lg font-semibold"
        >
          Leave session
        </button>
      </div>

      {/* Recording consent modal */}
      {showRecordingConsent && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="consent-title">
          <div className="bg-white text-stone-800 max-w-md p-6 rounded-2xl">
            <h2 id="consent-title" className="text-xl font-semibold mb-2">
              Recording request
            </h2>
            <p className="text-stone-600 mb-2">
              Your clinician would like to record this session. Do you consent?
            </p>
            <p className="text-sm text-stone-500 mb-6">
              You can decline, and the session will continue without recording.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDeclineRecording}
                className="px-4 py-2 border border-stone-300 rounded-lg font-medium"
              >
                Decline
              </button>
              <button
                onClick={handleAcceptRecording}
                className="px-4 py-2 bg-teal-700 text-white rounded-lg font-semibold"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
