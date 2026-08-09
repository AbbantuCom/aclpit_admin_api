'use client';

import { useState } from 'react';
import type { SectionWorkflow } from './useContentSave';

interface Props extends SectionWorkflow {
  /** Persists the editor's current state as a draft. Resolves false if the save failed. */
  onSave: () => Promise<boolean> | void;
}

function formatWhen(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Save → Preview → Publish, in that order, left to right.
 *
 * Nothing here reaches the public site except Publish. Save writes a private draft,
 * Preview opens that draft rendered by the real site, and Discard rolls the draft
 * back to whatever is currently live.
 */
export default function SaveBar({
  onSave,
  saving,
  saved,
  error,
  publishing,
  publishedJustNow,
  publishError,
  discarding,
  hasUnpublishedChanges,
  publishedAt,
  neverPublished,
  publish,
  discard,
  getPreviewUrl,
}: Props) {
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const busy = saving || publishing || discarding || previewing;

  async function handlePreview() {
    setPreviewError('');
    setPreviewing(true);

    // The tab has to be opened synchronously from the click, before any await, or
    // the browser treats the later window.open as an unrequested popup and blocks it.
    const tab = window.open('', '_blank');

    try {
      if ((await onSave()) === false) {
        tab?.close();
        return;
      }

      const url = await getPreviewUrl();
      if (!url) {
        tab?.close();
        setPreviewError('Preview is not configured — set CLIENT_URL and PREVIEW_SECRET.');
        return;
      }

      if (tab) tab.location.href = url;
      else window.open(url, '_blank');
    } finally {
      setPreviewing(false);
    }
  }

  function handleDiscard() {
    discard();
    setConfirmingDiscard(false);
  }

  return (
    <div className="pt-6 border-t border-gray-200 mt-8 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => onSave()}
          disabled={busy}
          className="bg-forest hover:bg-pine text-white font-semibold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-60 text-sm"
        >
          {saving ? 'Saving…' : 'Save Draft'}
        </button>

        <button
          onClick={handlePreview}
          disabled={busy}
          className="border border-gray-300 hover:border-wine hover:text-wine text-gray-700 font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60 text-sm inline-flex items-center gap-1.5"
        >
          {previewing ? 'Opening…' : 'Preview'}
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5h5m0 0v5m0-5L10 14M5 9v10h10" />
          </svg>
        </button>

        <button
          onClick={publish}
          disabled={busy || !hasUnpublishedChanges}
          title={hasUnpublishedChanges ? 'Make these changes live' : 'Nothing to publish — the live site already matches this draft'}
          className="bg-wine hover:bg-wine-dark text-white font-semibold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-40 disabled:hover:bg-wine text-sm"
        >
          {publishing ? 'Publishing…' : 'Publish'}
        </button>

        {hasUnpublishedChanges && !neverPublished && (
          confirmingDiscard ? (
            <span className="inline-flex items-center gap-2 text-sm">
              <span className="text-gray-600">Discard draft changes?</span>
              <button onClick={handleDiscard} className="text-red-600 hover:text-red-700 font-semibold">
                Yes, discard
              </button>
              <button onClick={() => setConfirmingDiscard(false)} className="text-gray-500 hover:text-gray-700">
                Cancel
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmingDiscard(true)}
              disabled={busy}
              className="text-gray-500 hover:text-red-600 text-sm transition-colors disabled:opacity-60"
            >
              {discarding ? 'Discarding…' : 'Discard draft'}
            </button>
          )
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {saved && !saving && (
          <span className="text-pine font-medium flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Draft saved — not live yet
          </span>
        )}

        {publishedJustNow && (
          <span className="text-pine font-medium flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Published — this is now live
          </span>
        )}

        {hasUnpublishedChanges && !publishedJustNow && (
          <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Unpublished changes
          </span>
        )}

        {neverPublished && (
          <span className="text-gray-500 text-xs">Never published — the live site is using fallback content.</span>
        )}

        {!hasUnpublishedChanges && !neverPublished && publishedAt && (
          <span className="text-gray-400 text-xs">Live since {formatWhen(publishedAt)}</span>
        )}

        {error && <span className="text-red-500">{error}</span>}
        {publishError && <span className="text-red-500">{publishError}</span>}
        {previewError && <span className="text-red-500">{previewError}</span>}
      </div>
    </div>
  );
}
