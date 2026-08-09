import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import type { AdminUser, PublicAdminUser, SessionPayload, UserRole } from '@/types';

export const SESSION_COOKIE = 'aclpit_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET environment variable is not set');
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ uid: payload.uid, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

/** Attaches the session cookie to a response. */
export function setSessionCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  });
  return res;
}

export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

/** Verifies a raw session token. Returns null when missing/expired/tampered. */
export async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.uid !== 'string' || typeof payload.role !== 'string') return null;
    return { uid: payload.uid, role: payload.role as UserRole };
  } catch {
    return null;
  }
}

/**
 * Resolves the signed-in user from the request's session cookie, re-reading the
 * database every time so role changes and removals take effect immediately
 * rather than waiting for the 7-day token to expire.
 *
 * Returns null if there is no valid session, the user no longer exists, or the
 * account is not active.
 */
export async function getSessionUser(): Promise<PublicAdminUser | null> {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) return null;

  const db = await getDb();
  const user = await db.collection<AdminUser>('users').findOne({ uid: session.uid });
  if (!user || user.status !== 'active') return null;

  return toPublicUser(user);
}

/** Strips credential fields before a user object crosses the network. */
export function toPublicUser(user: AdminUser): PublicAdminUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safe } = user;
  // Mongo documents carry an _id that isn't part of AdminUser — drop it too.
  const { _id, ...rest } = safe as PublicAdminUser & { _id?: unknown };
  void _id;
  return rest;
}

export interface AuthFailure {
  error: string;
  status: number;
}

/**
 * Guard for API routes: resolves the current user and checks their role.
 * Returns either { user } or { failure } — never throws — so routes can do:
 *
 *   const auth = await requireRole(CONTENT_ROLES);
 *   if ('failure' in auth) return authError(auth.failure);
 */
export async function requireRole(
  allowed: readonly UserRole[]
): Promise<{ user: PublicAdminUser } | { failure: AuthFailure }> {
  const user = await getSessionUser();
  if (!user) return { failure: { error: 'Unauthorized', status: 401 } };
  if (!allowed.includes(user.role)) return { failure: { error: 'Forbidden', status: 403 } };
  return { user };
}

export function authError(failure: AuthFailure): NextResponse {
  return NextResponse.json({ error: failure.error }, { status: failure.status });
}
