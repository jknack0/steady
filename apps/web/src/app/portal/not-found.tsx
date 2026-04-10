import Link from "next/link";

export default function PortalNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 p-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-semibold text-stone-800 mb-2">
          Page not found
        </h1>
        <p className="text-stone-600 mb-6">
          We couldn&apos;t find the page you were looking for.
        </p>
        <Link
          href="/portal/calendar"
          className="inline-block px-6 py-3 bg-teal-700 text-white font-semibold rounded-lg hover:bg-teal-800"
        >
          Back to your schedule
        </Link>
      </div>
    </div>
  );
}
