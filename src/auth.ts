import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import authConfig from "@/auth.config";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validation-auth";
import { DUMMY_HASH, verifyPassword } from "@/lib/password";
import { isLocked, recordFailedLogin, recordSuccessfulLogin } from "@/lib/auth-lockout";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await db.user.findUnique({ where: { email } });
        // Always run bcrypt (real hash or a dummy) so timing doesn't reveal
        // whether the account exists.
        const hash = user?.passwordHash ?? DUMMY_HASH;
        const locked = user ? isLocked(user) : false;
        const valid = await verifyPassword(password, hash);

        if (!user || locked || !valid) {
          if (user && !locked) await recordFailedLogin(user);
          return null;
        }

        await recordSuccessfulLogin(user.id);
        return { id: user.id, email: user.email, name: user.name ?? null };
      },
    }),
  ],
});
