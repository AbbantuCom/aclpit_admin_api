'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { AUDIT_ACTIONS, type AuditAction, type AuditEntryWithId } from '@/lib/audit-actions';

interface Actor {
  uid: string;
  name: string;
}

interface AuditResponse {
  entries: AuditEntryWithId[];
  total: number;
  page: number;
  pages: number;
  actors: Actor[];
}

const PAGE_SIZE = 50;

/** Actions grouped so the filter reads as a short list rather than 21 flat options. */
const ACTION_GROUPS: { label: string; actions: AuditAction[] }[] = [
  { label: 'Content', actions: ['content.save', 'content.publish', 'content.publish_all', 'content.discard', 'content.seed'] },
  { label: 'Media', actions: ['media.upload', 'media.delete', 'document.upload'] },
  { label: 'Messages', actions: ['message.update', 'message.read_all', 'message.delete'] },
  { label: 'People', actions: ['user.invite', 'user.invite_revoke', 'user.delete', 'user.transfer_ownership'] },
  {
    label: 'Sign-in',
    actions: ['auth.login', 'auth.login_failed', 'auth.logout', 'auth.password_reset', 'auth.invite_accepted', 'auth.super_admin_created'],
  },
];

/** Colour by consequence, so destructive and failed events stand out when scanning. */
function toneFor(action: AuditAction): string {
  if (action === 'auth.login_failed') return 'bg-amber-50 text-amber-700';
  if (action.endsWith('.delete') || action === 'user.invite_revoke' || action === 'content.discard') {
    return 'bg-red-50 text-red-600';
  }
  if (action.startsWith('content.publish') || action === 'user.transfer_ownership') {
    return 'bg-forest/10 text-forest';
  }
  return 'bg-gray-100 text-gray-600';
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function summarize(details: Record<string, unknown> | null): string {
  if (!details) return '';
  return Object.entries(details)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
    .join(' · ');
}

export default function AuditLog() {
  const { adminUser } = useAuth();
  const canDelete = adminUser?.role === 'super_admin';

  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [actorUid, setActorUid] = useState('');
  const [action, setAction] = useState('');

  // Ids ticked on the page currently shown. `allMatching` escalates that to every
  // entry the filter matches, including the pages the browser never loaded.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [allMatching, setAllMatching] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (actorUid) params.set('actorUid', actorUid);
    if (action) params.set('action', action);

    try {
      const res = await fetch(`/api/audit?${params}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load the audit log');
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the audit log');
    } finally {
      setLoading(false);
    }
  }, [page, actorUid, action]);

  useEffect(() => { load(); }, [load]);

  function clearSelection() {
    setSelected(new Set());
    setAllMatching(false);
  }

  // Any filter change restarts paging — page 3 of the old filter is meaningless —
  // and drops the selection, which was made against a different set of rows.
  function changeFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
    clearSelection();
  }

  function toggleRow(id: string) {
    setAllMatching(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    if (!data) return;
    setAllMatching(false);
    const pageIds = data.entries.map((e) => e._id);
    const fullySelected = pageIds.every((id) => selected.has(id));
    setSelected(fullySelected ? new Set() : new Set(pageIds));
  }

  const selectedCount = allMatching ? (data?.total ?? 0) : selected.size;

  async function handleDelete() {
    if (!data || selectedCount === 0) return;

    const scope = allMatching
      ? `all ${data.total} entries matching the current filter`
      : `${selected.size} selected ${selected.size === 1 ? 'entry' : 'entries'}`;
    if (!confirm(`Permanently delete ${scope}? This cannot be undone.`)) return;

    setDeleting(true);
    setError('');

    try {
      const res = await fetch('/api/audit', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          allMatching
            ? { all: true, actorUid: actorUid || undefined, action: action || undefined }
            : { ids: [...selected] }
        ),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete entries');

      clearSelection();
      setPage(1); // The page we were on may no longer exist.
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entries');
    } finally {
      setDeleting(false);
    }
  }

  const pageFullySelected =
    !!data && data.entries.length > 0 && data.entries.every((e) => selected.has(e._id));

  const selectClass =
    'border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-wine focus:ring-2 focus:ring-wine/15 bg-white';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={actorUid}
          onChange={(e) => changeFilter(setActorUid, e.target.value)}
          className={selectClass}
          aria-label="Filter by person"
        >
          <option value="">Everyone</option>
          {data?.actors.map((a) => (
            <option key={a.uid} value={a.uid}>{a.name}</option>
          ))}
        </select>

        <select
          value={action}
          onChange={(e) => changeFilter(setAction, e.target.value)}
          className={selectClass}
          aria-label="Filter by action"
        >
          <option value="">All actions</option>
          {ACTION_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.actions.map((a) => (
                <option key={a} value={a}>{AUDIT_ACTIONS[a]}</option>
              ))}
            </optgroup>
          ))}
        </select>

        <button
          onClick={load}
          disabled={loading}
          className="text-sm text-gray-600 hover:text-wine border border-gray-200 hover:border-wine px-3 py-2 rounded-lg transition-colors disabled:opacity-60"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>

        {data && (
          <span className="text-sm text-gray-500 ml-auto">
            {data.total} {data.total === 1 ? 'entry' : 'entries'}
          </span>
        )}
      </div>

      {error && (
        <p className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3">{error}</p>
      )}

      {canDelete && selectedCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="text-sm text-red-700 font-medium">
            {selectedCount} {selectedCount === 1 ? 'entry' : 'entries'} selected
          </span>

          {/* Offered only once the whole page is ticked and more pages exist —
              otherwise "select all" would silently mean "just these 50". */}
          {pageFullySelected && !allMatching && data && data.total > data.entries.length && (
            <button
              onClick={() => setAllMatching(true)}
              className="text-sm text-red-700 underline hover:no-underline"
            >
              Select all {data.total} matching this filter
            </button>
          )}

          <button onClick={clearSelection} className="text-sm text-gray-600 hover:text-gray-800">
            Clear
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="ml-auto bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-60"
          >
            {deleting ? 'Deleting…' : `Delete ${selectedCount}`}
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading && !data ? (
          <p className="text-center py-20 text-gray-500">Loading activity…</p>
        ) : !data || data.entries.length === 0 ? (
          <p className="text-center py-20 text-gray-500">
            No activity recorded yet{actorUid || action ? ' for this filter' : ''}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  {canDelete && (
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={pageFullySelected}
                        onChange={togglePage}
                        aria-label="Select all entries on this page"
                        className="accent-wine w-4 h-4 align-middle"
                      />
                    </th>
                  )}
                  <th className="text-left font-semibold px-4 py-3">When</th>
                  <th className="text-left font-semibold px-4 py-3">Who</th>
                  <th className="text-left font-semibold px-4 py-3">Did what</th>
                  <th className="text-left font-semibold px-4 py-3">To what</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.entries.map((entry) => (
                  <tr
                    key={entry._id}
                    className={`align-top hover:bg-gray-50/60 ${
                      allMatching || selected.has(entry._id) ? 'bg-red-50/40' : ''
                    }`}
                  >
                    {canDelete && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={allMatching || selected.has(entry._id)}
                          onChange={() => toggleRow(entry._id)}
                          aria-label={`Select entry from ${formatWhen(entry.at)}`}
                          className="accent-wine w-4 h-4 align-middle"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatWhen(entry.at)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{entry.actorName}</div>
                      {entry.actorEmail && entry.actorEmail !== entry.actorName && (
                        <div className="text-xs text-gray-500">{entry.actorEmail}</div>
                      )}
                      {entry.ip && <div className="text-xs text-gray-400">{entry.ip}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${toneFor(entry.action)}`}>
                        {AUDIT_ACTIONS[entry.action] ?? entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-700 break-all">{entry.target || '—'}</div>
                      {entry.details && (
                        <div className="text-xs text-gray-500 break-all">{summarize(entry.details)}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page <= 1 || loading}
            className="text-sm border border-gray-200 hover:border-wine hover:text-wine px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">Page {data.page} of {data.pages}</span>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, data.pages))}
            disabled={page >= data.pages || loading}
            className="text-sm border border-gray-200 hover:border-wine hover:text-wine px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
