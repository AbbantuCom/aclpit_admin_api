'use client';

import { useState, useEffect } from 'react';
import { getFirebaseAuth } from '@/lib/firebase';
import type { ContactSubmission } from '@/types';

async function authHeader() {
  const token = await getFirebaseAuth().currentUser?.getIdToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export default function MessagesManager() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ContactSubmission | null>(null);

  async function load() {
    setLoading(true);
    const headers = await authHeader();
    const res = await fetch('/api/contact', { headers });
    if (res.ok) {
      const data = await res.json();
      setSubmissions(data.submissions);

      // Viewing the table is what counts as "read" — mark any unread ones now,
      // in the database and in the UI, so they stop counting as new.
      if (data.submissions.some((s: ContactSubmission) => !s.read)) {
        await fetch('/api/contact', { method: 'PATCH', headers });
        setSubmissions((prev) => prev.map((s) => ({ ...s, read: true })));
      }
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleRead(id: string, read: boolean) {
    const headers = await authHeader();
    await fetch(`/api/contact/${id}`, { method: 'PATCH', headers, body: JSON.stringify({ read }) });
    setSubmissions((prev) => prev.map((s) => (s._id === id ? { ...s, read } : s)));
    setSelected((prev) => (prev?._id === id ? { ...prev, read } : prev));
  }

  async function toggleContacted(id: string, contacted: boolean) {
    const headers = await authHeader();
    await fetch(`/api/contact/${id}`, { method: 'PATCH', headers, body: JSON.stringify({ contacted }) });
    setSubmissions((prev) => prev.map((s) => (s._id === id ? { ...s, contacted } : s)));
    setSelected((prev) => (prev?._id === id ? { ...prev, contacted } : prev));
  }

  async function remove(id: string) {
    if (!confirm('Delete this message?')) return;
    const headers = await authHeader();
    await fetch(`/api/contact/${id}`, { method: 'DELETE', headers });
    setSubmissions((prev) => prev.filter((s) => s._id !== id));
    setSelected((prev) => (prev?._id === id ? null : prev));
  }

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading messages…</div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-6 pb-0">
        <h2 className="font-semibold text-gray-800">
          Contact Submissions ({submissions.length})
        </h2>
      </div>

      {submissions.length === 0 ? (
        <p className="text-gray-500 text-sm p-6">No messages yet.</p>
      ) : (
        <div className="overflow-x-auto p-6 pt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100">
                <th className="pb-3 pr-4 font-semibold">Name</th>
                <th className="pb-3 pr-4 font-semibold">Email</th>
                <th className="pb-3 pr-4 font-semibold">Subject</th>
                <th className="pb-3 pr-4 font-semibold">Message</th>
                <th className="pb-3 pr-4 font-semibold">Date</th>
                <th className="pb-3 pr-4 font-semibold">Status</th>
                <th className="pb-3 pr-4 font-semibold">Contacted</th>
                <th className="pb-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr
                  key={s._id}
                  onClick={() => setSelected(s)}
                  className={`border-b border-gray-50 cursor-pointer hover:bg-gray-50 ${s.read ? '' : 'bg-pine/5'}`}
                >
                  <td className="py-3 pr-4 font-medium text-gray-800 whitespace-nowrap">{s.name}</td>
                  <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">
                    <a href={`mailto:${s.email}`} onClick={(e) => e.stopPropagation()} className="hover:text-pine">{s.email}</a>
                  </td>
                  <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">{s.subject}</td>
                  <td className="py-3 pr-4 text-gray-600 max-w-xs truncate" title={s.message}>{s.message}</td>
                  <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                    {new Date(s.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleRead(s._id, !s.read); }}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        s.read ? 'bg-gray-100 text-gray-600' : 'bg-pine text-white'
                      }`}
                    >
                      {s.read ? 'Read' : 'New'}
                    </button>
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleContacted(s._id, !s.contacted); }}
                      title={s.contacted ? 'Mark as not contacted' : 'Mark as contacted'}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        s.contacted ? 'bg-pine text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      ✓
                    </button>
                  </td>
                  <td className="py-3 whitespace-nowrap">
                    <button onClick={(e) => { e.stopPropagation(); remove(s._id); }} className="text-red-400 hover:text-red-600 text-xs">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-800">{selected.subject}</h3>
                <p className="text-xs text-gray-500 mt-1">{new Date(selected.createdAt).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">From</p>
                <p className="text-gray-800">{selected.name}</p>
                <a href={`mailto:${selected.email}`} className="text-pine hover:underline">{selected.email}</a>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Message</p>
                <p className="text-gray-700 whitespace-pre-wrap">{selected.message}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => toggleContacted(selected._id, !selected.contacted)}
                className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full transition-colors ${
                  selected.contacted ? 'bg-pine text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <span>✓</span> {selected.contacted ? 'Contacted' : 'Mark as contacted'}
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => remove(selected._id)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  Delete
                </button>
                <a
                  href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-forest hover:bg-pine text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                  Reply
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
