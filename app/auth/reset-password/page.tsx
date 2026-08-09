'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthShell, { AuthError, AuthNotice, AuthSpinner } from '@/components/auth/AuthShell';
import PasswordInput from '@/components/auth/PasswordInput';

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';

  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  // Check the link before showing the form, so a dead link fails fast instead
  // of after the user has typed a new password.
  useEffect(() => {
    if (!token) {
      setError('This password reset link is invalid or has expired. Please request a new one.');
      setChecking(false);
      return;
    }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.valid) {
          setTokenValid(true);
          setEmail(d.email ?? '');
        } else {
          setError(d.error || 'This password reset link is invalid or has expired.');
        }
      })
      .catch(() => setError('Could not verify this link. Please try again.'))
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
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not reset your password.');

      setDone(true);
      setTimeout(() => router.replace('/auth'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset your password.');
    } finally {
      setBusy(false);
    }
  }

  if (checking) return <AuthSpinner />;

  return (
    <AuthShell
      subtitle="Choose a new password"
      footer={<Link href="/auth" className="text-wine hover:underline">← Back to sign in</Link>}
    >
      {done ? (
        <AuthNotice>Your password has been updated. Redirecting you to sign in…</AuthNotice>
      ) : !tokenValid ? (
        <>
          <AuthError message={error} />
          <Link
            href="/auth/forgot-password"
            className="block w-full text-center bg-wine hover:bg-wine-dark text-white font-semibold text-sm px-4 py-3 rounded-xl transition-colors"
          >
            Request a new link
          </Link>
        </>
      ) : (
        <>
          {error && <AuthError message={error} />}
          {email && (
            <p className="text-sm text-gray-600 mb-5">
              Setting a new password for <strong className="text-gray-800">{email}</strong>.
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordInput
              id="password"
              label="New Password"
              autoComplete="new-password"
              required
              value={password}
              onChange={setPassword}
              hint="At least 10 characters, with upper and lowercase letters and a number."
            />
            <PasswordInput
              id="confirm"
              label="Confirm New Password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={setConfirmPassword}
            />
            <button type="submit" disabled={busy}
              className="w-full bg-wine hover:bg-wine-dark text-white font-semibold text-sm px-4 py-3 rounded-xl transition-colors disabled:opacity-60">
              {busy ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthSpinner />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
