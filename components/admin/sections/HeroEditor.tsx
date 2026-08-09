'use client';

import { useEffect, useState } from 'react';
import ImageUpload from '../ImageUpload';
import SaveBar from '../SaveBar';
import SectionLoading from '../SectionLoading';
import { useContentSave } from '../useContentSave';
import { useSectionContent } from '../useSectionContent';
import { defaultHero } from '@/lib/seed-data';
import type { HeroContent } from '@/types';

export default function HeroEditor() {
  const { data: content, isLoading } = useSectionContent<HeroContent>('hero', defaultHero);
  const [data, setData] = useState<HeroContent>(defaultHero);
  const { save, ...workflow } = useContentSave('hero');

  useEffect(() => {
    if (content) setData(content);
  }, [content]);

  function set<K extends keyof HeroContent>(key: K, value: HeroContent[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  if (isLoading) return <SectionLoading />;

  const field = (label: string, key: keyof HeroContent, type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={data[key] as string}
        onChange={(e) => set(key, e.target.value as HeroContent[typeof key])}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-wine focus:ring-2 focus:ring-wine/15"
      />
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <h2 className="font-semibold text-gray-800 border-b pb-3">Hero Text</h2>
        {field('Kicker (small text above title)', 'kicker')}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Main Title</label>
          <input
            value={data.title}
            onChange={(e) => set('title', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-wine focus:ring-2 focus:ring-wine/15"
          />
          <p className="text-xs text-gray-400 mt-1">Full title text, e.g. &ldquo;Where African law meets technology, we stand for the public interest.&rdquo;</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Highlighted Word or Phrase</label>
          <input
            value={data.titleHighlight}
            onChange={(e) => set('titleHighlight', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-wine focus:ring-2 focus:ring-wine/15"
          />
          <p className="text-xs text-gray-400 mt-1">The word or phrase within the title to render in the accent colour, e.g. &ldquo;technology&rdquo;.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={data.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-wine focus:ring-2 focus:ring-wine/15 resize-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <h2 className="font-semibold text-gray-800 border-b pb-3">CTA Buttons</h2>
        <div className="grid grid-cols-2 gap-4">
          {field('Primary Button Text', 'primaryCtaText')}
          {field('Primary Button Link', 'primaryCtaHref')}
          {field('Secondary Button Text', 'secondaryCtaText')}
          {field('Secondary Button Link', 'secondaryCtaHref')}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <h2 className="font-semibold text-gray-800 border-b pb-3">Hero Image</h2>
        <ImageUpload value={data.image} onChange={(url) => set('image', url)} folder="hero" label="Hero Image" />
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <h2 className="font-semibold text-gray-800 border-b pb-3">Vision Badge</h2>
        {field('Badge Label', 'visionLabel')}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Badge Text</label>
          <textarea
            value={data.visionText}
            onChange={(e) => set('visionText', e.target.value)}
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-wine focus:ring-2 focus:ring-wine/15 resize-none"
          />
        </div>
      </div>

      <SaveBar {...workflow} onSave={() => save(data)} />
    </div>
  );
}
