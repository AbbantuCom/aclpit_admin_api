'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import AuthShell, { AuthError, AuthSpinner, authInputClass } from '@/components/auth/AuthShell';
import PasswordInput from '@/components/auth/PasswordInput';

function AuthForm() {
  const { adminUser, loading, signIn, refresh } = useAuth();
  const router = useRouter();

  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/auth/status')
      .then((r) => r.json())
      .then((d) => setNeedsSetup(Boolean(d.needsSetup)))
      .catch(() => setNeedsSetup(false));
  }, []);

  useEffect(() => {
    if (!loading && adminUser) router.replace('/admin');
  }, [loading, adminUser, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signIn(identifier, password);
      router.replace('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password, displayName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not create the account.');

      await refresh();
      router.replace('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the account.');
    } finally {
      setBusy(false);
    }
  }

  if (loading || needsSetup === null || adminUser) return <AuthSpinner />;

  return (
    <AuthShell subtitle={needsSetup ? 'First time setup' : 'Admin Panel'}>
      {needsSetup && (
        <div className="mb-5 bg-wine text-white rounded-xl px-4 py-4">
          <p className="font-semibold text-sm mb-1">Welcome, no accounts yet</p>
          <p className="text-white/75 text-xs leading-relaxed">
            Create the <strong>Super Admin</strong> account. This happens once; afterwards everyone
            else joins by invitation only.
          </p>
        </div>
      )}

      {error && <AuthError message={error} />}

      {needsSetup ? (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="rEmail">Email</label>
            <input id="rEmail" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} className={authInputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="rUsername">Username</label>
            <input id="rUsername" type="text" required value={username}
              onChange={(e) => setUsername(e.target.value)} className={authInputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="rName">Display Name</label>
            <input id="rName" type="text" value={displayName}
              onChange={(e) => setDisplayName(e.target.value)} className={authInputClass} />
          </div>
          <PasswordInput
            id="rPassword"
            label="Password"
            autoComplete="new-password"
            required
            value={password}
            onChange={setPassword}
            hint="At least 10 characters, with upper and lowercase letters and a number."
          />
          <PasswordInput
            id="rConfirm"
            label="Confirm Password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={setConfirmPassword}
          />
          <button type="submit" disabled={busy}
            className="w-full bg-wine hover:bg-wine-dark text-white font-semibold text-sm px-4 py-3 rounded-xl transition-colors disabled:opacity-60">
            {busy ? 'Creating account…' : 'Create Super Admin account'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="identifier">
              Email or Username
            </label>
            <input id="identifier" type="text" required autoComplete="username" value={identifier}
              onChange={(e) => setIdentifier(e.target.value)} className={authInputClass} />
          </div>
          <PasswordInput
            id="password"
            label="Password"
            autoComplete="current-password"
            required
            value={password}
            onChange={setPassword}
          />
          <button type="submit" disabled={busy}
            className="w-full bg-wine hover:bg-wine-dark text-white font-semibold text-sm px-4 py-3 rounded-xl transition-colors disabled:opacity-60">
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
          <p className="text-center text-sm">
            <Link href="/auth/forgot-password" className="text-wine hover:underline">
              Forgot your password?
            </Link>
          </p>
        </form>
      )}

      <p className="text-center text-xs text-gray-400 mt-5">
        {needsSetup
          ? 'Only one Super Admin account can ever be created.'
          : 'Only invited members can access this panel.'}
      </p>
    </AuthShell>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthSpinner />}>
      <AuthForm />
    </Suspense>
  );
}
