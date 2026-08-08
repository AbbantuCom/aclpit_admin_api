import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getDb } from '@/lib/mongodb';
import { getObjectBuffer, putObjectBuffer, deleteObject, publicUrlFor } from '@/lib/r2';
import { optimizeImage } from '@/lib/image-optimize';
import { optimizeVideo } from '@/lib/video-optimize';

export const runtime = 'nodejs';
// Video transcoding is CPU-bound — raise the function timeout above the Next.js
// default. Clamped by your hosting plan's serverless function duration limit.
export const maxDuration = 60;

async function getRequestUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    const db = await getDb();
    return await db.collection('users').findOne({ uid: decoded.uid });
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const requestUser = await getRequestUser(req);
  if (!requestUser || !['super_admin', 'admin'].includes(requestUser.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { key, type, folder } = await req.json();
  if (!key || !type || !folder) {
    return NextResponse.json({ error: 'key, type and folder are required' }, { status: 400 });
  }
  if (type !== 'image' && type !== 'video') {
    return NextResponse.json({ error: 'type must be "image" or "video"' }, { status: 400 });
  }

  try {
    const raw = await getObjectBuffer(key);
    const { buffer, contentType, extension } = type === 'image'
      ? await optimizeImage(raw)
      : await optimizeVideo(raw);

    const finalKey = `${folder}/${Date.now()}.${extension}`;
    await putObjectBuffer(finalKey, buffer, contentType);
    await deleteObject(key);

    return NextResponse.json({ url: publicUrlFor(finalKey) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to process upload' },
      { status: 500 }
    );
  }
}
