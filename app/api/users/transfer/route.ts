import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getDb } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    const db = await getDb();
    const requestUser = await db.collection('users').findOne({ uid: decoded.uid });

    if (!requestUser || requestUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only the super admin can transfer this role' }, { status: 403 });
    }

    const { targetUid } = await req.json();
    if (!targetUid) {
      return NextResponse.json({ error: 'targetUid is required' }, { status: 400 });
    }

    if (targetUid === decoded.uid) {
      return NextResponse.json({ error: 'You are already the super admin' }, { status: 400 });
    }

    const targetUser = await db.collection('users').findOne({ uid: targetUid });
    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Transfer: demote current super_admin, promote target to super_admin
    await db.collection('users').updateOne({ uid: decoded.uid }, { $set: { role: 'admin' } });
    await db.collection('users').updateOne({ uid: targetUid }, { $set: { role: 'super_admin' } });

    return NextResponse.json({ ok: true, message: `Super admin role transferred to ${targetUser.email}` });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
