import { describe, it, expect, beforeEach, vi } from "vitest";
import { api } from "@/lib/api-client";

const mockFetch = vi.fn();
global.fetch = mockFetch;

// jsdom doesn't always provide localStorage — mock it
const storage: Record<string, string> = {};
Object.defineProperty(global, "localStorage", {
  value: {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, value: string) => { storage[key] = value; },
    removeItem: (key: string) => { delete storage[key]; },
    clear: () => { for (const k in storage) delete storage[k]; },
  },
  writable: true,
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
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
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("includes auth token from localStorage", async () => {
    localStorage.setItem("token", "my-jwt-token");
    mockResponse({ id: "1" });

    await api.get("/api/programs");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer my-jwt-token",
        }),
      })
    );
  });

  it("omits Authorization header when no token", async () => {
    mockResponse({ id: "1" });

    await api.get("/api/programs");

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toBeUndefined();
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
});
