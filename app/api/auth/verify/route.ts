import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getDb } from '@/lib/mongodb';
import { SignJWT } from 'jose';
import type { AdminUser } from '@/types';

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'fallback-secret-change-in-production'
);

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 400 });

    const decoded = await adminAuth.verifyIdToken(token);
    const db = await getDb();

    let user = await db.collection<AdminUser>('users').findOne({ uid: decoded.uid });

    if (!user) {
      const userCount = await db.collection('users').countDocuments();

      if (userCount === 0) {
        // No users exist yet — this is the bootstrap sign-in, auto-create super admin
        const newUser: AdminUser = {
          uid: decoded.uid,
          email: decoded.email!,
          displayName: decoded.name || decoded.email!,
          photoURL: decoded.picture,
          role: 'super_admin',
          createdAt: new Date().toISOString(),
          status: 'active',
        };
        await db.collection('users').insertOne(newUser);
      } else {
        // Users already exist — require an invitation
        const invite = await db.collection('invitations').findOne({
          email: decoded.email,
          status: 'pending',
        });

        if (!invite) {
          return NextResponse.json(
            { error: 'Access denied. You need an invitation from an existing admin.' },
            { status: 403 }
          );
        }

        // Check invitation hasn't expired
        if (new Date(invite.expiresAt as string) < new Date()) {
          await db.collection('invitations').updateOne(
            { _id: invite._id },
            { $set: { status: 'expired' } }
          );
          return NextResponse.json(
            { error: 'Your invitation has expired. Ask an admin to send a new one.' },
            { status: 403 }
          );
        }

        const newUser: AdminUser = {
          uid: decoded.uid,
          email: decoded.email!,
          displayName: decoded.name || decoded.email!,
          photoURL: decoded.picture,
          role: 'admin',
          invitedBy: invite.invitedBy as string,
          createdAt: new Date().toISOString(),
          status: 'active',
        };
        await db.collection('users').insertOne(newUser);
        await db.collection('invitations').updateOne(
          { _id: invite._id },
          { $set: { status: 'accepted' } }
        );
      }

      user = await db.collection<AdminUser>('users').findOne({ uid: decoded.uid });
    }

    if (!user || user.status !== 'active') {
      return NextResponse.json({ error: 'Account is not active.' }, { status: 403 });
    }

    const sessionToken = await new SignJWT({ uid: user.uid, role: user.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(secret);

    const response = NextResponse.json({ user });
    response.cookies.set('agriverde_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Auth verify error:', err);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('agriverde_session');
  return response;
}
