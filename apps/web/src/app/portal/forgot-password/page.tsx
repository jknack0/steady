import Link from "next/link";
import ForgotPasswordForm from "./ForgotPasswordForm";

// FR-5 / Flow 6 — Forgot password page.
export default function PortalForgotPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-stone-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-stone-800">
            Reset your password
          </h1>
        </div>
        <ForgotPasswordForm />
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
