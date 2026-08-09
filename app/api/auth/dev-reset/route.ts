import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

// Development-only endpoint to wipe the users + invitations collections
// so the super admin self-registration flow can run again.
// Protected by RESET_SECRET env var — never expose this in production.

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const secret = process.env.RESET_SECRET;
  const { secret: provided } = await req.json().catch(() => ({ secret: '' }));

  if (secret && provided !== secret) {
    return NextResponse.json({ error: 'Wrong secret' }, { status: 403 });
  }

  const db = await getDb();
  const usersDeleted = await db.collection('users').deleteMany({});
  const invitesDeleted = await db.collection('invitations').deleteMany({});
  const tokensDeleted = await db.collection('passwordResetTokens').deleteMany({});

  return NextResponse.json({
    ok: true,
    usersDeleted: usersDeleted.deletedCount,
    invitesDeleted: invitesDeleted.deletedCount,
    resetTokensDeleted: tokensDeleted.deletedCount,
    message: 'Collections cleared. Visit /auth to register as Super Admin.',
  });
}
