import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getDb } from '@/lib/mongodb';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    const db = await getDb();
    const requestUser = await db.collection('users').findOne({ uid: decoded.uid });

    if (!requestUser || !['super_admin', 'admin'].includes(requestUser.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email } = await req.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    // Check if user already exists
    const existing = await db.collection('users').findOne({ email });
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    // Check for existing pending invite
    const existingInvite = await db.collection('invitations').findOne({ email, status: 'pending' });
    if (existingInvite) {
      return NextResponse.json({ error: 'An invitation for this email is already pending' }, { status: 409 });
    }

    const token = randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.collection('invitations').insertOne({
      email,
      token,
      invitedBy: decoded.uid,
      invitedByEmail: requestUser.email,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'pending',
    });

    const baseUrl = req.headers.get('origin') || '';
    const inviteLink = `${baseUrl}/auth?invite=${token}`;

    return NextResponse.json({ ok: true, inviteLink, token });
  } catch (err) {
    console.error('Invite error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    const db = await getDb();
    const requestUser = await db.collection('users').findOne({ uid: decoded.uid });

    if (!requestUser || requestUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can revoke invitations' }, { status: 403 });
    }

    const { token } = await req.json();
    await db.collection('invitations').deleteOne({ token });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
