import { describe, it, expect, beforeEach, vi } from "vitest";
import { api } from "@/lib/api-client";

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
});

function mockResponse(data: unknown, ok = true, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok,
    status,
    json: () => Promise.resolve(ok ? { data } : { error: "Request failed" }),
  });
}

describe("api client", () => {
  it("makes GET request with correct URL", async () => {
    mockResponse({ id: "1" });

    await api.get("/api/programs");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:4000/api/programs",
      expect.objectContaining({
        credentials: "include",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("uses credentials include instead of Authorization header", async () => {
    mockResponse({ id: "1" });

    await api.get("/api/programs");

    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.credentials).toBe("include");
    expect(callArgs.headers.Authorization).toBeUndefined();
  });

  it("makes POST request with JSON body", async () => {
    mockResponse({ id: "1" });

    await api.post("/api/programs", { title: "New" });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:4000/api/programs",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ title: "New" }),
      })
    );
  });

  it("makes PUT request", async () => {
    mockResponse({ id: "1" });

    await api.put("/api/programs/1", { title: "Updated" });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:4000/api/programs/1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ title: "Updated" }),
      })
    );
  });

  it("makes DELETE request", async () => {
    mockResponse(null);

    await api.delete("/api/programs/1");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:4000/api/programs/1",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("returns data from successful response", async () => {
    mockResponse({ id: "1", title: "Test" });

    const result = await api.get("/api/programs/1");

    expect(result).toEqual({ id: "1", title: "Test" });
  });

  it("throws error on non-ok response", async () => {
    mockResponse(null, false, 404);

    await expect(api.get("/api/programs/999")).rejects.toThrow("Request failed");
  });

  it("makes POST without body when none provided", async () => {
    mockResponse({ id: "1" });

    await api.post("/api/programs/1/clone");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST",
        body: undefined,
      })
    );
  });

  it("retries with cookie refresh on 401", async () => {
    // First call returns 401
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: "Token expired" }),
    });

    // Refresh call succeeds (cookie-based, no token in response needed)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: {} }),
    });

    // Retry succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: { id: "1" } }),
    });

    const result = await api.get("/api/programs");

    expect(result).toEqual({ id: "1" });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("throws when refresh fails on 401", async () => {
    // First call returns 401
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: "Token expired" }),
    });

    // Refresh call fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: "Invalid refresh token" }),
    });

    await expect(api.get("/api/programs")).rejects.toThrow();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-401 errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Server error" }),
    });

    await expect(api.get("/api/programs")).rejects.toThrow("Server error");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
