"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { RNPartContentRenderer } from "@/components/mobile-preview/RNPartRenderers";
import { ScaledDeviceFrame } from "@/components/mobile-preview/DeviceFrame";
import { DEVICES, type DeviceConfig } from "@/components/mobile-preview/devices";

// ── Types ──────────────────────────────────────────

interface PartPreviewModalProps {
  open: boolean;
  onClose: () => void;
  part: {
    type: string;
    title: string;
    content: any;
  };
}

// ── Device selector ────────────────────────────────

const deviceEntries = Object.entries(DEVICES);

// ── Component ──────────────────────────────────────

export function PartPreviewModal({ open, onClose, part }: PartPreviewModalProps) {
  const [deviceKey, setDeviceKey] = useState<string>(deviceEntries[0][0]);
  const device: DeviceConfig = DEVICES[deviceKey];

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 cursor-pointer"
        onClick={onClose}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-4 cursor-default">
        {/* Device selector */}
        <div className="flex items-center gap-2">
          {deviceEntries.map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setDeviceKey(key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                key === deviceKey
                  ? "bg-white text-[#2D2D2D]"
                  : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
              }`}
            >
              {cfg.name}
            </button>
          ))}
        </div>

        {/* Phone frame with part content */}
        <ScaledDeviceFrame device={device}>
          {/* Part header */}
          <div className="bg-white px-4 pt-3 pb-4 border-b border-[#F0EDE8]">
            <h3 className="text-lg font-bold text-[#2D2D2D]">{part.title}</h3>
          </div>

          {/* Part content */}
          <div className="bg-white flex-1">
            <RNPartContentRenderer part={part} />
          </div>
        </ScaledDeviceFrame>
      </div>
    </div>,
    document.body
  );
}
