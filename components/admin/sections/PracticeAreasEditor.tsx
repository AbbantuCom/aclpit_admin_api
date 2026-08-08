'use client';

import { useEffect, useState } from 'react';
import SaveBar from '../SaveBar';
import SectionLoading from '../SectionLoading';
import { useContentSave } from '../useContentSave';
import { useSectionContent } from '../useSectionContent';
import { defaultPracticeAreas } from '@/lib/seed-data';
import type { PracticeArea } from '@/types';

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-wine focus:ring-2 focus:ring-wine/15';

export default function PracticeAreasEditor() {
  const { data: content, isLoading } = useSectionContent<PracticeArea[]>('practiceAreas', defaultPracticeAreas);
  const [cards, setCards] = useState<PracticeArea[]>([...defaultPracticeAreas].sort((a, b) => a.order - b.order));
  const { save, saving, saved, error } = useContentSave('practiceAreas');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (content) setCards([...content].sort((a, b) => a.order - b.order));
  }, [content]);

  function update(id: string, patch: Partial<PracticeArea>) {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function setBullet(id: string, i: number, value: string) {
    setCards((cs) =>
      cs.map((c) => {
        if (c.id !== id) return c;
        const bullets = [...c.bullets];
        bullets[i] = value;
        return { ...c, bullets };
      })
    );
  }

  function addBullet(id: string) {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, bullets: [...c.bullets, ''] } : c)));
  }

  function removeBullet(id: string, i: number) {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, bullets: c.bullets.filter((_, idx) => idx !== i) } : c)));
  }

  function addCard() {
    const newCard: PracticeArea = {
      id: `pa-${Date.now()}`,
      anchor: '',
      icon: 'bi-star',
      title: 'New Practice Area',
      description: '',
      bullets: [],
      order: cards.length + 1,
    };
    setCards((cs) => [...cs, newCard]);
    setExpanded(newCard.id);
  }

  function removeCard(id: string) {
    if (!confirm('Delete this practice area?')) return;
    setCards((cs) => cs.filter((c) => c.id !== id));
  }

  function moveCard(id: string, dir: -1 | 1) {
    const idx = cards.findIndex((c) => c.id === id);
    if (idx + dir < 0 || idx + dir >= cards.length) return;
    const updated = [...cards];
    [updated[idx], updated[idx + dir]] = [updated[idx + dir], updated[idx]];
    setCards(updated.map((c, i) => ({ ...c, order: i + 1 })));
  }

  if (isLoading) return <SectionLoading />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={addCard} className="bg-wine text-white text-sm px-4 py-2 rounded-xl hover:bg-wine-dark transition-colors">
          + Add Practice Area
        </button>
      </div>

      {cards.map((card) => (
        <div key={card.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded(expanded === card.id ? null : card.id)}>
            <div className="flex flex-col gap-0.5">
              <button onClick={(e) => { e.stopPropagation(); moveCard(card.id, -1); }} className="text-gray-400 hover:text-gray-600 text-xs leading-none">▲</button>
              <button onClick={(e) => { e.stopPropagation(); moveCard(card.id, 1); }} className="text-gray-400 hover:text-gray-600 text-xs leading-none">▼</button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 truncate">{card.title || 'Untitled Practice Area'}</p>
              <p className="text-xs text-gray-500 truncate">{card.description.slice(0, 60)}{card.description.length > 60 ? '…' : ''}</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); removeCard(card.id); }} className="text-red-400 hover:text-red-600 text-sm px-2">✕</button>
            <span className="text-gray-400 text-sm">{expanded === card.id ? '▲' : '▼'}</span>
          </div>

          {expanded === card.id && (
            <div className="border-t border-gray-100 p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input value={card.title} onChange={(e) => update(card.id, { title: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icon (Bootstrap Icons class)</label>
                  <input placeholder="bi-shield-lock" value={card.icon} onChange={(e) => update(card.id, { icon: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Anchor (URL fragment, e.g. data)</label>
                <input value={card.anchor} onChange={(e) => update(card.id, { anchor: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={card.description} onChange={(e) => update(card.id, { description: e.target.value })} rows={3}
                  className={`${inputClass} resize-none`} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Bullet Points</label>
                  <button onClick={() => addBullet(card.id)} className="text-wine text-sm hover:text-wine-dark font-medium">+ Add</button>
                </div>
                <div className="space-y-2">
                  {card.bullets.map((b, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={b} onChange={(e) => setBullet(card.id, i, e.target.value)} className={inputClass} />
                      <button onClick={() => removeBullet(card.id, i)} className="text-red-400 hover:text-red-600 text-lg leading-none px-1">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      <SaveBar saving={saving} saved={saved} error={error} onSave={() => save(cards)} />
    </div>
  );
}
