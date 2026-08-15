import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getDb } from '@/lib/mongodb';
import { hashPassword, checkPasswordStrength } from '@/lib/password';
import { asString } from '@/lib/validation';
import { recordAudit } from '@/lib/audit';
import type { AdminUser, PasswordResetToken } from '@/types';

const INVALID_TOKEN = 'This password reset link is invalid or has expired. Please request a new one.';

/** GET ?token=… — lets the reset page tell the user early if the link is dead. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ valid: false, error: INVALID_TOKEN }, { status: 400 });

  const record = await findUsableToken(token);
  if (!record) return NextResponse.json({ valid: false, error: INVALID_TOKEN }, { status: 400 });

  return NextResponse.json({ valid: true, email: record.email });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const token = asString(body.token);
  const password = asString(body.password);

  if (!token || !password) {
    return NextResponse.json({ error: 'Token and new password are required.' }, { status: 400 });
  }

  const passwordCheck = checkPasswordStrength(password);
  if (!passwordCheck.ok) return NextResponse.json({ error: passwordCheck.error }, { status: 400 });

  const record = await findUsableToken(token);
  if (!record) return NextResponse.json({ error: INVALID_TOKEN }, { status: 400 });

  const db = await getDb();

  const updated = await db
    .collection<AdminUser>('users')
    .findOneAndUpdate(
      { uid: record.uid },
      { $set: { passwordHash: await hashPassword(password) } },
      { returnDocument: 'after' }
    );

  // Single-use: burn the token (and any siblings) so the link cannot be replayed.
  await db.collection<PasswordResetToken>('passwordResetTokens').deleteMany({ uid: record.uid });

  // No session here — the reset link is the only proof of identity — so the entry
  // is attributed to the account the token belonged to.
  await recordAudit({
    actor: null,
    actorLabel: updated?.email ?? record.uid,
    action: 'auth.password_reset',
    target: updated?.email ?? record.uid,
  });

  return NextResponse.json({ ok: true, message: 'Your password has been updated. You can now sign in.' });
}

async function findUsableToken(rawToken: string): Promise<PasswordResetToken | null> {
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const db = await getDb();

  const record = await db.collection<PasswordResetToken>('passwordResetTokens').findOne({ tokenHash });
  if (!record) return null;
  if (record.usedAt) return null;
  if (new Date(record.expiresAt) < new Date()) return null;

  return record;
}
