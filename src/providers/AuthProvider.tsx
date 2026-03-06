"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

type User = { name: string; email: string };

type AuthState = {
  user: User | null;
  toggle: () => void;
};

const demoUser: User = { name: "Demo User", email: "demo@nativespeech.ai" };

const AuthCtx = createContext<AuthState>({ user: demoUser, toggle: () => {} });
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(demoUser);
  const toggle = useCallback(() => setUser((u) => (u ? null : demoUser)), []);

  return (
    <AuthCtx.Provider value={{ user, toggle }}>
      {children}
    </AuthCtx.Provider>
  );
}
