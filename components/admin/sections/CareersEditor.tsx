'use client';

import { useEffect, useState } from 'react';
import SaveBar from '../SaveBar';
import SectionLoading from '../SectionLoading';
import { useContentSave } from '../useContentSave';
import { useSectionContent } from '../useSectionContent';
import { defaultCareers } from '@/lib/seed-data';
import { isValidEmail } from '@/lib/validation';
import { JOB_TYPES, type CareersContent, type JobPosting } from '@/types';

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-wine focus:ring-2 focus:ring-wine/15';

/** Today in Kampala (EAT), as YYYY-MM-DD — deadlines are dates in the Centre's own time zone. */
function todayInKampala(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala' }).format(new Date());
}

/** A deadline is the last day to apply, so a job closes the day after it. */
function isPastDeadline(job: JobPosting): boolean {
  return Boolean(job.deadline) && job.deadline < todayInKampala();
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Editable list of one-line points (responsibilities, requirements). */
function PointList({
  label,
  hint,
  values,
  onChange,
}: {
  label: string;
  hint: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <button type="button" onClick={() => onChange([...values, ''])} className="text-wine text-sm hover:text-wine-dark font-medium">
          + Add
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-2">{hint}</p>
      <div className="space-y-2">
        {values.map((v, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={v}
              onChange={(e) => onChange(values.map((x, n) => (n === i ? e.target.value : x)))}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, n) => n !== i))}
              className="text-red-400 hover:text-red-600 text-lg leading-none px-1"
              aria-label={`Remove ${label.toLowerCase()} point`}
            >
              ✕
            </button>
          </div>
        ))}
        {values.length === 0 && <p className="text-xs text-gray-400 italic">None yet.</p>}
      </div>
    </div>
  );
}

