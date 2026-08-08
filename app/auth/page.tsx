'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

function LoginForm() {
  const { firebaseUser, adminUser, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  const inviteToken = params.get('invite');

  // Check whether any admins exist yet
  useEffect(() => {
    fetch('/api/auth/status')
      .then((r) => r.json())
      .then((d) => setNeedsSetup(d.needsSetup))
      .catch(() => setNeedsSetup(false));
  }, []);

  // Redirect once logged in
  useEffect(() => {
    if (!loading && firebaseUser && adminUser) {
      router.replace('/admin');
    }
  }, [loading, firebaseUser, adminUser, router]);

  async function handleSignIn() {
    setError('');
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed. Please try again.');
    } finally {
      setSigningIn(false);
    }
  }

  if (loading || (firebaseUser && adminUser)) {
    return (
      <div className="min-h-screen bg-chalk flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-pine border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-earth text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  const isSetup = needsSetup === true;

  return (
    <div className="min-h-screen bg-chalk flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-wheat flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-forest" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 8C8 10 5.9 16.17 3.82 21H5.71C5.71 17 7.5 11.5 17 8zm1.5 0C19 8 22 8 22 8c0 0-1.5 5-1.5 8.5H21C21 13 20 9.5 18.5 8z"/>
              <path d="M12 22c-1.1 0-2-.9-2-2V10l2-2 2 2v10c0 1.1-.9 2-2 2z" opacity="0.7"/>
            </svg>
          </div>
          <h1 className="font-display text-forest text-2xl font-black">AgriVerde CMS</h1>
          <p className="text-earth/70 text-sm mt-1">
            {isSetup ? 'First-time setup' : 'Admin Panel'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-linen p-8">

          {/* First-time setup banner */}
          {isSetup && (
            <div className="mb-5 bg-forest text-white rounded-xl px-4 py-4">
              <p className="font-semibold text-sm mb-1">👋 Welcome — no admins yet</p>
              <p className="text-white/75 text-xs leading-relaxed">
                Sign in with your Google account to create the first <strong>Super Admin</strong> account.
                This only works once — after that, new admins must be invited.
              </p>
            </div>
          )}

          {/* Invite banner */}
          {inviteToken && !isSetup && (
            <div className="mb-5 bg-pine/10 border border-pine/20 rounded-xl px-4 py-3 text-sm text-pine">
              You have been invited to join as an admin. Sign in with the Google account
              that received this invitation.
            </div>
          )}

          {/* Unauthorised */}
          {firebaseUser && !adminUser && (
            <div className="mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              <strong>{firebaseUser.email}</strong> is not authorised. You need an
              invitation link from an existing admin.
            </div>
          )}

          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 hover:border-gray-300 rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 transition-all disabled:opacity-60"
          >
            {/* Google logo */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {signingIn
              ? 'Signing in…'
              : isSetup
              ? 'Create Super Admin account with Google'
              : 'Continue with Google'}
          </button>

          <p className="text-center text-xs text-gray-400 mt-5">
            {isSetup
              ? 'The first account to sign in becomes Super Admin.'
              : 'Only invited administrators can access this panel.'}
          </p>
        </div>

        <div className="text-center mt-6">
          <a href="/" className="text-sm text-earth/60 hover:text-earth transition-colors">
            ← Back to website
          </a>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
