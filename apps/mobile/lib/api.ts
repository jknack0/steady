import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:4000";

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("accessToken");
}

async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync("refreshToken");
}

async function setTokens(access: string, refresh: string): Promise<void> {
  await SecureStore.setItemAsync("accessToken", access);
  await SecureStore.setItemAsync("refreshToken", refresh);
}

async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync("accessToken");
  await SecureStore.deleteItemAsync("refreshToken");
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      await clearTokens();
      return null;
    }

    const json: ApiResponse<{ accessToken: string; refreshToken: string }> = await res.json();
    if (json.success && json.data) {
      await setTokens(json.data.accessToken, json.data.refreshToken);
      return json.data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  let token = await getToken();

  const doFetch = async (authToken: string | null) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    return fetch(`${API_URL}${path}`, { ...options, headers });
  };

  let res = await doFetch(token);

  // If 401, try refreshing the token once
  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await doFetch(newToken);
    }
  }

  const json = await res.json();
  return json;
}

export const api = {
  getToken,
  setTokens,
  clearTokens,
  refreshAccessToken,

  // Auth
  login: (email: string, password: string) =>
    apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ ...data, role: "PARTICIPANT" }),
    }),

  me: () => apiFetch("/api/auth/me"),

  // Participant endpoints
  getEnrollments: () => apiFetch("/api/participant/enrollments"),

  acceptEnrollment: (enrollmentId: string) =>
    apiFetch(`/api/participant/enrollments/${enrollmentId}/accept`, {
      method: "POST",
    }),

  getProgram: (enrollmentId: string) =>
    apiFetch(`/api/participant/programs/${enrollmentId}`),

  markPartComplete: (partId: string, enrollmentId: string, responseData?: any) =>
    apiFetch(`/api/participant/progress/part/${partId}`, {
      method: "POST",
      body: JSON.stringify({ enrollmentId, responseData }),
    }),
};
