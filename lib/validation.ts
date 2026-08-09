const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

export function checkUsername(username: string): ValidationResult {
  if (!USERNAME_PATTERN.test(username)) {
    return {
      ok: false,
      error: 'Username must be 3–32 characters and use only letters, numbers, dots, hyphens or underscores.',
    };
  }
  return { ok: true };
}

/** Narrows an unknown JSON body field to a non-empty string. */
export function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}
