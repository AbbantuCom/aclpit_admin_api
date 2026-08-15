import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireRole, authError } from '@/lib/session';
import { recordAudit } from '@/lib/audit';
import type { AdminUser } from '@/types';

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
