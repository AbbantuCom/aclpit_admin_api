import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { verifyPassword } from '@/lib/password';
import { createSessionToken, setSessionCookie, toPublicUser } from '@/lib/session';
import { normalizeEmail, asString } from '@/lib/validation';
import { recordAudit } from '@/lib/audit';
import type { AdminUser } from '@/types';

/** Same message for "no such user" and "wrong password" — never reveal which. */
const INVALID_CREDENTIALS = 'Incorrect credentials. Please check and try again.';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const identifier = asString(body.identifier);
  const password = asString(body.password);

  if (!identifier || !password) {
    return NextResponse.json({ error: 'Please enter your credentials.' }, { status: 400 });
  }

  const normalized = normalizeEmail(identifier); // lowercase covers both email and username
  const db = await getDb();

  const user = await db
    .collection<AdminUser>('users')
    .findOne({ $or: [{ email: normalized }, { username: normalized }] });

  // Failed attempts are recorded against the identifier that was typed, since
  // there may be no account behind it — that pattern is the point of logging them.
  if (!user) {
    await recordAudit({
      actor: null,
      actorLabel: normalized,
      action: 'auth.login_failed',
      details: { reason: 'no such account' },
    });
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);
  if (!passwordOk) {
    await recordAudit({
      actor: null,
      actorLabel: user.email,
      action: 'auth.login_failed',
      details: { reason: 'wrong password' },
    });
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  if (user.status !== 'active') {
    await recordAudit({
      actor: null,
      actorLabel: user.email,
      action: 'auth.login_failed',
      details: { reason: `account status is ${user.status}` },
    });
    return NextResponse.json(
      { error: 'This account is not active. Contact an administrator.' },
      { status: 403 }
    );
  }

  const now = new Date().toISOString();
  await db.collection<AdminUser>('users').updateOne({ uid: user.uid }, { $set: { lastLoginAt: now } });

  const publicUser = toPublicUser({ ...user, lastLoginAt: now });
  await recordAudit({ actor: publicUser, action: 'auth.login' });

  const token = await createSessionToken({ uid: user.uid, role: user.role });
  const res = NextResponse.json({ user: publicUser });
  return setSessionCookie(res, token);
}
