import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireRole, authError } from '@/lib/session';
import { readContent, type ContentDoc } from '@/lib/content';
import { CONTENT_ROLES } from '@/types';

/**
 * POST /api/content/:section/discard
 *
 * Throws the draft away and resets it to whatever is currently live. Nothing about
 * the published copy changes, so the public site is untouched and no cache ping is
 * needed. This is the escape hatch for "I made a mess of this section".
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  const { section } = await params;
  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  const db = await getDb();
  const state = await readContent(db, section);

  if (state.neverPublished) {
    return NextResponse.json(
      { error: 'This section has never been published, so there is nothing to revert to' },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  await db.collection<ContentDoc>('content').updateOne(
    { section },
    { $set: { section, draft: state.published, draftUpdatedAt: now, draftUpdatedBy: auth.user.uid } }
  );

  return NextResponse.json({ ok: true, data: state.published, hasUnpublishedChanges: false });
}
