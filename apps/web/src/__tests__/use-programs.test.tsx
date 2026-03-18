import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  usePrograms,
  useProgram,
  useCreateProgram,
  useUpdateProgram,
  useDeleteProgram,
  useCloneProgram,
} from "@/hooks/use-programs";

// Mock the api client
vi.mock("@/lib/api-client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from "@/lib/api-client";
const mockApi = vi.mocked(api);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = "TestQueryWrapper";
  return Wrapper;
}

const mockProgram = {
  id: "p1",
  title: "Test Program",
  description: null,
  cadence: "WEEKLY",
  enrollmentMethod: "INVITE",
  sessionType: "INDIVIDUAL",
  followUpCount: 3,
  status: "DRAFT",
  isTemplate: false,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("usePrograms", () => {
  it("fetches programs list", async () => {
    mockApi.get.mockResolvedValue([mockProgram]);

    const { result } = renderHook(() => usePrograms(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([mockProgram]);
    expect(mockApi.get).toHaveBeenCalledWith("/api/programs");
  });

  it("handles fetch error", async () => {
    mockApi.get.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => usePrograms(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe("Network error");
  });
});

describe("useProgram", () => {
  it("fetches single program by id", async () => {
    mockApi.get.mockResolvedValue(mockProgram);

    const { result } = renderHook(() => useProgram("p1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockProgram);
    expect(mockApi.get).toHaveBeenCalledWith("/api/programs/p1");
  });

  it("does not fetch when id is empty", () => {
    renderHook(() => useProgram(""), { wrapper: createWrapper() });

    expect(mockApi.get).not.toHaveBeenCalled();
  });
});

describe("useCreateProgram", () => {
  it("posts new program", async () => {
    mockApi.post.mockResolvedValue(mockProgram);

    const { result } = renderHook(() => useCreateProgram(), { wrapper: createWrapper() });

    result.current.mutate({ title: "Test Program" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApi.post).toHaveBeenCalledWith("/api/programs", { title: "Test Program" });
  });
});

describe("useUpdateProgram", () => {
  it("puts updated program data", async () => {
    mockApi.put.mockResolvedValue({ ...mockProgram, title: "Updated" });

    const { result } = renderHook(() => useUpdateProgram("p1"), { wrapper: createWrapper() });

    result.current.mutate({ title: "Updated" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApi.put).toHaveBeenCalledWith("/api/programs/p1", { title: "Updated" });
  });
});

describe("useDeleteProgram", () => {
  it("deletes a program", async () => {
    mockApi.delete.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteProgram(), { wrapper: createWrapper() });

    result.current.mutate("p1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApi.delete).toHaveBeenCalledWith("/api/programs/p1");
  });
});

describe("useCloneProgram", () => {
  it("clones a program", async () => {
    mockApi.post.mockResolvedValue({ ...mockProgram, id: "p2", title: "Test Program (Copy)" });

    const { result } = renderHook(() => useCloneProgram(), { wrapper: createWrapper() });

    result.current.mutate("p1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApi.post).toHaveBeenCalledWith("/api/programs/p1/clone");
  });
});
