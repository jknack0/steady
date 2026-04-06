import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/api-client", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), put: vi.fn() },
}));
import { api } from "@/lib/api-client";
const mockApi = vi.mocked(api);

import { AppointmentModal } from "@/components/appointments/AppointmentModal";
import type { AppointmentView, ServiceCodeRef, LocationRef } from "@/lib/appointment-types";

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const serviceCodes: ServiceCodeRef[] = [
  { id: "sc-1", code: "90834", description: "Therapy, 45 min", defaultDurationMinutes: 45 },
];
const locations: LocationRef[] = [
  { id: "loc-1", name: "Main Office", type: "IN_PERSON", isDefault: true },
];

const terminalAppt: AppointmentView = {
  id: "a-1",
  practiceId: "p-1",
  clinicianId: "c-1",
  participantId: "pp-1",
  participant: { id: "pp-1", firstName: "Jane", lastName: "Doe", email: "jane@test.com" },
  serviceCode: serviceCodes[0],
  location: locations[0],
  startAt: "2026-04-07T14:00:00Z",
  endAt: "2026-04-07T14:45:00Z",
  status: "ATTENDED",
  appointmentType: "INDIVIDUAL",
  internalNote: "existing note",
  cancelReason: null,
  statusChangedAt: null,
  createdById: "u-1",
  createdAt: "2026-04-06T10:00:00Z",
  updatedAt: "2026-04-06T10:00:00Z",
  recurringSeriesId: null,
  invoiceId: null,
};

const scheduledAppt: AppointmentView = {
  ...terminalAppt,
  status: "SCHEDULED",
  internalNote: "",
};

beforeEach(() => vi.clearAllMocks());

describe("AppointmentModal", () => {
  it("renders create fields when mode=create", () => {
    const { getByText, getAllByText, getByLabelText } = render(
      <AppointmentModal
        open
        onOpenChange={() => {}}
        mode="create"
        serviceCodes={serviceCodes}
        locations={locations}
        timezone="America/New_York"
      />,
      { wrapper },
    );
    expect(getAllByText(/Schedule appointment/i).length).toBeGreaterThan(0);
    expect(getAllByText(/Service code/i).length).toBeGreaterThan(0);
    expect(getAllByText(/Internal note/i).length).toBeGreaterThan(0);
    expect(getByLabelText(/Start \*/i)).toBeTruthy();
    expect(getByLabelText(/End \*/i)).toBeTruthy();
    void getByText;
  });

  it("shows terminal-status banner and disables scheduling fields in edit-terminal mode", () => {
    const { getByText, getByLabelText } = render(
      <AppointmentModal
        open
        onOpenChange={() => {}}
        mode="edit"
        existing={terminalAppt}
        serviceCodes={serviceCodes}
        locations={locations}
        timezone="America/New_York"
      />,
      { wrapper },
    );
    expect(getByText(/Only the internal note can be edited/i)).toBeTruthy();
    const startInput = getByLabelText(/Start \*/i) as HTMLInputElement;
    expect(startInput.disabled).toBe(true);
  });

  it("shows validation error when end <= start", () => {
    const { getByLabelText, getByText } = render(
      <AppointmentModal
        open
        onOpenChange={() => {}}
        mode="edit"
        existing={scheduledAppt}
        serviceCodes={serviceCodes}
        locations={locations}
        timezone="America/New_York"
      />,
      { wrapper },
    );
    const endInput = getByLabelText(/End \*/i) as HTMLInputElement;
    fireEvent.change(endInput, { target: { value: "2026-04-07T09:00" } });
    const startInput = getByLabelText(/Start \*/i) as HTMLInputElement;
    fireEvent.change(startInput, { target: { value: "2026-04-07T10:00" } });
    expect(getByText(/End time must be after start time/i)).toBeTruthy();
  });

  it("shows conflict banner when create response includes conflicts", async () => {
    mockApi.post.mockResolvedValue({
      appointment: { ...scheduledAppt, id: "new-1" },
      conflicts: ["other-1"],
    });
    const { getByText, findByText, getByLabelText } = render(
      <AppointmentModal
        open
        onOpenChange={() => {}}
        mode="edit"
        existing={scheduledAppt}
        serviceCodes={serviceCodes}
        locations={locations}
        timezone="America/New_York"
      />,
      { wrapper },
    );
    // Use update path instead (edit). mock patch.
    mockApi.patch.mockResolvedValue({
      appointment: { ...scheduledAppt },
      conflicts: ["other-1"],
    });
    const note = getByLabelText(/Internal note/i) as HTMLTextAreaElement;
    fireEvent.change(note, { target: { value: "changed" } });
    const save = getByText(/Save changes/i);
    fireEvent.click(save);
    await waitFor(() => expect(mockApi.patch).toHaveBeenCalled());
    const banner = await findByText(/overlaps with 1 existing appointment/i);
    expect(banner).toBeTruthy();
  });
});
