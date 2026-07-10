import type { NextAuthConfig } from "next-auth";

// Edge-safe config shared by the middleware. No Prisma / bcrypt here — those
// live in the Credentials provider in auth.ts (Node runtime only).
export default {
  pages: { signIn: "/login" },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60, // rolling refresh once per day of activity
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id as string;
      return token;
    },
    session({ session, token }) {
      if (token?.id && session.user) session.user.id = token.id as string;
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
