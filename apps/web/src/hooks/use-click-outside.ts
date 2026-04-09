import { useEffect, type RefObject } from "react";

/**
 * Calls the given callback when a click (mousedown) occurs outside
 * the element referred to by `ref`.
 *
 * Replaces 3+ inline click-outside handlers across the codebase.
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  callback: () => void,
): void {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        callback();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [ref, callback]);
}
