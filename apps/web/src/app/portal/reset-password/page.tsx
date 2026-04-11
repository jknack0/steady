import Link from "next/link";
import ResetPasswordForm from "./ResetPasswordForm";

// FR-5 / Flow 6 — Reset password confirmation page.
export default async function PortalResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-stone-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-stone-800">
            Set a new password
          </h1>
        </div>
        <ResetPasswordForm defaultEmail={email ?? ""} />
        <p className="text-center text-xs text-stone-500 mt-6">
          <Link
            href="https://steadymentalhealth.com/privacy"
            className="hover:underline"
          >
            Privacy policy
          </Link>
        </p>
      </div>
    </div>
  );
}
