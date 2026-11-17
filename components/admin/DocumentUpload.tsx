'use client';

import { useState, useRef, useId } from 'react';
import { uploadDocumentToR2 } from '@/lib/document-upload-client';
import MediaPicker from './MediaPicker';

interface Props {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  /**
   * Called once a PDF has actually been chosen — after an upload finishes, a
   * library pick, or when a typed link is confirmed (Enter or leaving the field).
   * `onChange` fires on every keystroke of a typed link, so it can't be used for
   * work that should happen once per document.
   */
  onCommit?: (url: string) => void;
}

export default function DocumentUpload({ value, onChange, onCommit, folder = 'documents', label = 'Document' }: Props) {
  const linkId = useId();
  const committed = useRef(value);

  function commit(url: string) {
    const trimmed = url.trim();
    if (!trimmed || trimmed === committed.current) return;
    committed.current = trimmed;
    onCommit?.(trimmed);
  }
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);
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
      const url = await uploadDocumentToR2({ file, folder, onProgress: setProgress });
      onChange(url);
      commit(url);
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
            onClick={() => { onChange(''); committed.current = ''; }}
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

      <div className="flex items-center gap-3 my-4" aria-hidden="true">
        <span className="h-px flex-1 bg-gray-200" />
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">or</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
        <label htmlFor={linkId} className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
          <svg className="w-4 h-4 text-wine" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
          Paste a link to the PDF
        </label>
        <input
          id={linkId}
          type="url"
          inputMode="url"
          placeholder="https://drive.google.com/file/d/…   or   https://example.org/report.pdf"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit(e.currentTarget.value);
            }
          }}
          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-wine focus:ring-2 focus:ring-wine/15"
        />
        <p className="text-xs text-gray-500 mt-1.5">
          Use this instead of uploading if the PDF is already online — a Google Drive file (sharing set to
          &ldquo;Anyone with the link&rdquo;), Dropbox, or any web address that opens a PDF. Press Enter or click
          outside the box when done.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setPicking(true)}
        disabled={uploading}
        className="mt-3 w-full flex items-center justify-center gap-2 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-wine hover:text-wine transition-colors disabled:opacity-60"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M18 10.5h.008v.008H18V10.5zM2.25 19.5V4.5A2.25 2.25 0 014.5 2.25h15A2.25 2.25 0 0121.75 4.5v15a2.25 2.25 0 01-2.25 2.25h-15A2.25 2.25 0 012.25 19.5z" />
        </svg>
        Choose from Media Library
      </button>


      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

      <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

      {picking && (
        <MediaPicker
          kind="document"
          onSelect={(url) => { onChange(url); setError(''); commit(url); }}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  );
}
