"use server";

import { redirect } from "next/navigation";
import { portalApi } from "@/lib/portal-api-client";
import { setPortalAuthCookies } from "@/lib/portal-cookies";

interface RedeemResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: "PARTICIPANT";
  };
  accessToken: string;
  refreshToken: string;
}

interface RedeemActionResult {
  ok: boolean;
  error?: string;
  code?: string;
}

// FR-3 — AC-3.1 through AC-3.12
// Submits to /api/auth/redeem-portal-invite. On success, sets portal
// cookies and redirects to /portal/calendar.
export async function redeemInviteAction(
  formData: FormData
): Promise<RedeemActionResult> {
  const token = String(formData.get("token") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) {
    return { ok: false, error: "This invitation link is invalid." };
  }
  if (!email || !firstName || !lastName || !password) {
    return { ok: false, error: "All fields are required." };
  }
  if (password !== confirmPassword) {
    return { ok: false, error: "Passwords don't match." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const result = await portalApi<RedeemResponse>(
    "/api/auth/redeem-portal-invite",
    {
      method: "POST",
      body: JSON.stringify({
        token,
        email,
        firstName,
        lastName,
        password,
      }),
    }
  );

  if (!result.ok || !result.data) {
    // Map specific error codes to friendly messages
    return {
      ok: false,
      error: result.error ?? "Failed to set up your account.",
      code: result.code,
    };
  }

  await setPortalAuthCookies({
    accessToken: result.data.accessToken,
    refreshToken: result.data.refreshToken,
  });

  redirect("/portal/calendar");
}
