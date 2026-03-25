import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock next/navigation before importing component
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

// Mock next/link to render a plain anchor
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import { Breadcrumbs, segmentToLabel } from "@/components/breadcrumbs";
import { usePathname } from "next/navigation";

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
});

describe("Breadcrumbs", () => {
  it("renders single segment", () => {
    vi.mocked(usePathname).mockReturnValue("/dashboard");
    render(<Breadcrumbs />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders nested segments with links", () => {
    vi.mocked(usePathname).mockReturnValue("/programs/some-uuid/modules/another-uuid");
    render(<Breadcrumbs />);
    const programsLink = screen.getByRole("link", { name: "Programs" });
    expect(programsLink).toHaveAttribute("href", "/programs");
    expect(screen.getByText("Modules")).toBeInTheDocument();
  });

  it("skips UUID segments in display", () => {
    vi.mocked(usePathname).mockReturnValue("/participants/some-uuid");
    render(<Breadcrumbs />);
    expect(screen.getByText("Clients")).toBeInTheDocument();
    expect(screen.queryByText("some-uuid")).not.toBeInTheDocument();
  });
});
