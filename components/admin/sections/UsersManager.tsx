'use client';

import { useState, useEffect } from 'react';
import { getFirebaseAuth } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import type { AdminUser, Invitation } from '@/types';
import Image from 'next/image';

async function authHeader() {
  const token = await getFirebaseAuth().currentUser?.getIdToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export default function UsersManager() {
  const { adminUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [transferTarget, setTransferTarget] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [message, setMessage] = useState('');

  const isSuperAdmin = adminUser?.role === 'super_admin';

  async function load() {
    setLoading(true);
    const headers = await authHeader();
    const res = await fetch('/api/users', { headers });
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
      setInvitations(data.invitations);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInviteLink('');
    setInviting(true);
    try {
      const headers = await authHeader();
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: inviteEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
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
    const headers = await authHeader();
    await fetch('/api/users/invite', { method: 'DELETE', headers, body: JSON.stringify({ token }) });
    load();
  }

  async function removeUser(uid: string) {
    if (!confirm('Remove this admin?')) return;
    const headers = await authHeader();
    await fetch(`/api/users/${uid}`, { method: 'DELETE', headers });
    load();
  }

  async function transferRole() {
    if (!transferTarget) return;
    if (!confirm('Transfer super admin role? You will become a regular admin.')) return;
    setTransferring(true);
    setError('');
    try {
      const headers = await authHeader();
      const res = await fetch('/api/users/transfer', {
        method: 'POST',
        headers,
        body: JSON.stringify({ targetUid: transferTarget }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(data.message);
      setTransferTarget('');
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

  return (
    <div className="space-y-8">
      {/* Invite Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4">Invite a New Admin</h2>
        <form onSubmit={sendInvite} className="flex gap-3">
          <input
            type="email"
            placeholder="admin@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-pine focus:ring-2 focus:ring-pine/15"
          />
          <button
            type="submit"
            disabled={inviting}
            className="bg-forest text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-pine transition-colors disabled:opacity-60"
          >
            {inviting ? 'Inviting…' : 'Send Invite'}
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        {message && <p className="text-pine text-sm mt-2">✓ {message}</p>}
        {inviteLink && (
          <div className="mt-4 bg-pine/10 border border-pine/20 rounded-xl p-4">
            <p className="text-sm font-semibold text-pine mb-1">Invitation link (share this):</p>
            <div className="flex items-center gap-2">
              <code className="text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 flex-1 break-all">{inviteLink}</code>
              <button
                onClick={() => navigator.clipboard.writeText(inviteLink)}
                className="bg-pine text-white text-xs px-3 py-2 rounded-lg hover:bg-forest transition-colors whitespace-nowrap"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">The invited person must sign in with their Google account using this link. The link expires in 7 days.</p>
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">Pending Invitations</h2>
          <div className="space-y-3">
            {invitations.map((inv) => (
              <div key={inv._id} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{inv.email}</p>
                  <p className="text-xs text-gray-500">Invited by {inv.invitedByEmail} · Expires {new Date(inv.expiresAt).toLocaleDateString()}</p>
                </div>
                {isSuperAdmin && (
                  <button onClick={() => revokeInvite(inv.token)} className="text-red-500 hover:text-red-700 text-xs font-medium">Revoke</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Admins */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4">Admin Users ({users.length})</h2>
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.uid} className="flex items-center gap-4 border border-gray-100 rounded-xl px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-pine flex items-center justify-center text-white text-sm font-bold shrink-0">
                {u.displayName?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{u.displayName}</p>
                <p className="text-xs text-gray-500 truncate">{u.email}</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${u.role === 'super_admin' ? 'bg-forest text-white' : 'bg-gray-100 text-gray-600'}`}>
                {u.role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </span>
              {isSuperAdmin && u.uid !== adminUser?.uid && (
                <button onClick={() => removeUser(u.uid)} className="text-red-400 hover:text-red-600 text-sm ml-2">Remove</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Transfer Super Admin */}
      {isSuperAdmin && users.filter((u) => u.role === 'admin').length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-red-100">
          <h2 className="font-semibold text-gray-800 mb-1">Transfer Super Admin Role</h2>
          <p className="text-xs text-gray-500 mb-4">You will become a regular admin after transfer. This action cannot be undone without the new super admin&apos;s cooperation.</p>
          <div className="flex gap-3">
            <select
              value={transferTarget}
              onChange={(e) => setTransferTarget(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-400"
            >
              <option value="">Select admin to promote…</option>
              {users.filter((u) => u.role === 'admin').map((u) => (
                <option key={u.uid} value={u.uid}>{u.displayName} ({u.email})</option>
              ))}
            </select>
            <button
              onClick={transferRole}
              disabled={!transferTarget || transferring}
              className="bg-red-500 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-40"
            >
              {transferring ? 'Transferring…' : 'Transfer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
