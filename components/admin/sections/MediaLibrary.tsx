'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { readJsonResponse } from '@/lib/api-response';

interface MediaFile {
  key: string;
  url: string;
  size: number;
  lastModified: string;
  inUse: boolean;
  /** Section names whose draft or published content mentions this file. */
  usedIn?: string[];
}

type Kind = 'image' | 'video' | 'pdf' | 'other';
type Filter = 'all' | Kind | 'unused';

const KIND_PATTERNS: [Kind, RegExp][] = [
  ['image', /\.(jpe?g|png|webp|gif|avif|svg)$/i],
  ['video', /\.(mp4|webm|mov|m4v)$/i],
  ['pdf', /\.pdf$/i],
];

function kindOf(key: string): Kind {
  return KIND_PATTERNS.find(([, re]) => re.test(key))?.[0] ?? 'other';
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'image', label: 'Images' },
  { id: 'video', label: 'Videos' },
  { id: 'pdf', label: 'PDFs' },
  { id: 'other', label: 'Other' },
  { id: 'unused', label: 'Unused' },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function baseName(key: string): string {
  return key.split('/').pop() ?? key;
}

function folderOf(key: string): string {
  const parts = key.split('/');
  return parts.length > 1 ? parts.slice(0, -1).join(' / ') : '';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function DocIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function FileIconTile({ label }: { label: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-wine bg-wine/5">
      <DocIcon className="w-10 h-10" />
      <span className="text-[11px] font-bold tracking-wider uppercase">{label}</span>
    </div>
  );
}

/**
 * First page of a PDF, rendered by the server (see /api/media/thumbnail). Falls
 * back to the plain document icon if the PDF can't be drawn — damaged,
 * password-protected, or the server is unavailable.
 */
function PdfThumb({ file }: { file: MediaFile }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (failed) return <FileIconTile label="PDF" />;

  const src = `/api/media/thumbnail?key=${encodeURIComponent(file.key)}&v=${encodeURIComponent(file.lastModified)}`;
  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center text-wine/40 animate-pulse">
          <DocIcon className="w-10 h-10" />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`w-full h-full object-cover object-top bg-white transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
      <span className="absolute bottom-2 right-2 text-[10px] font-bold tracking-wider bg-wine text-white rounded px-1.5 py-0.5">
        PDF
      </span>
    </>
  );
}

/** The small preview in a grid tile. */
function Thumb({ file }: { file: MediaFile }) {
  const kind = kindOf(file.key);
  if (kind === 'pdf') return <PdfThumb file={file} />;
  if (kind === 'image') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={file.url} alt="" loading="lazy" className="w-full h-full object-cover" />;
  }
  if (kind === 'video') {
    return (
      <>
        <video src={`${file.url}#t=0.5`} preload="metadata" muted className="w-full h-full object-cover" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-10 h-10 rounded-full bg-black/55 text-white flex items-center justify-center text-sm">▶</span>
        </span>
      </>
    );
  }
  return <FileIconTile label={baseName(file.key).split('.').pop() || 'File'} />;
}

