"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { api } from "@/lib/api-client";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => void;
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
      const user = await api.get<User>("/api/auth/me");
      setState({ user, isLoading: false, isAuthenticated: true });
    } catch {
      // Token invalid/expired — try refresh
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          const tokens = await api.post<{ accessToken: string; refreshToken: string }>(
            "/api/auth/refresh",
            { refreshToken }
          );
          localStorage.setItem("token", tokens.accessToken);
          localStorage.setItem("refreshToken", tokens.refreshToken);
          const user = await api.get<User>("/api/auth/me");
          setState({ user, isLoading: false, isAuthenticated: true });
          return;
        } catch {
          // Refresh also failed
        }
      }
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

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  return { ...state, login, register, logout };
}
