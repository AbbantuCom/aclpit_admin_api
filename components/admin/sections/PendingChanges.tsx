'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useContentStatus, usePublishAll, type SectionStatus } from '../useContentStatus';
import SectionLoading from '../SectionLoading';

/** Where each section is edited in the admin panel. Sections without a page of their
 *  own can still be reviewed and published from here. */
const SECTION_ROUTES: Record<string, string> = {
  hero: '/admin/hero',
  about: '/admin/about',
  services: '/admin/services',
  practiceAreas: '/admin/practice-areas',
  publications: '/admin/publications',
  dialogues: '/admin/dialogues',
  contact: '/admin/contact',
};

function formatWhen(iso: string | null): string {
  if (!iso) return 'never';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'never';

  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h ago`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function Row({ status }: { status: SectionStatus }) {
  const route = SECTION_ROUTES[status.section];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 last:border-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-800">{status.label}</span>
          {status.hasUnpublishedChanges ? (
            <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Unpublished
            </span>
          ) : (
            <span className="text-xs text-gray-400">Live</span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {status.hasUnpublishedChanges
            ? `Edited ${formatWhen(status.draftUpdatedAt)}${status.draftUpdatedByName ? ` by ${status.draftUpdatedByName}` : ''}`
            : `Published ${formatWhen(status.publishedAt)}`}
        </p>
      </div>

      {route && (
        <Link
          href={route}
          className="text-sm text-wine hover:text-wine-dark font-medium whitespace-nowrap"
        >
          {status.hasUnpublishedChanges ? 'Review & publish →' : 'Edit →'}
        </Link>
      )}
    </div>
  );
}

/**
 * One screen showing which sections have drafts waiting, so nothing gets published
 * by accident and nothing sits forgotten in draft either.
 */
export default function PendingChanges() {
  const { data: status, isLoading } = useContentStatus();
  const publishAll = usePublishAll();
  const [confirming, setConfirming] = useState(false);

  if (isLoading || !status) return <SectionLoading />;

  const pending = status.sections.filter((s) => s.hasUnpublishedChanges);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-800">
              {pending.length === 0
                ? 'Everything is published'
                : `${pending.length} section${pending.length === 1 ? '' : 's'} waiting to publish`}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Drafts are private. The public site keeps showing the last published version until you publish.
            </p>
          </div>

          {pending.length > 0 &&
            (confirming ? (
              <span className="inline-flex items-center gap-2 text-sm">
                <span className="text-gray-600">Publish all {pending.length}?</span>
                <button
                  onClick={() => {
                    publishAll.mutate();
                    setConfirming(false);
                  }}
                  className="bg-wine hover:bg-wine-dark text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
                >
                  Yes, make live
                </button>
                <button onClick={() => setConfirming(false)} className="text-gray-500 hover:text-gray-700">
                  Cancel
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                disabled={publishAll.isPending}
                className="bg-wine hover:bg-wine-dark text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
              >
                {publishAll.isPending ? 'Publishing…' : 'Publish all'}
              </button>
            ))}
        </div>

        {status.sections.map((s) => (
          <Row key={s.section} status={s} />
        ))}
      </div>

      {publishAll.isError && (
        <p className="text-sm text-red-500">
          {publishAll.error instanceof Error ? publishAll.error.message : 'Publish failed'}
        </p>
      )}
      {publishAll.isSuccess && publishAll.data.publishedCount > 0 && (
        <p className="text-sm text-pine font-medium">
          Published {publishAll.data.publishedCount} section
          {publishAll.data.publishedCount === 1 ? '' : 's'} — the site is live with these changes.
        </p>
      )}
    </div>
  );
}
