import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireRole, authError, toPublicUser } from '@/lib/session';
import { USER_MANAGEMENT_ROLES } from '@/types';
import type { AdminUser, Invitation } from '@/types';

export async function GET() {
  const auth = await requireRole(USER_MANAGEMENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  const db = await getDb();
  const users = await db.collection<AdminUser>('users').find({}).toArray();
  const invitations = await db
    .collection<Invitation>('invitations')
    .find({ status: 'pending' })
    .toArray();

  return NextResponse.json({
    // toPublicUser strips passwordHash — never let credentials reach the client.
    users: users.map(toPublicUser),
    invitations: invitations.map(({ _id, ...i }) => ({ ...i, _id: String(_id) })),
  });
}
