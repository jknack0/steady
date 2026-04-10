import { cookies } from "next/headers";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

// ── Portal cookie utility ──────────────────────────────────────────
// Ref: docs/sdlc/client-web-portal-mvp/04-architecture.md AD-1, NFR-2.2
//
// Portal cookies are scoped to portal.steadymentalhealth.com ONLY.
// Critically, NO `domain` attribute is set — this ensures the browser
// scopes the cookie to the exact host, preventing it from being read
// by the clinician app at steadymentalhealth.com.
//
// COND-10: cookie isolation between subdomains.

const PORTAL_ACCESS_TOKEN_COOKIE = "portal_access_token";
const PORTAL_REFRESH_TOKEN_COOKIE = "portal_refresh_token";

const isProduction = process.env.NODE_ENV === "production";

const baseOptions: Partial<ResponseCookie> = {
  httpOnly: true,
  secure: isProduction,
  // SameSite=lax is sufficient because all reads happen via server actions
  // on the same origin. CSRF risk is mitigated by Next.js server actions
  // requiring origin validation by default.
  sameSite: "lax",
  path: "/",
  // NO `domain` attribute — scope to exact host (portal subdomain only)
};

const ACCESS_TOKEN_MAX_AGE = 30 * 60; // 30 minutes (matches Cognito)
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export async function getPortalAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(PORTAL_ACCESS_TOKEN_COOKIE)?.value ?? null;
}

export async function getPortalRefreshToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(PORTAL_REFRESH_TOKEN_COOKIE)?.value ?? null;
}

export async function setPortalAuthCookies(params: {
  accessToken: string;
  refreshToken: string;
}): Promise<void> {
  const store = await cookies();
  store.set(PORTAL_ACCESS_TOKEN_COOKIE, params.accessToken, {
    ...baseOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  store.set(PORTAL_REFRESH_TOKEN_COOKIE, params.refreshToken, {
    ...baseOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

export async function clearPortalAuthCookies(): Promise<void> {
  const store = await cookies();
  store.delete(PORTAL_ACCESS_TOKEN_COOKIE);
  store.delete(PORTAL_REFRESH_TOKEN_COOKIE);
}
