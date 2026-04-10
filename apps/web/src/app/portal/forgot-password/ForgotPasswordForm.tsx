"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { forgotPasswordAction } from "../_actions/forgot-password";

export default function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await forgotPasswordAction(formData);
      if (result.ok) {
        setSubmitted(true);
      } else {
        setError(result.error ?? "Something went wrong. Please try again.");
      }
    });
  }

  if (submitted) {
    return (
      <div
        className="bg-white p-6 rounded-2xl border border-stone-200 text-center"
        role="status"
        aria-live="polite"
      >
        <h2 className="text-lg font-semibold text-stone-800 mb-2">
          Check your email
        </h2>
        <p className="text-sm text-stone-600 mb-6">
          If an account exists with that email, we&apos;ve sent a reset code.
        </p>
        <Link
          href="/portal/reset-password"
          className="inline-block px-5 py-2.5 bg-teal-700 text-white font-semibold rounded-lg hover:bg-teal-800"
        >
          Enter reset code
        </Link>
      </div>
    );
  }

  return (
    <form action={onSubmit} className="space-y-4 bg-white p-6 rounded-2xl border border-stone-200">
      {error && (
        <div
          className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm"
          role="alert"
        >
          {error}
        </div>
      )}
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
          disabled={isPending}
          className="w-full px-3 py-2 border border-stone-300 rounded-lg disabled:bg-stone-50 disabled:text-stone-500"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        aria-busy={isPending}
        className="w-full py-2.5 bg-teal-700 text-white font-semibold rounded-lg hover:bg-teal-800 disabled:opacity-60"
      >
        {isPending ? "Sending..." : "Send reset code"}
      </button>
      <div className="text-center text-sm">
        <Link href="/portal/login" className="text-teal-700 hover:underline">
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
