'use client';

import { useEffect, useId, useState } from 'react';
import { readJsonResponse } from '@/lib/api-response';

interface Settings {
  recipients: string[];
  canEdit: boolean;
  emailConfigured: boolean;
  maxRecipients: number;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * "Who gets emailed about new messages" — shown at the top of the Messages page.
 * Every change saves immediately; there is no separate Save button to forget.
 */
export default function MessageNotificationSettings() {
  const inputId = useId();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    fetch('/api/contact/notifications')
      .then((res) => readJsonResponse<Settings>(res, 'Loading notification settings'))
      .then(setSettings)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load notification settings.'));
  }, []);

  async function save(recipients: string[], successMessage: string) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/contact/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients }),
      });
      const data = await readJsonResponse<{ recipients: string[] }>(res, 'Saving');
      setSettings((s) => (s ? { ...s, recipients: data.recipients } : s));
      setNotice(successMessage);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function add() {
    if (!settings) return;
    const email = draft.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL_PATTERN.test(email)) {
      setError(`"${draft.trim()}" is not a valid email address.`);
      return;
    }
    if (settings.recipients.includes(email)) {
      setError(`${email} is already on the list.`);
      return;
    }
    if (await save([...settings.recipients, email], `${email} will now be notified of new messages.`)) setDraft('');
  }

  function remove(email: string) {
    if (!settings) return;
    if (!confirm(`Stop sending message notifications to ${email}?`)) return;
    save(settings.recipients.filter((r) => r !== email), `${email} will no longer be notified.`);
  }

  async function sendTest() {
    setTesting(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/contact/notifications/test', { method: 'POST' });
      const data = await readJsonResponse<{ sentTo: string[]; delivered: boolean }>(res, 'Sending the test email');
      setNotice(
        data.delivered
          ? `Test email sent to ${data.sentTo.join(', ')}. Check the inbox (and spam folder).`
          : 'Email sending is not set up on this server, so the test was only written to the server log.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the test email.');
    } finally {
      setTesting(false);
    }
  }

  const full = settings ? settings.recipients.length >= settings.maxRecipients : false;

  return (
    <section className="bg-white rounded-2xl shadow-sm p-6 mb-6" aria-labelledby={`${inputId}-title`}>
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-full bg-wine/10 text-wine flex items-center justify-center shrink-0" aria-hidden="true">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </span>
        <div className="flex-1 min-w-0">
          <h2 id={`${inputId}-title`} className="font-semibold text-gray-800">Email notifications</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            When someone sends a message through the contact form on the website, an email is sent to these
            addresses so they know to come and view it here.
          </p>
        </div>
      </div>

      {!settings && !error && <p className="text-sm text-gray-400 mt-4">Loading…</p>}

      {settings && (
        <div className="mt-4 space-y-4">
          {!settings.emailConfigured && (
            <p className="text-sm bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-3 py-2">
              Email sending is not set up on this server yet (the <code>RESEND_API_KEY</code> setting is missing), so
              notifications are only written to the server log. Addresses saved here will start receiving emails as
              soon as it is configured.
            </p>
          )}

          {settings.recipients.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No one is notified yet — new messages only appear on this page.</p>
          ) : (
            <ul className="flex flex-wrap gap-2" aria-label="Notified email addresses">
              {settings.recipients.map((email) => (
                <li
                  key={email}
                  className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full pl-3 pr-1.5 py-1 text-sm text-gray-700"
                >
                  {email}
                  {settings.canEdit && (
                    <button
                      type="button"
                      onClick={() => remove(email)}
                      disabled={saving}
                      aria-label={`Stop notifying ${email}`}
                      className="w-5 h-5 rounded-full text-gray-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-xs disabled:opacity-50"
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {settings.canEdit ? (
            <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <div className="flex-1">
                <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
                  Add an email address to notify
                </label>
                <input
                  id={inputId}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="name@example.org"
                  value={draft}
                  disabled={saving || full}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      add();
                    }
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-wine focus:ring-2 focus:ring-wine/15 disabled:bg-gray-50"
                />
              </div>
              <button
                type="button"
                onClick={add}
                disabled={saving || full || !draft.trim()}
                className="bg-wine text-white text-sm px-4 py-2 rounded-lg hover:bg-wine-dark transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Add'}
              </button>
              <button
                type="button"
                onClick={sendTest}
                disabled={testing || saving || settings.recipients.length === 0}
                className="text-sm border border-gray-200 rounded-lg px-4 py-2 text-gray-700 hover:border-wine hover:text-wine transition-colors disabled:opacity-50"
              >
                {testing ? 'Sending…' : 'Send test email'}
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-500">Only admins can change who receives these notifications.</p>
          )}

          {full && settings.canEdit && (
            <p className="text-xs text-gray-500">
              You have reached the limit of {settings.maxRecipients} addresses. Remove one to add another.
            </p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600 mt-3" role="alert">{error}</p>}
      {notice && <p className="text-sm text-green-700 mt-3" role="status">{notice}</p>}
    </section>
  );
}
