"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Calendar } from "lucide-react";

export default function TelehealthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Telehealth error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[var(--steady-warm-50)]">
      <div className="mx-auto max-w-md text-center px-6">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>

        <h2 className="mb-2 text-xl font-semibold" style={{ color: "#1a1a1a" }}>
          Telehealth session error
        </h2>

        <p className="mb-6 text-sm" style={{ color: "#6b6b6b" }}>
          {error.message ||
            "Something went wrong with the telehealth session. Please try again or return to your calendar."}
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: "#5B8A8A" }}
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>

          <Link
            href="/appointments"
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
            style={{ borderColor: "#d4d4d4", color: "#374151" }}
          >
            <Calendar className="h-4 w-4" />
            Return to calendar
          </Link>
        </div>

        {error.digest && (
          <p className="mt-6 text-xs" style={{ color: "#9ca3af" }}>
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
