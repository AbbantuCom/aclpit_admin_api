import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getDb } from '@/lib/mongodb';

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

export async function GET(req: NextRequest) {
  const requestUser = await getRequestUser(req);
  if (!requestUser || !['super_admin', 'admin'].includes(requestUser.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = await getDb();
  const users = await db.collection('users').find({}).toArray();
  const invitations = await db.collection('invitations').find({ status: 'pending' }).toArray();

  return NextResponse.json({
    users: users.map(({ _id, ...u }) => u),
    invitations: invitations.map(({ _id, ...i }) => ({ ...i, _id: _id.toString() })),
  });
}
