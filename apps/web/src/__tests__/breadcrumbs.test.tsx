import { describe, it, expect, vi } from "vitest";
import { segmentToLabel } from "@/components/breadcrumbs";

describe("segmentToLabel", () => {
  it("maps known segments to labels", () => {
    expect(segmentToLabel("dashboard")).toBe("Dashboard");
    expect(segmentToLabel("participants")).toBe("Clients");
    expect(segmentToLabel("programs")).toBe("Programs");
    expect(segmentToLabel("sessions")).toBe("Sessions");
    expect(segmentToLabel("rtm")).toBe("RTM");
    expect(segmentToLabel("modules")).toBe("Modules");
    expect(segmentToLabel("trackers")).toBe("Trackers");
    expect(segmentToLabel("prepare")).toBe("Prepare");
    expect(segmentToLabel("superbill")).toBe("Superbill");
    expect(segmentToLabel("setup")).toBe("Setup");
    expect(segmentToLabel("settings")).toBe("Settings");
  });

  it("returns null for UUID-like segments", () => {
    expect(segmentToLabel("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBeNull();
  });

  it("returns null for CUID segments", () => {
    expect(segmentToLabel("cmn4wp4l7000bj5klzb7mfz35")).toBeNull();
    expect(segmentToLabel("clxyz1234567890abcdefghij")).toBeNull();
  });

  it("titlecases unknown non-ID segments", () => {
    expect(segmentToLabel("overview")).toBe("Overview");
    expect(segmentToLabel("analytics")).toBe("Analytics");
  });
});
