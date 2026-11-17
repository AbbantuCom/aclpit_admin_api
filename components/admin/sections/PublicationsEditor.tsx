'use client';

import { useEffect, useState } from 'react';
import ImageUpload from '../ImageUpload';
import DocumentUpload from '../DocumentUpload';
import SaveBar from '../SaveBar';
import SectionLoading from '../SectionLoading';
import { useContentSave } from '../useContentSave';
import { useSectionContent } from '../useSectionContent';
import { defaultPublications } from '@/lib/seed-data';
import { readJsonResponse } from '@/lib/api-response';
import type { PublicationItem } from '@/types';

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-wine focus:ring-2 focus:ring-wine/15';

export default function PublicationsEditor() {
  const { data: content, isLoading } = useSectionContent<PublicationItem[]>('publications', defaultPublications);
  const [items, setItems] = useState<PublicationItem[]>([...defaultPublications].sort((a, b) => a.order - b.order));
  const { save, ...workflow } = useContentSave('publications');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [covers, setCovers] = useState<Record<string, { busy: boolean; error?: string }>>({});
  /** The publication whose "use your own cover image" picker is open, if any. */
  const [customCoverFor, setCustomCoverFor] = useState<string | null>(null);

  useEffect(() => {
    if (content) setItems([...content].sort((a, b) => a.order - b.order));
  }, [content]);

  function update(id: string, patch: Partial<PublicationItem>) {
    setItems((it) => it.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  /** Renders the PDF's first page on the server and uses it as the cover. */
  async function generateCover(id: string, pdfUrl: string) {
    setCovers((c) => ({ ...c, [id]: { busy: true } }));
    try {
      const res = await fetch('/api/documents/cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfUrl, folder: 'publications' }),
      });
      const { url } = await readJsonResponse<{ url: string }>(res, 'Creating the cover');
      update(id, { coverImage: url });
      setCovers((c) => ({ ...c, [id]: { busy: false } }));
    } catch (err) {
      setCovers((c) => ({
        ...c,
        [id]: { busy: false, error: err instanceof Error ? err.message : 'Could not create a cover from this PDF.' },
      }));
    }
  }

  function addItem() {
    const newItem: PublicationItem = {
      id: `pub-${Date.now()}`,
      title: 'New Publication',
      description: '',
      category: 'Policy Brief',
      fileUrl: '',
      coverImage: '',
      date: '',
      order: items.length + 1,
      enabled: true,
    };
    setItems((it) => [...it, newItem]);
    setExpanded(newItem.id);
  }

  function removeItem(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const hasFiles = Boolean(item.fileUrl || item.coverImage);
    const message = hasFiles
      ? 'Delete this publication?\n\nIts PDF and cover image will also be deleted from the Media Library once the publication is off the website (after you save and publish).'
      : 'Delete this publication?';
    if (!confirm(message)) return;

    setItems((it) => it.filter((i) => i.id !== id));

    // Files from a publication that was never saved aren't referenced by any
    // saved content, so no later save or publish would free them. The server
    // deletes only files nothing saved still uses, so this is safe for saved
    // publications too — theirs are kept until the publish (see media-cleanup.ts).
    const stillUsed = new Set(items.filter((i) => i.id !== id).flatMap((i) => [i.fileUrl, i.coverImage]));
    const urls = [item.fileUrl, item.coverImage].filter((u) => u && !stillUsed.has(u));
    if (urls.length > 0) {
      fetch('/api/media/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      }).catch(() => {
        // Best-effort: a leftover file shows as "Unused" in the Media Library.
      });
    }
  }

  function moveItem(id: string, dir: -1 | 1) {
    const idx = items.findIndex((i) => i.id === id);
    if (idx + dir < 0 || idx + dir >= items.length) return;
    const updated = [...items];
    [updated[idx], updated[idx + dir]] = [updated[idx + dir], updated[idx]];
    setItems(updated.map((i, n) => ({ ...i, order: n + 1 })));
  }

  if (isLoading) return <SectionLoading />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={addItem} className="bg-wine text-white text-sm px-4 py-2 rounded-xl hover:bg-wine-dark transition-colors">
          + Add Publication
        </button>
      </div>

      {items.map((item) => {
        const enabled = item.enabled !== false;
        return (
        <div key={item.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
            <div className="flex flex-col gap-0.5">
              <button onClick={(e) => { e.stopPropagation(); moveItem(item.id, -1); }} className="text-gray-400 hover:text-gray-600 text-xs leading-none">▲</button>
              <button onClick={(e) => { e.stopPropagation(); moveItem(item.id, 1); }} className="text-gray-400 hover:text-gray-600 text-xs leading-none">▼</button>
            </div>
            <div className={`flex-1 min-w-0 ${enabled ? '' : 'opacity-50'}`}>
              <p className="font-medium text-gray-800 truncate">{item.title || 'Untitled Publication'}</p>
              <p className="text-xs text-gray-500 truncate">{item.category}{item.date ? ` · ${item.date}` : ''}</p>
            </div>
            <label
              className="flex items-center gap-2 cursor-pointer select-none"
              onClick={(e) => e.stopPropagation()}
              title={enabled ? 'Shown on the public site — click to hide' : 'Hidden from the public site — click to show'}
            >
              <span className={`text-xs font-medium ${enabled ? 'text-green-700' : 'text-gray-400'}`}>
                {enabled ? 'Enabled' : 'Disabled'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label={`Show "${item.title || 'Untitled Publication'}" on the public site`}
                onClick={() => update(item.id, { enabled: !enabled })}
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-wine/40 ${enabled ? 'bg-wine' : 'bg-gray-300'}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : ''}`}
                />
              </button>
            </label>
            <button onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} className="text-red-400 hover:text-red-600 text-sm px-2">✕</button>
            <span className="text-gray-400 text-sm">{expanded === item.id ? '▲' : '▼'}</span>
          </div>

          {expanded === item.id && (
            <div className="border-t border-gray-100 p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input value={item.title} onChange={(e) => update(item.id, { title: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={item.description} onChange={(e) => update(item.id, { description: e.target.value })} rows={4}
                  className={`${inputClass} resize-none`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input placeholder="Policy Brief" value={item.category} onChange={(e) => update(item.id, { category: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" value={item.date} onChange={(e) => update(item.id, { date: e.target.value })} className={inputClass} />
                </div>
              </div>
              <DocumentUpload
                value={item.fileUrl}
                onChange={(url) => update(item.id, { fileUrl: url })}
                // A new PDF only fills an empty cover — it never replaces one an
                // editor chose. "Regenerate" below does that on request.
                onCommit={(url) => { if (!item.coverImage) generateCover(item.id, url); }}
                folder="publications"
                label="PDF File — upload it, or paste a link to it"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image</label>

                {customCoverFor === item.id ? (
                  // The full image picker (upload / library / link) only appears on
                  // request — the cover normally comes from the PDF, and showing a
                  // second upload box and link field read as a duplicate of the PDF's.
                  <div className="rounded-xl border border-gray-200 p-4">
                    <ImageUpload
                      value={item.coverImage}
                      onChange={(url) => update(item.id, { coverImage: url })}
                      folder="publications"
                      label="Your own cover image"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomCoverFor(null)}
                      className="mt-3 text-sm bg-wine text-white rounded-xl px-4 py-2 hover:bg-wine-dark transition-colors"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-4 items-start">
                    <div className="w-28 shrink-0 aspect-[3/4] rounded-lg border border-gray-200 bg-gray-50 overflow-hidden relative flex items-center justify-center">
                      {covers[item.id]?.busy ? (
                        <span className="text-xs text-gray-400 text-center px-2 animate-pulse">Creating…</span>
                      ) : item.coverImage ? (
                        // Plain <img> for the same reason as ImageUpload's preview.
                        <img src={item.coverImage} alt="Cover" className="absolute inset-0 w-full h-full object-cover object-top" />
                      ) : (
                        <span className="text-xs text-gray-400 text-center px-2">No cover yet</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-2">
                        {covers[item.id]?.busy
                          ? 'Making the cover from the first page of the PDF…'
                          : item.coverImage
                            ? 'Shown on this publication’s card on the website.'
                            : item.fileUrl
                              ? 'Use the first page of the PDF as the cover, or choose your own image.'
                              : 'Add the PDF above — its first page becomes the cover automatically.'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => generateCover(item.id, item.fileUrl)}
                          disabled={!item.fileUrl || covers[item.id]?.busy}
                          className="text-sm border border-wine text-wine rounded-xl px-3 py-1.5 hover:bg-wine hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-wine"
                        >
                          {item.coverImage ? 'Regenerate from PDF' : 'Use PDF first page'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomCoverFor(item.id)}
                          disabled={covers[item.id]?.busy}
                          className="text-sm border border-gray-200 text-gray-700 rounded-xl px-3 py-1.5 hover:border-wine hover:text-wine transition-colors disabled:opacity-50"
                        >
                          Use a different image
                        </button>
                        {item.coverImage && !covers[item.id]?.busy && (
                          <button
                            type="button"
                            onClick={() => update(item.id, { coverImage: '' })}
                            className="text-sm text-red-400 hover:text-red-600 px-2 py-1.5"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {covers[item.id]?.error && (
                        <p className="text-sm text-red-600 mt-2">{covers[item.id]?.error}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        );
      })}

      <SaveBar {...workflow} onSave={() => save(items)} />
    </div>
  );
}
