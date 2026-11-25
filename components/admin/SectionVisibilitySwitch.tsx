'use client';

import { useEffect, useState } from 'react';
import type { SiteSettings } from '@/types';

interface Props {
  /** Which site setting this switch flips. */
  setting: keyof SiteSettings;
  /** The section's name as visitors see it, e.g. "News & Events". */
  label: string;
}

/**
 * The on/off switch for a whole section of the public site (its page and its
 * main-menu link). Takes effect immediately — it is not part of the
 * draft/publish workflow that the section's content goes through.
 */
export default function SectionVisibilitySwitch({ setting, label }: Props) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((body: { settings: SiteSettings }) => {
        if (!cancelled) setEnabled(body.settings[setting]);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the current setting.');
      });
    return () => {
      cancelled = true;
    };
  }, [setting]);

  async function toggle() {
    if (enabled === null || saving) return;
    const next = !enabled;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [setting]: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEnabled(next);
    } catch {
      setError('Could not save the change. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const loading = enabled === null && !error;
  const title = `Show ${label} on the website`;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800">{title}</p>
        <p className="text-sm text-gray-500 mt-0.5">
          {loading
            ? 'Loading…'
            : enabled
              ? `Live — the ${label} page is open to visitors and listed in the main menu.`
              : `Hidden — the ${label} page is not shown and is left out of the main menu.`}
        </p>
        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
      </div>
      <span className={`text-xs font-semibold ${enabled ? 'text-green-700' : 'text-gray-400'}`}>
        {enabled ? 'ON' : 'OFF'}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled === true}
        aria-label={title}
        disabled={enabled === null || saving}
        onClick={toggle}
        className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-wine/40 disabled:opacity-50 disabled:cursor-not-allowed ${
          enabled ? 'bg-wine' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            enabled ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  );
}
