import { NextRequest, NextResponse } from 'next/server';
import { requireRole, authError } from '@/lib/session';
import { putObjectBuffer, publicUrlFor } from '@/lib/r2';
import { recordAudit } from '@/lib/audit';
import { CONTENT_ROLES } from '@/types';

export const runtime = 'nodejs';
// Downloading a large PDF from a slow host and rendering it can take a while.
export const maxDuration = 60;

/**
 * POST /api/documents/cover  { pdfUrl, folder }
 *
 * Makes a cover image from the first page of a PDF — one uploaded here or any
 * public link (Google Drive and Dropbox share links included) — stores it in
 * the media bucket and returns its URL.
 */
export async function POST(req: NextRequest) {
  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  const body = await req.json().catch(() => null);
  const pdfUrl = typeof body?.pdfUrl === 'string' ? body.pdfUrl.trim() : '';
  const folder = typeof body?.folder === 'string' ? body.folder : '';

  if (!pdfUrl || !folder) {
    return NextResponse.json({ error: 'pdfUrl and folder are required' }, { status: 400 });
  }
  // Interpolated into the object key — keep it a plain name.
  if (!/^[a-z0-9_-]{1,40}$/i.test(folder)) {
    return NextResponse.json({ error: 'folder must be a simple name' }, { status: 400 });
  }

  // Imported lazily so the PDF renderer only loads when a cover is requested.
  const { createPdfCover, PdfCoverError } = await import('@/lib/pdf-cover');

  try {
    const { buffer, contentType, extension } = await createPdfCover(pdfUrl);
    const key = `${folder}/cover-${Date.now()}.${extension}`;
    await putObjectBuffer(key, buffer, contentType);

    await recordAudit({
      actor: auth.user,
      action: 'media.upload',
      target: key,
      details: { type: 'pdf-cover', source: pdfUrl, bytes: buffer.length },
    });

    return NextResponse.json({ url: publicUrlFor(key) });
  } catch (err) {
    const known = err instanceof PdfCoverError;
    if (!known) console.error('PDF cover generation failed:', err);
    return NextResponse.json(
      { error: known ? err.message : 'Could not create a cover from this PDF.' },
      { status: known ? 422 : 500 }
    );
  }
}
