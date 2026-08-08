'use client';

import { useState, useEffect } from 'react';
import { getFirebaseAuth } from '@/lib/firebase';

interface MediaFile {
  key: string;
  url: string;
  size: number;
  lastModified: string;
  inUse: boolean;
}

async function authHeader() {
  const token = await getFirebaseAuth().currentUser?.getIdToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isVideo(key: string): boolean {
  return /\.(mp4|webm|mov)$/i.test(key);
}

export default function MediaLibrary() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const headers = await authHeader();
    const res = await fetch('/api/media', { headers });
    if (res.ok) {
      const data = await res.json();
      setFiles(data.files);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function remove(file: MediaFile) {
    const message = file.inUse
      ? `"${file.key}" appears to still be used somewhere on the site. Delete anyway? This will break that image/video until it's replaced.`
      : `Delete "${file.key}"? This cannot be undone.`;
    if (!confirm(message)) return;

    setError('');
    const headers = await authHeader();
    const res = await fetch('/api/media', { method: 'DELETE', headers, body: JSON.stringify({ key: file.key }) });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to delete file');
      return;
    }
    setFiles((prev) => prev.filter((f) => f.key !== file.key));
  }

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading media…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">{files.length} file{files.length === 1 ? '' : 's'} in storage</h2>
        <button onClick={load} className="text-pine hover:text-forest text-sm font-medium">Refresh</button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {files.length === 0 ? (
        <p className="text-gray-500 text-sm">No uploaded media yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((file) => (
            <div key={file.key} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="h-32 bg-gray-100 relative">
                {isVideo(file.key) ? (
                  <video src={file.url} className="w-full h-full object-cover" muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.url} alt={file.key} className="w-full h-full object-cover" />
                )}
                <span
                  className={`absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    file.inUse ? 'bg-pine text-white' : 'bg-amber-500 text-white'
                  }`}
                >
                  {file.inUse ? 'In use' : 'Unused'}
                </span>
              </div>
              <div className="p-3">
                <p className="text-xs text-gray-700 truncate" title={file.key}>{file.key}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatBytes(file.size)} · {new Date(file.lastModified).toLocaleDateString()}
                </p>
                <button
                  onClick={() => remove(file)}
                  className="mt-2 text-red-500 hover:text-red-700 text-xs font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
