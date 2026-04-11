"use server";

import { portalApi } from "@/lib/portal-api-client";

// AC-6.7, AC-6.8: persist participant timezone on first calendar load
export async function updateTimezoneAction(
  timezone: string
): Promise<{ ok: boolean }> {
  const result = await portalApi("/api/participant-portal/profile", {
    method: "PATCH",
    body: JSON.stringify({ timezone }),
  });
  return { ok: result.ok };
}
