'use client';

import { useState } from 'react';
import { getFirebaseAuth } from '@/lib/firebase';

export function useContentSave(section: string) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function save(data: unknown) {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      const res = await fetch(`/api/content/${section}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return { save, saving, saved, error };
}
