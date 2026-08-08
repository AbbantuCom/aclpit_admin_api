'use client';

import { useEffect, useState } from 'react';
import SaveBar from '../SaveBar';
import SectionLoading from '../SectionLoading';
import { useContentSave } from '../useContentSave';
import { useSectionContent } from '../useSectionContent';
import { defaultFooter } from '@/lib/seed-data';
import type { FooterContent } from '@/types';

export default function FooterEditor() {
  const { data: content, isLoading } = useSectionContent<FooterContent>('footer', defaultFooter);
  const [data, setData] = useState<FooterContent>(defaultFooter);
  const { save, saving, saved, error } = useContentSave('footer');

  useEffect(() => {
    if (content) setData(content);
  }, [content]);

  function set<K extends keyof FooterContent>(key: K, value: string) {
    setData((d) => ({ ...d, [key]: value }));
  }

  if (isLoading) return <SectionLoading />;

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <h2 className="font-semibold text-gray-800 border-b pb-3">Footer Content</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Brand Description</label>
          <textarea
            value={data.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-wine focus:ring-2 focus:ring-wine/15 resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Copyright Organisation Name</label>
          <input
            value={data.copyrightName}
            onChange={(e) => set('copyrightName', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-wine focus:ring-2 focus:ring-wine/15"
          />
          <p className="text-xs text-gray-400 mt-1">Used as &ldquo;© {new Date().getFullYear()} {data.copyrightName || '…'}. All rights reserved.&rdquo;</p>
        </div>
      </div>
      <SaveBar saving={saving} saved={saved} error={error} onSave={() => save(data)} />
    </div>
  );
}
