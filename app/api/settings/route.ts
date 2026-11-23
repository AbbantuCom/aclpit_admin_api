import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireRole, authError } from '@/lib/session';
import { readContent, type ContentDoc } from '@/lib/content';
import { notifyClientRevalidate } from '@/lib/revalidate';
import { recordAudit } from '@/lib/audit';
import { SETTINGS_SECTION, SETTING_KEYS, withDefaults } from '@/lib/settings';
import { CONTENT_ROLES, type SiteSettings } from '@/types';

/** GET /api/settings → the current switches, with defaults filled in. */
export async function GET() {
  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  const db = await getDb();
  const state = await readContent(db, SETTINGS_SECTION);
  return NextResponse.json({ settings: withDefaults(state.published) });
}

/**
 * PUT /api/settings  { publicationsEnabled?: boolean, dialoguesEnabled?: boolean }
 *
 * Flips site-wide switches. Unlike content sections there is no draft: a switch
 * is the publish action, so it writes draft and published together and pings the
 * public site's cache straight away. The public site reads the result through
 * GET /api/content/settings, the same endpoint as every other section.
 */
export async function PUT(req: NextRequest) {
  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  const body = await req.json().catch(() => null);
  const changes: Partial<SiteSettings> = {};
  if (body && typeof body === 'object') {
    for (const key of SETTING_KEYS) {
      if (typeof body[key] === 'boolean') changes[key] = body[key];
    }
  }
  if (Object.keys(changes).length === 0) {
    return NextResponse.json(
      { error: `At least one of ${SETTING_KEYS.join(', ')} (boolean) is required` },
      { status: 400 }
    );
  }

  const db = await getDb();
  const current = withDefaults((await readContent(db, SETTINGS_SECTION)).published);
  const next: SiteSettings = { ...current, ...changes };
  const now = new Date().toISOString();

  await db.collection<ContentDoc>('content').updateOne(
    { section: SETTINGS_SECTION },
    {
      $set: {
        section: SETTINGS_SECTION,
        draft: next,
        published: next,
        draftUpdatedAt: now,
        draftUpdatedBy: auth.user.uid,
        publishedAt: now,
        publishedBy: auth.user.uid,
      },
    },
    { upsert: true }
  );

  await notifyClientRevalidate(SETTINGS_SECTION);
  await recordAudit({
    actor: auth.user,
    action: 'settings.update',
    target: Object.keys(changes)
      .map((k) => k.replace(/Enabled$/, ''))
      .join(', '),
    details: changes,
  });

  return NextResponse.json({ ok: true, settings: next });
}
