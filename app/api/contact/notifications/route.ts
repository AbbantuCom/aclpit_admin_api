import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireRole, authError } from '@/lib/session';
import { recordAudit } from '@/lib/audit';
import { isEmailConfigured } from '@/lib/email';
import {
  getContactRecipients,
  setContactRecipients,
  parseRecipients,
  MAX_NOTIFICATION_RECIPIENTS,
} from '@/lib/notifications';
import { CONTENT_ROLES, USER_MANAGEMENT_ROLES } from '@/types';

/**
 * GET /api/contact/notifications
 *
 * Who is emailed about new contact-form messages. Everyone who can read the
 * messages can see the list; only admins can change it (see PUT), because it
 * decides where visitors' messages are sent outside the platform.
 */
export async function GET() {
  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  const db = await getDb();
  return NextResponse.json({
    recipients: await getContactRecipients(db),
    canEdit: USER_MANAGEMENT_ROLES.includes(auth.user.role),
    emailConfigured: isEmailConfigured(),
    maxRecipients: MAX_NOTIFICATION_RECIPIENTS,
  });
}

/** PUT /api/contact/notifications  { recipients: string[] } — replaces the list. */
export async function PUT(req: NextRequest) {
  const auth = await requireRole(USER_MANAGEMENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  const body = await req.json().catch(() => null);
  const parsed = parseRecipients(body?.recipients);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const db = await getDb();
  await setContactRecipients(db, parsed.recipients, auth.user.uid);
  await recordAudit({
    actor: auth.user,
    action: 'settings.update',
    target: 'message notifications',
    details: { recipients: parsed.recipients },
  });

  return NextResponse.json({ ok: true, recipients: parsed.recipients });
}
