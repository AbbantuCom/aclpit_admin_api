import { headers } from 'next/headers';
import { ObjectId, type Collection } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import type { AuditAction, AuditEntry, AuditEntryWithId } from '@/lib/audit-actions';
import type { PublicAdminUser } from '@/types';

export type { AuditAction, AuditEntry, AuditEntryWithId };

let indexesReady: Promise<unknown> | null = null;

async function getAuditCollection(): Promise<Collection<AuditEntry>> {
  const db = await getDb();
  const collection = db.collection<AuditEntry>('auditLog');

  // Created once per process, on the same connection the write is about to use.
  // Without the `at` index the log screen's sort would scan the whole collection.
  if (!indexesReady) {
    indexesReady = collection
      .createIndexes([
        { key: { at: -1 } },
        { key: { actorUid: 1, at: -1 } },
        { key: { action: 1, at: -1 } },
      ])
      .catch((err) => {
        indexesReady = null;
        throw err;
      });
  }
  await indexesReady;

  return collection;
}

/** Caller's IP and user agent, read from the request Next is currently handling. */
async function requestOrigin(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const h = await headers();
    // x-forwarded-for is a chain; the client is the first entry.
    const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim();
    return {
      ip: forwarded || h.get('x-real-ip') || null,
      userAgent: h.get('user-agent') || null,
    };
  } catch {
    return { ip: null, userAgent: null };
  }
}

interface RecordParams {
  /** The signed-in user, or null when there is no session behind the action. */
  actor: PublicAdminUser | null;
  action: AuditAction;
  target?: string | null;
  details?: Record<string, unknown>;
  /** Identifies the actor when there is no session — e.g. an attempted username. */
  actorLabel?: string;
}

/**
 * Appends one entry to the audit log.
 *
 * Never throws: an audit failure must not turn a successful publish into a 500.
 * A dropped entry is logged to the server console so it is still discoverable.
 */
export async function recordAudit({
  actor,
  action,
  target = null,
  details,
  actorLabel,
}: RecordParams): Promise<void> {
  try {
    const collection = await getAuditCollection();
    const { ip, userAgent } = await requestOrigin();

    await collection.insertOne({
      at: new Date().toISOString(),
      actorUid: actor?.uid ?? null,
      actorName: actor?.displayName || actorLabel || 'Unknown',
      actorEmail: actor?.email || actorLabel || '',
      actorRole: actor?.role ?? null,
      action,
      target,
      details: details ?? null,
      ip,
      userAgent,
    });
  } catch (err) {
    console.warn(`[audit] failed to record "${action}":`, err);
  }
}

export interface AuditQuery {
  page?: number;
  limit?: number;
  actorUid?: string;
  action?: string;
}

export interface AuditPage {
  entries: AuditEntryWithId[];
  total: number;
  page: number;
  pages: number;
}

const MAX_LIMIT = 100;

/** One page of the log, newest first. */
export async function listAudit({
  page = 1,
  limit = 50,
  actorUid,
  action,
}: AuditQuery): Promise<AuditPage> {
  const collection = await getAuditCollection();

  const filter: Record<string, unknown> = {};
  if (actorUid) filter.actorUid = actorUid;
  if (action) filter.action = action;

  const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
  const safePage = Math.max(page, 1);

  const [rows, total] = await Promise.all([
    collection
      .find(filter)
      .sort({ at: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .toArray(),
    collection.countDocuments(filter),
  ]);

  return {
    entries: rows.map(({ _id, ...rest }) => ({ ...rest, _id: _id.toString() })),
    total,
    page: safePage,
    pages: Math.max(Math.ceil(total / safeLimit), 1),
  };
}

/**
 * Removes specific entries by id. Ids that are not valid ObjectIds are ignored
 * rather than rejected — a stale row in the browser must not fail the whole purge.
 */
export async function deleteAuditByIds(ids: string[]): Promise<number> {
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  if (objectIds.length === 0) return 0;

  const collection = await getAuditCollection();
  const result = await collection.deleteMany({ _id: { $in: objectIds } });
  return result.deletedCount;
}

/**
 * Removes every entry matching a filter — what "select all" means once the
 * selection is bigger than the page the browser is holding. An empty filter
 * clears the whole log, which is why the route restricts this to the super admin.
 */
export async function deleteAuditByFilter({
  actorUid,
  action,
}: Pick<AuditQuery, 'actorUid' | 'action'>): Promise<number> {
  const filter: Record<string, unknown> = {};
  if (actorUid) filter.actorUid = actorUid;
  if (action) filter.action = action;

  const collection = await getAuditCollection();
  const result = await collection.deleteMany(filter);
  return result.deletedCount;
}

/** Everyone who appears in the log, for the filter dropdown. */
export async function listAuditActors(): Promise<{ uid: string; name: string }[]> {
  const collection = await getAuditCollection();

  const rows = await collection
    .aggregate<{ _id: string | null; name: string }>([
      { $match: { actorUid: { $ne: null } } },
      { $group: { _id: '$actorUid', name: { $last: '$actorName' } } },
      { $sort: { name: 1 } },
    ])
    .toArray();

  return rows.filter((r): r is { _id: string; name: string } => r._id !== null)
    .map((r) => ({ uid: r._id, name: r.name }));
}
