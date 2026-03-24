"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Loader2, X, Smartphone, Monitor } from "lucide-react";
import { DEVICES, type DeviceId } from "./devices";
import { ScaledDeviceFrame } from "./DeviceFrame";
import { RNHomeworkPreview } from "./RNHomeworkPreview";

interface MobilePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The homework part content (same shape as HomeworkContent) */
  content: {
    type: string;
    items: Array<any>;
    completionRule?: string;
    completionMinimum?: number | null;
    [key: string]: any;
  };
  title?: string;
}

export function MobilePreviewModal({
  open,
  onOpenChange,
  content,
  title,
}: MobilePreviewModalProps) {
  const [deviceId, setDeviceId] = useState<DeviceId>("iphone-15");
  const device = DEVICES[deviceId];

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 cursor-pointer"
        onClick={() => onOpenChange(false)}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-4 cursor-default">
        {/* Controls bar */}
        <div className="flex items-center gap-3">
          {/* Device selector */}
          <div className="flex rounded-lg bg-white/10 p-1 gap-1">
            {Object.entries(DEVICES).map(([id, dev]) => (
              <button
                key={id}
                onClick={() => setDeviceId(id as DeviceId)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  deviceId === id
                    ? "bg-white text-gray-900"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                {id === "iphone-se" ? (
                  <Smartphone className="h-3.5 w-3.5" />
                ) : (
                  <Smartphone className="h-3.5 w-3.5" />
                )}
                {dev.name}
              </button>
            ))}
          </div>

          {/* Close */}
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full bg-white/10 p-2 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Phone frame with RN Web content */}
        <ScaledDeviceFrame device={device}>
          {/* App header */}
          <div className="bg-white px-4 py-3 border-b border-[#F0EDE8]">
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#2D2D2D",
                fontFamily: "PlusJakartaSans_700Bold, system-ui, sans-serif",
              }}
            >
              {title || "Homework"}
            </h3>
          </div>

          {/* Actual RN Web homework renderers */}
          <RNHomeworkPreview content={content} />
        </ScaledDeviceFrame>
      </div>
    </div>,
    document.body
  );
}
