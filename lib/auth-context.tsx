'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import type { PublicAdminUser } from '@/types';

interface AuthContextValue {
  adminUser: PublicAdminUser | null;
  loading: boolean;
  /** Signs in with an email-or-username identifier. Throws on failure. */
  signIn: (identifier: string, password: string) => Promise<PublicAdminUser>;
  signOut: () => Promise<void>;
  /** Re-reads the session from the server (after a role change, for example). */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [adminUser, setAdminUser] = useState<PublicAdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      setAdminUser(res.ok ? (await res.json()).user : null);
    } catch {
      setAdminUser(null);
    }
  }, []);

  useEffect(() => {
    // The session lives in an httpOnly cookie the browser can't read, so the
    // only way to know who (if anyone) is signed in is to ask the server.
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function signIn(identifier: string, password: string): Promise<PublicAdminUser> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Sign-in failed. Please try again.');

    setAdminUser(data.user);
    return data.user as PublicAdminUser;
  }

  async function signOut(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setAdminUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ adminUser, loading, signIn, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
