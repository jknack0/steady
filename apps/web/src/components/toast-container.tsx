"use client";

import { useEffect } from "react";
import { useToasts } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle } from "lucide-react";

export function ToastContainer() {
  const { toasts, subscribe } = useToasts();

  useEffect(() => {
    return subscribe();
  }, [subscribe]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg text-sm font-medium animate-in slide-in-from-bottom-2 fade-in",
            toast.variant === "success"
              ? "bg-background border-green-200 text-green-800"
              : "bg-background border-red-200 text-red-800"
          )}
        >
          {toast.variant === "success" ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          {toast.message}
        </div>
      ))}
    </div>
  );
}
