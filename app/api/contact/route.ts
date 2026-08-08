import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getDb } from '@/lib/mongodb';
import { corsHeaders, corsPreflight } from '@/lib/cors';

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

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req);
  const body = await req.json();
  const { name, email, subject, message } = body;

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400, headers });
  }

  const db = await getDb();
  await db.collection('contactSubmissions').insertOne({
    name,
    email,
    subject,
    message,
    createdAt: new Date().toISOString(),
    read: false,
    contacted: false,
  });

  return NextResponse.json({ ok: true }, { headers });
}

export async function GET(req: NextRequest) {
  const requestUser = await getRequestUser(req);
  if (!requestUser || !['super_admin', 'admin'].includes(requestUser.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = await getDb();
  const submissions = await db
    .collection('contactSubmissions')
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({
    submissions: submissions.map(({ _id, ...s }) => ({ _id: _id.toString(), ...s })),
  });
}

export async function PATCH(req: NextRequest) {
  const requestUser = await getRequestUser(req);
  if (!requestUser || !['super_admin', 'admin'].includes(requestUser.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = await getDb();
  await db.collection('contactSubmissions').updateMany({ read: false }, { $set: { read: true } });

  return NextResponse.json({ ok: true });
}
