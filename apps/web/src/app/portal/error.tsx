"use client";

import { useEffect } from "react";
import Link from "next/link";

// Global portal error boundary (Next.js convention).
// MUST NOT log PHI or expose stack traces to the user.

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Digest is safe to log; the full error object is NOT.
    // Client-side logging is minimal — the server is the audit source of truth.
    // eslint-disable-next-line no-console
    console.error(`Portal error digest=${error.digest ?? "none"}`);
  }, [error.digest]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 p-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-semibold text-stone-800 mb-2">
          Something went wrong
        </h1>
        <p className="text-stone-600 mb-6">
          We hit an unexpected error. Please try again, or head back to your
          schedule.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 border border-stone-300 bg-white text-stone-800 font-semibold rounded-lg hover:bg-stone-100"
          >
            Try again
          </button>
          <Link
            href="/portal/calendar"
            className="px-5 py-2.5 bg-teal-700 text-white font-semibold rounded-lg hover:bg-teal-800"
          >
            Back to your schedule
          </Link>
        </div>
      </div>
    </div>
  );
}
