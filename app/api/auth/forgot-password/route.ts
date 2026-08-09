import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { getDb } from '@/lib/mongodb';
import { sendPasswordResetEmail } from '@/lib/email';
import { normalizeEmail, asString } from '@/lib/validation';
import type { AdminUser, PasswordResetToken } from '@/types';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Starts a password reset. Always responds with the same success message
 * whether or not the account exists, so this endpoint cannot be used to
 * enumerate which emails/usernames are registered.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const identifier = body ? asString(body.identifier) : null;

  const genericResponse = NextResponse.json({
    ok: true,
    message: 'If an account matches, a password reset link has been sent to its email address.',
  });

  if (!identifier) return genericResponse;

  const normalized = normalizeEmail(identifier);
  const db = await getDb();

  const user = await db
    .collection<AdminUser>('users')
    .findOne({ $or: [{ email: normalized }, { username: normalized }] });

  if (!user || user.status !== 'active') return genericResponse;

  // Only the hash is stored — a database leak alone cannot be used to reset
  // anyone's password, since the raw token only ever exists in the email.
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const now = new Date();

  // Invalidate any outstanding tokens so only the newest link works.
  await db.collection<PasswordResetToken>('passwordResetTokens').deleteMany({ uid: user.uid });

  await db.collection<PasswordResetToken>('passwordResetTokens').insertOne({
    uid: user.uid,
    email: user.email,
    tokenHash,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + TOKEN_TTL_MS).toISOString(),
  });

  await sendPasswordResetEmail({ to: user.email, token: rawToken });

  return genericResponse;
}
