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

  // Homework Instances
  getHomeworkInstances: (params?: { date?: string; enrollmentId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.date) qs.set("date", params.date);
    if (params?.enrollmentId) qs.set("enrollmentId", params.enrollmentId);
    const query = qs.toString();
    return apiFetch(`/api/participant/homework-instances${query ? `?${query}` : ""}`);
  },

  getHomeworkStreak: (instanceId: string) =>
    apiFetch(`/api/participant/homework-instances/${instanceId}/streak`),

  completeHomeworkInstance: (instanceId: string, response?: any) =>
    apiFetch(`/api/participant/homework-instances/${instanceId}/complete`, {
      method: "POST",
      body: JSON.stringify({ response: response ?? null }),
    }),

  skipHomeworkInstance: (instanceId: string) =>
    apiFetch(`/api/participant/homework-instances/${instanceId}/skip`, {
      method: "POST",
    }),

  // Daily Trackers
  getDailyTrackers: () => apiFetch("/api/participant/daily-trackers"),

  getTrackerToday: (trackerId: string) =>
    apiFetch(`/api/participant/daily-trackers/${trackerId}/today`),

  submitTrackerEntry: (trackerId: string, date: string, responses: Record<string, any>) =>
    apiFetch(`/api/participant/daily-trackers/${trackerId}/entries`, {
      method: "POST",
      body: JSON.stringify({ date, responses }),
    }),

  getTrackerHistory: (trackerId: string, params?: { startDate?: string; endDate?: string }) => {
    const qs = new URLSearchParams();
    if (params?.startDate) qs.set("startDate", params.startDate);
    if (params?.endDate) qs.set("endDate", params.endDate);
    const query = qs.toString();
    return apiFetch(`/api/participant/daily-trackers/${trackerId}/history${query ? `?${query}` : ""}`);
  },

  getTrackerStreak: (trackerId: string) =>
    apiFetch(`/api/participant/daily-trackers/${trackerId}/streak`),

  // File Downloads
  getPresignedDownloadUrl: (key: string) =>
    apiFetch<{ downloadUrl: string }>(`/api/uploads/presign-download?key=${encodeURIComponent(key)}`),

  // Notifications
  registerPushToken: (pushToken: string) =>
    apiFetch("/api/notifications/push-token", {
      method: "POST",
      body: JSON.stringify({ pushToken }),
    }),

  removePushToken: () =>
    apiFetch("/api/notifications/push-token", { method: "DELETE" }),

  getNotificationPreferences: () =>
    apiFetch("/api/notifications/preferences"),

  updateNotificationPreferences: (preferences: Array<{ category: string; enabled: boolean; preferredTime?: string }>) =>
    apiFetch("/api/notifications/preferences", {
      method: "PUT",
      body: JSON.stringify({ preferences }),
    }),

  // Tasks
  getTasks: (params?: { status?: string; category?: string; cursor?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.category) qs.set("category", params.category);
    if (params?.cursor) qs.set("cursor", params.cursor);
    const query = qs.toString();
    return apiFetch(`/api/participant/tasks${query ? `?${query}` : ""}`);
  },

  createTask: (data: {
    title: string;
    description?: string;
    estimatedMinutes?: number;
    dueDate?: string;
    energyLevel?: string;
    category?: string;
  }) =>
    apiFetch("/api/participant/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTask: (id: string, data: any) =>
    apiFetch(`/api/participant/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteTask: (id: string) =>
    apiFetch(`/api/participant/tasks/${id}`, { method: "DELETE" }),

  // Calendar
  getCalendarEvents: (start: string, end: string) =>
    apiFetch(`/api/participant/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`),

  createCalendarEvent: (data: {
    title: string;
    startTime: string;
    endTime: string;
    eventType?: string;
    color?: string;
    taskId?: string;
  }) =>
    apiFetch("/api/participant/calendar", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateCalendarEvent: (id: string, data: any) =>
    apiFetch(`/api/participant/calendar/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteCalendarEvent: (id: string) =>
    apiFetch(`/api/participant/calendar/${id}`, { method: "DELETE" }),

  // Journal
  getJournalEntries: (params?: { start?: string; end?: string; cursor?: string }) => {
    const qs = new URLSearchParams();
    if (params?.start) qs.set("start", params.start);
    if (params?.end) qs.set("end", params.end);
    if (params?.cursor) qs.set("cursor", params.cursor);
    const query = qs.toString();
    return apiFetch(`/api/participant/journal${query ? `?${query}` : ""}`);
  },

  getJournalEntry: (date: string) =>
    apiFetch(`/api/participant/journal/${date}`),

  saveJournalEntry: (data: {
    entryDate: string;
    freeformContent?: string;
    responses?: any;
    regulationScore?: number;
    isSharedWithClinician?: boolean;
  }) =>
    apiFetch("/api/participant/journal", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Sessions
  getUpcomingSession: () => apiFetch("/api/sessions/upcoming"),

  getSessionHistory: (params?: { cursor?: string }) => {
    const qs = new URLSearchParams();
    if (params?.cursor) qs.set("cursor", params.cursor);
    const query = qs.toString();
    return apiFetch(`/api/sessions/history${query ? `?${query}` : ""}`);
  },

  dismissNotification: (category: string) =>
    apiFetch("/api/notifications/dismiss", {
      method: "POST",
      body: JSON.stringify({ category }),
    }),

  // RTM
  getPendingRtmConsent: () => apiFetch("/api/participant/rtm/pending"),

  submitRtmConsent: (data: { rtmEnrollmentId: string; consentGiven: boolean; signatureName: string }) =>
    apiFetch("/api/participant/rtm/consent", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Stats
  getMyStats: (params?: { start?: string; end?: string }) => {
    const qs = new URLSearchParams();
    if (params?.start) qs.set("start", params.start);
    if (params?.end) qs.set("end", params.end);
    const query = qs.toString();
    return apiFetch(`/api/stats/participant${query ? `?${query}` : ""}`);
  },
};
