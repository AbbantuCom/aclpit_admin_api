import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { adminAuth } from '@/lib/firebase-admin';
import { getDb } from '@/lib/mongodb';

async function getRequestUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    const db = await getDb();
    return await db.collection('users').findOne({ uid: decoded.uid });
  } catch {
    return null;
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestUser = await getRequestUser(req);
  if (!requestUser || !['super_admin', 'admin'].includes(requestUser.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestUser = await getRequestUser(req);
  if (!requestUser || !['super_admin', 'admin'].includes(requestUser.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = await getDb();
  await db.collection('contactSubmissions').deleteOne({ _id: new ObjectId(id) });

  return NextResponse.json({ ok: true });
}