export default function MediaLibrary() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState<MediaFile | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await readJsonResponse<{ files: MediaFile[] }>(await fetch('/api/media'), 'Loading the media library');
      setFiles(data.files ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load the media library.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Close the viewer with Escape.
  useEffect(() => {
    if (!viewing) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setViewing(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewing]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: files.length, image: 0, video: 0, pdf: 0, other: 0, unused: 0 };
    for (const f of files) {
      c[kindOf(f.key)]++;
      if (!f.inUse) c.unused++;
    }
    return c;
  }, [files]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return files.filter((f) => {
      if (filter === 'unused' ? f.inUse : filter !== 'all' && kindOf(f.key) !== filter) return false;
      return !q || f.key.toLowerCase().includes(q);
    });
  }, [files, filter, query]);

  async function remove(file: MediaFile) {
    const where = file.usedIn?.length ? file.usedIn.join(', ') : 'somewhere on the site';
    const message = file.inUse
      ? `"${baseName(file.key)}" is still used in: ${where}.\n\nDelete it anyway? That part of the site will show a broken file until it is replaced.`
      : `Delete "${baseName(file.key)}"? This cannot be undone.`;
    if (!confirm(message)) return;

    setError('');
    setDeleting(file.key);
    try {
      const res = await fetch('/api/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: file.key }),
      });
      await readJsonResponse(res, 'Deleting the file');
      setFiles((prev) => prev.filter((f) => f.key !== file.key));
      setViewing((v) => (v?.key === file.key ? null : v));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    } finally {
      setDeleting(null);
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt('Copy this link:', url);
    }
  }

  if (loading && files.length === 0) {
    return <div className="text-center py-20 text-gray-500">Loading media…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.filter((f) => f.id !== 'other' || counts.other > 0).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`text-sm rounded-full px-3 py-1.5 border transition-colors ${
                filter === f.id ? 'bg-wine text-white border-wine' : 'bg-white text-gray-700 border-gray-200 hover:border-wine hover:text-wine'
              }`}
            >
              {f.label} <span className={filter === f.id ? 'text-white/75' : 'text-gray-400'}>{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 sm:ms-auto">
          <input
            type="search"
            placeholder="Search by name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full sm:w-56 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-wine focus:ring-2 focus:ring-wine/15"
          />
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="text-sm border border-gray-200 bg-white rounded-lg px-3 py-1.5 text-gray-700 hover:border-wine hover:text-wine disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {loadError && <p className="text-red-600 text-sm">{loadError}</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {shown.length === 0 ? (
        <p className="text-gray-500 text-sm py-10 text-center">
          {files.length === 0 ? 'No uploaded media yet.' : 'No files match this filter.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {shown.map((file) => (
            <div key={file.key} className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <button
                type="button"
                onClick={() => setViewing(file)}
                className="h-36 bg-gray-100 relative block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-wine/40"
                aria-label={`View ${baseName(file.key)}`}
              >
                <Thumb file={file} />
                <span
                  className={`absolute top-2 left-2 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    file.inUse ? 'bg-green-600 text-white' : 'bg-amber-500 text-white'
                  }`}
                >
                  {file.inUse ? 'In use' : 'Unused'}
                </span>
              </button>
              <div className="p-3 flex-1 flex flex-col">
                <p className="text-xs font-medium text-gray-800 truncate" title={file.key}>{baseName(file.key)}</p>
                <p className="text-[11px] text-gray-400 truncate">{folderOf(file.key) || '—'}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {formatBytes(file.size)} · {formatDate(file.lastModified)}
                </p>
                {file.usedIn && file.usedIn.length > 0 && (
                  <p className="text-[11px] text-green-700 mt-0.5 truncate" title={`Used in ${file.usedIn.join(', ')}`}>
                    Used in {file.usedIn.join(', ')}
                  </p>
                )}
                <div className="mt-auto pt-2 flex gap-3">
                  <button type="button" onClick={() => setViewing(file)} className="text-wine hover:underline text-xs font-medium">
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(file)}
                    disabled={deleting === file.key}
                    className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-50"
                  >
                    {deleting === file.key ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Viewer */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setViewing(null)}
          role="dialog"
          aria-modal="true"
          aria-label={baseName(viewing.key)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-800 truncate">{baseName(viewing.key)}</p>
                <p className="text-xs text-gray-500 truncate">
                  {folderOf(viewing.key) && `${folderOf(viewing.key)} · `}
                  {formatBytes(viewing.size)} · {formatDate(viewing.lastModified)} ·{' '}
                  {viewing.inUse ? (
                    <span className="text-green-700">Used in {viewing.usedIn?.join(', ') || 'site content'}</span>
                  ) : (
                    <span className="text-amber-600">Not used anywhere</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none px-2"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 min-h-0 bg-gray-50 flex items-center justify-center overflow-auto">
              {kindOf(viewing.key) === 'image' && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={viewing.url} alt={baseName(viewing.key)} className="max-w-full max-h-[70vh] object-contain" />
              )}
              {kindOf(viewing.key) === 'video' && (
                <video src={viewing.url} controls autoPlay className="max-w-full max-h-[70vh]" />
              )}
              {kindOf(viewing.key) === 'pdf' && (
                <iframe src={viewing.url} title={baseName(viewing.key)} className="w-full h-[70vh] bg-white" />
              )}
              {kindOf(viewing.key) === 'other' && (
                <div className="py-16 text-center text-gray-500">
                  <DocIcon className="w-12 h-12 mx-auto text-wine mb-2" />
                  <p className="text-sm">No preview for this type of file — open it in a new tab instead.</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-t border-gray-100">
              <a
                href={viewing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 hover:border-wine hover:text-wine"
              >
                Open in new tab
              </a>
              <button
                type="button"
                onClick={() => copyLink(viewing.url)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 hover:border-wine hover:text-wine"
              >
                {copied ? 'Link copied ✓' : 'Copy link'}
              </button>
              <button
                type="button"
                onClick={() => remove(viewing)}
                disabled={deleting === viewing.key}
                className="text-sm ms-auto bg-red-500 text-white rounded-lg px-3 py-1.5 hover:bg-red-600 disabled:opacity-50"
              >
                {deleting === viewing.key ? 'Deleting…' : 'Delete file'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
