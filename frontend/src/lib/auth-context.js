"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { authApi, getTokens, clearTokens } from "./api";

const AuthContext = createContext({
  user: null,
  loading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user profile on mount if token exists
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const { access, refresh } = getTokens();
      if (!access && !refresh) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const userData = await authApi.me();
        if (isMounted) {
          setUser(userData);
        }
      } catch (err) {
        console.error("Initial auth check failed:", err);
        clearTokens();
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initAuth();

    // Listen to global logout event triggered on token refresh failures
    const handleLogoutEvent = () => {
      setUser(null);
    };
    window.addEventListener("auth:logout", handleLogoutEvent);

    return () => {
      isMounted = false;
      window.removeEventListener("auth:logout", handleLogoutEvent);
    };
  }, []);

  const login = async (username, password) => {
    await authApi.login({ username, password });
    const userData = await authApi.me();
    setUser(userData);
    return userData;
  };

  const register = async (username, password) => {
    await authApi.register({ username, password });
    // After register, automatically log user in
    return await login(username, password);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn("Logout error:", err);
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await authApi.me();
      setUser(userData);
      return userData;
    } catch {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
