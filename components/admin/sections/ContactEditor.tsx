'use client';

import { useEffect, useState } from 'react';
import SaveBar from '../SaveBar';
import SectionLoading from '../SectionLoading';
import { useContentSave } from '../useContentSave';
import { useSectionContent } from '../useSectionContent';
import { defaultContact } from '@/lib/seed-data';
import { SOCIAL_PLATFORMS, type ContactContent, type ContactSocials } from '@/types';

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-wine focus:ring-2 focus:ring-wine/15';

export default function ContactEditor() {
  const { data: content, isLoading } = useSectionContent<ContactContent>('contact', defaultContact);
  const [data, setData] = useState<ContactContent>(defaultContact);
  const { save, ...workflow } = useContentSave('contact');

  useEffect(() => {
    if (content) setData(content);
  }, [content]);

  function set<K extends keyof ContactContent>(key: K, value: ContactContent[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function setSocial(key: keyof ContactSocials, value: string) {
    setData((d) => ({ ...d, socials: { ...d.socials, [key]: value } }));
  }

  function setTopic(i: number, value: string) {
    const topics = [...data.topics];
    topics[i] = value;
    set('topics', topics);
  }

  function addTopic() {
    set('topics', [...data.topics, '']);
  }

  function removeTopic(i: number) {
    set('topics', data.topics.filter((_, idx) => idx !== i));
  }

  const fields: Array<{ key: keyof ContactContent; label: string; type?: string }> = [
    { key: 'subtitle', label: 'Section Label (small text)' },
    { key: 'title', label: 'Section Title' },
  ];

  const contactFields: Array<{ key: keyof ContactContent; label: string; type?: string }> = [
    { key: 'email', label: 'Email Address', type: 'email' },
    { key: 'phone', label: 'Phone Number' },
    { key: 'address', label: 'Physical Address' },
    { key: 'postalAddress', label: 'Postal Address' },
    { key: 'officeHours', label: 'Office Hours' },
    { key: 'mapEmbedUrl', label: 'Google Maps Embed URL' },
  ];

  if (isLoading) return <SectionLoading />;

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <h2 className="font-semibold text-gray-800 border-b pb-3">Section Text</h2>
        {fields.map(({ key, label, type }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input type={type || 'text'} value={data[key] as string} onChange={(e) => set(key, e.target.value as ContactContent[typeof key])} className={inputClass} />
          </div>
        ))}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea value={data.description} onChange={(e) => set('description', e.target.value)} rows={3} className={`${inputClass} resize-none`} />
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <h2 className="font-semibold text-gray-800 border-b pb-3">Contact Information</h2>
        {contactFields.map(({ key, label, type }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input type={type || 'text'} value={data[key] as string} onChange={(e) => set(key, e.target.value as ContactContent[typeof key])} className={inputClass} />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <div className="border-b pb-3">
          <h2 className="font-semibold text-gray-800">Social Links</h2>
          <p className="text-sm text-gray-500 mt-1">
            Paste a link for each account you have. Only platforms with a link show their icon on the website — in
            the footer and the Contact section. Leave the rest empty.
          </p>
        </div>
        {SOCIAL_PLATFORMS.map(({ key, label, icon, placeholder }) => {
          const value = data.socials?.[key] ?? '';
          const shown = value.trim() !== '';
          return (
            <div key={key}>
              <label htmlFor={`social-${key}`} className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${
                    shown ? 'bg-wine text-white' : 'bg-gray-100 text-gray-400'
                  }`}
                  aria-hidden="true"
                >
                  <i className={`bi ${icon}`} />
                </span>
                {label}
                <span className={`ms-auto text-xs font-normal ${shown ? 'text-green-700' : 'text-gray-400'}`}>
                  {shown ? 'Shown on website' : 'Not shown'}
                </span>
              </label>
              <input
                id={`social-${key}`}
                type="url"
                inputMode="url"
                placeholder={placeholder}
                value={value}
                onChange={(e) => setSocial(key, e.target.value)}
                className={inputClass}
              />
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h2 className="font-semibold text-gray-800">Area of Interest Options</h2>
          <button onClick={addTopic} className="text-wine text-sm hover:text-wine-dark font-medium">+ Add</button>
        </div>
        <div className="space-y-2">
          {data.topics.map((t, i) => (
            <div key={i} className="flex gap-2">
              <input value={t} onChange={(e) => setTopic(i, e.target.value)} className={inputClass} />
              <button onClick={() => removeTopic(i)} className="text-red-400 hover:text-red-600 text-lg leading-none px-1">✕</button>
            </div>
          ))}
        </div>
      </div>

      <SaveBar {...workflow} onSave={() => save(data)} />
    </div>
  );
}
