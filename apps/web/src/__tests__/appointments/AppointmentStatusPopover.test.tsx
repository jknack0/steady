import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/api-client", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), put: vi.fn() },
}));
import { api } from "@/lib/api-client";
const mockApi = vi.mocked(api);

import { AppointmentStatusPopover } from "@/components/appointments/AppointmentStatusPopover";
import type { AppointmentView } from "@/lib/appointment-types";

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const appt: AppointmentView = {
  id: "a-1",
  practiceId: "p-1",
  clinicianId: "c-1",
  participantId: "pp-1",
  participant: { id: "pp-1", firstName: "Jane", lastName: "Doe", email: "jane@test.com" },
  serviceCode: { id: "sc-1", code: "90834", description: "Therapy", defaultDurationMinutes: 45 },
  location: { id: "loc-1", name: "Main", type: "IN_PERSON" },
  startAt: "2026-04-07T14:00:00Z",
  endAt: "2026-04-07T14:45:00Z",
  status: "SCHEDULED",
  appointmentType: "INDIVIDUAL",
  internalNote: null,
  cancelReason: null,
  statusChangedAt: null,
  createdById: "u-1",
  createdAt: "2026-04-06T10:00:00Z",
  updatedAt: "2026-04-06T10:00:00Z",
};

beforeEach(() => vi.clearAllMocks());

describe("AppointmentStatusPopover", () => {
  it("lists all six statuses", () => {
    const { getByText } = render(<AppointmentStatusPopover appointment={appt} onClose={() => {}} />, { wrapper });
    expect(getByText("Scheduled")).toBeTruthy();
    expect(getByText("Attended")).toBeTruthy();
    expect(getByText("No-show")).toBeTruthy();
    expect(getByText("Late canceled")).toBeTruthy();
    expect(getByText("Client canceled")).toBeTruthy();
    expect(getByText("You canceled")).toBeTruthy();
  });

  it("reveals reason textarea for cancellation statuses", () => {
    const { getByText } = render(<AppointmentStatusPopover appointment={appt} onClose={() => {}} />, { wrapper });
    fireEvent.click(getByText("Client canceled"));
    expect(getByText(/Reason \(optional\)/i)).toBeTruthy();
  });

  it("calls the status change API for a non-cancellation status", async () => {
    mockApi.post.mockResolvedValue({ ...appt, status: "ATTENDED" });
    const onClose = vi.fn();
    const { getByText } = render(<AppointmentStatusPopover appointment={appt} onClose={onClose} />, { wrapper });
    fireEvent.click(getByText("Attended"));
    await waitFor(() => expect(mockApi.post).toHaveBeenCalled());
    const path = mockApi.post.mock.calls[0][0];
    expect(path).toBe("/api/appointments/a-1/status");
    const body = mockApi.post.mock.calls[0][1] as any;
    expect(body.status).toBe("ATTENDED");
  });

  it("shows error on API failure", async () => {
    mockApi.post.mockRejectedValue(new Error("boom"));
    const { getByText, findByRole } = render(<AppointmentStatusPopover appointment={appt} onClose={() => {}} />, { wrapper });
    fireEvent.click(getByText("Attended"));
    const alert = await findByRole("alert");
    expect(alert.textContent).toContain("boom");
  });
});
