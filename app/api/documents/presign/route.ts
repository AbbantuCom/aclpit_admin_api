import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUploadUrl, publicUrlFor } from '@/lib/r2';
import { requireRole, authError } from '@/lib/session';
import { recordAudit } from '@/lib/audit';
import { CONTENT_ROLES } from '@/types';

// Presigns a direct PUT to the document's final public key. Unlike the image/video
// upload flow, PDFs need no server-side processing step, so there's no raw/ staging
// key and no separate /process call.
export async function POST(req: NextRequest) {
  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  const { filename, contentType, folder } = await req.json();

  if (!filename || !contentType || !folder) {
    return NextResponse.json({ error: 'filename, contentType and folder are required' }, { status: 400 });
  }
  if (contentType !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF uploads are allowed' }, { status: 400 });
  }

  const safeName = String(filename).replace(/[^a-z0-9.]/gi, '_');
  const key = `documents/${folder}/${Date.now()}-${safeName}`;
  const uploadUrl = await getPresignedUploadUrl(key, contentType);

  // Logged here because the browser PUTs straight to R2 afterwards and never
  // reports back — so this records who was handed the key, not a completed upload.
  await recordAudit({
    actor: auth.user,
    action: 'document.upload',
    target: key,
    details: { folder, filename: String(filename) },
  });

  return NextResponse.json({ uploadUrl, url: publicUrlFor(key) });
}
