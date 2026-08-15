import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDb } from '@/lib/mongodb';
import { hashPassword, checkPasswordStrength } from '@/lib/password';
import { createSessionToken, setSessionCookie, toPublicUser } from '@/lib/session';
import { normalizeUsername, checkUsername, asString } from '@/lib/validation';
import { ensureUserIndexes, isDuplicateKeyError } from '@/lib/users';
import { recordAudit } from '@/lib/audit';
import type { AdminUser, Invitation } from '@/types';

const INVALID_INVITE = 'This invitation is invalid or has expired. Ask an administrator for a new one.';

/** GET ?token=… — lets the accept-invite page show who/what the invite is for. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ valid: false, error: INVALID_INVITE }, { status: 400 });

  const invite = await findUsableInvite(token);
  if (!invite) return NextResponse.json({ valid: false, error: INVALID_INVITE }, { status: 400 });

  return NextResponse.json({
    valid: true,
    email: invite.email,
    role: invite.role,
    invitedByEmail: invite.invitedByEmail,
  });
}

/** Consumes an invitation and creates the account, then signs the user straight in. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const token = asString(body.token);
  const rawUsername = asString(body.username);
  const password = asString(body.password);
  const displayName = asString(body.displayName);

  if (!token || !rawUsername || !password) {
    return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
  }

  const username = normalizeUsername(rawUsername);

  const usernameCheck = checkUsername(username);
  if (!usernameCheck.ok) return NextResponse.json({ error: usernameCheck.error }, { status: 400 });

  const passwordCheck = checkPasswordStrength(password);
  if (!passwordCheck.ok) return NextResponse.json({ error: passwordCheck.error }, { status: 400 });

  const invite = await findUsableInvite(token);
  if (!invite) return NextResponse.json({ error: INVALID_INVITE }, { status: 400 });

  const db = await getDb();
  await ensureUserIndexes();

  // The invite was issued to a specific address, so the account is created with
  // an already-verified email — clicking the emailed link proves ownership.
  const now = new Date().toISOString();
  const user: AdminUser = {
    uid: randomUUID(),
    email: invite.email,
    username,
    displayName: displayName || username,
    passwordHash: await hashPassword(password),
    role: invite.role,
    invitedBy: invite.invitedBy,
    createdAt: now,
    status: 'active',
    emailVerified: true,
    lastLoginAt: now,
  };

  try {
    await db.collection<AdminUser>('users').insertOne(user);
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return NextResponse.json(
        { error: 'That username is already taken, or an account already exists for this email.' },
        { status: 409 }
      );
    }
    throw err;
  }

  await db
    .collection<Invitation>('invitations')
    .updateOne({ token: invite.token }, { $set: { status: 'accepted' } });

  await recordAudit({
    actor: toPublicUser(user),
    action: 'auth.invite_accepted',
    target: user.email,
    details: { role: user.role, invitedBy: invite.invitedByEmail },
  });

  const sessionToken = await createSessionToken({ uid: user.uid, role: user.role });
  const res = NextResponse.json({ user: toPublicUser(user) });
  return setSessionCookie(res, sessionToken);
}

async function findUsableInvite(token: string): Promise<Invitation | null> {
  const db = await getDb();
  const invite = await db.collection<Invitation>('invitations').findOne({ token });

  if (!invite || invite.status !== 'pending') return null;

  if (new Date(invite.expiresAt) < new Date()) {
    await db.collection<Invitation>('invitations').updateOne({ token }, { $set: { status: 'expired' } });
    return null;
  }

  // An account may have been created for this address by other means since the
  // invite was sent — don't let a stale invite collide with it.
  const existingUser = await db.collection<AdminUser>('users').findOne({ email: invite.email });
  if (existingUser) return null;

  return invite;
}
