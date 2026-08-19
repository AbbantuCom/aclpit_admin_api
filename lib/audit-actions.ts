import type { UserRole } from '@/types';

/**
 * The action catalogue and record shape, kept free of any server import.
 *
 * lib/audit.ts — which does the reading and writing — pulls in `mongodb` and
 * `next/headers`, neither of which can be bundled for the browser. The log screen
 * needs the labels, so they live here where both sides can reach them.
 */
export const AUDIT_ACTIONS = {
  'content.save': 'Saved draft',
  'content.publish': 'Published section',
  'content.publish_all': 'Published all pending sections',
  'content.discard': 'Discarded draft',
  'content.seed': 'Seeded default content',
  'media.upload': 'Uploaded media',
  'media.delete': 'Deleted media',
  'document.upload': 'Uploaded document',
  'message.update': 'Updated message',
  'message.read_all': 'Marked all messages read',
  'message.delete': 'Deleted message',
  'user.invite': 'Invited user',
  'user.invite_revoke': 'Revoked invitation',
  'user.delete': 'Removed user',
  'user.deactivate': 'Deactivated account',
  'user.reactivate': 'Reactivated account',
  'user.transfer_ownership': 'Transferred super admin role',
  'auth.login': 'Signed in',
  'auth.login_failed': 'Failed sign-in attempt',
  'auth.logout': 'Signed out',
  'auth.password_reset': 'Reset password',
  'auth.invite_accepted': 'Accepted invitation',
  'auth.super_admin_created': 'Created super admin account',
  // Recorded after the rows are gone, so a purge always leaves its own trace.
  'audit.purge': 'Deleted audit entries',
} as const;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

/** A row in the `auditLog` collection. Append-only — nothing ever updates one. */
export interface AuditEntry {
  at: string;
  /** null for actions taken without a session (failed sign-in, seeding). */
  actorUid: string | null;
  /**
   * The actor's name, email and role *as they were at the time*. Copied rather
   * than joined to the users collection so the record still reads correctly after
   * someone is renamed, demoted or removed.
   */
  actorName: string;
  actorEmail: string;
  actorRole: UserRole | null;
  action: AuditAction;
  /** What was acted on: a section name, an email address, a file key. */
  target: string | null;
  /** Small extras worth keeping, e.g. which sections a publish-all covered. */
  details: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
}

export type AuditEntryWithId = AuditEntry & { _id: string };
