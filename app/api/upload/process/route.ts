import { NextRequest, NextResponse } from 'next/server';
import { getObjectBuffer, putObjectBuffer, deleteObject, publicUrlFor } from '@/lib/r2';
import { requireRole, authError } from '@/lib/session';
import { CONTENT_ROLES } from '@/types';
import { recordAudit } from '@/lib/audit';

export const runtime = 'nodejs';
// Video transcoding is CPU-bound — raise the function timeout above the Next.js
// default. Clamped by your hosting plan's serverless function duration limit.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  const body = await req.json().catch(() => null);
  const key = typeof body?.key === 'string' ? body.key : '';
  const type = typeof body?.type === 'string' ? body.type : '';
  const folder = typeof body?.folder === 'string' ? body.folder : '';

  if (!key || !type || !folder) {
    return NextResponse.json({ error: 'key, type and folder are required' }, { status: 400 });
  }
  if (type !== 'image' && type !== 'video') {
    return NextResponse.json({ error: 'type must be "image" or "video"' }, { status: 400 });
  }

  try {
    const raw = await getObjectBuffer(key);

    // Imported here rather than at the top of the file so that a picture upload
    // never loads the video toolchain. ffmpeg's installer throws on import when
    // its binary is not present in the deployment, and at module scope that
    // failure would break this whole route — returning the platform's HTML error
    // page, which the browser then fails to parse as JSON.
    const { buffer, contentType, extension } =
      type === 'image'
        ? await (await import('@/lib/image-optimize')).optimizeImage(raw)
        : await (await import('@/lib/video-optimize')).optimizeVideo(raw);

    const finalKey = `${folder}/${Date.now()}.${extension}`;
    await putObjectBuffer(finalKey, buffer, contentType);
    await deleteObject(key);

    await recordAudit({
      actor: auth.user,
      action: 'media.upload',
      target: finalKey,
      details: { type, folder, bytes: buffer.length },
    });

    return NextResponse.json({ url: publicUrlFor(finalKey) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to process upload' },
      { status: 500 }
    );
  }
}
