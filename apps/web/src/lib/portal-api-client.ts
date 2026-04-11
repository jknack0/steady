import {
  getPortalAccessToken,
  setPortalAuthCookies,
} from "./portal-cookies";

// ── Server-side API client used by portal server actions ───────────
// Ref: docs/sdlc/client-web-portal-mvp/04-architecture.md AD-1
//
// All portal-to-API calls flow through Next.js server actions, which
// use this client to call the Express API with a Bearer token from
// the portal-scoped cookie. This is the proxy layer that enforces
// cookie isolation (COND-10): the browser only ever talks to the
// portal Next.js server, never directly to api.steadymentalhealth.com.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ApiResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  code?: string;
}

async function refreshIfPossible(): Promise<boolean> {
  // For now, use the standard Cognito refresh flow via the API.
  // The refresh token comes from the portal cookie.
  try {
    const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!refreshRes.ok) return false;
    const json = await refreshRes.json();
    if (json.data?.accessToken && json.data?.refreshToken) {
      await setPortalAuthCookies({
        accessToken: json.data.accessToken,
        refreshToken: json.data.refreshToken,
      });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function portalApi<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<ApiResult<T>> {
  const accessToken = await getPortalAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (res.status === 401 && accessToken) {
    const refreshed = await refreshIfPossible();
    if (refreshed) {
      const newToken = await getPortalAccessToken();
      const retryHeaders = new Headers(init.headers);
      retryHeaders.set("Content-Type", "application/json");
      if (newToken) retryHeaders.set("Authorization", `Bearer ${newToken}`);
      res = await fetch(`${API_BASE}${path}`, { ...init, headers: retryHeaders });
    }
  }

  let body: { success?: boolean; data?: T; error?: string; code?: string } = {};
  try {
    body = await res.json();
  } catch {
    // Empty body or non-JSON response
  }

  return {
    ok: res.ok,
    status: res.status,
    data: body.data,
    error: body.error,
    code: body.code,
  };
}
