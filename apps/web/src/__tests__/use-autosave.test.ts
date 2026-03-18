import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutosave } from "@/hooks/use-autosave";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useAutosave", () => {
  it("starts with idle status", () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutosave(saveFn));

    expect(result.current.status).toBe("idle");
  });

  it("sets status to saving immediately on save call", () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutosave(saveFn, 1000));

    act(() => {
      result.current.save({ title: "test" });
    });

    expect(result.current.status).toBe("saving");
  });

  it("calls saveFn after debounce period", async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutosave(saveFn, 1000));

    act(() => {
      result.current.save({ title: "test" });
    });

    expect(saveFn).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(saveFn).toHaveBeenCalledWith({ title: "test" });
  });

  it("transitions to saved after successful save", async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutosave(saveFn, 1000));

    act(() => {
      result.current.save({ title: "test" });
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.status).toBe("saved");
  });

  it("transitions back to idle after saved timeout", async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutosave(saveFn, 1000));

    act(() => {
      result.current.save({ title: "test" });
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.status).toBe("saved");

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.status).toBe("idle");
  });

  it("sets status to error on save failure", async () => {
    const saveFn = vi.fn().mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() => useAutosave(saveFn, 500));

    act(() => {
      result.current.save({ title: "test" });
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.status).toBe("error");
  });

  it("debounces multiple rapid calls", async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutosave(saveFn, 1000));

    act(() => {
      result.current.save({ title: "first" });
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    act(() => {
      result.current.save({ title: "second" });
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // Only the last call should have gone through
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(saveFn).toHaveBeenCalledWith({ title: "second" });
  });

  it("uses default 2000ms debounce", async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutosave(saveFn));

    act(() => {
      result.current.save({ title: "test" });
    });

    await act(async () => {
      vi.advanceTimersByTime(1999);
    });

    expect(saveFn).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(saveFn).toHaveBeenCalled();
  });
});
