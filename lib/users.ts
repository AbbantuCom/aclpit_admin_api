import type { Db } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import type { AdminUser } from '@/types';

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

/**
 * How many *usable* super admins there are — active accounts only, since a
 * deactivated one cannot sign in to rescue anything.
 *
 * `excludeUid` leaves one account out of the count, which is how the callers ask
 * "if I change this person, is anyone left?" before committing the change.
 */
export async function countActiveSuperAdmins(db: Db, excludeUid?: string): Promise<number> {
  const filter: Record<string, unknown> = { role: 'super_admin', status: 'active' };
  if (excludeUid) filter.uid = { $ne: excludeUid };
  return db.collection<AdminUser>('users').countDocuments(filter);
}
