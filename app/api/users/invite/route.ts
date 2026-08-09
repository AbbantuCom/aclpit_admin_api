import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getDb } from '@/lib/mongodb';
import { requireRole, authError } from '@/lib/session';
import { sendInvitationEmail, getAppUrl } from '@/lib/email';
import { normalizeEmail, isValidEmail, asString } from '@/lib/validation';
import { USER_MANAGEMENT_ROLES } from '@/types';
import type { AdminUser, Invitation, UserRole } from '@/types';

/** Roles that can be handed out by invitation. super_admin is deliberately
 *  excluded — there is only ever one, and it moves via /api/users/transfer. */
const INVITABLE_ROLES: readonly UserRole[] = ['admin', 'staff'];

export async function POST(req: NextRequest) {
  const auth = await requireRole(USER_MANAGEMENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const rawEmail = asString(body.email);
  const role = (asString(body.role) ?? 'staff') as UserRole;

  if (!rawEmail) return NextResponse.json({ error: 'Email is required.' }, { status: 400 });

  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  if (!INVITABLE_ROLES.includes(role)) {
    return NextResponse.json(
      { error: 'Invitations can only be sent for the Admin or Staff role.' },
      { status: 400 }
    );
  }

  const db = await getDb();

  const existing = await db.collection<AdminUser>('users').findOne({ email });
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
  }

  const existingInvite = await db
    .collection<Invitation>('invitations')
    .findOne({ email, status: 'pending' });
  if (existingInvite) {
    return NextResponse.json(
      { error: 'An invitation for this email is already pending.' },
      { status: 409 }
    );
  }

  const token = randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.collection<Invitation>('invitations').insertOne({
    email,
    token,
    role,
    invitedBy: auth.user.uid,
    invitedByEmail: auth.user.email,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: 'pending',
  });

  const emailResult = await sendInvitationEmail({
    to: email,
    inviterName: auth.user.displayName || auth.user.email,
    role,
    token,
  });

  // The link is returned either way so an admin can pass it on manually if
  // mail delivery is misconfigured — the invite itself is already valid.
  return NextResponse.json({
    ok: true,
    emailSent: emailResult.ok,
    emailError: emailResult.error,
    inviteLink: `${getAppUrl()}/auth/accept-invite?token=${token}`,
  });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireRole(['super_admin']);
  if ('failure' in auth) {
    return authError(
      auth.failure.status === 403
        ? { error: 'Only the super admin can revoke invitations.', status: 403 }
        : auth.failure
    );
  }

  const body = await req.json().catch(() => null);
  const token = body ? asString(body.token) : null;
  if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 });

  const db = await getDb();
  await db.collection<Invitation>('invitations').deleteOne({ token });

  return NextResponse.json({ ok: true });
}
