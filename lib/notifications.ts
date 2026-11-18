import type { Db } from 'mongodb';
import { isValidEmail, normalizeEmail } from '@/lib/validation';

/**
 * Who gets emailed when a visitor sends a message through the website's
 * contact form.
 *
 * Kept in its own collection, deliberately *not* in `content`: everything in
 * `content` can be read by anyone through GET /api/content/:section, and staff
 * email addresses must not be published.
 */
const COLLECTION = 'notificationSettings';
const CONTACT_DOC_ID = 'contactMessages';

/** Enough for a team inbox plus a few people; keeps one email's recipient list sane. */
export const MAX_NOTIFICATION_RECIPIENTS = 10;

interface NotificationDoc {
  _id: string;
  recipients: string[];
  updatedAt: string;
  updatedBy: string;
}

export async function getContactRecipients(db: Db): Promise<string[]> {
  const doc = await db.collection<NotificationDoc>(COLLECTION).findOne({ _id: CONTACT_DOC_ID });
  return Array.isArray(doc?.recipients) ? doc.recipients : [];
}

export async function setContactRecipients(db: Db, recipients: string[], uid: string): Promise<void> {
  await db.collection<NotificationDoc>(COLLECTION).updateOne(
    { _id: CONTACT_DOC_ID },
    { $set: { recipients, updatedAt: new Date().toISOString(), updatedBy: uid } },
    { upsert: true }
  );
}

/**
 * Validates and tidies a submitted list: lower-cased, trimmed, duplicates
 * dropped. Returns an error message naming the first bad address instead of
 * silently skipping it, so a typo is noticed rather than never notified.
 */
export function parseRecipients(value: unknown): { recipients: string[] } | { error: string } {
  if (!Array.isArray(value)) return { error: 'recipients must be a list of email addresses' };

  const recipients: string[] = [];
  for (const raw of value) {
    if (typeof raw !== 'string') return { error: 'recipients must be a list of email addresses' };
    const email = normalizeEmail(raw);
    if (!email) continue;
    if (email.length > 254 || !isValidEmail(email)) return { error: `"${raw.trim()}" is not a valid email address.` };
    if (!recipients.includes(email)) recipients.push(email);
  }

  if (recipients.length > MAX_NOTIFICATION_RECIPIENTS) {
    return { error: `You can add up to ${MAX_NOTIFICATION_RECIPIENTS} email addresses.` };
  }
  return { recipients };
}
