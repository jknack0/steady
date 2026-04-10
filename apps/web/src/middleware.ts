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

  // Propagate the current pathname as a request header so server
  // components (notably the portal root layout's cross-role guard) can
  // see which route is being rendered. Next.js does NOT expose the
  // rewritten path to server components via `headers()` otherwise.
  // The header must be set on the DOWNSTREAM request, not the response.
  const forwardHeaders = new Headers(request.headers);

  if (!isPortalHost && !request.nextUrl.pathname.startsWith("/portal")) {
    forwardHeaders.set("x-pathname", request.nextUrl.pathname);
    return NextResponse.next({ request: { headers: forwardHeaders } });
  }

  const url = request.nextUrl.clone();

  // If the client requests `/` on the portal host, route to /portal/calendar
  if (url.pathname === "/" || url.pathname === "") {
    url.pathname = "/portal/calendar";
    forwardHeaders.set("x-pathname", url.pathname);
    return NextResponse.rewrite(url, { request: { headers: forwardHeaders } });
  }

  // Already prefixed (either hit directly in dev, or already rewritten)
  if (url.pathname.startsWith("/portal/") || url.pathname === "/portal") {
    forwardHeaders.set("x-pathname", url.pathname);
    return NextResponse.next({ request: { headers: forwardHeaders } });
  }

  // Portal host with a bare path → prepend /portal so the route group resolves
  url.pathname = `/portal${url.pathname}`;
  forwardHeaders.set("x-pathname", url.pathname);
  return NextResponse.rewrite(url, { request: { headers: forwardHeaders } });
}

export const config = {
  // Apply to all paths except Next.js internals and static assets
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};
