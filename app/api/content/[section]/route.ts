import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getDb } from '@/lib/mongodb';

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  const { section } = await params;
  const db = await getDb();
  const doc = await db.collection('content').findOne({ section });
  if (!doc) return NextResponse.json({ data: null });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, ...rest } = doc;
  return NextResponse.json(rest);
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

  return NextResponse.json({ ok: true, updatedAt: now });
}
