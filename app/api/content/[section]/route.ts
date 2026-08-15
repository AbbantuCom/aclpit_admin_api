import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { corsHeaders, corsPreflight } from '@/lib/cors';
import { requireRole, authError, getSessionUser } from '@/lib/session';
import { readContent, type ContentDoc } from '@/lib/content';
import { isValidPreviewSecret } from '@/lib/preview';
import { recordAudit } from '@/lib/audit';
import { CONTENT_ROLES } from '@/types';

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

/**
 * Draft content is not public. It is readable by a signed-in admin (the editor
 * itself, via same-origin fetch) or by the public site's *server* when it renders
 * a preview, which proves itself with the shared preview secret.
 */
async function canReadDraft(req: NextRequest): Promise<boolean> {
  if (isValidPreviewSecret(req.headers.get('x-preview-secret'))) return true;
  return (await getSessionUser()) !== null;
}

/**
 * GET /api/content/:section          → the published copy (what the live site reads)
 * GET /api/content/:section?state=draft → the working copy (authenticated only)
 *
 * The `{ data }` envelope is identical for both so the public site can switch
 * between them without changing how it parses the response.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  const { section } = await params;
  const headers = corsHeaders(req);
  const wantsDraft = req.nextUrl.searchParams.get('state') === 'draft';

  if (wantsDraft && !(await canReadDraft(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
  }

  const db = await getDb();
  const state = await readContent(db, section);

  return NextResponse.json(
    {
      section,
      data: wantsDraft ? state.draft : state.published,
      state: wantsDraft ? 'draft' : 'published',
      updatedAt: wantsDraft ? state.draftUpdatedAt : state.publishedAt,
      updatedBy: wantsDraft ? state.draftUpdatedBy : state.publishedBy,
      hasUnpublishedChanges: state.hasUnpublishedChanges,
      publishedAt: state.publishedAt,
      neverPublished: state.neverPublished,
    },
    { headers }
  );
}

/**
 * Saves the draft. Deliberately does NOT touch the published copy or ping the
 * client's cache — a save is private until someone publishes it, which is the
 * whole point of the draft/publish split.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  const { section } = await params;
  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  const db = await getDb();
  const body = await req.json();
  const now = new Date().toISOString();

  await db.collection<ContentDoc>('content').updateOne(
    { section },
    { $set: { section, draft: body, draftUpdatedAt: now, draftUpdatedBy: auth.user.uid } },
    { upsert: true }
  );

  const state = await readContent(db, section);

  await recordAudit({ actor: auth.user, action: 'content.save', target: section });

  return NextResponse.json({
    ok: true,
    state: 'draft',
    updatedAt: now,
    hasUnpublishedChanges: state.hasUnpublishedChanges,
  });
}
