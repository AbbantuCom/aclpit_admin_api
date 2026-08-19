import { NextRequest, NextResponse } from 'next/server';

/**
 * Origins allowed to call the public endpoints cross-origin, from CLIENT_ORIGIN.
 *
 * Trailing slashes are stripped because an Origin header never has one: a value
 * of "https://aclpit.com/" would silently match nothing, and the failure surfaces
 * only as a CORS error in someone's browser.
 */
function getAllowedOrigins(): string[] {
  return (process.env.CLIENT_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

export function corsHeaders(req: NextRequest): HeadersInit {
  const origin = req.headers.get('origin');
  const allowed = getAllowedOrigins();
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  if (origin && allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }
  return headers;
}

export function corsPreflight(req: NextRequest): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}
