'use client';

import { useEffect, useState } from 'react';
import ImageUpload from '../ImageUpload';
import SaveBar from '../SaveBar';
import SectionLoading from '../SectionLoading';
import { useContentSave } from '../useContentSave';
import { useSectionContent } from '../useSectionContent';
import { defaultAbout } from '@/lib/seed-data';
import type { AboutContent, AboutObjective, AboutStakeholder } from '@/types';

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-wine focus:ring-2 focus:ring-wine/15';

export default function AboutEditor() {
  const { data: content, isLoading } = useSectionContent<AboutContent>('about', defaultAbout);
  const [data, setData] = useState<AboutContent>(defaultAbout);
  const { save, saving, saved, error } = useContentSave('about');

  useEffect(() => {
    if (content) setData(content);
  }, [content]);

  function set<K extends keyof AboutContent>(key: K, value: AboutContent[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function setEntry<T extends AboutObjective | AboutStakeholder>(
    key: 'objectives' | 'stakeholders',
    i: number,
    field: keyof T,
    value: string
  ) {
    setData((d) => {
      const list = [...(d[key] as T[])];
      list[i] = { ...list[i], [field]: value };
      return { ...d, [key]: list };
    });
  }

  function addEntry(key: 'objectives' | 'stakeholders') {
    setData((d) => ({ ...d, [key]: [...d[key], { icon: 'bi-star', title: '', description: '' }] }));
  }

  function removeEntry(key: 'objectives' | 'stakeholders', i: number) {
    setData((d) => ({ ...d, [key]: d[key].filter((_, idx) => idx !== i) }));
  }

  function setGovernanceValue(i: number, value: string) {
    const values = [...data.governanceValues];
    values[i] = value;
    set('governanceValues', values);
  }

  function addGovernanceValue() {
    set('governanceValues', [...data.governanceValues, '']);
  }

  function removeGovernanceValue(i: number) {
    set('governanceValues', data.governanceValues.filter((_, idx) => idx !== i));
  }

  function textField(label: string, key: keyof AboutContent) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input value={data[key] as string} onChange={(e) => set(key, e.target.value as AboutContent[typeof key])} className={inputClass} />
      </div>
    );
  }

  function textArea(label: string, key: keyof AboutContent, rows = 3) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <textarea
          value={data[key] as string}
          onChange={(e) => set(key, e.target.value as AboutContent[typeof key])}
          rows={rows}
          className={`${inputClass} resize-none`}
        />
      </div>
    );
  }

  function entryEditor(key: 'objectives' | 'stakeholders', title: string) {
    const list = data[key];
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          <button onClick={() => addEntry(key)} className="text-wine text-sm hover:text-wine-dark font-medium">+ Add</button>
        </div>
        {list.map((entry, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_2fr_auto] gap-3 items-start">
            <input
              placeholder="Icon (e.g. bi-search)"
              value={entry.icon}
              onChange={(e) => setEntry<AboutObjective | AboutStakeholder>(key, i, 'icon', e.target.value)}
              className={inputClass}
            />
            <input
              placeholder="Title"
              value={entry.title}
              onChange={(e) => setEntry<AboutObjective | AboutStakeholder>(key, i, 'title', e.target.value)}
              className={inputClass}
            />
            <input
              placeholder="Description"
              value={entry.description}
              onChange={(e) => setEntry<AboutObjective | AboutStakeholder>(key, i, 'description', e.target.value)}
              className={inputClass}
            />
            <button onClick={() => removeEntry(key, i)} className="text-red-400 hover:text-red-600 text-lg leading-none px-1 py-2">✕</button>
          </div>
        ))}
      </div>
    );
  }

  if (isLoading) return <SectionLoading />;

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <h2 className="font-semibold text-gray-800 border-b pb-3">Home Preview</h2>
        {textField('Eyebrow', 'eyebrow')}
        {textField('Title', 'title')}
        {textArea('Paragraph 1', 'paragraph1')}
        {textArea('Paragraph 2', 'paragraph2')}
        <ImageUpload value={data.image} onChange={(url) => set('image', url)} folder="about" label="Preview Image" />
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <h2 className="font-semibold text-gray-800 border-b pb-3">Background &amp; Rationale</h2>
        {textField('Eyebrow', 'backgroundEyebrow')}
        {textField('Title', 'backgroundTitle')}
        {textArea('Paragraph 1', 'backgroundParagraph1')}
        {textArea('Paragraph 2', 'backgroundParagraph2')}
        {textArea('Paragraph 3', 'backgroundParagraph3')}
        <ImageUpload value={data.backgroundImage} onChange={(url) => set('backgroundImage', url)} folder="about" label="Background Image" />
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <h2 className="font-semibold text-gray-800 border-b pb-3">Vision &amp; Mission</h2>
        {textArea('Vision', 'visionText', 2)}
        {textArea('Mission', 'missionText', 2)}
      </div>

      {entryEditor('objectives', 'Objectives')}

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <h2 className="font-semibold text-gray-800 border-b pb-3">Governance</h2>
        {textField('Eyebrow', 'governanceEyebrow')}
        {textField('Title', 'governanceTitle')}
        {textArea('Paragraph 1', 'governanceParagraph1')}
        {textArea('Paragraph 2', 'governanceParagraph2')}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Value Chips</label>
            <button onClick={addGovernanceValue} className="text-wine text-sm hover:text-wine-dark font-medium">+ Add</button>
          </div>
          <div className="space-y-2">
            {data.governanceValues.map((v, i) => (
              <div key={i} className="flex gap-2">
                <input value={v} onChange={(e) => setGovernanceValue(i, e.target.value)} className={inputClass} />
                <button onClick={() => removeGovernanceValue(i)} className="text-red-400 hover:text-red-600 text-lg leading-none px-1">✕</button>
              </div>
            ))}
          </div>
        </div>
        <ImageUpload value={data.governanceImage} onChange={(url) => set('governanceImage', url)} folder="about" label="Governance Image" />
      </div>

      {entryEditor('stakeholders', 'Stakeholders')}

      <SaveBar saving={saving} saved={saved} error={error} onSave={() => save(data)} />
    </div>
  );
}
