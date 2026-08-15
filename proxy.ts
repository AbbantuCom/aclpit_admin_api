import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE = 'aclpit_session';

// Kept in sync with types/index.ts USER_MANAGEMENT_ROLES. Duplicated as a plain
// literal because this file runs in the Edge runtime, where importing the wider
// types module (which pulls in server-only code paths) is best avoided.
const USER_MANAGEMENT_ROLES = ['super_admin', 'admin'];

function getSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.SESSION_SECRET || '');
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/admin')) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return redirectToAuth(req);

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const role = typeof payload.role === 'string' ? payload.role : '';

    // Staff have no business on the Users or Activity Log screens — bounce them to
    // the dashboard rather than letting them load a page whose API calls would 403.
    const restricted = pathname.startsWith('/admin/users') || pathname.startsWith('/admin/audit');
    if (restricted && !USER_MANAGEMENT_ROLES.includes(role)) {
      return NextResponse.redirect(new URL('/admin', req.url));
    }

    return NextResponse.next();
  } catch {
    return redirectToAuth(req);
  }
}

function redirectToAuth(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/auth', req.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

export const config = {
  matcher: ['/admin/:path*'],
};
