import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { useCommandPalette } from "@/hooks/use-command-palette";

describe("useCommandPalette", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts closed", () => {
    const { result } = renderHook(() => useCommandPalette());
    expect(result.current.isOpen).toBe(false);
  });

  it("opens and closes", () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });

  it("toggles on Cmd+K", () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", metaKey: true })
      );
    });
    expect(result.current.isOpen).toBe(true);
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", metaKey: true })
      );
    });
    expect(result.current.isOpen).toBe(false);
  });

  it("toggles on Ctrl+K", () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", ctrlKey: true })
      );
    });
    expect(result.current.isOpen).toBe(true);
  });
});
