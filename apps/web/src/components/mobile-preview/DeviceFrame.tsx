"use client";

import { useCallback } from "react";
import type { DeviceConfig } from "./devices";

interface DeviceFrameProps {
  device: DeviceConfig;
  children: React.ReactNode;
}

export function DeviceFrame({ device, children }: DeviceFrameProps) {
  const bezel = 8;
  const innerRadius = device.borderRadius - bezel;

  return (
    <div
      className="relative"
      style={{ width: device.width + bezel * 2, height: device.height + bezel * 2 }}
    >
      {/* Outer bezel */}
      <div
        className="absolute inset-0 bg-[#1a1a1a] shadow-2xl"
        style={{ borderRadius: device.borderRadius }}
      />

      {/* Inner screen */}
      <div
        className="absolute flex flex-col overflow-hidden bg-[#F7F5F2]"
        style={{
          top: bezel,
          left: bezel,
          right: bezel,
          bottom: bezel,
          borderRadius: innerRadius,
        }}
      >
        {/* Status bar */}
        <div className="flex items-center justify-between bg-white px-6 py-2 shrink-0 relative">
          {device.hasDynamicIsland && (
            <div className="absolute left-1/2 -translate-x-1/2 top-1.5 w-[120px] h-[34px] bg-black rounded-full" />
          )}
          <span className="text-xs font-semibold text-[#2D2D2D] relative z-10">9:41</span>
          <div className="flex items-center gap-1 relative z-10">
            {/* Signal */}
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
              <rect x="0" y="8" width="3" height="4" rx="0.5" fill="#2D2D2D" />
              <rect x="4.5" y="5" width="3" height="7" rx="0.5" fill="#2D2D2D" />
              <rect x="9" y="2" width="3" height="10" rx="0.5" fill="#2D2D2D" />
              <rect x="13.5" y="0" width="2.5" height="12" rx="0.5" fill="#2D2D2D" />
            </svg>
            {/* Battery */}
            <div className="h-3 w-5 rounded-sm border border-[#2D2D2D] relative ml-1">
              <div className="absolute inset-[1.5px] rounded-[1px] bg-[#2D2D2D]" style={{ width: "70%" }} />
              <div className="absolute -right-[3px] top-[3px] w-[2px] h-[5px] rounded-r-sm bg-[#2D2D2D]" />
            </div>
          </div>
        </div>

        {/* Dynamic Island spacer */}
        {device.hasDynamicIsland && <div className="h-5 bg-white shrink-0" />}

        {/* Content viewport — scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </div>

        {/* Home indicator */}
        <div className="flex justify-center pb-2 pt-1 bg-[#F7F5F2] shrink-0">
          <div className="h-1 w-32 rounded-full bg-[#2D2D2D]/20" />
        </div>
      </div>
    </div>
  );
}

interface ScaledDeviceFrameProps {
  device: DeviceConfig;
  children: React.ReactNode;
}

export function ScaledDeviceFrame({ device, children }: ScaledDeviceFrameProps) {
  const bezel = 8;
  const outerW = device.width + bezel * 2;
  const outerH = device.height + bezel * 2;

  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const update = () => {
        const vh = window.innerHeight * 0.88;
        const vw = window.innerWidth * 0.9;
        const s = Math.min(1, vh / outerH, vw / outerW);
        node.style.transform = `scale(${s})`;
      };
      update();
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    },
    [outerW, outerH]
  );

  return (
    <div
      ref={containerRef}
      style={{ width: outerW, height: outerH, transformOrigin: "center center" }}
    >
      <DeviceFrame device={device}>{children}</DeviceFrame>
    </div>
  );
}
