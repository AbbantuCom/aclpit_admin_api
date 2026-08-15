import { NextResponse } from 'next/server';
import { clearSessionCookie, getSessionUser } from '@/lib/session';
import { recordAudit } from '@/lib/audit';

export async function POST() {
  // Read the session before clearing it — afterwards there is no one to attribute
  // the entry to. A logout with no valid session is a no-op worth no record.
  const user = await getSessionUser();
  if (user) await recordAudit({ actor: user, action: 'auth.logout' });

  return clearSessionCookie(NextResponse.json({ ok: true }));
}
