"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { confirmResetPasswordAction } from "../_actions/forgot-password";

interface Props {
  defaultEmail?: string;
}

export default function ResetPasswordForm({ defaultEmail = "" }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await confirmResetPasswordAction(formData);
      if (result.ok) {
        router.push("/portal/login?passwordReset=1");
      } else {
        setError(result.error ?? "Unable to reset your password.");
      }
    });
  }

  return (
    <form
      action={onSubmit}
      className="space-y-4 bg-white p-6 rounded-2xl border border-stone-200"
    >
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
          defaultValue={defaultEmail}
          autoComplete="email"
          disabled={isPending}
          className="w-full px-3 py-2 border border-stone-300 rounded-lg disabled:bg-stone-50 disabled:text-stone-500"
        />
      </div>
      <div>
        <label
          htmlFor="code"
          className="block text-sm font-medium text-stone-700 mb-1"
        >
          Reset code
        </label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          required
          autoComplete="one-time-code"
          disabled={isPending}
          className="w-full px-3 py-2 border border-stone-300 rounded-lg disabled:bg-stone-50 disabled:text-stone-500"
        />
      </div>
      <div>
        <label
          htmlFor="newPassword"
          className="block text-sm font-medium text-stone-700 mb-1"
        >
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          disabled={isPending}
          className="w-full px-3 py-2 border border-stone-300 rounded-lg disabled:bg-stone-50 disabled:text-stone-500"
        />
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
        {isPending ? "Resetting..." : "Reset password"}
      </button>
      <div className="text-center text-sm">
        <Link href="/portal/login" className="text-teal-700 hover:underline">
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
