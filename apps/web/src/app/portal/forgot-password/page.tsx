import Link from "next/link";

// Stub — engineer wires the form to /api/auth/forgot-password.
// FR-5 / Flow 6.
export default function PortalForgotPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-stone-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-stone-800">
            Reset your password
          </h1>
        </div>
        <form className="space-y-4 bg-white p-6 rounded-2xl border border-stone-200">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-3 py-2 border border-stone-300 rounded-lg"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-teal-700 text-white font-semibold rounded-lg"
          >
            Send reset code
          </button>
          <div className="text-center text-sm">
            <Link href="/portal/login" className="text-teal-700 hover:underline">
              Back to sign in
            </Link>
          </div>
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
