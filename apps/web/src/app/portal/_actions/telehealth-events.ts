"use server";

import { portalApi } from "@/lib/portal-api-client";

// COND-7: HIPAA-required audit logging for room.connected / room.disconnected
export async function logTelehealthEventAction(params: {
  appointmentId: string;
  event: "connected" | "disconnected";
}): Promise<{ ok: boolean }> {
  const result = await portalApi("/api/participant-portal/telehealth-events", {
    method: "POST",
    body: JSON.stringify(params),
  });
  return { ok: result.ok };
}

export async function issueTelehealthTokenAction(
  appointmentId: string
): Promise<{
  ok: boolean;
  token?: string;
  url?: string;
  error?: string;
  code?: string;
}> {
  const result = await portalApi<{ token: string; url: string }>(
    `/api/telehealth/token`,
    {
      method: "POST",
      body: JSON.stringify({ appointmentId }),
    }
  );
  if (!result.ok) {
    return {
      ok: false,
      error: result.error ?? "Failed to issue telehealth token",
      code: result.code,
    };
  }
  return {
    ok: true,
    token: result.data?.token,
    url: result.data?.url,
  };
}
