'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import type { PublicAdminUser, Invitation, UserRole } from '@/types';

const inputClass =
  'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-wine focus:ring-2 focus:ring-wine/15';

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  staff: 'Staff',
};

const ROLE_BADGE: Record<UserRole, string> = {
  super_admin: 'bg-wine text-white',
  admin: 'bg-wine/10 text-wine',
  staff: 'bg-gray-100 text-gray-600',
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export default function UsersManager() {
  const { adminUser, refresh } = useAuth();
  const [users, setUsers] = useState<PublicAdminUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'staff'>('staff');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteWarning, setInviteWarning] = useState('');
  const [inviting, setInviting] = useState(false);

  const [transferTarget, setTransferTarget] = useState('');
  const [transferring, setTransferring] = useState(false);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [statusBusy, setStatusBusy] = useState('');

  const isSuperAdmin = adminUser?.role === 'super_admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setInvitations(data.invitations);
      } else {
        setError('Could not load users.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setInviteLink('');
    setInviteWarning('');
    setInviting(true);
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.emailSent) {
        setMessage(`Invitation sent to ${inviteEmail}.`);
      } else {
        // Mail failed but the invite is valid — surface the link so the admin
        // can still pass it on manually.
        setInviteWarning(
          data.emailError
            ? `The invitation was created, but the email could not be sent (${data.emailError}). Share the link below instead.`
            : 'The invitation was created, but the email could not be sent. Share the link below instead.'
        );
      }
      setInviteLink(data.inviteLink);
      setInviteEmail('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error sending invite');
    } finally {
      setInviting(false);
    }
  }

  async function revokeInvite(token: string) {
    if (!confirm('Revoke this invitation?')) return;
    setError('');
    const res = await fetch('/api/users/invite', {
      method: 'DELETE',
      headers: JSON_HEADERS,
      body: JSON.stringify({ token }),
    });
    if (!res.ok) setError((await res.json()).error || 'Could not revoke invitation.');
    load();
  }

  async function removeUser(uid: string, label: string) {
    if (!confirm(`Remove ${label}? They will lose access immediately.`)) return;
    setError('');
    const res = await fetch(`/api/users/${uid}`, { method: 'DELETE' });
    if (!res.ok) setError((await res.json()).error || 'Could not remove user.');
    load();
  }

  async function setUserStatus(uid: string, label: string, deactivate: boolean) {
    const prompt = deactivate
      ? `Deactivate ${label}? They are signed out immediately and cannot sign back in, but their account and history are kept.`
      : `Reactivate ${label}? They will be able to sign in again with their existing password.`;
    if (!confirm(prompt)) return;

    setError('');
    setMessage('');
    setStatusBusy(uid);
    try {
      const res = await fetch(`/api/users/${uid}`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: deactivate ? 'deactivated' : 'active' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(`${label} ${deactivate ? 'deactivated' : 'reactivated'}.`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change account status.');
    } finally {
      setStatusBusy('');
    }
  }

  async function transferRole() {
    if (!transferTarget) return;
    if (!confirm('Transfer the super admin role? You will become a regular admin.')) return;
    setTransferring(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/users/transfer', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ targetUid: transferTarget }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(data.message);
      setTransferTarget('');
      // The caller was demoted server-side — re-read the session so the UI
      // stops offering super-admin-only controls.
      await refresh();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading users…</div>;
  }

  // Deactivated accounts are excluded: the transfer route refuses a target that
  // is not active, so offering them would only produce an error.
  const transferCandidates = users.filter(
    (u) => u.role !== 'super_admin' && u.status !== 'deactivated'
  );

  return (
    <div className="space-y-8">
      {(error || message) && (
        <div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
          )}
          {message && (
            <div className="bg-linen border border-wine/20 rounded-xl px-4 py-3 text-sm text-gray-700">✓ {message}</div>
          )}
        </div>
      )}

      {/* Invite */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-1">Invite a Team Member</h2>
        <p className="text-xs text-gray-500 mb-4">
          They receive an email with a link to choose their own username and password. Invitations
          expire after 7 days.
        </p>
        <form onSubmit={sendInvite} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            placeholder="person@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            className={`${inputClass} flex-1`}
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as 'admin' | 'staff')}
            className={`${inputClass} sm:w-40`}
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={inviting}
            className="bg-wine text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-wine-dark transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {inviting ? 'Inviting…' : 'Send Invite'}
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-3">
          <strong>Staff</strong> can edit content, media and messages. <strong>Admin</strong> can
          additionally invite members.
        </p>

        {inviteWarning && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            {inviteWarning}
          </div>
        )}

        {inviteLink && (
          <div className="mt-4 bg-linen border border-wine/20 rounded-xl p-4">
            <p className="text-sm font-semibold text-wine mb-2">Invitation link</p>
            <div className="flex items-center gap-2">
              <code className="text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 flex-1 break-all">
                {inviteLink}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(inviteLink)}
                className="bg-wine text-white text-xs px-3 py-2 rounded-lg hover:bg-wine-dark transition-colors whitespace-nowrap"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">Pending Invitations ({invitations.length})</h2>
          <div className="space-y-3">
            {invitations.map((inv) => (
              <div
                key={inv._id}
                className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{inv.email}</p>
                  <p className="text-xs text-gray-500">
                    {ROLE_LABELS[inv.role] ?? inv.role} · invited by {inv.invitedByEmail} · expires{' '}
                    {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                {isSuperAdmin && (
                  <button
                    onClick={() => revokeInvite(inv.token)}
                    className="text-red-500 hover:text-red-700 text-xs font-medium whitespace-nowrap"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4">Team Members ({users.length})</h2>
        <div className="space-y-3">
          {users.map((u) => (
            <div
              key={u.uid}
              className={`flex items-center gap-4 border rounded-xl px-4 py-3 ${
                u.status === 'deactivated' ? 'border-gray-200 bg-gray-50' : 'border-gray-100'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${
                  u.status === 'deactivated' ? 'bg-gray-300' : 'bg-wine'
                }`}
              >
                {u.displayName?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${u.status === 'deactivated' ? 'text-gray-500' : 'text-gray-800'}`}>
                  {u.displayName}
                  {u.uid === adminUser?.uid && <span className="text-gray-400 font-normal"> (you)</span>}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {u.email} · @{u.username}
                </p>
              </div>

              {u.status === 'deactivated' && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap bg-gray-200 text-gray-600">
                  Deactivated
                </span>
              )}

              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${ROLE_BADGE[u.role]}`}>
                {ROLE_LABELS[u.role]}
              </span>

              {/* Admins and the super admin can switch an account off; only the
                  super admin can delete one outright. Neither applies to the
                  super admin's own account or to the person acting. */}
              {u.uid !== adminUser?.uid && u.role !== 'super_admin' && (
                <button
                  onClick={() => setUserStatus(u.uid, u.displayName || u.email, u.status !== 'deactivated')}
                  disabled={statusBusy === u.uid}
                  className={`text-sm ml-2 whitespace-nowrap disabled:opacity-50 ${
                    u.status === 'deactivated'
                      ? 'text-forest hover:text-pine'
                      : 'text-amber-600 hover:text-amber-700'
                  }`}
                >
                  {statusBusy === u.uid
                    ? 'Saving…'
                    : u.status === 'deactivated'
                      ? 'Reactivate'
                      : 'Deactivate'}
                </button>
              )}

              {isSuperAdmin && u.uid !== adminUser?.uid && (
                <button
                  onClick={() => removeUser(u.uid, u.displayName || u.email)}
                  className="text-red-400 hover:text-red-600 text-sm ml-2 whitespace-nowrap"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Transfer super admin */}
      {isSuperAdmin && transferCandidates.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-red-100">
          <h2 className="font-semibold text-gray-800 mb-1">Transfer Super Admin Role</h2>
          <p className="text-xs text-gray-500 mb-4">
            There can only ever be one super admin. You will become a regular admin after the
            transfer, and this cannot be undone without the new super admin&apos;s cooperation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={transferTarget}
              onChange={(e) => setTransferTarget(e.target.value)}
              className={`${inputClass} flex-1`}
            >
              <option value="">Select a member to promote…</option>
              {transferCandidates.map((u) => (
                <option key={u.uid} value={u.uid}>
                  {u.displayName} ({u.email}) — {ROLE_LABELS[u.role]}
                </option>
              ))}
            </select>
            <button
              onClick={transferRole}
              disabled={!transferTarget || transferring}
              className="bg-red-500 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-40 whitespace-nowrap"
            >
              {transferring ? 'Transferring…' : 'Transfer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
