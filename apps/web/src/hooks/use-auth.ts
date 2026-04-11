"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { api } from "@/lib/api-client";
import { getQueryClient } from "@/lib/query-provider";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  hasCompletedSetup: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useAuthState(): AuthContextValue {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const checkAuth = useCallback(async () => {
    try {
      // Cookie is sent automatically via credentials: "include"
      const user = await api.get<User>("/api/auth/me");
      setState({ user, isLoading: false, isAuthenticated: true });
    } catch {
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ user: User; accessToken: string; refreshToken: string }>(
      "/api/auth/login",
      { email, password }
    );
    // Cookies are set by the server via Set-Cookie headers
    setState({ user: data.user, isLoading: false, isAuthenticated: true });
  }, []);

  const register = useCallback(
    async (input: { email: string; password: string; firstName: string; lastName: string }) => {
      const data = await api.post<{ user: User; accessToken: string; refreshToken: string }>(
        "/api/auth/register",
        { ...input, role: "CLINICIAN" }
      );
      setState({ user: data.user, isLoading: false, isAuthenticated: true });
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout", {});
    } catch {
      // Best-effort — server clears cookies
    }
    getQueryClient().clear();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    await api.post("/api/auth/forgot-password", { email });
  }, []);

  const resetPassword = useCallback(async (email: string, code: string, newPassword: string) => {
    await api.post("/api/auth/confirm-reset-password", { email, code, newPassword });
  }, []);

  // One-time cleanup: remove any stale tokens from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
    }
  }, []);

  return { ...state, login, register, logout, refreshUser: checkAuth, forgotPassword, resetPassword };
}
