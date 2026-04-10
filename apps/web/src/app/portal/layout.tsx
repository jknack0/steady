import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { getPortalAccessToken } from "@/lib/portal-cookies";
import { portalApi } from "@/lib/portal-api-client";
import { logoutAction } from "./_actions/logout";

// ── Portal Root Layout — Cross-Role Authorization Guard ──────────
// Ref: docs/sdlc/client-web-portal-mvp/04-architecture.md AD-2
// Implements: AC-9.1 through AC-9.8, FR-9
//
// This server layout is the security boundary for the portal UI tree.
// It runs on every request, has DB access (via the API), and enforces
// PARTICIPANT role for all protected routes.
//
// Public routes (login, signup, forgot, reset, error pages) bypass
// the auth check.

const PUBLIC_PORTAL_PATHS = [
  "/portal/login",
  "/portal/signup",
  "/portal/forgot-password",
  "/portal/reset-password",
  "/portal/404",
  "/portal/error",
];

const CLINICIAN_APP_URL =
  process.env.NEXT_PUBLIC_CLINICIAN_URL || "https://steadymentalhealth.com";

interface MeResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "PARTICIPANT" | "CLINICIAN" | "ADMIN";
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PORTAL_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

// Open-redirect guard (NFR-2.13)
function safeRedirectParam(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/portal/")) return null;
  if (raw.includes("://")) return null;
  if (raw.includes("\n") || raw.includes("\r")) return null;
  return raw;
}

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  // Next.js doesn't expose the rewritten path directly via the standard
  // headers() API. `apps/web/src/middleware.ts` sets `x-pathname` on the
  // forwarded request headers so this layout can read it.
  //
  // IMPORTANT: if the header is ever missing (misconfigured middleware,
  // direct render during hot reload, etc.), we MUST NOT default to a
  // protected path like /portal/calendar — that would infinite-loop the
  // unauth redirect. Default to the login path instead, which is public.
  const pathname = headerList.get("x-pathname") || "/portal/login";

  // Public routes pass through without auth check
  if (isPublicPath(pathname)) {
    return (
      <div className="min-h-screen bg-stone-50">{children}</div>
    );
  }

  // Authenticated routes: verify session + role
  const token = await getPortalAccessToken();
  if (!token) {
    redirect(`/portal/login?redirect=${encodeURIComponent(pathname)}`);
  }

  const meResult = await portalApi<MeResponse>("/api/auth/me");

  // Token expired and refresh failed — re-auth
  if (meResult.status === 401 || !meResult.data) {
    redirect(`/portal/login?redirect=${encodeURIComponent(pathname)}`);
  }

  const user = meResult.data;

  // Cross-role guard (AC-9.1, AC-9.3)
  if (user.role === "CLINICIAN") {
    redirect(CLINICIAN_APP_URL);
  }
  if (user.role === "ADMIN") {
    redirect(`${CLINICIAN_APP_URL}/admin`);
  }
  if (user.role !== "PARTICIPANT") {
    redirect(`/portal/login`);
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <PortalHeader user={user} />
      <main className="flex-1">{children}</main>
    </div>
  );
}

function PortalHeader({ user }: { user: MeResponse }) {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/portal/calendar" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white font-bold">
            S
          </div>
          <span className="font-semibold text-stone-800">STEADY</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-stone-600">Hi, {user.firstName}</span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-stone-600 hover:text-stone-900 underline"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
