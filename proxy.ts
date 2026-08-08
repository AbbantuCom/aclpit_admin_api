import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'fallback-secret-change-in-production'
);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/admin')) return NextResponse.next();

  const token = req.cookies.get('agriverde_session')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/auth', req.url));
  }

  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(new URL('/auth', req.url));
    res.cookies.delete('agriverde_session');
    return res;
  }
}

export const config = {
  matcher: ['/admin/:path*'],
};
