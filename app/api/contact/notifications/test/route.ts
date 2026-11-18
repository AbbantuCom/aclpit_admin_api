import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireRole, authError } from '@/lib/session';
import { sendNotificationTestEmail, isEmailConfigured } from '@/lib/email';
import { getContactRecipients } from '@/lib/notifications';
import { USER_MANAGEMENT_ROLES } from '@/types';

/**
 * POST /api/contact/notifications/test
 *
 * Sends a test email to the saved recipients, so an admin can confirm the
 * addresses are right and the mail provider works before a real message
 * depends on it.
 */
export async function POST() {
  const auth = await requireRole(USER_MANAGEMENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  const db = await getDb();
  const recipients = await getContactRecipients(db);
  if (recipients.length === 0) {
    return NextResponse.json({ error: 'Add at least one email address first.' }, { status: 400 });
  }

  const result = await sendNotificationTestEmail({ to: recipients, requestedBy: auth.user.displayName });
  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'The test email could not be sent.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, sentTo: recipients, delivered: isEmailConfigured() });
}
