import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireRole, authError } from '@/lib/session';
import { publishSection } from '@/lib/content';
import { notifyClientRevalidate } from '@/lib/revalidate';
import { recordAudit } from '@/lib/audit';
import { CONTENT_ROLES } from '@/types';

/**
 * POST /api/content/:section/publish
 *
 * Promotes the draft to published — the only operation that changes what visitors
 * see. The published copy is a snapshot taken at this moment, so any further draft
 * edits stay invisible until the next publish.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  const { section } = await params;
  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  const db = await getDb();
  const result = await publishSection(db, section, auth.user.uid);

  if (result.status === 'empty') {
    return NextResponse.json({ error: 'Nothing to publish for this section' }, { status: 400 });
  }
  if (result.status === 'unchanged') {
    return NextResponse.json({
      ok: true,
      alreadyPublished: true,
      publishedAt: result.publishedAt,
      hasUnpublishedChanges: false,
    });
  }

  await notifyClientRevalidate(section);
  await recordAudit({ actor: auth.user, action: 'content.publish', target: section });

  return NextResponse.json({
    ok: true,
    publishedAt: result.publishedAt,
    hasUnpublishedChanges: false,
  });
}
