"use client";

import { useState, useCallback } from "react";

interface Toast {
  id: string;
  message: string;
  variant: "success" | "error";
}

let toastListeners: Array<(toast: Toast) => void> = [];
let nextId = 0;

export function showToast(message: string, variant: "success" | "error" = "success") {
  const toast: Toast = { id: String(++nextId), message, variant };
  toastListeners.forEach((fn) => fn(toast));
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Toast) => {
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 3000);
  }, []);

  const subscribe = useCallback(() => {
    toastListeners.push(addToast);
    return () => {
      toastListeners = toastListeners.filter((fn) => fn !== addToast);
    };
  }, [addToast]);

  return { toasts, subscribe };
}
