import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async () => {
        // Stub: always returns demo user, no real auth
        return {
          id: "1",
          name: "Demo User",
          email: "demo@nativespeech.ai",
        };
      },
    }),
  ],
  pages: {
    signIn: "/sign-in",
  },
});
