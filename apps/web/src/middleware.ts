import { NextRequest, NextResponse } from "next/server";

// ── Host-based dispatcher for the client web portal ────────────────
// Ref: docs/sdlc/client-web-portal-mvp/04-architecture.md AD-2
//
// portal.steadymentalhealth.com/* → rewrites to /(portal)/* in the
// Next.js route tree without changing the visible URL. This lets us
// serve two distinct UIs from a single Amplify deployment.
//
// Auth and role checks are handled by the portal's server layout
// (apps/web/src/app/(portal)/layout.tsx), NOT by this middleware.
// Edge middleware has no DB access; the layout does.

const PORTAL_HOSTS = new Set(["portal.steadymentalhealth.com"]);
// Local dev: support `?portal=1` query for testing without DNS
const PORTAL_DEV_QUERY = "portal";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const isPortalHost =
    PORTAL_HOSTS.has(host) ||
    host.startsWith("portal.") ||
    request.nextUrl.searchParams.get(PORTAL_DEV_QUERY) === "1";

  if (!isPortalHost) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();

  // If the client requests `/`, route them to `/portal` for layout dispatch
  if (url.pathname === "/" || url.pathname === "") {
    url.pathname = "/portal/calendar";
    return NextResponse.rewrite(url);
  }

  // Already prefixed (already in the portal route group) → pass through
  if (url.pathname.startsWith("/portal/")) {
    return NextResponse.next();
  }

  // Otherwise, prepend /portal so the request lands in the (portal) route group
  url.pathname = `/portal${url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Apply to all paths except Next.js internals and static assets
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};
