'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import AuthShell, { AuthError, AuthSpinner, authInputClass } from '@/components/auth/AuthShell';
import PasswordInput from '@/components/auth/PasswordInput';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  staff: 'Staff',
  super_admin: 'Super Admin',
};

function AcceptInviteForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { refresh } = useAuth();
  const token = params.get('token') ?? '';

  const [checking, setChecking] = useState(true);
  const [inviteValid, setInviteValid] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [invitedByEmail, setInvitedByEmail] = useState('');

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('This invitation is invalid or has expired. Ask an administrator for a new one.');
      setChecking(false);
      return;
    }
    fetch(`/api/auth/accept-invite?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.valid) {
          setInviteValid(true);
          setEmail(d.email ?? '');
          setRole(d.role ?? '');
          setInvitedByEmail(d.invitedByEmail ?? '');
        } else {
          setError(d.error || 'This invitation is invalid or has expired.');
        }
      })
      .catch(() => setError('Could not verify this invitation. Please try again.'))
      .finally(() => setChecking(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, username, password, displayName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not activate your account.');

      // Accepting signs the user straight in — hydrate the context, then go.
      await refresh();
      router.replace('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not activate your account.');
    } finally {
      setBusy(false);
    }
  }

  if (checking) return <AuthSpinner />;

  if (!inviteValid) {
    return (
      <AuthShell
        subtitle="Invitation"
        footer={<Link href="/auth" className="text-wine hover:underline">← Back to sign in</Link>}
      >
        <AuthError message={error} />
        <p className="text-sm text-gray-600">
          Invitations expire after 7 days. Ask an administrator to send you a new one.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      subtitle="Activate your account"
      footer={<Link href="/auth" className="text-wine hover:underline">← Back to sign in</Link>}
    >
      <div className="mb-5 bg-wine text-white rounded-xl px-4 py-4">
        <p className="font-semibold text-sm mb-1">You have been invited</p>
        <p className="text-white/75 text-xs leading-relaxed">
          {invitedByEmail ? <>{invitedByEmail} invited </> : 'You have been invited '}
          <strong>{email}</strong> to join as <strong>{ROLE_LABELS[role] ?? role}</strong>.
          Choose a username and password to activate your account.
        </p>
      </div>

      {error && <AuthError message={error} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={email} disabled
            className={`${authInputClass} bg-gray-50 text-gray-500 cursor-not-allowed`} />
          <p className="text-xs text-gray-400 mt-1">Your account is tied to the invited address.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="username">Username</label>
          <input id="username" type="text" required value={username}
            onChange={(e) => setUsername(e.target.value)} className={authInputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="displayName">Display Name</label>
          <input id="displayName" type="text" value={displayName}
            onChange={(e) => setDisplayName(e.target.value)} className={authInputClass} />
        </div>
        <PasswordInput
          id="password"
          label="Password"
          autoComplete="new-password"
          required
          value={password}
          onChange={setPassword}
          hint="At least 10 characters, with upper and lowercase letters and a number."
        />
        <PasswordInput
          id="confirm"
          label="Confirm Password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={setConfirmPassword}
        />
        <button type="submit" disabled={busy}
          className="w-full bg-wine hover:bg-wine-dark text-white font-semibold text-sm px-4 py-3 rounded-xl transition-colors disabled:opacity-60">
          {busy ? 'Activating…' : 'Activate Account'}
        </button>
      </form>
    </AuthShell>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<AuthSpinner />}>
      <AcceptInviteForm />
    </Suspense>
  );
}
