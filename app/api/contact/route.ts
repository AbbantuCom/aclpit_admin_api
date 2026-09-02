import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { corsHeaders, corsPreflight } from '@/lib/cors';
import { requireRole, authError } from '@/lib/session';
import { recordAudit } from '@/lib/audit';
import { asBoundedString, isValidEmail, normalizeEmail } from '@/lib/validation';
import { CONTENT_ROLES } from '@/types';

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

/**
 * The one endpoint anyone on the internet can post to, so every field is checked
 * for type and length before it goes anywhere near the database.
 *
 * The type check matters most: without it a JSON body can carry an object where a
 * string belongs, which would be stored as a document shaped unlike every other
 * submission and rendered back into the admin inbox.
 */
const FIELD_LIMITS = { name: 120, email: 254, subject: 200, message: 5000 } as const;

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req);
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400, headers });
  }

  const name = asBoundedString(body.name, FIELD_LIMITS.name);
  const rawEmail = asBoundedString(body.email, FIELD_LIMITS.email);
  const subject = asBoundedString(body.subject, FIELD_LIMITS.subject);
  const message = asBoundedString(body.message, FIELD_LIMITS.message);

  if (!name || !rawEmail || !subject || !message) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400, headers });
  }

  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400, headers });
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
  const result = await db
    .collection('contactSubmissions')
    .updateMany({ read: false }, { $set: { read: true } });

  if (result.modifiedCount > 0) {
    await recordAudit({
      actor: auth.user,
      action: 'message.read_all',
      target: `${result.modifiedCount} message${result.modifiedCount === 1 ? '' : 's'}`,
    });
  }

  return NextResponse.json({ ok: true });
}
