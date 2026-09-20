import bcrypt from 'bcryptjs';
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH, SYMBOL_PATTERN } from '@/lib/password-policy';

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export interface PasswordCheck {
  ok: boolean;
  error?: string;
}

/**
 * Minimum password policy, enforced server-side on every route that sets a
 * password (register, accept-invite, reset-password) so the rules can't be
 * bypassed by skipping the UI. The numbers live in lib/password-policy.ts, which
 * the sign-in screens import too.
 */
export function checkPasswordStrength(password: string): PasswordCheck {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, error: `Password must be under ${MAX_PASSWORD_LENGTH} characters.` };
  }
  if (!SYMBOL_PATTERN.test(password)) {
    return {
      ok: false,
      error: 'Password must include at least one symbol, such as @ # ! or ?',
    };
  }
  return { ok: true };
}
