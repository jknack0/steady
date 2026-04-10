import Link from "next/link";

// Stub — engineer wires the form to /api/auth/confirm-reset-password.
// FR-5 / Flow 6.
export default function PortalResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-stone-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-stone-800">
            Set a new password
          </h1>
        </div>
        <form className="space-y-4 bg-white p-6 rounded-2xl border border-stone-200">
          <input type="email" name="email" required placeholder="Email" className="w-full px-3 py-2 border border-stone-300 rounded-lg" />
          <input type="text" name="code" required placeholder="Reset code" className="w-full px-3 py-2 border border-stone-300 rounded-lg" />
          <input type="password" name="newPassword" required placeholder="New password" className="w-full px-3 py-2 border border-stone-300 rounded-lg" />
          <button
            type="submit"
            className="w-full py-2.5 bg-teal-700 text-white font-semibold rounded-lg"
          >
            Reset password
          </button>
        </form>
        <p className="text-center text-xs text-stone-500 mt-6">
          <Link href="https://steadymentalhealth.com/privacy" className="hover:underline">
            Privacy policy
          </Link>
        </p>
      </div>
    </div>
  );
}
