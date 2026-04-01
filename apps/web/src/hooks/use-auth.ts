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
    const token = localStorage.getItem("token");
    if (!token) {
      setState({ user: null, isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      // api.get handles 401 → refresh automatically
      const user = await api.get<User>("/api/auth/me");
      setState({ user, isLoading: false, isAuthenticated: true });
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
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
    localStorage.setItem("token", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    setState({ user: data.user, isLoading: false, isAuthenticated: true });
  }, []);

  const register = useCallback(
    async (input: { email: string; password: string; firstName: string; lastName: string }) => {
      const data = await api.post<{ user: User; accessToken: string; refreshToken: string }>(
        "/api/auth/register",
        { ...input, role: "CLINICIAN" }
      );
      localStorage.setItem("token", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      setState({ user: data.user, isLoading: false, isAuthenticated: true });
    },
    []
  );

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    // Revoke server-side before clearing local state
    if (refreshToken) {
      try {
        await api.post("/api/auth/logout", { refreshToken });
      } catch {
        // Best-effort — still clear local tokens
      }
    }
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    getQueryClient().clear(); // Clear all cached PHI from memory
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  return { ...state, login, register, logout, refreshUser: checkAuth };
}
