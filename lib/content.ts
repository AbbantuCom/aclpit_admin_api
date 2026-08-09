import type { Db } from 'mongodb';

/**
 * A row in the `content` collection.
 *
 * Every section carries two independent copies of its content:
 *
 *   draft     — what the admin panel edits and saves. Never reaches the public site
 *               except through an authenticated preview.
 *   published — what the public site reads. Only a publish action overwrites it.
 *
 * `data` is the pre-draft/publish shape, where a save went straight live. Documents
 * written before this feature still only have `data`, so every read goes through
 * readContent() below, which treats a legacy `data` as both states at once.
 */
export interface ContentDoc {
  section: string;
  /** @deprecated Legacy single-state field. Read via readContent(), never directly. */
  data?: unknown;
  draft?: unknown;
  published?: unknown;
  draftUpdatedAt?: string;
  draftUpdatedBy?: string;
  publishedAt?: string;
  publishedBy?: string;
}

export interface ContentState {
  draft: unknown;
  published: unknown;
  draftUpdatedAt: string | null;
  draftUpdatedBy: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
  /** True when the draft holds edits that the public site is not serving yet. */
  hasUnpublishedChanges: boolean;
  /** True when nothing has ever been published for this section. */
  neverPublished: boolean;
}

/**
 * Key-sorted JSON, so two objects that differ only in property order compare equal.
 * Editors rebuild their state object on every keystroke, and Mongo does not promise
 * to hand back keys in insertion order, so a plain JSON.stringify comparison would
 * report phantom "unpublished changes".
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(',')}}`;
}

export function contentEquals(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

/**
 * Normalises a raw document into both states.
 *
 * Legacy documents (only `data`) are reported as published with no pending changes:
 * whatever was there before this feature existed was, by definition, already live.
 */
export function toContentState(doc: ContentDoc | null): ContentState {
  const published = doc?.published ?? doc?.data ?? null;
  // A section that has never been edited since publishing has no draft row of its
  // own — the published copy is the starting point for the next edit.
  const draft = doc?.draft ?? published;

  return {
    draft,
    published,
    draftUpdatedAt: doc?.draftUpdatedAt ?? null,
    draftUpdatedBy: doc?.draftUpdatedBy ?? null,
    publishedAt: doc?.publishedAt ?? null,
    publishedBy: doc?.publishedBy ?? null,
    hasUnpublishedChanges: !contentEquals(draft, published),
    neverPublished: published === null,
  };
}

export async function readContent(db: Db, section: string): Promise<ContentState> {
  const doc = await db.collection<ContentDoc>('content').findOne({ section });
  return toContentState(doc);
}

export type PublishResult =
  | { status: 'published'; publishedAt: string }
  | { status: 'unchanged'; publishedAt: string | null }
  | { status: 'empty' };

/**
 * Promotes a section's draft to published. Shared by the single-section publish
 * route and "publish everything pending", so both write exactly the same shape.
 *
 * Callers are responsible for pinging the client's cache afterwards — only they
 * know whether they are publishing one section or batching several.
 */
export async function publishSection(
  db: Db,
  section: string,
  uid: string
): Promise<PublishResult> {
  const state = await readContent(db, section);

  if (state.draft === null) return { status: 'empty' };
  if (!state.hasUnpublishedChanges) {
    return { status: 'unchanged', publishedAt: state.publishedAt };
  }

  const now = new Date().toISOString();

  await db.collection<ContentDoc>('content').updateOne(
    { section },
    {
      $set: {
        section,
        published: state.draft,
        draft: state.draft,
        publishedAt: now,
        publishedBy: uid,
      },
      // Drop the pre-draft/publish field so a stale copy can never be mistaken
      // for the live content by toContentState()'s legacy fallback.
      $unset: { data: '' },
    },
    { upsert: true }
  );

  return { status: 'published', publishedAt: now };
}

/** Every section the public site renders, in the order the admin sidebar lists them. */
export const CONTENT_SECTIONS = [
  'hero',
  'about',
  'services',
  'practiceAreas',
  'publications',
  'dialogues',
  'contact',
  'footer',
] as const;

export type ContentSectionName = (typeof CONTENT_SECTIONS)[number];

export function isContentSection(value: string): value is ContentSectionName {
  return (CONTENT_SECTIONS as readonly string[]).includes(value);
}

/** Human-readable section names, for the pending-changes review screen. */
export const SECTION_LABELS: Record<ContentSectionName, string> = {
  hero: 'Hero',
  about: 'About',
  services: 'Services',
  practiceAreas: 'Practice Areas',
  publications: 'Publications',
  dialogues: 'Dialogues',
  contact: 'Contact',
  footer: 'Footer',
};
