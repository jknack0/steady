"use client";

import { useEffect, useRef } from "react";
import {
  useParticipants,
} from "@livekit/components-react";
import { useSessionTimer } from "@/hooks/use-session-timer";

interface WaitingRoomProps {
  roomName: string;
  token: string;
  onTherapistJoined: () => void;
}

export function WaitingRoom({
  roomName,
  token,
  onTherapistJoined,
}: WaitingRoomProps) {
  const participants = useParticipants();
  const timer = useSessionTimer();
  const hasNotified = useRef(false);

  // Start timing when waiting begins
  useEffect(() => {
    timer.start();
    return () => {
      timer.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When another participant (therapist) joins, trigger the callback
  useEffect(() => {
    // participants includes local participant, so > 1 means someone else joined
    if (participants.length > 1 && !hasNotified.current) {
      hasNotified.current = true;
      onTherapistJoined();
    }
  }, [participants, onTherapistJoined]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--steady-warm-50)] p-4">
      {/* Animated pulse indicator */}
      <div className="relative mb-8">
        <div className="h-24 w-24 rounded-full bg-[var(--steady-teal-bg)] flex items-center justify-center">
          <div className="h-16 w-16 rounded-full bg-[var(--steady-teal)]/20 flex items-center justify-center animate-pulse">
            <div className="h-10 w-10 rounded-full bg-[var(--steady-teal)] flex items-center justify-center">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15.5 5.5a3.5 3.5 0 0 0-7 0v5a3.5 3.5 0 0 0 7 0z" />
                <path d="M18 10.5a6 6 0 0 1-12 0" />
                <path d="M12 16.5v3" />
              </svg>
            </div>
          </div>
        </div>

        {/* Pulsing ring */}
        <div className="absolute inset-0 rounded-full border-2 border-[var(--steady-teal)]/30 animate-ping" />
      </div>

      {/* Message */}
      <h2 className="mb-2 text-xl font-semibold text-[var(--steady-warm-500)]">
        Your therapist will be with you shortly
      </h2>
      <p className="mb-6 text-sm text-[var(--steady-warm-300)]">
        Please stay on this page. You will be connected automatically.
      </p>

      {/* Wait time */}
      <div className="rounded-lg bg-white border border-[var(--steady-warm-200)] px-4 py-2 shadow-sm">
        <p className="text-xs text-[var(--steady-warm-300)]">
          Waiting{" "}
          <span className="font-medium text-[var(--steady-warm-400)]">
            {timer.formatted}
          </span>
        </p>
      </div>

      {/* Animated dots */}
      <div className="mt-8 flex gap-1.5">
        <div
          className="h-2 w-2 rounded-full bg-[var(--steady-teal)]"
          style={{ animation: "pulse 1.4s ease-in-out infinite", animationDelay: "0s" }}
        />
        <div
          className="h-2 w-2 rounded-full bg-[var(--steady-teal)]"
          style={{ animation: "pulse 1.4s ease-in-out infinite", animationDelay: "0.2s" }}
        />
        <div
          className="h-2 w-2 rounded-full bg-[var(--steady-teal)]"
          style={{ animation: "pulse 1.4s ease-in-out infinite", animationDelay: "0.4s" }}
        />
      </div>
    </div>
  );
}
