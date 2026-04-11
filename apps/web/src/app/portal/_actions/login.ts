"use server";

import { redirect } from "next/navigation";
import { portalApi } from "@/lib/portal-api-client";
import { setPortalAuthCookies } from "@/lib/portal-cookies";

interface LoginResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: "PARTICIPANT" | "CLINICIAN" | "ADMIN";
  };
  accessToken: string;
  refreshToken: string;
}

interface LoginActionResult {
  ok: boolean;
  error?: string;
}

// AC-4.1, AC-4.2: Portal-only login — rejects CLINICIAN/ADMIN roles
// with a wrong-role message and never sets cookies.
export async function loginAction(formData: FormData): Promise<LoginActionResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "/portal/calendar");

  if (!email || !password) {
    return { ok: false, error: "Email and password are required" };
  }

  const result = await portalApi<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (!result.ok || !result.data) {
    return {
      ok: false,
      error: result.error ?? "Invalid email or password",
    };
  }

  // AC-4.2 / AC-4.3: only PARTICIPANT may sign in here
  if (result.data.user.role !== "PARTICIPANT") {
    return {
      ok: false,
      error:
        "This login is for clients only. Please use the clinician app at steadymentalhealth.com.",
    };
  }

  await setPortalAuthCookies({
    accessToken: result.data.accessToken,
    refreshToken: result.data.refreshToken,
  });

  // Open-redirect guard (NFR-2.13)
  const safeRedirect =
    redirectTo.startsWith("/portal/") &&
    !redirectTo.includes("://") &&
    !redirectTo.includes("\n")
      ? redirectTo
      : "/portal/calendar";

  redirect(safeRedirect);
}
