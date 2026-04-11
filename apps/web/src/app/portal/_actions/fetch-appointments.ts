"use server";

import { portalApi } from "@/lib/portal-api-client";
import type { ParticipantAppointmentView } from "@steady/shared";

export async function fetchAppointmentsAction(params: {
  from: string;
  to: string;
  cursor?: string;
}): Promise<{
  ok: boolean;
  data?: ParticipantAppointmentView[];
  cursor?: string | null;
  error?: string;
}> {
  const query = new URLSearchParams({
    from: params.from,
    to: params.to,
    ...(params.cursor ? { cursor: params.cursor } : {}),
  });
  const result = await portalApi<ParticipantAppointmentView[]>(
    `/api/participant-portal/appointments?${query.toString()}`
  );
  if (!result.ok) {
    return { ok: false, error: result.error ?? "Failed to load appointments" };
  }
  return {
    ok: true,
    data: result.data ?? [],
    cursor: (result as { cursor?: string | null }).cursor ?? null,
  };
}
