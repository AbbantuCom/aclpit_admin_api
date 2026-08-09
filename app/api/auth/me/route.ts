import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';

/** Who am I? Used by the client auth context to hydrate on load. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}
