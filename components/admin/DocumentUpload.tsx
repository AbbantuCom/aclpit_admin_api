'use client';

import { useState, useRef } from 'react';
import { getFirebaseAuth } from '@/lib/firebase';
import { uploadDocumentToR2 } from '@/lib/document-upload-client';

interface Props {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
}

export default function DocumentUpload({ value, onChange, folder = 'documents', label = 'Document' }: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('PDF must be under 20MB.');
      return;
    }

    setError('');
    setUploading(true);
    setProgress(0);

    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      const url = await uploadDocumentToR2({ file, folder, token, onProgress: setProgress });
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
        <div className="mb-3 flex items-center gap-3 border border-gray-200 rounded-xl p-3">
          <svg className="w-8 h-8 text-wine shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-wine hover:underline truncate flex-1">
            {value.split('/').pop()}
          </a>
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-red-400 hover:text-red-600 text-xs shrink-0"
          >
            Remove
          </button>
        </div>
      )}

      <div
        className="border-2 border-dashed border-gray-300 hover:border-wine rounded-xl p-6 text-center cursor-pointer transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      >
        {uploading ? (
          <div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div className="bg-wine h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-sm text-gray-500">Uploading… {progress}%</p>
          </div>
        ) : (
          <>
            <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm text-gray-500">Click or drag & drop to upload</p>
            <p className="text-xs text-gray-400 mt-1">PDF only — max 20MB</p>
          </>
        )}
      </div>

      <div className="mt-2">
        <input
          type="url"
          placeholder="Or paste a document link…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-wine focus:ring-2 focus:ring-wine/15"
        />
      </div>

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

      <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
}
