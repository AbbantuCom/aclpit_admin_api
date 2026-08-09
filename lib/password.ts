import bcrypt from 'bcryptjs';

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
 * bypassed by skipping the UI.
 */
export function checkPasswordStrength(password: string): PasswordCheck {
  if (password.length < 10) {
    return { ok: false, error: 'Password must be at least 10 characters long.' };
  }
  if (password.length > 200) {
    return { ok: false, error: 'Password must be under 200 characters.' };
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return { ok: false, error: 'Password must include both uppercase and lowercase letters.' };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, error: 'Password must include at least one number.' };
  }
  return { ok: true };
}
