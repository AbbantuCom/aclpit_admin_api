import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDb } from '@/lib/mongodb';
import { hashPassword, checkPasswordStrength } from '@/lib/password';
import { createSessionToken, setSessionCookie, toPublicUser } from '@/lib/session';
import { sendWelcomeEmail } from '@/lib/email';
import { normalizeEmail, normalizeUsername, isValidEmail, checkUsername, asString } from '@/lib/validation';
import { ensureUserIndexes, isDuplicateKeyError } from '@/lib/users';
import type { AdminUser } from '@/types';

/**
 * One-time super admin bootstrap. Only succeeds while the users collection is
 * empty — once any account exists this route is permanently closed, so the
 * super admin cannot be re-registered and everyone else must be invited.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const rawEmail = asString(body.email);
  const rawUsername = asString(body.username);
  const password = asString(body.password);
  const displayName = asString(body.displayName);

  if (!rawEmail || !rawUsername || !password) {
    return NextResponse.json({ error: 'Email, username and password are required.' }, { status: 400 });
  }

  const email = normalizeEmail(rawEmail);
  const username = normalizeUsername(rawUsername);

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const usernameCheck = checkUsername(username);
  if (!usernameCheck.ok) return NextResponse.json({ error: usernameCheck.error }, { status: 400 });

  const passwordCheck = checkPasswordStrength(password);
  if (!passwordCheck.ok) return NextResponse.json({ error: passwordCheck.error }, { status: 400 });

  const db = await getDb();

  // Guard the "only one super admin ever" rule. This is checked again by the
  // unique index below, which is what actually makes it race-safe.
  const existingCount = await db.collection('users').countDocuments();
  if (existingCount > 0) {
    return NextResponse.json(
      { error: 'Setup has already been completed. Ask an administrator for an invitation.' },
      { status: 403 }
    );
  }

  await ensureUserIndexes();

  const now = new Date().toISOString();
  const user: AdminUser = {
    uid: randomUUID(),
    email,
    username,
    displayName: displayName || username,
    passwordHash: await hashPassword(password),
    role: 'super_admin',
    createdAt: now,
    status: 'active',
    emailVerified: false,
    lastLoginAt: now,
  };

  try {
    await db.collection<AdminUser>('users').insertOne(user);
  } catch (err) {
    // Duplicate key — another request won the bootstrap race.
    if (isDuplicateKeyError(err)) {
      return NextResponse.json({ error: 'Setup has already been completed.' }, { status: 409 });
    }
    throw err;
  }

  // Best-effort welcome mail; a mail failure must not block account creation.
  await sendWelcomeEmail({ to: email, displayName: user.displayName });

  const token = await createSessionToken({ uid: user.uid, role: user.role });
  const res = NextResponse.json({ user: toPublicUser(user) });
  return setSessionCookie(res, token);
}
