"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
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

  // Close on Escape — use capture phase + stopImmediatePropagation
  // so Radix Dialog's Escape handler doesn't also fire
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        e.preventDefault();
        onClose();
      }
    };
    // Capture phase so we intercept before Radix Dialog
    document.addEventListener("keydown", handleKey, true);
    return () => document.removeEventListener("keydown", handleKey, true);
  }, [open, onClose]);

  // Lock body scroll while preview is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    // z-[60] sits above z-50 Dialog; onWheel/onTouchMove stop scroll leaking
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 cursor-pointer"
        onClick={onClose}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-4 cursor-default">
        {/* Device selector + close button */}
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
          <button
            onClick={onClose}
            className="ml-4 p-2 rounded-full bg-white/10 text-white/70 hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Phone frame with part content */}
        <ScaledDeviceFrame device={device}>
          <div className="bg-white min-h-full">
            {/* Part header */}
            <div className="px-4 pt-3 pb-4 border-b border-[#F0EDE8]">
              <h3 className="text-lg font-bold text-[#2D2D2D]">{part.title}</h3>
            </div>

            {/* Part content */}
            <div className="px-4 py-3">
              <RNPartContentRenderer part={part} />
            </div>
          </div>
        </ScaledDeviceFrame>
      </div>
    </div>,
    document.body
  );
}
