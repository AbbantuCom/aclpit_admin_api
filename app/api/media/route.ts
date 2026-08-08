import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getDb } from '@/lib/mongodb';
import { listObjects, deleteObject, publicUrlFor } from '@/lib/r2';

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

export async function GET(req: NextRequest) {
  const requestUser = await getRequestUser(req);
  if (!requestUser || !['super_admin', 'admin'].includes(requestUser.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = await getDb();
  const contentDocs = await db.collection('content').find({}).toArray();
  const contentBlob = JSON.stringify(contentDocs);

  const objects = await listObjects();
  const files = objects
    .filter((o) => !o.key.startsWith('raw/'))
    .map((o) => ({
      ...o,
      url: publicUrlFor(o.key),
      inUse: contentBlob.includes(publicUrlFor(o.key)),
    }))
    .sort((a, b) => b.lastModified.localeCompare(a.lastModified));

  return NextResponse.json({ files });
}

export async function DELETE(req: NextRequest) {
  const requestUser = await getRequestUser(req);
  if (!requestUser || !['super_admin', 'admin'].includes(requestUser.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { key } = await req.json();
  if (!key) return NextResponse.json({ error: 'key is required' }, { status: 400 });

  await deleteObject(key);
  return NextResponse.json({ ok: true });
}
