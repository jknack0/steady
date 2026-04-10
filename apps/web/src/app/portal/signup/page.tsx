import Link from "next/link";
import { portalApi } from "@/lib/portal-api-client";
import SignupForm from "./SignupForm";

// FR-3 / Flow 1, 3, 4 — Portal invitation redemption
// This is a server component that fetches the invitation status
// before deciding which UI to render. UX flows in:
// docs/sdlc/client-web-portal-mvp/05-ux-design.md

interface InviteStatusResponse {
  status: "VALID" | "EXPIRED" | "USED" | "REVOKED" | "INVALID";
  existingUser?: boolean;
  firstName?: string | null;
  lastName?: string | null;
}

export default async function PortalSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const params = await searchParams;
  const token = params.t ?? "";

  if (!token) {
    return <InvitationErrorState testId="invitation-invalid-error" headline="This link isn't valid" body="Please contact your clinician for a new invitation." />;
  }

  const lookup = await portalApi<InviteStatusResponse>(
    `/api/auth/portal-invite-status?t=${encodeURIComponent(token)}`
  );

  const status = lookup.data?.status ?? "INVALID";

  if (status === "EXPIRED") {
    return <InvitationErrorState testId="invitation-expired-error" headline="This invitation has expired" body="Please contact your clinician for a new one." />;
  }
  if (status === "USED") {
    return (
      <InvitationErrorState
        testId="invitation-used-error"
        headline="This invitation has already been used"
        body="If this is your account, please sign in."
        cta={{ label: "Sign in", href: "/portal/login" }}
      />
    );
  }
  if (status === "REVOKED") {
    return <InvitationErrorState testId="invitation-revoked-error" headline="This invitation is no longer valid" body="Please contact your clinician." />;
  }
  if (status === "INVALID") {
    return <InvitationErrorState testId="invitation-invalid-error" headline="This link isn't valid" body="Please contact your clinician for a new invitation." />;
  }

  // VALID — render either the existing-user sign-in screen or the signup form
  if (lookup.data?.existingUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-stone-50">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-teal-700 items-center justify-center text-white text-2xl font-bold mb-3">
            S
          </div>
          <h1 className="text-2xl font-semibold text-stone-800 mb-3">
            You already have an account
          </h1>
          <p className="text-stone-600 mb-6">
            Please sign in to accept the invitation to your clinician&apos;s practice.
          </p>
          <Link
            href={`/portal/login?redirect=/portal/calendar`}
            className="inline-block px-6 py-3 bg-teal-700 text-white font-semibold rounded-lg hover:bg-teal-800"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <SignupForm
      token={token}
      defaultFirstName={lookup.data?.firstName ?? ""}
      defaultLastName={lookup.data?.lastName ?? ""}
    />
  );
}

function InvitationErrorState({
  testId,
  headline,
  body,
  cta,
}: {
  testId: string;
  headline: string;
  body: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 bg-stone-50"
      data-testid={testId}
    >
      <div className="w-full max-w-md text-center bg-white p-8 rounded-2xl border border-stone-200">
        <h1 className="text-2xl font-semibold text-stone-800 mb-3">
          {headline}
        </h1>
        <p className="text-stone-600 mb-6">{body}</p>
        {cta && (
          <Link
            href={cta.href}
            className="inline-block px-6 py-3 bg-teal-700 text-white font-semibold rounded-lg hover:bg-teal-800"
          >
            {cta.label}
          </Link>
        )}
      </div>
      <p className="text-center text-xs text-stone-500 mt-6">
        <Link
          href="https://steadymentalhealth.com/privacy"
          className="hover:underline"
        >
          Privacy policy
        </Link>
      </p>
    </div>
  );
}
