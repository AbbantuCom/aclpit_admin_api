import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { corsHeaders, corsPreflight } from '@/lib/cors';
import { requireRole, authError } from '@/lib/session';
import { CONTENT_ROLES } from '@/types';

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
  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  const db = await getDb();
  const body = await req.json();
  const now = new Date().toISOString();

  await db.collection('content').updateOne(
    { section },
    { $set: { section, data: body, updatedAt: now, updatedBy: auth.user.uid } },
    { upsert: true }
  );

  await notifyClientRevalidate(section);

  return NextResponse.json({ ok: true, updatedAt: now });
}
