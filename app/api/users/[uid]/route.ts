import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getDb } from '@/lib/mongodb';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params;
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    const db = await getDb();
    const requestUser = await db.collection('users').findOne({ uid: decoded.uid });

    if (!requestUser || requestUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can remove admins' }, { status: 403 });
    }

    if (uid === decoded.uid) {
      return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 });
    }

    await db.collection('users').deleteOne({ uid });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
