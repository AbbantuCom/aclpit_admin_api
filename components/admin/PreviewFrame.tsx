'use client';

import { useState } from 'react';
import Link from 'next/link';

const DEVICES = [
  { key: 'desktop', label: 'Desktop', width: null },
  { key: 'tablet', label: 'Tablet', width: 834 },
  { key: 'mobile', label: 'Mobile', width: 390 },
] as const;

type DeviceKey = (typeof DEVICES)[number]['key'];

interface Props {
  /** The public site's preview entry point, token already signed by the server. */
  src: string;
  /** Admin route of the editor this preview was opened from. */
  editorHref: string;
  sectionLabel: string;
}

/**
 * The public site, framed inside the admin panel.
 *
 * The site renders itself rather than the admin re-implementing its markup, so a
 * preview cannot drift from what visitors actually see. The trade-off is that the
 * frame depends on the client deployment being reachable and willing to be framed —
 * hence the escape hatch to open the same URL in its own tab.
 */
export default function PreviewFrame({ src, editorHref, sectionLabel }: Props) {
  const [device, setDevice] = useState<DeviceKey>('desktop');
  // Bumped to remount the iframe: reassigning the same src would not re-request a
  // page the browser has already cached, and there is no cross-origin reload API.
  const [reloadKey, setReloadKey] = useState(0);

  const width = DEVICES.find((d) => d.key === device)?.width ?? null;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-3 flex flex-wrap items-center gap-3">
        <Link
          href={editorHref}
          className="text-sm text-gray-600 hover:text-wine inline-flex items-center gap-1.5 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to {sectionLabel}
        </Link>

        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden shrink-0">
          {DEVICES.map((d) => (
            <button
              key={d.key}
              onClick={() => setDevice(d.key)}
              aria-pressed={device === d.key}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                device === d.key ? 'bg-wine text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 ml-auto shrink-0">
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="text-sm text-gray-600 hover:text-wine inline-flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M20 9A8 8 0 006 5.3M4 15a8 8 0 0014 3.7" />
            </svg>
            Reload
          </button>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-gray-600 hover:text-wine inline-flex items-center gap-1.5"
          >
            Open in new tab
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5h5m0 0v5m0-5L10 14M5 9v10h10" />
            </svg>
          </a>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-gray-100 flex justify-center">
        <iframe
          key={reloadKey}
          src={src}
          title={`${sectionLabel} preview`}
          className="h-full bg-white shadow-sm border-x border-gray-200"
          style={{ width: width ?? '100%', maxWidth: '100%' }}
        />
      </div>

      <p className="bg-white border-t border-gray-200 px-4 sm:px-8 py-2 text-xs text-gray-500">
        Showing unpublished draft content. Visitors still see the published site until you publish.
        Blank frame? Open it in a new tab — some browsers block the preview cookie inside a frame
        when the site and this panel are on unrelated domains.
      </p>
    </div>
  );
}