export default function CareersEditor() {
  const { data: content, isLoading } = useSectionContent<CareersContent>('careers', defaultCareers);
  const [page, setPage] = useState<CareersContent>(defaultCareers);
  const { save, ...workflow } = useContentSave('careers');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (content) {
      setPage({
        ...defaultCareers,
        ...content,
        jobs: [...(content.jobs ?? [])].sort((a, b) => a.order - b.order),
      });
    }
  }, [content]);

  const jobs = page.jobs;
  const setJobs = (fn: (jobs: JobPosting[]) => JobPosting[]) => setPage((p) => ({ ...p, jobs: fn(p.jobs) }));

  function update(id: string, patch: Partial<JobPosting>) {
    setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }

  function addJob() {
    const job: JobPosting = {
      id: `job-${Date.now()}`,
      title: 'New Position',
      department: '',
      location: 'Kampala, Uganda',
      employmentType: 'Full-time',
      summary: '',
      description: '',
      responsibilities: [],
      requirements: [],
      deadline: '',
      postedDate: todayInKampala(),
      applicationEmail: '',
      order: jobs.length + 1,
      enabled: true,
    };
    setJobs((js) => [...js, job]);
    setExpanded(job.id);
  }

  function removeJob(id: string) {
    if (!confirm('Delete this job posting?')) return;
    setJobs((js) => js.filter((j) => j.id !== id));
  }

  function moveJob(id: string, dir: -1 | 1) {
    const idx = jobs.findIndex((j) => j.id === id);
    if (idx + dir < 0 || idx + dir >= jobs.length) return;
    const updated = [...jobs];
    [updated[idx], updated[idx + dir]] = [updated[idx + dir], updated[idx]];
    setJobs(() => updated.map((j, n) => ({ ...j, order: n + 1 })));
  }

  /** Refuses to save an email address that the "Apply" button couldn't send to. */
  function validate(): string {
    if (!page.applicationEmail.trim()) return 'Add the email address applications should be sent to.';
    if (!isValidEmail(page.applicationEmail.trim())) return `“${page.applicationEmail}” is not a valid email address.`;
    const badJob = jobs.find((j) => j.applicationEmail?.trim() && !isValidEmail(j.applicationEmail.trim()));
    if (badJob) return `The application email for “${badJob.title}” is not a valid email address.`;
    const untitled = jobs.find((j) => !j.title.trim());
    if (untitled) return 'Every job needs a title.';
    return '';
  }

  async function onSave() {
    const error = validate();
    setValidationError(error);
    if (error) return false;
    const clean: CareersContent = {
      ...page,
      applicationEmail: page.applicationEmail.trim(),
      jobs: jobs.map((j) => ({
        ...j,
        applicationEmail: j.applicationEmail?.trim() ?? '',
        // Blank points left over from "+ Add" would render as empty bullets.
        responsibilities: j.responsibilities.map((r) => r.trim()).filter(Boolean),
        requirements: j.requirements.map((r) => r.trim()).filter(Boolean),
      })),
    };
    setPage(clean);
    return save(clean);
  }

  if (isLoading) return <SectionLoading />;

  const emailInvalid = Boolean(page.applicationEmail.trim()) && !isValidEmail(page.applicationEmail.trim());

  return (
    <div className="space-y-6">
      {/* ── Page-wide settings ── */}
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Careers page</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Application email</label>
          <input
            type="email"
            placeholder="careers@aclpit.com"
            value={page.applicationEmail}
            onChange={(e) => setPage((p) => ({ ...p, applicationEmail: e.target.value }))}
            className={`${inputClass} ${emailInvalid ? 'border-red-300' : ''}`}
          />
          <p className={`text-xs mt-1 ${emailInvalid ? 'text-red-600' : 'text-gray-500'}`}>
            {emailInvalid
              ? 'This doesn’t look like a valid email address.'
              : 'Shown on the Careers page. Every job’s “Apply by Email” button opens an email to this address, with the job title as the subject.'}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Introduction</label>
          <textarea
            value={page.intro}
            onChange={(e) => setPage((p) => ({ ...p, intro: e.target.value }))}
            rows={3}
            className={`${inputClass} resize-none`}
          />
          <p className="text-xs text-gray-500 mt-1">Shown at the top of the Careers page.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">How to apply</label>
          <textarea
            value={page.howToApply}
            onChange={(e) => setPage((p) => ({ ...p, howToApply: e.target.value }))}
            rows={2}
            className={`${inputClass} resize-none`}
          />
          <p className="text-xs text-gray-500 mt-1">Shown on every job, next to the Apply button — e.g. which documents to send.</p>
        </div>
      </div>

      {/* ── Jobs ── */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">
          Jobs <span className="text-gray-400 font-normal">({jobs.length})</span>
        </h2>
        <button onClick={addJob} className="bg-wine text-white text-sm px-4 py-2 rounded-xl hover:bg-wine-dark transition-colors">
          + Add Job
        </button>
      </div>

      {jobs.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-sm text-gray-500">
          No jobs yet. The Careers page tells visitors there are no openings right now. Click “+ Add Job” to post one.
        </div>
      )}

      {jobs.map((job) => {
        const enabled = job.enabled !== false;
        const closed = isPastDeadline(job);
        return (
          <div key={job.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded(expanded === job.id ? null : job.id)}>
              <div className="flex flex-col gap-0.5">
                <button onClick={(e) => { e.stopPropagation(); moveJob(job.id, -1); }} className="text-gray-400 hover:text-gray-600 text-xs leading-none" aria-label="Move up">▲</button>
                <button onClick={(e) => { e.stopPropagation(); moveJob(job.id, 1); }} className="text-gray-400 hover:text-gray-600 text-xs leading-none" aria-label="Move down">▼</button>
              </div>
              <div className={`flex-1 min-w-0 ${enabled ? '' : 'opacity-50'}`}>
                <p className="font-medium text-gray-800 truncate">{job.title || 'Untitled position'}</p>
                <p className="text-xs text-gray-500 truncate">
                  {closed ? (
                    <span className="inline-block rounded-full bg-gray-100 text-gray-600 font-medium px-2 py-0.5 mr-1.5">Closed</span>
                  ) : (
                    <span className="inline-block rounded-full bg-green-50 text-green-700 font-medium px-2 py-0.5 mr-1.5">Open</span>
                  )}
                  {[job.employmentType, job.location, job.deadline ? `Deadline ${formatDate(job.deadline)}` : 'No deadline']
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <label
                className="flex items-center gap-2 cursor-pointer select-none"
                onClick={(e) => e.stopPropagation()}
                title={enabled ? 'Shown on the public site — click to hide' : 'Hidden from the public site — click to show'}
              >
                <span className={`text-xs font-medium ${enabled ? 'text-green-700' : 'text-gray-400'}`}>
                  {enabled ? 'Enabled' : 'Disabled'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={`Show "${job.title || 'Untitled position'}" on the public site`}
                  onClick={() => update(job.id, { enabled: !enabled })}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-wine/40 ${enabled ? 'bg-wine' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : ''}`} />
                </button>
              </label>
              <button onClick={(e) => { e.stopPropagation(); removeJob(job.id); }} className="text-red-400 hover:text-red-600 text-sm px-2" aria-label="Delete job">✕</button>
              <span className="text-gray-400 text-sm">{expanded === job.id ? '▲' : '▼'}</span>
            </div>

            {expanded === job.id && (
              <div className="border-t border-gray-100 p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job title</label>
                  <input value={job.title} onChange={(e) => update(job.id, { title: e.target.value })} className={inputClass} />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select value={job.employmentType} onChange={(e) => update(job.id, { employmentType: e.target.value })} className={inputClass}>
                      {JOB_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input placeholder="Kampala, Uganda / Remote" value={job.location} onChange={(e) => update(job.id, { location: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department <span className="font-normal text-gray-400">(optional)</span></label>
                    <input placeholder="e.g. Research, Litigation" value={job.department} onChange={(e) => update(job.id, { department: e.target.value })} className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Posted</label>
                      <input type="date" value={job.postedDate} onChange={(e) => update(job.id, { postedDate: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                      <input type="date" value={job.deadline} onChange={(e) => update(job.id, { deadline: e.target.value })} className={inputClass} />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 -mt-2">
                  The deadline is the last day to apply. After it, the job leaves the Careers list and its page says applications have closed. Leave it empty for “open until filled”.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
                  <textarea value={job.summary} onChange={(e) => update(job.id, { summary: e.target.value })} rows={2} className={`${inputClass} resize-none`} />
                  <p className="text-xs text-gray-500 mt-1">One or two sentences, shown on the job’s card in the list.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">About the role</label>
                  <textarea value={job.description} onChange={(e) => update(job.id, { description: e.target.value })} rows={6} className={`${inputClass} resize-y`} />
                  <p className="text-xs text-gray-500 mt-1">The full description. Leave a blank line between paragraphs.</p>
                </div>

                <PointList
                  label="Responsibilities"
                  hint="What the person will do — one point per line."
                  values={job.responsibilities}
                  onChange={(responsibilities) => update(job.id, { responsibilities })}
                />
                <PointList
                  label="Requirements"
                  hint="Qualifications, experience and skills — one point per line."
                  values={job.requirements}
                  onChange={(requirements) => update(job.id, { requirements })}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Application email for this job <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder={page.applicationEmail || 'Uses the Careers page email'}
                    value={job.applicationEmail ?? ''}
                    onChange={(e) => update(job.id, { applicationEmail: e.target.value })}
                    className={inputClass}
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to use the Careers page email above.</p>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {validationError && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{validationError}</p>
      )}

      <SaveBar {...workflow} onSave={onSave} />
    </div>
  );
}
