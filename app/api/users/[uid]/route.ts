import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import {
  requireRole,
  authError,
  toPublicUser,
  createSessionToken,
  setSessionCookie,
} from '@/lib/session';
import { countActiveSuperAdmins } from '@/lib/users';
import { recordAudit } from '@/lib/audit';
import { USER_MANAGEMENT_ROLES, MAX_SUPER_ADMINS } from '@/types';
import type { AdminUser, UserRole } from '@/types';

const ROLES: readonly UserRole[] = ['super_admin', 'admin', 'staff'];

/**
 * PATCH /api/users/:uid
 *
 *   { status: 'active' | 'deactivated' }   — admin or super admin
 *   { role: 'super_admin' | 'admin' | 'staff' } — super admin only
 *
 * Both are here because they are the same kind of change: adjusting an existing
 * account rather than creating or destroying one. They are accepted in the same
 * request, so "demote and deactivate on their last day" is one atomic action.
 *
 * The invariant this route protects is that **at least one active super admin
 * always exists**. Up to MAX_SUPER_ADMINS may hold the role at once, so no single
 * person is a point of failure, but the last one cannot be demoted or switched off.
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
        ? { error: 'Only an admin or the super admin can change an account.', status: 403 }
        : auth.failure
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const status = 'status' in body ? body.status : undefined;
  const role = 'role' in body ? body.role : undefined;

  if (status === undefined && role === undefined) {
    return NextResponse.json({ error: 'Provide a status or a role to change.' }, { status: 400 });
  }
  if (status !== undefined && status !== 'active' && status !== 'deactivated') {
    return NextResponse.json(
      { error: "status must be either 'active' or 'deactivated'" },
      { status: 400 }
    );
  }
  if (role !== undefined && !ROLES.includes(role)) {
    return NextResponse.json(
      { error: "role must be 'super_admin', 'admin' or 'staff'" },
      { status: 400 }
    );
  }

  // Only a super admin may hand out or take back any role — including promoting
  // someone to super admin. Admins manage people but not the shape of authority.
  if (role !== undefined && auth.user.role !== 'super_admin') {
    return NextResponse.json(
      { error: 'Only a super admin can change roles.' },
      { status: 403 }
    );
  }

  // Deactivating yourself would lock you out on the next request. Changing your
  // own role is allowed — that is how a super admin steps down — but only while
  // another active super admin remains, which the check further down enforces.
  if (uid === auth.user.uid && status === 'deactivated') {
    return NextResponse.json({ error: 'You cannot deactivate your own account.' }, { status: 400 });
  }

  const db = await getDb();
  const target = await db.collection<AdminUser>('users').findOne({ uid });
  if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const nextRole: UserRole = role ?? target.role;
  const nextStatus: AdminUser['status'] = status ?? target.status;

  // Would this change leave nobody able to administer the system?
  const losesSuperAdmin =
    target.role === 'super_admin' && (nextRole !== 'super_admin' || nextStatus !== 'active');
  if (losesSuperAdmin && (await countActiveSuperAdmins(db, uid)) === 0) {
    return NextResponse.json(
      {
        error:
          'This is the only active super admin. Promote someone else to super admin first.',
      },
      { status: 400 }
    );
  }

  // The cap is on *active* super admins, so reactivating a deactivated one counts
  // just as much as promoting a new one.
  const gainsSuperAdmin =
    nextRole === 'super_admin' &&
    nextStatus === 'active' &&
    !(target.role === 'super_admin' && target.status === 'active');
  if (gainsSuperAdmin && (await countActiveSuperAdmins(db, uid)) >= MAX_SUPER_ADMINS) {
    return NextResponse.json(
      {
        error: `There can be at most ${MAX_SUPER_ADMINS} super admins. Demote one before promoting another.`,
      },
      { status: 409 }
    );
  }

  if (nextRole === target.role && nextStatus === target.status) {
    return NextResponse.json({ ok: true, changed: false, user: toPublicUser(target) });
  }

  await db
    .collection<AdminUser>('users')
    .updateOne({ uid }, { $set: { role: nextRole, status: nextStatus } });

  // A pending reset link would otherwise let a departed account change its own
  // password. Login already refuses them, but leaving live tokens around is untidy.
  if (nextStatus === 'deactivated') {
    await db.collection('passwordResetTokens').deleteMany({ uid });
  }

  if (nextRole !== target.role) {
    await recordAudit({
      actor: auth.user,
      action: 'user.role_change',
      target: target.email,
      details: { uid, from: target.role, to: nextRole },
    });
  }
  if (nextStatus !== target.status) {
    await recordAudit({
      actor: auth.user,
      action: nextStatus === 'deactivated' ? 'user.deactivate' : 'user.reactivate',
      target: target.email,
      details: { uid, role: nextRole },
    });
  }

  const updated = toPublicUser({ ...target, role: nextRole, status: nextStatus });
  const res = NextResponse.json({ ok: true, changed: true, user: updated });

  // Demoting yourself leaves a cookie still claiming the old role. Reissue it at
  // the new one so it cannot be used to keep acting as super admin.
  if (uid === auth.user.uid && nextRole !== target.role) {
    return setSessionCookie(res, await createSessionToken({ uid, role: nextRole }));
  }

  return res;
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
        ? { error: 'Only a super admin can remove users.', status: 403 }
        : auth.failure
    );
  }

  if (uid === auth.user.uid) {
    return NextResponse.json({ error: 'You cannot remove yourself.' }, { status: 400 });
  }

  const db = await getDb();
  const target = await db.collection<AdminUser>('users').findOne({ uid });
  if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  // A super admin can be removed now that there may be more than one — but never
  // the last one, or nobody could administer the system afterwards.
  if (target.role === 'super_admin' && (await countActiveSuperAdmins(db, uid)) === 0) {
    return NextResponse.json(
      { error: 'This is the only active super admin. Promote someone else first.' },
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
