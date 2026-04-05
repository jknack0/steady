import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/api-client", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), put: vi.fn() },
}));
import { api } from "@/lib/api-client";
const mockApi = vi.mocked(api);

import { ClientSearchSelect } from "@/components/appointments/ClientSearchSelect";

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => vi.clearAllMocks());

describe("ClientSearchSelect", () => {
  it("requires at least 2 characters (no search on 1 char)", async () => {
    mockApi.get.mockResolvedValue([]);
    const { getByLabelText, getByText } = render(<ClientSearchSelect value={null} onChange={() => {}} />, { wrapper });
    fireEvent.change(getByLabelText(/Client search/i), { target: { value: "a" } });
    // debounce 300ms
    await new Promise((r) => setTimeout(r, 400));
    expect(getByText(/Type at least 2 characters/i)).toBeTruthy();
    expect(mockApi.get).not.toHaveBeenCalledWith(expect.stringContaining("/api/participants/search"));
  });

  it("debounces and searches after 2+ chars", async () => {
    mockApi.get.mockResolvedValue([
      { id: "pp-1", firstName: "Maria", lastName: "Garcia", email: "maria@test.com" },
    ]);
    const { getByLabelText, findByText } = render(<ClientSearchSelect value={null} onChange={() => {}} />, { wrapper });
    fireEvent.change(getByLabelText(/Client search/i), { target: { value: "mar" } });
    const result = await findByText(/Maria Garcia/i);
    expect(result).toBeTruthy();
    expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining("/api/participants/search"));
  });

  it("renders Add new client affordance and opens inline form", async () => {
    mockApi.get.mockResolvedValue([]);
    const { getByLabelText, findByText, getByText } = render(<ClientSearchSelect value={null} onChange={() => {}} />, {
      wrapper,
    });
    fireEvent.change(getByLabelText(/Client search/i), { target: { value: "xy" } });
    const addBtn = await findByText(/Add new client "xy"/i);
    fireEvent.click(addBtn);
    expect(getByText(/First name/i)).toBeTruthy();
    expect(getByText(/Create client/i)).toBeTruthy();
  });

  it("calls create API on submit and selects the new client", async () => {
    mockApi.get.mockResolvedValue([]);
    mockApi.post.mockResolvedValue({ id: "pp-new", firstName: "New", lastName: "Client", email: "new@test.com" });
    const onChange = vi.fn();
    const { getByLabelText, findByText, getByText, getAllByRole } = render(
      <ClientSearchSelect value={null} onChange={onChange} />,
      { wrapper },
    );
    fireEvent.change(getByLabelText(/Client search/i), { target: { value: "new" } });
    const addBtn = await findByText(/Add new client "new"/i);
    fireEvent.click(addBtn);
    const inputs = getAllByRole("textbox") as HTMLInputElement[];
    // first/last/email
    fireEvent.change(inputs[0], { target: { value: "New" } });
    fireEvent.change(inputs[1], { target: { value: "Client" } });
    fireEvent.change(inputs[2], { target: { value: "new@test.com" } });
    fireEvent.click(getByText(/Create client/i));
    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith("/api/participants", expect.anything()));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
  });
});
