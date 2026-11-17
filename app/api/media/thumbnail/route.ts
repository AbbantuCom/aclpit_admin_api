import { NextRequest, NextResponse } from 'next/server';
import { requireRole, authError } from '@/lib/session';
import { CONTENT_ROLES } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * GET /api/media/thumbnail?key=documents/…/file.pdf&v=<lastModified>
 *
 * A picture of the first page of a stored PDF, for the Media Library grid. `v`
 * is only there to make the URL change when the file does, so the long browser
 * cache below can never show an outdated page.
 */
export async function GET(req: NextRequest) {
  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  const key = req.nextUrl.searchParams.get('key')?.trim() ?? '';
  // Same rule as the media delete route: nothing outside the listed bucket keys.
  if (!key || key.startsWith('/') || key.split('/').includes('..') || !/\.pdf$/i.test(key)) {
    return NextResponse.json({ error: 'A valid PDF key is required' }, { status: 400 });
  }

  const { createPdfThumbnail } = await import('@/lib/pdf-cover');
  try {
    const image = await createPdfThumbnail(key);
    return new NextResponse(new Uint8Array(image), {
      headers: {
        'Content-Type': 'image/webp',
        // Private: it sits behind a login. A week: the URL changes with the file.
        'Cache-Control': 'private, max-age=604800',
      },
    });
  } catch (err) {
    console.warn(`PDF thumbnail for "${key}" failed:`, err);
    return NextResponse.json({ error: 'Could not render this PDF' }, { status: 422 });
  }
}
