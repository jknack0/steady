"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { redeemInviteAction } from "../_actions/redeem-invite";

interface SignupFormProps {
  token: string;
  defaultFirstName: string;
  defaultLastName: string;
}

export default function SignupForm({
  token,
  defaultFirstName,
  defaultLastName,
}: SignupFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await redeemInviteAction(formData);
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
            Welcome to your STEADY portal
          </h1>
          <p className="text-stone-600 mt-2 text-sm">
            Set up your account to start joining your sessions.
          </p>
        </div>

        {error && (
          <div
            className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm"
            role="alert"
            data-testid="portal-signup-error"
          >
            {error}
          </div>
        )}

        <form
          action={handleSubmit}
          className="space-y-4 bg-white p-6 rounded-2xl border border-stone-200"
        >
          <input type="hidden" name="token" value={token} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-stone-700 mb-1"
              >
                First name
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                defaultValue={defaultFirstName}
                autoComplete="given-name"
                maxLength={100}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                disabled={pending}
              />
            </div>
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-stone-700 mb-1"
              >
                Last name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                defaultValue={defaultLastName}
                autoComplete="family-name"
                maxLength={100}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                disabled={pending}
              />
            </div>
          </div>

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
              minLength={8}
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              disabled={pending}
            />
            <p className="text-xs text-stone-500 mt-1">
              At least 8 characters with uppercase, lowercase, and a number.
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-stone-700 mb-1"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
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
            {pending ? "Setting up your account..." : "Create your account"}
          </button>

          <div className="text-center text-sm text-stone-600">
            Already have an account?{" "}
            <Link href="/portal/login" className="text-teal-700 hover:underline">
              Sign in
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
