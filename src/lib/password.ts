import bcrypt from "bcryptjs";

const COST = 12;

/**
 * Precomputed bcrypt hash of a throwaway string. When an email isn't found we
 * still run bcrypt against this so response time doesn't reveal whether the
 * account exists (mitigates user enumeration by timing).
 */
export const DUMMY_HASH =
  "$2b$12$5t5oY50panlao9JCCS8uK.WiRqvgRAphyFhhqc7xr3z85X3FIUd82";

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
