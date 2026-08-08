import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getDb } from '@/lib/mongodb';
import { getPresignedUploadUrl, publicUrlFor } from '@/lib/r2';

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

// Presigns a direct PUT to the document's final public key. Unlike the image/video
// upload flow, PDFs need no server-side processing step, so there's no raw/ staging
// key and no separate /process call.
export async function POST(req: NextRequest) {
  const requestUser = await getRequestUser(req);
  if (!requestUser || !['super_admin', 'admin'].includes(requestUser.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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

  return NextResponse.json({ uploadUrl, url: publicUrlFor(key) });
}
