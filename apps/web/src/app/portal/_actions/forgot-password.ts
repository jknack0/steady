"use server";

import { portalApi } from "@/lib/portal-api-client";

interface ForgotPasswordResult {
  ok: boolean;
  error?: string;
}

// FR-5 / Flow 6 — privacy-preserving forgot-password.
// Always returns success regardless of whether the email exists (no enumeration).
export async function forgotPasswordAction(
  formData: FormData
): Promise<ForgotPasswordResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    return { ok: false, error: "Email is required" };
  }

  const result = await portalApi<{ message?: string }>(
    "/api/auth/forgot-password",
    {
      method: "POST",
      body: JSON.stringify({ email }),
    }
  );

  // AC-5.3: Rate limit response surfaces to the user; everything else
  // returns success to avoid enumeration.
  if (!result.ok && result.status === 429) {
    return {
      ok: false,
      error: "Too many requests. Please try again in 15 minutes.",
    };
  }

  return { ok: true };
}

interface ResetPasswordResult {
  ok: boolean;
  error?: string;
}

export async function confirmResetPasswordAction(
  formData: FormData
): Promise<ResetPasswordResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const code = String(formData.get("code") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!email || !code || !newPassword) {
    return {
      ok: false,
      error: "Email, code, and new password are required",
    };
  }
  if (newPassword !== confirmPassword) {
    return { ok: false, error: "Passwords don't match" };
  }

  const result = await portalApi<{ message?: string }>(
    "/api/auth/confirm-reset-password",
    {
      method: "POST",
      body: JSON.stringify({ email, code, newPassword }),
    }
  );

  if (!result.ok) {
    return {
      ok: false,
      error: result.error ?? "Unable to reset your password. Please try again.",
    };
  }

  return { ok: true };
}
