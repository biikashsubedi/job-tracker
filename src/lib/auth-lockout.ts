import { db } from "./db";

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function isLocked(user: { lockedUntil: Date | null }): boolean {
  return !!(user.lockedUntil && user.lockedUntil.getTime() > Date.now());
}

/**
 * Count a failed attempt. On the 5th consecutive failure, lock the account for
 * 15 minutes and reset the counter (so a fresh set of attempts is available
 * once the lock expires).
 */
export async function recordFailedLogin(user: {
  id: string;
  failedLogins: number;
}): Promise<void> {
  const failed = user.failedLogins + 1;
  if (failed >= MAX_FAILED_ATTEMPTS) {
    await db.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_DURATION_MS) },
    });
  } else {
    await db.user.update({
      where: { id: user.id },
      data: { failedLogins: failed },
    });
  }
}

export async function recordSuccessfulLogin(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { failedLogins: 0, lockedUntil: null },
  });
}
