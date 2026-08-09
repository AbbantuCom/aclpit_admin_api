import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { corsHeaders, corsPreflight } from '@/lib/cors';
import { requireRole, authError } from '@/lib/session';
import { CONTENT_ROLES } from '@/types';

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

export async function GET() {
  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

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

export async function PATCH() {
  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  const db = await getDb();
  await db.collection('contactSubmissions').updateMany({ read: false }, { $set: { read: true } });

  return NextResponse.json({ ok: true });
}
