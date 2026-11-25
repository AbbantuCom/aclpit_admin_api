'use client';

import { useEffect, useState } from 'react';
import { SHARE_PLATFORMS, type SharePlatformKey, type SiteSettings } from '@/types';

/**
 * Resources → "Share on social media": an on/off switch, and — when on — a
 * checklist of the platforms whose share buttons appear on the website. Like
 * the section switches, changes take effect immediately (no draft/publish).
 */
export default function PublicationSharingSettings() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [platforms, setPlatforms] = useState<SharePlatformKey[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((body: { settings: SiteSettings }) => {
        if (cancelled) return;
        setEnabled(body.settings.publicationSharingEnabled === true);
        setPlatforms(body.settings.publicationSharePlatforms ?? []);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the sharing settings.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveChange(change: Partial<SiteSettings>, undo: () => void) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(change),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      undo();
      setError('Could not save the change. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function toggle() {
    if (enabled === null || saving) return;
    const next = !enabled;
    setEnabled(next);
    saveChange({ publicationSharingEnabled: next }, () => setEnabled(!next));
  }

  function togglePlatform(key: SharePlatformKey) {
    if (saving) return;
    const before = platforms;
    const next = before.includes(key) ? before.filter((k) => k !== key) : [...before, key];
    setPlatforms(next);
    saveChange({ publicationSharePlatforms: next }, () => setPlatforms(before));
  }

  const loading = enabled === null && !error;
  const title = 'Share on social media';

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-800">{title}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading
              ? 'Loading…'
              : enabled
                ? 'On — every item shows share buttons for the platforms ticked below. Shared links open that item’s page on the website.'
                : 'Off — items have no share buttons.'}
          </p>
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

      {enabled && (
        <fieldset className="mt-5 border-t border-gray-100 pt-4">
          <legend className="text-sm font-medium text-gray-700 mb-3">Share on</legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SHARE_PLATFORMS.map((p) => {
              const checked = platforms.includes(p.key);
              return (
                <label
                  key={p.key}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm cursor-pointer select-none transition-colors ${
                    checked ? 'border-wine bg-wine/5 text-gray-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  } ${saving ? 'opacity-60 cursor-wait' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={saving}
                    onChange={() => togglePlatform(p.key)}
                    className="h-4 w-4 accent-wine"
                  />
                  <i className={`bi ${p.icon} text-base ${checked ? 'text-wine' : 'text-gray-400'}`} aria-hidden="true" />
                  {p.label}
                </label>
              );
            })}
          </div>
          {platforms.length === 0 && (
            <p className="text-sm text-amber-700 mt-3">No platforms ticked — items won’t show any share buttons.</p>
          )}
        </fieldset>
      )}

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  );
}
