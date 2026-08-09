'use client';

import { useEffect, useMemo, useState } from 'react';

export type MediaKind = 'image' | 'video' | 'document';

interface MediaFile {
  key: string;
  url: string;
  size: number;
  lastModified: string;
  inUse: boolean;
}

interface Props {
  kind: MediaKind;
  onSelect: (url: string) => void;
  onClose: () => void;
}

const EXTENSIONS: Record<MediaKind, RegExp> = {
  image: /\.(jpe?g|png|webp|gif|avif|svg)$/i,
  video: /\.(mp4|webm|mov|m4v)$/i,
  document: /\.pdf$/i,
};

const KIND_LABELS: Record<MediaKind, string> = {
  image: 'image',
  video: 'video',
  document: 'document',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Filename without the folder prefix, for display. */
function baseName(key: string): string {
  return key.split('/').pop() ?? key;
}

export default function MediaPicker({ kind, onSelect, onClose }: Props) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/media')
      .then((res) => {
        if (!res.ok) throw new Error('Could not load the media library.');
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setFiles(data.files ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load media.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const matches = useMemo(() => {
    const pattern = EXTENSIONS[kind];
    return files
      .filter((f) => pattern.test(f.key))
      .filter((f) => f.key.toLowerCase().includes(query.trim().toLowerCase()))
      .sort((a, b) => b.lastModified.localeCompare(a.lastModified));
  }, [files, kind, query]);

  return (
    <div
      className="fixed inset-0 z-[1090] bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Choose ${KIND_LABELS[kind]} from media library`}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-800">Media Library</h2>
            <p className="text-xs text-gray-500">
              Choose an existing {KIND_LABELS[kind]} instead of uploading a new one.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none px-2"
          >
            &times;
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100">
          <input
            type="search"
            placeholder="Search by file name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-wine focus:ring-2 focus:ring-wine/15"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-2 border-wine border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <p className="text-center text-sm text-red-600 py-16">{error}</p>
          ) : matches.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-gray-500">
                {query
                  ? `No ${KIND_LABELS[kind]}s match “${query}”.`
                  : `No ${KIND_LABELS[kind]}s in the media library yet.`}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Upload one and it will appear here for reuse.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {matches.map((file) => (
                <button
                  key={file.key}
                  type="button"
                  onClick={() => {
                    onSelect(file.url);
                    onClose();
                  }}
                  className="group text-left border border-gray-200 rounded-xl overflow-hidden hover:border-wine hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-wine/40"
                >
                  <div className="h-28 bg-gray-50 flex items-center justify-center overflow-hidden">
                    {kind === 'image' ? (
                      // Plain <img> — the media library can contain URLs from
                      // hosts that next/image isn't configured for.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={file.url}
                        alt={baseName(file.key)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : kind === 'video' ? (
                      <video src={file.url} className="w-full h-full object-cover" muted preload="metadata" />
                    ) : (
                      <svg className="w-10 h-10 text-wine" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium text-gray-700 truncate" title={file.key}>
                      {baseName(file.key)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-gray-400">{formatBytes(file.size)}</span>
                      {file.inUse && (
                        <span className="text-[10px] bg-wine/10 text-wine px-1.5 py-0.5 rounded-full">in use</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {loading ? '' : `${matches.length} ${KIND_LABELS[kind]}${matches.length === 1 ? '' : 's'}`}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
