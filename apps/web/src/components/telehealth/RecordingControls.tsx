"use client";

import { useCallback, useEffect, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent, DataPacket_Kind } from "livekit-client";
import { Button } from "@/components/ui/button";
import { Circle, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";

interface RecordingControlsProps {
  appointmentId: string;
  role: "therapist" | "patient";
}

interface RecordingState {
  isRecording: boolean;
  consentStatus: string | null;
  pendingConsentId: string | null;
}

interface ConsentMessage {
  type: string;
  consentId?: string;
  timeoutMs?: number;
  revoked?: boolean;
}

const CONSENT_TEXT = `Your therapist is requesting to record this session. The recording will be transcribed and used to help generate clinical notes. All data is encrypted and stored securely in accordance with HIPAA requirements. You can decline, and you may revoke consent at any time during the session.`;

export function RecordingControls({ appointmentId, role }: RecordingControlsProps) {
  const room = useRoomContext();
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    consentStatus: null,
    pendingConsentId: null,
  });
  const [isRequesting, setIsRequesting] = useState(false);
  const [showClinicianConfirm, setShowClinicianConfirm] = useState(false);

  // Patient-side consent modal state
  const [patientConsentOpen, setPatientConsentOpen] = useState(false);
  const [activeConsentId, setActiveConsentId] = useState<string | null>(null);
  const [consentTimeRemaining, setConsentTimeRemaining] = useState(60);
  const [isResponding, setIsResponding] = useState(false);

  // Fetch current state
  const refreshState = useCallback(async () => {
    try {
      const data = await api.get<RecordingState>(`/api/telehealth/${appointmentId}/recording/state`);
      setState(data);
    } catch {
      // ignore
    }
  }, [appointmentId]);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  // Listen for LiveKit data channel messages
  useEffect(() => {
    const handleData = (payload: Uint8Array) => {
      try {
        const text = new TextDecoder().decode(payload);
        const msg = JSON.parse(text) as ConsentMessage;

        if (msg.type === "recording:consent:requested" && role === "patient" && msg.consentId) {
          setActiveConsentId(msg.consentId);
          setPatientConsentOpen(true);
          setConsentTimeRemaining(Math.floor((msg.timeoutMs ?? 60000) / 1000));
        } else if (msg.type === "recording:consent:timeout") {
          setPatientConsentOpen(false);
          setActiveConsentId(null);
        } else if (msg.type === "recording:consent:declined") {
          refreshState();
          setIsRequesting(false);
          if (role === "therapist") {
            alert("Client declined recording consent.");
          }
        } else if (msg.type === "recording:started") {
          refreshState();
          setPatientConsentOpen(false);
          setIsRequesting(false);
        } else if (msg.type === "recording:stopped") {
          refreshState();
          if (msg.revoked && role === "therapist") {
            alert("Client revoked recording consent.");
          }
        }
      } catch {
        // ignore non-JSON data packets
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room, role, refreshState]);

  // Countdown for patient consent modal
  useEffect(() => {
    if (!patientConsentOpen) return;
    const interval = setInterval(() => {
      setConsentTimeRemaining((t) => {
        if (t <= 1) {
          setPatientConsentOpen(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [patientConsentOpen]);

  // Clinician initiates recording request
  const handleStartRecording = useCallback(async () => {
    setShowClinicianConfirm(false);
    setIsRequesting(true);
    try {
      await api.post(`/api/telehealth/${appointmentId}/recording/request-consent`, {});
    } catch (err) {
      setIsRequesting(false);
      alert(err instanceof Error ? err.message : "Failed to request consent");
    }
  }, [appointmentId]);

  // Clinician stops recording
  const handleStopRecording = useCallback(async () => {
    try {
      await api.post(`/api/telehealth/${appointmentId}/recording/stop`, {});
      await refreshState();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to stop recording");
    }
  }, [appointmentId, refreshState]);

  // Patient responds to consent
  const handleConsentResponse = useCallback(async (granted: boolean) => {
    if (!activeConsentId) return;
    setIsResponding(true);
    try {
      await api.post(`/api/telehealth/${appointmentId}/recording/consent`, {
        consentId: activeConsentId,
        granted,
      });
      setPatientConsentOpen(false);
      setActiveConsentId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to respond");
    } finally {
      setIsResponding(false);
    }
  }, [appointmentId, activeConsentId]);

  // Patient revokes active recording
  const handleRevokeRecording = useCallback(async () => {
    if (!confirm("Stop recording this session?")) return;
    try {
      await api.post(`/api/telehealth/${appointmentId}/recording/stop`, {});
      await refreshState();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to stop");
    }
  }, [appointmentId, refreshState]);

  return (
    <>
      {/* Recording indicator — visible to both participants when active */}
      {state.isRecording && (
        <div className="flex items-center gap-2 rounded-full bg-red-500/90 px-3 py-1 text-xs font-medium text-white">
          <Circle className="h-2.5 w-2.5 animate-pulse fill-white text-white" />
          <span>Recording</span>
          {role === "patient" && (
            <button
              onClick={handleRevokeRecording}
              className="ml-1 rounded px-1.5 text-[10px] underline hover:no-underline"
            >
              Stop
            </button>
          )}
        </div>
      )}

      {/* Clinician "Start/Stop Recording" button */}
      {role === "therapist" && (
        <>
          {!state.isRecording && !isRequesting && (
            <button
              onClick={() => setShowClinicianConfirm(true)}
              className="rounded-full bg-white/15 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-white/25"
            >
              Start Recording
            </button>
          )}
          {isRequesting && (
            <div className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-medium text-white">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Awaiting consent...</span>
            </div>
          )}
          {state.isRecording && (
            <button
              onClick={handleStopRecording}
              className="rounded-full bg-red-500 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-red-600"
            >
              Stop Recording
            </button>
          )}
        </>
      )}

      {/* Clinician confirmation modal */}
      {showClinicianConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold">Start Recording This Session?</h3>
            <p className="mb-4 text-sm text-gray-700">
              The client will be asked to consent before recording begins. They have 60 seconds to respond.
              If they decline or do not respond in time, no recording will start.
            </p>
            <p className="mb-4 text-xs text-gray-500">
              Recorded audio is transcribed and used to generate clinical notes. All data is encrypted at rest.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowClinicianConfirm(false)}>
                Cancel
              </Button>
              <Button onClick={handleStartRecording}>Request Consent</Button>
            </div>
          </div>
        </div>
      )}

      {/* Patient consent modal */}
      {patientConsentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center gap-2">
              <Circle className="h-4 w-4 fill-red-500 text-red-500" />
              <h3 className="text-lg font-semibold">Recording Consent</h3>
            </div>
            <p className="mb-4 text-sm text-gray-700">{CONSENT_TEXT}</p>
            <div className="mb-4 text-xs text-gray-500">
              Responding in {consentTimeRemaining} seconds...
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => handleConsentResponse(false)}
                disabled={isResponding}
              >
                Decline
              </Button>
              <Button
                onClick={() => handleConsentResponse(true)}
                disabled={isResponding}
              >
                {isResponding ? "Responding..." : "I Consent"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
