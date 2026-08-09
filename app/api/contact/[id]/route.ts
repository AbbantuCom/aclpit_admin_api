import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireRole, authError } from '@/lib/session';
import { CONTENT_ROLES } from '@/types';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  const body = await req.json();
  const update: Record<string, boolean> = {};
  if ('read' in body) update.read = !!body.read;
  if ('contacted' in body) update.contacted = !!body.contacted;

  const db = await getDb();
  await db.collection('contactSubmissions').updateOne(
    { _id: new ObjectId(id) },
    { $set: update }
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  const db = await getDb();
  await db.collection('contactSubmissions').deleteOne({ _id: new ObjectId(id) });

  return NextResponse.json({ ok: true });
}
