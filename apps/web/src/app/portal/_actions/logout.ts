"use server";

import { redirect } from "next/navigation";
import { portalApi } from "@/lib/portal-api-client";
import { clearPortalAuthCookies } from "@/lib/portal-cookies";

// AC-8.1: Sign out — call Cognito GlobalSignOut, clear portal cookies,
// redirect to login with flash message.

export async function logoutAction() {
  try {
    await portalApi("/api/auth/logout", { method: "POST" });
  } catch {
    // Best-effort — even if the API call fails, we still clear cookies
  }
  await clearPortalAuthCookies();
  redirect("/portal/login?signedOut=1");
}
