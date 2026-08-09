import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUploadUrl } from '@/lib/r2';
import { requireRole, authError } from '@/lib/session';
import { CONTENT_ROLES } from '@/types';

export async function POST(req: NextRequest) {
  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  const { filename, contentType, folder } = await req.json();

  if (!filename || !contentType || !folder) {
    return NextResponse.json({ error: 'filename, contentType and folder are required' }, { status: 400 });
  }
  if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) {
    return NextResponse.json({ error: 'Only image and video uploads are allowed' }, { status: 400 });
  }

  const safeName = String(filename).replace(/[^a-z0-9.]/gi, '_');
  const key = `raw/${folder}/${Date.now()}-${safeName}`;
  const uploadUrl = await getPresignedUploadUrl(key, contentType);

  return NextResponse.json({ uploadUrl, key });
}
