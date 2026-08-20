import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireRole, authError, createSessionToken, setSessionCookie } from '@/lib/session';
import { asString } from '@/lib/validation';
import { recordAudit } from '@/lib/audit';
import type { AdminUser } from '@/types';

/**
 * Hands the super admin role to someone else and steps down in the same operation,
 * leaving the number of super admins unchanged.
 *
 * Distinct from PATCH /api/users/:uid, which promotes or demotes one person at a
 * time up to MAX_SUPER_ADMINS. Use this one when you are leaving and someone else
 * is taking over; use promote when you want a second super admin alongside you.
 */
export async function POST(req: NextRequest) {
  const auth = await requireRole(['super_admin']);
  if ('failure' in auth) {
    return authError(
      auth.failure.status === 403
        ? { error: 'Only the super admin can transfer this role.', status: 403 }
        : auth.failure
    );
  }

  const body = await req.json().catch(() => null);
  const targetUid = body ? asString(body.targetUid) : null;
  if (!targetUid) return NextResponse.json({ error: 'targetUid is required' }, { status: 400 });

  if (targetUid === auth.user.uid) {
    return NextResponse.json({ error: 'You are already a super admin.' }, { status: 400 });
  }

  const db = await getDb();
  const target = await db.collection<AdminUser>('users').findOne({ uid: targetUid });
  if (!target) return NextResponse.json({ error: 'Target user not found.' }, { status: 404 });
  if (target.status !== 'active') {
    return NextResponse.json({ error: 'That account is not active.' }, { status: 400 });
  }
  // Handing over to an existing super admin would just demote the caller, quietly
  // reducing the count. Stepping down is a demotion, so say so explicitly.
  if (target.role === 'super_admin') {
    return NextResponse.json(
      { error: 'That account is already a super admin. Demote yourself instead if you are stepping down.' },
      { status: 400 }
    );
  }

  await db.collection<AdminUser>('users').updateOne({ uid: auth.user.uid }, { $set: { role: 'admin' } });
  await db.collection<AdminUser>('users').updateOne({ uid: targetUid }, { $set: { role: 'super_admin' } });

  await recordAudit({
    actor: auth.user,
    action: 'user.transfer_ownership',
    target: target.email,
    details: { fromUid: auth.user.uid, toUid: targetUid },
  });

  // The caller's session still claims super_admin — reissue it at the new role
  // so the cookie can't be used to keep acting as super admin.
  const token = await createSessionToken({ uid: auth.user.uid, role: 'admin' });
  const res = NextResponse.json({
    ok: true,
    message: `Super admin role transferred to ${target.email}.`,
  });
  return setSessionCookie(res, token);
}
