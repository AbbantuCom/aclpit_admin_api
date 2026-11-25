'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
// Name → codepoint map shipped with the icon font. The public site loads the
// same package and version, so every icon offered here renders there too.
import iconMap from 'bootstrap-icons/font/bootstrap-icons.json';

const ALL_ICONS = Object.keys(iconMap);

/** Shown first, before any search: icons that suit the Centre's content. */
const SUGGESTED = [
  'building', 'buildings', 'bank', 'bank2', 'briefcase', 'people', 'people-fill', 'person', 'person-badge',
  'person-workspace', 'person-check', 'person-heart', 'globe', 'globe-europe-africa', 'globe2', 'shield-lock',
  'shield-check', 'lock', 'key', 'fingerprint', 'eye', 'compass', 'search', 'lightbulb', 'book', 'journal-text',
  'journal-bookmark', 'journal-richtext', 'mortarboard', 'cpu', 'robot', 'laptop', 'phone', 'wifi', 'database',
  'server', 'cloud', 'code-slash', 'diagram-3', 'graph-up', 'bar-chart', 'pie-chart', 'megaphone', 'chat-dots',
  'chat-quote', 'chat-square-text', 'hand-thumbs-up', 'heart', 'heart-pulse', 'rocket-takeoff', 'star', 'award',
  'trophy', 'flag', 'bullseye', 'clipboard-check', 'file-earmark-text', 'newspaper', 'calendar-event', 'mic',
  'camera-video', 'easel', 'gear', 'gear-wide-connected', 'tools', 'puzzle', 'link-45deg', 'share',
  'signpost-split', 'map', 'geo-alt', 'house-door', 'hospital', 'cash-coin', 'wallet2', 'currency-exchange',
  'credit-card', 'shop', 'tree', 'recycle', 'lightning-charge', 'translate', 'universal-access', 'patch-check',
  'card-checklist', 'list-check', 'hammer', 'feather', 'pencil-square', 'envelope', 'telephone',
].filter((name) => name in iconMap);

const PANEL_WIDTH = 352;
const PANEL_HEIGHT = 380;

/** "bi-bank2" → "bank2"; tolerates values typed without the prefix. */
function bare(value: string): string {
  return value.trim().replace(/^bi\s+/, '').replace(/^bi-/, '');
}

/** "rocket-takeoff" → "Rocket takeoff" */
function pretty(name: string): string {
  const s = name.replace(/-/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface Props {
  /** Stored as the icon's class, e.g. "bi-building". */
  value: string;
  onChange: (value: string) => void;
}

/**
 * A dropdown for choosing a Bootstrap icon: shows a picture of the current
 * icon, and opens a searchable grid of every icon so editors pick by sight
 * instead of typing class names.
 */
export default function IconPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const current = bare(value);
  const known = current in iconMap;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^bi-/, '').replace(/\s+/g, '-');
    return q ? ALL_ICONS.filter((n) => n.includes(q)) : null;
  }, [query]);

  // The panel is portalled to <body> and fixed-positioned so cards with
  // overflow-hidden can't clip it. Keep it beside the trigger as things move.
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const below = window.innerHeight - r.bottom;
      const top = below < PANEL_HEIGHT + 12 && r.top > below ? r.top - PANEL_HEIGHT - 6 : r.bottom + 6;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - PANEL_WIDTH - 8));
      setPos({ top: Math.max(8, top), left });
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function choose(name: string) {
    onChange(`bi-${name}`);
    setOpen(false);
    setQuery('');
    triggerRef.current?.focus();
  }

  function grid(names: string[]) {
    return (
      <div className="grid grid-cols-6 gap-1">
        {names.map((name) => (
          <button
            key={name}
            type="button"
            title={pretty(name)}
            aria-label={pretty(name)}
            onClick={() => choose(name)}
            className={`aspect-square flex items-center justify-center rounded-lg text-xl transition-colors ${
              name === current ? 'bg-wine text-white' : 'text-gray-700 hover:bg-wine/10 hover:text-wine'
            }`}
          >
            <i className={`bi bi-${name}`} aria-hidden="true" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 border border-gray-200 rounded-lg px-3 py-2 text-sm text-left outline-none hover:border-wine focus:border-wine focus:ring-2 focus:ring-wine/15"
      >
        <span className="w-7 h-7 shrink-0 rounded-md bg-wine/10 text-wine flex items-center justify-center text-base">
          {known ? <i className={`bi bi-${current}`} aria-hidden="true" /> : <span className="text-gray-400">?</span>}
        </span>
        <span className={`flex-1 truncate ${known ? 'text-gray-800' : 'text-gray-400'}`}>
          {known ? pretty(current) : current ? `Unknown: ${current}` : 'Choose an icon'}
        </span>
        <span className="text-gray-400 text-xs">▼</span>
      </button>

      {open && pos &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Choose an icon"
            style={{ top: pos.top, left: pos.left, width: PANEL_WIDTH, height: PANEL_HEIGHT }}
            className="fixed z-[1000] bg-white rounded-xl border border-gray-200 shadow-xl flex flex-col"
          >
            <div className="p-3 border-b border-gray-100">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${ALL_ICONS.length.toLocaleString()} icons — e.g. people, globe, shield`}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-wine focus:ring-2 focus:ring-wine/15"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {results ? (
                results.length > 0 ? (
                  <>
                    <p className="text-xs text-gray-500">{results.length} match{results.length === 1 ? '' : 'es'}</p>
                    {grid(results)}
                  </>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">No icons match “{query}”.</p>
                )
              ) : (
                <>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Suggested</p>
                    {grid(SUGGESTED)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">All icons</p>
                    {grid(ALL_ICONS)}
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
