import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { listObjects, deleteObject, publicUrlFor } from '@/lib/r2';
import { requireRole, authError } from '@/lib/session';
import { CONTENT_ROLES } from '@/types';

export async function GET() {
  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

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
  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  const { key } = await req.json();
  if (!key) return NextResponse.json({ error: 'key is required' }, { status: 400 });

  await deleteObject(key);
  return NextResponse.json({ ok: true });
}
