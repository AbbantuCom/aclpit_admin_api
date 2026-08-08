import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getDb } from '@/lib/mongodb';
import { corsHeaders, corsPreflight } from '@/lib/cors';

async function verifyRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    return await adminAuth.verifyIdToken(token);
  } catch {
    return null;
  }
}

// Tells the public client site to drop its cache for this section. Best-effort:
// the admin save already succeeded and persisted, so a client that's unreachable
// (down, misconfigured CLIENT_URL, etc.) should never fail the save.
async function notifyClientRevalidate(section: string) {
  const clientUrl = process.env.CLIENT_URL;
  if (!clientUrl) return;

  try {
    const res = await fetch(`${clientUrl.replace(/\/$/, '')}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: process.env.REVALIDATE_SECRET, tag: section }),
    });
    if (!res.ok) {
      console.warn(`Revalidate request for "${section}" failed with status ${res.status}`);
    }
  } catch (err) {
    console.warn(`Revalidate request for "${section}" failed:`, err);
  }
}

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  const { section } = await params;
  const db = await getDb();
  const doc = await db.collection('content').findOne({ section });
  const headers = corsHeaders(req);
  if (!doc) return NextResponse.json({ data: null }, { headers });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, ...rest } = doc;
  return NextResponse.json(rest, { headers });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  const { section } = await params;
  const decoded = await verifyRequest(req);
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const user = await db.collection('users').findOne({ uid: decoded.uid });
  if (!user || user.status !== 'active') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const now = new Date().toISOString();

  await db.collection('content').updateOne(
    { section },
    { $set: { section, data: body, updatedAt: now, updatedBy: decoded.uid } },
    { upsert: true }
  );

  await notifyClientRevalidate(section);

  return NextResponse.json({ ok: true, updatedAt: now });
}
