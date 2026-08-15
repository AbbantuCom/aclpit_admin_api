import { NextRequest, NextResponse } from 'next/server';
import { requireRole, authError } from '@/lib/session';
import { isContentSection } from '@/lib/content';
import { buildAdminPreviewPath } from '@/lib/preview';
import { CONTENT_ROLES } from '@/types';

/**
 * GET /api/content/:section/preview-link
 *
 * Where Preview should send the editor: a screen inside the admin panel that frames
 * the public site rendering this section's draft. The signed token that unlocks the
 * draft is minted by that screen, not here, so its 15-minute life starts when the
 * frame actually loads.
 *
 * `url: null` means previewing isn't configured on this deployment (no CLIENT_URL
 * or no PREVIEW_SECRET); the admin UI hides the button rather than erroring.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  const { section } = await params;
  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  if (!isContentSection(section)) {
    return NextResponse.json({ error: `Unknown content section "${section}"` }, { status: 404 });
  }

  return NextResponse.json({ url: buildAdminPreviewPath(section) });
}
