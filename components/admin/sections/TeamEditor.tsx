'use client';

import { useEffect, useState } from 'react';
import ImageUpload from '../ImageUpload';
import SaveBar from '../SaveBar';
import SectionLoading from '../SectionLoading';
import { useContentSave } from '../useContentSave';
import { useSectionContent } from '../useSectionContent';
import { defaultTeam } from '@/lib/seed-data';
import type { TeamMember } from '@/types';

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-wine focus:ring-2 focus:ring-wine/15';

/** How many members the home page shows — matches the client's home page grid. */
const HOME_PAGE_SLOTS = 3;

/** Renumbers `order` from the array position, so the list order *is* the hierarchy. */
function renumber(members: TeamMember[]): TeamMember[] {
  return members.map((m, i) => ({ ...m, order: i + 1 }));
}

export default function TeamEditor() {
  const { data: content, isLoading } = useSectionContent<TeamMember[]>('team', defaultTeam);
  const [members, setMembers] = useState<TeamMember[]>(
    [...defaultTeam].sort((a, b) => a.order - b.order)
  );
  const { save, ...workflow } = useContentSave('team');
  const [expanded, setExpanded] = useState<string | null>(null);

  // Index being dragged, and the index it is currently hovering over. Kept as
  // state rather than in the drag payload because dataTransfer is unreadable
  // during dragover in most browsers, which is exactly when the preview is drawn.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (content) setMembers([...content].sort((a, b) => a.order - b.order));
  }, [content]);

  function update(id: string, patch: Partial<TeamMember>) {
    setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function addMember() {
    const member: TeamMember = {
      id: `team-${Date.now()}`,
      name: 'New Team Member',
      title: '',
      bio: '',
      image: '',
      email: '',
      linkedin: '',
      featured: false,
      order: members.length + 1,
    };
    setMembers((ms) => [...ms, member]);
    setExpanded(member.id);
  }

  function removeMember(id: string) {
    if (!confirm('Remove this team member?')) return;
    setMembers((ms) => renumber(ms.filter((m) => m.id !== id)));
  }

  /** Moves one member to a new index and renumbers everyone. */
  function moveTo(from: number, to: number) {
    if (from === to || to < 0 || to >= members.length) return;
    const next = [...members];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setMembers(renumber(next));
  }

  function handleDrop(index: number) {
    if (dragIndex !== null) moveTo(dragIndex, index);
    setDragIndex(null);
    setOverIndex(null);
  }

  if (isLoading) return <SectionLoading />;

  const featuredCount = members.filter((m) => m.featured).length;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        <p className="text-sm text-gray-600 flex-1 min-w-[16rem]">
          Drag a row by its handle to set the order of seniority — the Team page lists people
          top to bottom in exactly this order. Tick <strong>Show on home page</strong> for the
          few who should also appear in the home page preview.
        </p>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
            featuredCount > HOME_PAGE_SLOTS ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
          }`}
          title={`The home page has room for about ${HOME_PAGE_SLOTS}`}
        >
          {featuredCount} on home page
        </span>
        <button
          onClick={addMember}
          className="bg-wine text-white text-sm px-4 py-2 rounded-xl hover:bg-wine-dark transition-colors whitespace-nowrap"
        >
          + Add Member
        </button>
      </div>

      {featuredCount > HOME_PAGE_SLOTS && (
        <p className="bg-amber-50 text-amber-700 text-sm rounded-xl px-4 py-3">
          The home page shows the first {HOME_PAGE_SLOTS} ticked members in this order. The rest
          are still on the Team page.
        </p>
      )}

      {members.length === 0 && (
        <p className="bg-white rounded-2xl p-8 shadow-sm text-center text-sm text-gray-500">
          No team members yet. Add the first one to start building the page.
        </p>
      )}

      {members.map((member, index) => (
        <div
          key={member.id}
          onDragOver={(e) => {
            // Without preventDefault the browser refuses the drop outright.
            e.preventDefault();
            if (dragIndex !== null && overIndex !== index) setOverIndex(index);
          }}
          onDrop={() => handleDrop(index)}
          className={`bg-white rounded-2xl shadow-sm overflow-hidden transition-[opacity,box-shadow] ${
            dragIndex === index ? 'opacity-40' : ''
          } ${overIndex === index && dragIndex !== index ? 'ring-2 ring-wine' : ''}`}
        >
          <div className="flex items-center gap-3 p-4">
            {/* Only the handle is draggable: making the whole row draggable would
                stop people selecting text in the fields inside it. */}
            <div
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
              role="button"
              tabIndex={0}
              aria-label={`Reorder ${member.name}. Use arrow keys to move.`}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') { e.preventDefault(); moveTo(index, index - 1); }
                if (e.key === 'ArrowDown') { e.preventDefault(); moveTo(index, index + 1); }
              }}
              className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 px-1 select-none focus:outline-none focus:text-wine"
              title="Drag to reorder, or focus and use ↑ / ↓"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <circle cx="7" cy="4" r="1.5" /><circle cx="13" cy="4" r="1.5" />
                <circle cx="7" cy="10" r="1.5" /><circle cx="13" cy="10" r="1.5" />
                <circle cx="7" cy="16" r="1.5" /><circle cx="13" cy="16" r="1.5" />
              </svg>
            </div>

            <span className="text-xs font-semibold text-gray-400 w-5 text-center shrink-0">{index + 1}</span>

            {member.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={member.image} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 bg-gray-100" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs shrink-0">
                {member.name?.[0]?.toUpperCase() || '?'}
              </div>
            )}

            <button
              onClick={() => setExpanded(expanded === member.id ? null : member.id)}
              className="flex-1 min-w-0 text-left"
            >
              <p className="font-medium text-gray-800 truncate">{member.name || 'Unnamed'}</p>
              <p className="text-xs text-gray-500 truncate">{member.title || 'No title yet'}</p>
            </button>

            <label
              className="flex items-center gap-2 text-xs text-gray-600 whitespace-nowrap cursor-pointer select-none"
              title="Show this person in the home page team preview"
            >
              <input
                type="checkbox"
                checked={member.featured}
                onChange={(e) => update(member.id, { featured: e.target.checked })}
                className="accent-wine w-4 h-4"
              />
              <span className="hidden sm:inline">Show on home page</span>
              <span className="sm:hidden">Home</span>
            </label>

            <button
              onClick={() => removeMember(member.id)}
              className="text-red-400 hover:text-red-600 text-sm px-2"
              aria-label={`Remove ${member.name}`}
            >
              ✕
            </button>
            <button
              onClick={() => setExpanded(expanded === member.id ? null : member.id)}
              className="text-gray-400 text-sm"
              aria-label={expanded === member.id ? 'Collapse' : 'Expand'}
            >
              {expanded === member.id ? '▲' : '▼'}
            </button>
          </div>

          {expanded === member.id && (
            <div className="border-t border-gray-100 p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                  <input
                    value={member.name}
                    onChange={(e) => update(member.id, { name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position / title</label>
                  <input
                    placeholder="Executive Director"
                    value={member.title}
                    onChange={(e) => update(member.id, { title: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Short biography</label>
                <textarea
                  value={member.bio}
                  onChange={(e) => update(member.id, { bio: e.target.value })}
                  rows={4}
                  className={inputClass}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                  <input
                    type="email"
                    placeholder="name@aclpit.com"
                    value={member.email}
                    onChange={(e) => update(member.id, { email: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL (optional)</label>
                  <input
                    placeholder="https://www.linkedin.com/in/…"
                    value={member.linkedin}
                    onChange={(e) => update(member.id, { linkedin: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <ImageUpload
                label="Photo"
                folder="team"
                value={member.image}
                onChange={(url) => update(member.id, { image: url })}
              />
            </div>
          )}
        </div>
      ))}

      <SaveBar onSave={() => save(renumber(members))} {...workflow} />
    </div>
  );
}
