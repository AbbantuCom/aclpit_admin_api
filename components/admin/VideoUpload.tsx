'use client';

import { useState, useRef } from 'react';
import { uploadToR2 } from '@/lib/upload-client';
import MediaPicker from './MediaPicker';

interface Props {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
}

export default function VideoUpload({ value, onChange, folder = 'videos', label = 'Video' }: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith('video/')) {
      setError('Please select a video file.');
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      setError('Video must be under 200MB.');
      return;
    }

    setError('');
    setUploading(true);
    setProgress(0);

    try {
      const url = await uploadToR2({ file, folder, type: 'video', onProgress: setProgress });
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>

      {value && (
        <div className="mb-3 relative w-full rounded-xl overflow-hidden border border-gray-200 bg-black">
          <video src={value} className="w-full max-h-48" controls />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      <div
        className="border-2 border-dashed border-gray-300 hover:border-pine rounded-xl p-6 text-center cursor-pointer transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      >
        {uploading ? (
          <div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div className="bg-pine h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-sm text-gray-500">
              {progress < 90 ? `Uploading… ${progress}%` : 'Compressing video…'}
            </p>
          </div>
        ) : (
          <>
            <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-2.72a.75.75 0 011.13.65v7.14a.75.75 0 01-1.13.65l-4.72-2.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-7.5A2.25 2.25 0 0013.5 6.75h-9A2.25 2.25 0 002.25 9v7.5a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <p className="text-sm text-gray-500">Click or drag & drop to upload</p>
            <p className="text-xs text-gray-400 mt-1">MP4, MOV, WebM — max 200MB</p>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => setPicking(true)}
        disabled={uploading}
        className="mt-2 w-full flex items-center justify-center gap-2 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-wine hover:text-wine transition-colors disabled:opacity-60"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M18 10.5h.008v.008H18V10.5zM2.25 19.5V4.5A2.25 2.25 0 014.5 2.25h15A2.25 2.25 0 0121.75 4.5v15a2.25 2.25 0 01-2.25 2.25h-15A2.25 2.25 0 012.25 19.5z" />
        </svg>
        Choose from Media Library
      </button>

      <div className="mt-2">
        <input
          type="url"
          placeholder="Or paste a video URL…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-pine focus:ring-2 focus:ring-pine/15"
        />
      </div>

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

      <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

      {picking && (
        <MediaPicker
          kind="video"
          onSelect={(url) => { onChange(url); setError(''); }}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  );
}
