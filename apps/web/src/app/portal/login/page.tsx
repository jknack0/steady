"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction } from "../_actions/login";

// FR-4 / Flow 5 — Returning client login
// Layout/copy: docs/sdlc/client-web-portal-mvp/05-ux-design.md "Login form"

export default function PortalLoginPage() {
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const signedOut = params.get("signedOut") === "1";
  const idle = params.get("idle") === "1";
  const redirect = params.get("redirect") || "/portal/calendar";

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await loginAction(formData);
      if (!result?.ok && result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-stone-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-teal-700 items-center justify-center text-white text-2xl font-bold mb-3">
            S
          </div>
          <h1 className="text-2xl font-semibold text-stone-800">
            Sign in to STEADY
          </h1>
        </div>

        {signedOut && (
          <div
            className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm"
            role="status"
            data-testid="portal-signed-out-flash"
          >
            You&apos;ve been signed out.
          </div>
        )}
        {idle && (
          <div
            className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm"
            role="status"
            data-testid="portal-idle-flash"
          >
            You&apos;ve been signed out due to inactivity.
          </div>
        )}
        {error && (
          <div
            className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm"
            role="alert"
            data-testid="portal-wrong-role-error"
          >
            {error}
          </div>
        )}

        <form
          action={handleSubmit}
          className="space-y-4 bg-white p-6 rounded-2xl border border-stone-200"
        >
          <input type="hidden" name="redirect" value={redirect} />

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-stone-700 mb-1"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              disabled={pending}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-stone-700 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              disabled={pending}
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="w-full py-2.5 bg-teal-700 text-white font-semibold rounded-lg hover:bg-teal-800 disabled:opacity-60"
          >
            {pending ? "Signing in..." : "Sign in"}
          </button>

          <div className="text-center">
            <Link
              href="/portal/forgot-password"
              className="text-sm text-teal-700 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </form>

        <p className="text-center text-xs text-stone-500 mt-6">
          <Link
            href="https://steadymentalhealth.com/privacy"
            className="hover:underline"
          >
            Privacy policy
          </Link>
        </p>
      </div>
    </div>
  );
}
