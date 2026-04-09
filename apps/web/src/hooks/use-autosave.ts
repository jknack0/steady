"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

export function useAutosave<T>(
  saveFn: (data: T) => Promise<unknown>,
  debounceMs = 2000,
) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    (data: T) => {
      // Clear existing timers
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);

      // Show "pending" while waiting for the debounce period to elapse
      setStatus("pending");

      timeoutRef.current = setTimeout(async () => {
        // Only set "saving" when the save actually starts
        setStatus("saving");
        try {
          await saveFn(data);
          setStatus("saved");
          savedTimerRef.current = setTimeout(() => setStatus("idle"), 2000);
        } catch {
          setStatus("error");
        }
      }, debounceMs);
    },
    [saveFn, debounceMs],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  return { save, status };
}
