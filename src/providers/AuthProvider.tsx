"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

const stubSession = {
  user: { name: "Demo User", email: "demo@nativespeech.ai" },
  expires: "2099-01-01T00:00:00.000Z",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider session={stubSession}>{children}</SessionProvider>;
}
