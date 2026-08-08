'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth, createGoogleProvider } from './firebase';
import type { AdminUser } from '@/types';

// firebase/auth functions are statically imported — no code runs at import time.
// All actual Firebase initialization is deferred to useEffect (browser-only).

interface AuthContextValue {
  firebaseUser: User | null;
  adminUser: AdminUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // getFirebaseAuth() initializes Firebase on first call — safe here because
    // useEffect only runs in the browser, never during SSR.
    const auth = getFirebaseAuth();

    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const token = await user.getIdToken();
          const res = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
          if (res.ok) {
            const data = await res.json();
            setAdminUser(data.user);
          } else {
            setAdminUser(null);
          }
        } catch {
          setAdminUser(null);
        }
      } else {
        setAdminUser(null);
      }
      setLoading(false);
    });

    return unsub;
  }, []);

  async function signInWithGoogle() {
    await signInWithPopup(getFirebaseAuth(), createGoogleProvider());
  }

  async function signOut() {
    await fbSignOut(getFirebaseAuth());
    setAdminUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ firebaseUser, adminUser, loading, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
