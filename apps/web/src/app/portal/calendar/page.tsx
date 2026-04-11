import { fetchAppointmentsAction } from "../_actions/fetch-appointments";
import PortalCalendarClient from "./PortalCalendarClient";

// FR-6 — Client portal calendar view
// Server component fetches the initial appointment list, then hands off
// to a client component for interactivity (view switcher, polling,
// timezone detection, idle timer, navigation).

export default async function PortalCalendarPage() {
  // Fetch a default 30-day-back / 90-day-forward window
  const now = new Date();
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const result = await fetchAppointmentsAction({ from, to });

  return (
    <PortalCalendarClient
      initialAppointments={result.data ?? []}
      initialError={result.error}
    />
  );
}
