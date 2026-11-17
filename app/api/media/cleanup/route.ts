import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireRole, authError } from '@/lib/session';
import { deleteUnreferencedMedia } from '@/lib/media-cleanup';
import { CONTENT_ROLES } from '@/types';

/**
 * POST /api/media/cleanup  { urls: string[], reason?: string }
 *
 * Deletes the given files only if no saved content references them. The editor
 * calls this when an unsaved publication is deleted — its freshly uploaded PDF
 * and cover were never saved anywhere, so no save or publish would ever free
 * them. Anything still referenced is left alone, which makes this safe to call
 * with any URL.
 */
export async function POST(req: NextRequest) {
  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  const body = await req.json().catch(() => null);
  const urls = Array.isArray(body?.urls) ? body.urls.filter((u: unknown): u is string => typeof u === 'string') : [];
  if (urls.length === 0 || urls.length > 20) {
    return NextResponse.json({ error: 'urls must list 1–20 file URLs' }, { status: 400 });
  }

  const db = await getDb();
  const deleted = await deleteUnreferencedMedia(db, urls, auth.user, 'publication deleted');
  return NextResponse.json({ ok: true, deleted });
}
