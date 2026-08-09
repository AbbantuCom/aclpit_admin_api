import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { verifyPassword } from '@/lib/password';
import { createSessionToken, setSessionCookie, toPublicUser } from '@/lib/session';
import { normalizeEmail, asString } from '@/lib/validation';
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

  if (!user) {
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);
  if (!passwordOk) {
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  if (user.status !== 'active') {
    return NextResponse.json(
      { error: 'This account is not active. Contact an administrator.' },
      { status: 403 }
    );
  }

  const now = new Date().toISOString();
  await db.collection<AdminUser>('users').updateOne({ uid: user.uid }, { $set: { lastLoginAt: now } });

  const token = await createSessionToken({ uid: user.uid, role: user.role });
  const res = NextResponse.json({ user: toPublicUser({ ...user, lastLoginAt: now }) });
  return setSessionCookie(res, token);
}
