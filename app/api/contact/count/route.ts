import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireRole, authError } from '@/lib/session';
import { CONTENT_ROLES } from '@/types';

export async function GET() {
  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  const db = await getDb();
  const unread = await db.collection('contactSubmissions').countDocuments({ read: false });

  return NextResponse.json({ unread });
}
