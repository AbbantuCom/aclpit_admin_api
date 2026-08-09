'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthShell, { AuthError, AuthNotice, authInputClass } from '@/components/auth/AuthShell';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      if (!res.ok) throw new Error('Could not send the reset email. Please try again.');
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      subtitle="Reset your password"
      footer={<Link href="/auth" className="text-wine hover:underline">← Back to sign in</Link>}
    >
      {sent ? (
        <AuthNotice>
          If an account matches, a password reset link has been sent to its email address. The link
          expires in one hour.
        </AuthNotice>
      ) : (
        <>
          {error && <AuthError message={error} />}
          <p className="text-sm text-gray-600 mb-5">
            Enter your email address or username and we will send you a link to choose a new password.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="identifier">
                Email or Username
              </label>
              <input
                id="identifier"
                type="text"
                required
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className={authInputClass}
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-wine hover:bg-wine-dark text-white font-semibold text-sm px-4 py-3 rounded-xl transition-colors disabled:opacity-60"
            >
              {busy ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
