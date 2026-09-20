import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireRole, authError } from '@/lib/session';
import { recordAudit } from '@/lib/audit';
import { CONTENT_ROLES } from '@/types';

// `new ObjectId(...)` throws on anything that is not 24 hex characters, which
// would surface as a 500 on a request that is simply malformed.
const badId = () => NextResponse.json({ error: 'Invalid message id' }, { status: 400 });


export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);
  if (!ObjectId.isValid(id)) return badId();

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const update: Record<string, boolean> = {};
  if ('read' in body) update.read = !!body.read;
  if ('contacted' in body) update.contacted = !!body.contacted;

  const db = await getDb();
  await db.collection('contactSubmissions').updateOne(
    { _id: new ObjectId(id) },
    { $set: update }
  );

  await recordAudit({ actor: auth.user, action: 'message.update', target: id, details: update });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);
  if (!ObjectId.isValid(id)) return badId();

  const db = await getDb();
  // Deleted-and-returned in one step so the audit entry can name whose message it
  // was — after the delete there is nothing left to look up.
  const removed = await db
    .collection('contactSubmissions')
    .findOneAndDelete({ _id: new ObjectId(id) });

  await recordAudit({
    actor: auth.user,
    action: 'message.delete',
    target: id,
    details: removed ? { from: removed.email, subject: removed.subject } : undefined,
  });

  return NextResponse.json({ ok: true });
}
