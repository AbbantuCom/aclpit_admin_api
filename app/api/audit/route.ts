import { NextRequest, NextResponse } from 'next/server';
import { requireRole, authError } from '@/lib/session';
import {
  listAudit,
  listAuditActors,
  deleteAuditByIds,
  deleteAuditByFilter,
  recordAudit,
} from '@/lib/audit';
import { AUDIT_ACTIONS } from '@/lib/audit-actions';
import { USER_MANAGEMENT_ROLES } from '@/types';

/**
 * GET /api/audit?page=1&limit=50&actorUid=…&action=…
 *
 * Restricted to the roles that can already manage people. Staff can see their own
 * work in the editors; they have no business reading everyone else's activity,
 * their colleagues' IP addresses, or failed sign-in attempts.
 */
export async function GET(req: NextRequest) {
  const auth = await requireRole(USER_MANAGEMENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  const params = req.nextUrl.searchParams;
  const page = Number(params.get('page')) || 1;
  const limit = Number(params.get('limit')) || 50;

  const [result, actors] = await Promise.all([
    listAudit({
      page,
      limit,
      actorUid: params.get('actorUid') || undefined,
      action: params.get('action') || undefined,
    }),
    listAuditActors(),
  ]);

  return NextResponse.json({ ...result, actors });
}

/**
 * DELETE /api/audit
 *
 * Body is either `{ ids: [...] }` for a hand-picked set, or
 * `{ all: true, actorUid?, action? }` to remove everything matching the filter the
 * screen is showing — with no filter, that is the entire log.
 *
 * Super admin only: admins can read the log but must not be able to erase the
 * record of their own actions. The purge is itself recorded afterwards, so the
 * deletion survives as an entry naming who did it and how many rows went.
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireRole(['super_admin']);
  if ('failure' in auth) {
    return authError(
      auth.failure.status === 403
        ? { error: 'Only the super admin can delete activity entries.', status: 403 }
        : auth.failure
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const actorUid = typeof body.actorUid === 'string' ? body.actorUid : undefined;
  const action = typeof body.action === 'string' ? body.action : undefined;

  let deletedCount: number;
  let scope: Record<string, unknown>;

  if (body.all === true) {
    deletedCount = await deleteAuditByFilter({ actorUid, action });
    scope = {
      scope: 'all matching filter',
      person: actorUid ?? 'everyone',
      action: action ? AUDIT_ACTIONS[action as keyof typeof AUDIT_ACTIONS] ?? action : 'all actions',
    };
  } else if (Array.isArray(body.ids)) {
    const ids = body.ids.filter((id: unknown): id is string => typeof id === 'string');
    if (ids.length === 0) {
      return NextResponse.json({ error: 'No entries selected' }, { status: 400 });
    }
    deletedCount = await deleteAuditByIds(ids);
    scope = { scope: 'selected entries', requested: ids.length };
  } else {
    return NextResponse.json(
      { error: 'Provide either ids: [...] or all: true' },
      { status: 400 }
    );
  }

  // Written after the delete so the purge cannot remove its own record.
  if (deletedCount > 0) {
    await recordAudit({
      actor: auth.user,
      action: 'audit.purge',
      target: `${deletedCount} entr${deletedCount === 1 ? 'y' : 'ies'}`,
      details: scope,
    });
  }

  return NextResponse.json({ ok: true, deletedCount });
}
