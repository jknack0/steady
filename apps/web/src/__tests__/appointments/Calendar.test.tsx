import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock next navigation
const replace = vi.fn();
let currentSearch = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

// Mock api client
vi.mock("@/lib/api-client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
  },
}));
import { api } from "@/lib/api-client";
const mockApi = vi.mocked(api);

import { Calendar } from "@/components/appointments/Calendar";

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  currentSearch = "";
  mockApi.get.mockImplementation(async (path: string) => {
    if (path.startsWith("/api/appointments")) return [];
    if (path.startsWith("/api/locations")) return [{ id: "loc-1", name: "Main Office", type: "IN_PERSON", isDefault: true }];
    if (path.startsWith("/api/service-codes")) return [{ id: "sc-1", code: "90834", description: "Therapy", defaultDurationMinutes: 45 }];
    return null;
  });
});

describe("Calendar", () => {
  it("defaults to week view and renders schedule button", async () => {
    const { findAllByText, findByRole } = render(<Calendar />, { wrapper });
    await findByRole("tab", { name: /Week/ });
    const weekTab = await findByRole("tab", { name: /Week/ });
    expect(weekTab.getAttribute("aria-selected")).toBe("true");
    const btns = await findAllByText(/Schedule appointment/i);
    expect(btns.length).toBeGreaterThan(0);
  });

  it("shows schedule button when no appointments", async () => {
    const { findByText } = render(<Calendar />, { wrapper });
    const cta = await findByText(/Schedule appointment/i);
    expect(cta).toBeTruthy();
  });

  it("toggles view via tab click and updates URL params", async () => {
    const { findByRole } = render(<Calendar />, { wrapper });
    const dayTab = await findByRole("tab", { name: /Day/ });
    fireEvent.click(dayTab);
    expect(replace).toHaveBeenCalled();
    const call = replace.mock.calls[0][0] as string;
    expect(call).toContain("view=day");
  });
});
