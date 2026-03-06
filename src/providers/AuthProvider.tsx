"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import type { Session } from "next-auth";

const demoSession: Session = {
  user: { name: "Demo User", email: "demo@nativespeech.ai" },
  expires: "2099-01-01T00:00:00.000Z",
};

type AuthToggle = { loggedIn: boolean; toggle: () => void };
const AuthToggleCtx = createContext<AuthToggle>({ loggedIn: true, toggle: () => {} });
export const useAuthToggle = () => useContext(AuthToggleCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(true);
  const toggle = useCallback(() => setLoggedIn((v) => !v), []);

  return (
    <AuthToggleCtx.Provider value={{ loggedIn, toggle }}>
      <SessionProvider session={loggedIn ? demoSession : undefined}>
        {children}
      </SessionProvider>
    </AuthToggleCtx.Provider>
  );
}
