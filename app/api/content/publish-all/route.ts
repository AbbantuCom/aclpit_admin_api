import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireRole, authError } from '@/lib/session';
import { CONTENT_SECTIONS, publishSection } from '@/lib/content';
import { notifyClientRevalidate } from '@/lib/revalidate';
import { CONTENT_ROLES } from '@/types';

/**
 * POST /api/content/publish-all
 *
 * Publishes every section that has unpublished changes, for the review screen's
 * "Publish all" action. Sections already in sync are skipped, so this is safe to
 * press twice. Cache pings are fired only for sections that actually changed.
 */
export async function POST() {
  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  const db = await getDb();
  const published: string[] = [];

  for (const section of CONTENT_SECTIONS) {
    const result = await publishSection(db, section, auth.user.uid);
    if (result.status === 'published') published.push(section);
  }

  await Promise.all(published.map(notifyClientRevalidate));

  return NextResponse.json({ ok: true, published, publishedCount: published.length });
}
