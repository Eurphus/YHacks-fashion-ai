"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface MockUser {
  id: string;
  name: string;
  role: string;
}

interface UserContextValue {
  user: MockUser;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

// ── Static mock user ───────────────────────────────────────────────────────────

const MOCK_USER: MockUser = {
  id: "usr_mock_123",
  name: "Peter Macdonald",
  role: "beta_tester",
};

const AUTH_STORAGE_KEY = "fashionai_authed";

// ── Context ────────────────────────────────────────────────────────────────────

const UserContext = createContext<UserContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────

export function UserProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Rehydrate from localStorage on mount (handles page refresh)
  useEffect(() => {
    try {
      const flag = localStorage.getItem(AUTH_STORAGE_KEY);
      if (flag === "true") {
        setIsAuthenticated(true);
      }
    } catch {
      // localStorage may be unavailable in some environments — silently ignore
    }
  }, []);

  const login = () => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, "true");
    } catch {
      // ignore
    }
    setIsAuthenticated(true);
  };

  const logout = () => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
  };

  return (
    <UserContext.Provider
      value={{
        user: MOCK_USER,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within a <UserProvider>.");
  }
  return ctx;
}
