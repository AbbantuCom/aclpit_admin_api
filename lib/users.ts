import { getDb } from '@/lib/mongodb';

/**
 * Unique indexes are what actually enforce one-account-per-email/username —
 * the application-level checks in the auth routes are just for nicer errors.
 * Safe to call repeatedly; createIndex is idempotent.
 */
export async function ensureUserIndexes(): Promise<void> {
  const db = await getDb();
  await Promise.all([
    db.collection('users').createIndex({ uid: 1 }, { unique: true }),
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
    db.collection('users').createIndex({ username: 1 }, { unique: true }),
  ]);
}

export function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === 11000;
}
