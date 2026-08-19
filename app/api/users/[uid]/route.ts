import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireRole, authError, toPublicUser } from '@/lib/session';
import { recordAudit } from '@/lib/audit';
import { USER_MANAGEMENT_ROLES } from '@/types';
import type { AdminUser } from '@/types';

/**
 * PATCH /api/users/:uid  { status: 'active' | 'deactivated' }
 *
 * Turns an account off without destroying it — the case when someone leaves and
 * their work, authorship and audit trail must stay intact and reversible. Deleting
 * is the irreversible alternative and remains super-admin only.
 *
 * Access is cut off immediately rather than on cookie expiry: getSessionUser()
 * re-reads the account on every request and returns null unless it is active, so
 * a deactivated person's live session stops working on their very next click.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params;

  const auth = await requireRole(USER_MANAGEMENT_ROLES);
  if ('failure' in auth) {
    return authError(
      auth.failure.status === 403
        ? { error: 'Only an admin or the super admin can change account status.', status: 403 }
        : auth.failure
    );
  }

  const body = await req.json().catch(() => null);
  const status = body?.status;
  if (status !== 'active' && status !== 'deactivated') {
    return NextResponse.json(
      { error: "status must be either 'active' or 'deactivated'" },
      { status: 400 }
    );
  }

  // Deactivating yourself would lock you out on the next request, with no one
  // necessarily around to undo it.
  if (uid === auth.user.uid) {
    return NextResponse.json({ error: 'You cannot change your own account status.' }, { status: 400 });
  }

  const db = await getDb();
  const target = await db.collection<AdminUser>('users').findOne({ uid });
  if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  // The super admin is the one account that must always be able to get back in.
  // Transfer the role first if that person is the one leaving.
  if (target.role === 'super_admin') {
    return NextResponse.json(
      { error: 'The super admin account cannot be deactivated. Transfer the role first.' },
      { status: 400 }
    );
  }

  if (target.status === status) {
    return NextResponse.json({ ok: true, changed: false, user: toPublicUser({ ...target, status }) });
  }

  await db.collection<AdminUser>('users').updateOne({ uid }, { $set: { status } });

  // A pending reset link would otherwise let a departed account change its own
  // password. Login already refuses them, but leaving live tokens around is untidy.
  if (status === 'deactivated') {
    await db.collection('passwordResetTokens').deleteMany({ uid });
  }

  await recordAudit({
    actor: auth.user,
    action: status === 'deactivated' ? 'user.deactivate' : 'user.reactivate',
    target: target.email,
    details: { uid, role: target.role },
  });

  return NextResponse.json({ ok: true, changed: true, user: toPublicUser({ ...target, status }) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params;

  const auth = await requireRole(['super_admin']);
  if ('failure' in auth) {
    return authError(
      auth.failure.status === 403
        ? { error: 'Only the super admin can remove users.', status: 403 }
        : auth.failure
    );
  }

  if (uid === auth.user.uid) {
    return NextResponse.json({ error: 'You cannot remove yourself.' }, { status: 400 });
  }

  const db = await getDb();
  const target = await db.collection<AdminUser>('users').findOne({ uid });
  if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  // Defensive: the super admin is the only one who can reach this route and
  // cannot delete themselves, so this should be unreachable — but it keeps the
  // "there is always exactly one super admin" invariant impossible to break.
  if (target.role === 'super_admin') {
    return NextResponse.json(
      { error: 'The super admin account cannot be removed. Transfer the role first.' },
      { status: 400 }
    );
  }

  await db.collection<AdminUser>('users').deleteOne({ uid });
  // Clean up anything that would let a removed account get back in.
  await db.collection('passwordResetTokens').deleteMany({ uid });

  await recordAudit({
    actor: auth.user,
    action: 'user.delete',
    target: target.email,
    details: { uid, role: target.role },
  });

  return NextResponse.json({ ok: true });
}
