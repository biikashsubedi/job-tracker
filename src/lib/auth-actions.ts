"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { auth, signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { loginSchema, passwordSchema } from "@/lib/validation-auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { isLocked } from "@/lib/auth-lockout";

const GENERIC_LOGIN_ERROR = "Invalid email or password";
const RATE_LIMITED = "Too many attempts, try again later.";

function clientIp(): string {
  const h = headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "local"
  );
}

/** Only allow same-origin relative redirects (no open redirects). */
function safeCallback(url: string | undefined): string {
  if (url && url.startsWith("/") && !url.startsWith("//")) return url;
  return "/";
}

export type LoginResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

export async function login(
  email: string,
  password: string,
  callbackUrl?: string
): Promise<LoginResult> {
  // IP rate limit first — cheap and blocks rapid guessing.
  if (!rateLimit(`login:${clientIp()}`, 10, 60_000).ok) {
    return { ok: false, error: RATE_LIMITED };
  }

  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }

  try {
    const result = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    // Some versions return an object with `.error` instead of throwing.
    if (result && typeof result === "object" && "error" in result && result.error) {
      throw new AuthError("CredentialsSignin");
    }
  } catch (error) {
    if (error instanceof AuthError) {
      // Distinguish a locked account (only reveals the account exists after
      // the 5th failure, which the spec accepts) from a bad credential.
      const user = await db.user.findUnique({
        where: { email: parsed.data.email },
        select: { lockedUntil: true },
      });
      if (user && isLocked(user)) return { ok: false, error: RATE_LIMITED };
      return { ok: false, error: GENERIC_LOGIN_ERROR };
    }
    throw error;
  }

  return { ok: true, redirectTo: safeCallback(callbackUrl) };
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

export type ChangePasswordResult = { ok: true } | { ok: false; error: string };

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ChangePasswordResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not authenticated" };

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { ok: false, error: "Not authenticated" };

  const currentOk = await verifyPassword(currentPassword, user.passwordHash);
  if (!currentOk) return { ok: false, error: "Current password is incorrect" };

  const policy = passwordSchema.safeParse(newPassword);
  if (!policy.success) {
    return { ok: false, error: policy.error.issues[0].message };
  }

  const passwordHash = await hashPassword(newPassword);
  await db.user.update({ where: { id: user.id }, data: { passwordHash } });

  // Invalidate the current session — force a fresh login with the new password.
  await signOut({ redirect: false });
  return { ok: true };
}
