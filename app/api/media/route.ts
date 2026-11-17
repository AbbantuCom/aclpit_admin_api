import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { listObjects, deleteObject, publicUrlFor } from '@/lib/r2';
import { requireRole, authError } from '@/lib/session';
import { recordAudit } from '@/lib/audit';
import { isContentSection, SECTION_LABELS, type ContentSectionName } from '@/lib/content';
import { CONTENT_ROLES } from '@/types';

export async function GET() {
  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  const db = await getDb();
  const contentDocs = await db.collection('content').find({}).toArray();
  // One string per section, so a file can say *where* it is used, not just whether.
  const sectionBlobs = contentDocs.map((doc) => ({
    label: isContentSection(String(doc.section)) ? SECTION_LABELS[doc.section as ContentSectionName] : String(doc.section),
    blob: JSON.stringify(doc),
  }));

  const objects = await listObjects();
  const files = objects
    .filter((o) => !o.key.startsWith('raw/'))
    .map((o) => {
      const url = publicUrlFor(o.key);
      const usedIn = sectionBlobs.filter((s) => s.blob.includes(url)).map((s) => s.label);
      return { ...o, url, inUse: usedIn.length > 0, usedIn };
    })
    .sort((a, b) => b.lastModified.localeCompare(a.lastModified));

  return NextResponse.json({ files });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  const body = await req.json().catch(() => null);
  const key = typeof body?.key === 'string' ? body.key.trim() : '';

  // A leading slash or a ".." segment would address something outside the prefix
  // the library lists, so a delete could reach an object the UI never showed.
  if (!key || key.startsWith('/') || key.split('/').includes('..')) {
    return NextResponse.json({ error: 'A valid key is required' }, { status: 400 });
  }

  await deleteObject(key);
  await recordAudit({ actor: auth.user, action: 'media.delete', target: key });

  return NextResponse.json({ ok: true });
}
