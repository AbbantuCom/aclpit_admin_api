'use client';

import { useState } from 'react';
import ImageUpload from '../ImageUpload';
import DocumentUpload from '../DocumentUpload';
import SaveBar from '../SaveBar';
import { useContentSave } from '../useContentSave';
import type { PublicationItem } from '@/types';

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-wine focus:ring-2 focus:ring-wine/15';

export default function PublicationsEditor({ initial }: { initial: PublicationItem[] }) {
  const [items, setItems] = useState([...initial].sort((a, b) => a.order - b.order));
  const { save, saving, saved, error } = useContentSave('publications');
  const [expanded, setExpanded] = useState<string | null>(null);

  function update(id: string, patch: Partial<PublicationItem>) {
    setItems((it) => it.map((i) => (i.id === id ? { ...i, ...patch } : i)));
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
    };
    setItems((it) => [...it, newItem]);
    setExpanded(newItem.id);
  }

  function removeItem(id: string) {
    if (!confirm('Delete this publication?')) return;
    setItems((it) => it.filter((i) => i.id !== id));
  }

  function moveItem(id: string, dir: -1 | 1) {
    const idx = items.findIndex((i) => i.id === id);
    if (idx + dir < 0 || idx + dir >= items.length) return;
    const updated = [...items];
    [updated[idx], updated[idx + dir]] = [updated[idx + dir], updated[idx]];
    setItems(updated.map((i, n) => ({ ...i, order: n + 1 })));
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={addItem} className="bg-wine text-white text-sm px-4 py-2 rounded-xl hover:bg-wine-dark transition-colors">
          + Add Publication
        </button>
      </div>

      {items.map((item) => (
        <div key={item.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
            <div className="flex flex-col gap-0.5">
              <button onClick={(e) => { e.stopPropagation(); moveItem(item.id, -1); }} className="text-gray-400 hover:text-gray-600 text-xs leading-none">▲</button>
              <button onClick={(e) => { e.stopPropagation(); moveItem(item.id, 1); }} className="text-gray-400 hover:text-gray-600 text-xs leading-none">▼</button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 truncate">{item.title || 'Untitled Publication'}</p>
              <p className="text-xs text-gray-500 truncate">{item.category}{item.date ? ` · ${item.date}` : ''}</p>
            </div>
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
              <ImageUpload
                value={item.coverImage}
                onChange={(url) => update(item.id, { coverImage: url })}
                folder="publications"
                label="Cover Image"
              />
              <DocumentUpload
                value={item.fileUrl}
                onChange={(url) => update(item.id, { fileUrl: url })}
                folder="publications"
                label="PDF File (or paste an external link)"
              />
            </div>
          )}
        </div>
      ))}

      <SaveBar saving={saving} saved={saved} error={error} onSave={() => save(items)} />
    </div>
  );
}
