import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api";
import { registerForPushNotifications, unregisterPushNotifications } from "./notifications";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const token = await api.getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      const res = await api.me();
      if (res.success && res.data) {
        setUser(res.data);
        registerForPushNotifications().catch(() => {});
      } else {
        await api.clearTokens();
      }
    } catch {
      await api.clearTokens();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    if (res.success && res.data) {
      await api.setTokens(res.data.accessToken, res.data.refreshToken);
      setUser(res.data.user);
      registerForPushNotifications().catch(() => {});
      return { success: true };
    }
    return { success: false, error: res.error || "Login failed" };
  }, []);

  const register = useCallback(
    async (data: { email: string; password: string; firstName: string; lastName: string }) => {
      const res = await api.register(data);
      if (res.success && res.data) {
        await api.setTokens(res.data.accessToken, res.data.refreshToken);
        setUser(res.data.user);
        registerForPushNotifications().catch(() => {});
        return { success: true };
      }
      return { success: false, error: res.error || "Registration failed" };
    },
    []
  );

  const logout = useCallback(async () => {
    await unregisterPushNotifications().catch(() => {});
    // Revoke server-side before clearing local tokens
    await api.logout().catch(() => {});
    await api.clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
