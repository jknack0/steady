import { issueTelehealthTokenAction } from "../../_actions/telehealth-events";
import TelehealthParticipantView from "./TelehealthParticipantView";
import Link from "next/link";

// FR-7 — Client joins telehealth session (participant-facing view)
// AC-7.4: server verifies ownership + SCHEDULED status before issuing token
// AC-7.6: NEW component, NOT a reuse of clinician telehealth page

export default async function PortalTelehealthPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = await params;

  const result = await issueTelehealthTokenAction(appointmentId);

  if (!result.ok) {
    // 409 SessionUnavailable / 403 ownership / generic error
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold mb-3">
            This session is no longer available
          </h1>
          <p className="text-stone-400 mb-6">
            It may have been canceled or ended. Please contact your clinician.
          </p>
          <Link
            href="/portal/calendar"
            className="inline-block px-6 py-3 bg-teal-700 text-white font-semibold rounded-lg hover:bg-teal-800"
          >
            Back to calendar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <TelehealthParticipantView
      appointmentId={appointmentId}
      livekitToken={result.token!}
      livekitUrl={result.url!}
    />
  );
}
