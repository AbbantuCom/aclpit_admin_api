import { NextRequest, NextResponse } from 'next/server';
import { requireRole, authError } from '@/lib/session';
import { isContentSection } from '@/lib/content';
import { buildPreviewUrl } from '@/lib/preview';
import { CONTENT_ROLES } from '@/types';

/**
 * GET /api/content/:section/preview-link
 *
 * Mints a short-lived, signed URL that opens the public site with draft content.
 * Generated per click rather than embedded in the page so the token's 15-minute
 * lifetime starts when the editor actually asks for it.
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

  return NextResponse.json({ url: buildPreviewUrl(section) });
}
