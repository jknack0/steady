"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Video, VideoOff, Mic, MicOff, Loader2 } from "lucide-react";

interface PreJoinScreenProps {
  onJoin: (token: string) => void;
  appointmentId: string;
  participantName: string;
  role: string;
  isLoading: boolean;
}

interface MediaDeviceOption {
  deviceId: string;
  label: string;
}

type PermissionError = "camera" | "microphone" | "both" | null;

export function PreJoinScreen({
  onJoin,
  appointmentId,
  participantName,
  role,
  isLoading,
}: PreJoinScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [cameras, setCameras] = useState<MediaDeviceOption[]>([]);
  const [microphones, setMicrophones] = useState<MediaDeviceOption[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceOption[]>([]);

  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [selectedMic, setSelectedMic] = useState<string>("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");

  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [micLevel, setMicLevel] = useState(0);
  const [permissionError, setPermissionError] = useState<PermissionError>(null);
  const [mediaReady, setMediaReady] = useState(false);

  // Enumerate devices after permission is granted
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices
        .filter((d) => d.kind === "videoinput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${i + 1}`,
        }));
      const mics = devices
        .filter((d) => d.kind === "audioinput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${i + 1}`,
        }));
      const spks = devices
        .filter((d) => d.kind === "audiooutput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Speaker ${i + 1}`,
        }));

      setCameras(cams);
      setMicrophones(mics);
      setSpeakers(spks);

      if (cams.length > 0 && !selectedCamera) setSelectedCamera(cams[0].deviceId);
      if (mics.length > 0 && !selectedMic) setSelectedMic(mics[0].deviceId);
      if (spks.length > 0 && !selectedSpeaker) setSelectedSpeaker(spks[0].deviceId);
    } catch {
      // Device enumeration not supported
    }
  }, [selectedCamera, selectedMic, selectedSpeaker]);

  // Setup audio level monitoring
  const setupAudioAnalyser = useCallback((stream: MediaStream) => {
    try {
      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        // Normalize to 0-100
        setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // AudioContext not supported
    }
  }, []);

  // Start media stream
  const startMedia = useCallback(
    async (cameraId?: string, micId?: string) => {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }

      try {
        const constraints: MediaStreamConstraints = {
          video: cameraEnabled
            ? cameraId
              ? { deviceId: { exact: cameraId } }
              : true
            : false,
          audio: micId ? { deviceId: { exact: micId } } : true,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current && cameraEnabled) {
          videoRef.current.srcObject = stream;
        }

        setupAudioAnalyser(stream);
        setPermissionError(null);
        setMediaReady(true);

        // Enumerate after permission granted
        await enumerateDevices();
      } catch (err) {
        const error = err as DOMException;
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          setPermissionError("both");
        } else if (error.name === "NotFoundError") {
          // Try audio-only
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: micId ? { deviceId: { exact: micId } } : true,
            });
            streamRef.current = audioStream;
            setupAudioAnalyser(audioStream);
            setPermissionError("camera");
            setMediaReady(true);
            await enumerateDevices();
          } catch {
            setPermissionError("both");
          }
        } else {
          setPermissionError("both");
        }
      }
    },
    [cameraEnabled, setupAudioAnalyser, enumerateDevices],
  );

  // Initialize on mount
  useEffect(() => {
    startMedia();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restart when device selection changes
  useEffect(() => {
    if (mediaReady && (selectedCamera || selectedMic)) {
      startMedia(selectedCamera || undefined, selectedMic || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCamera, selectedMic]);

  // Toggle camera track
  useEffect(() => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      videoTracks.forEach((t) => {
        t.enabled = cameraEnabled;
      });
    }
  }, [cameraEnabled]);

  // Toggle mic track
  useEffect(() => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach((t) => {
        t.enabled = micEnabled;
      });
    }
  }, [micEnabled]);

  const handleJoin = () => {
    // The parent (TelehealthSession) handles token fetch;
    // we call onJoin with an empty string to signal readiness
    onJoin("");
  };

  const retryPermissions = () => {
    setPermissionError(null);
    startMedia();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--steady-warm-50)] p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-[var(--steady-warm-500)]">
            STEADY Video Session
          </h1>
          <p className="mt-1 text-sm text-[var(--steady-warm-300)]">
            Check your camera and microphone before joining
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Camera Preview */}
          <div className="flex-1">
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-[var(--steady-warm-500)]">
              {cameraEnabled && !permissionError ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--steady-teal)] text-2xl font-bold text-white">
                    {participantName
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                </div>
              )}

              {/* Camera/Mic toggle overlay */}
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                <button
                  onClick={() => setCameraEnabled((v) => !v)}
                  className={`rounded-full p-3 transition-colors ${
                    cameraEnabled
                      ? "bg-white/20 text-white hover:bg-white/30"
                      : "bg-red-500 text-white hover:bg-red-600"
                  }`}
                  aria-label={cameraEnabled ? "Turn off camera" : "Turn on camera"}
                >
                  {cameraEnabled ? (
                    <Video className="h-5 w-5" />
                  ) : (
                    <VideoOff className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={() => setMicEnabled((v) => !v)}
                  className={`rounded-full p-3 transition-colors ${
                    micEnabled
                      ? "bg-white/20 text-white hover:bg-white/30"
                      : "bg-red-500 text-white hover:bg-red-600"
                  }`}
                  aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"}
                >
                  {micEnabled ? (
                    <Mic className="h-5 w-5" />
                  ) : (
                    <MicOff className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Device Settings Panel */}
          <div className="w-full lg:w-72">
            <div className="rounded-2xl border border-[var(--steady-warm-200)] bg-white p-5 shadow-sm">
              {/* Permission error */}
              {permissionError && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-medium text-amber-900">
                    {permissionError === "camera"
                      ? "Camera access blocked"
                      : permissionError === "microphone"
                        ? "Microphone access blocked"
                        : "Camera and microphone access blocked"}
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    Check your browser&apos;s address bar and allow access for this site.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={retryPermissions}
                  >
                    Retry Permissions
                  </Button>
                </div>
              )}

              {/* Camera selector */}
              {cameras.length > 0 && (
                <div className="mb-4">
                  <label className="mb-1 block text-xs font-medium text-[var(--steady-warm-400)]">
                    Camera
                  </label>
                  <select
                    value={selectedCamera}
                    onChange={(e) => setSelectedCamera(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {cameras.map((cam) => (
                      <option key={cam.deviceId} value={cam.deviceId}>
                        {cam.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Microphone selector */}
              {microphones.length > 0 && (
                <div className="mb-4">
                  <label className="mb-1 block text-xs font-medium text-[var(--steady-warm-400)]">
                    Microphone
                  </label>
                  <select
                    value={selectedMic}
                    onChange={(e) => setSelectedMic(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {microphones.map((mic) => (
                      <option key={mic.deviceId} value={mic.deviceId}>
                        {mic.label}
                      </option>
                    ))}
                  </select>

                  {/* Mic level meter */}
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <Mic className="h-3.5 w-3.5 text-[var(--steady-warm-300)]" />
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--steady-warm-100)]">
                        <div
                          className="h-full rounded-full bg-[var(--steady-teal)] transition-all duration-75"
                          style={{ width: `${micEnabled ? micLevel : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Speaker selector */}
              {speakers.length > 0 && (
                <div className="mb-4">
                  <label className="mb-1 block text-xs font-medium text-[var(--steady-warm-400)]">
                    Speaker
                  </label>
                  <select
                    value={selectedSpeaker}
                    onChange={(e) => setSelectedSpeaker(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {speakers.map((spk) => (
                      <option key={spk.deviceId} value={spk.deviceId}>
                        {spk.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Participant info */}
              <div className="mb-4 border-t border-[var(--steady-warm-100)] pt-4">
                <p className="text-sm text-[var(--steady-warm-400)]">
                  Joining as{" "}
                  <span className="font-medium text-[var(--steady-warm-500)]">
                    {participantName}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-[var(--steady-warm-300)]">
                  {role === "therapist" ? "Clinician" : "Participant"}
                </p>
              </div>

              {/* Join button */}
              <Button
                className="w-full bg-[var(--steady-teal)] text-white hover:bg-[var(--steady-teal-dark)] focus-visible:ring-2 focus-visible:ring-[var(--steady-teal)]/50 focus-visible:ring-offset-2"
                size="lg"
                disabled={isLoading || (permissionError === "both")}
                onClick={handleJoin}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Join Session"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Hidden canvas for future use (mic visualization, etc.) */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
