import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireRole, authError } from '@/lib/session';
import {
  CONTENT_SECTIONS,
  SECTION_LABELS,
  toContentState,
  type ContentDoc,
  type ContentSectionName,
} from '@/lib/content';
import { CONTENT_ROLES } from '@/types';

export interface SectionStatus {
  section: ContentSectionName;
  label: string;
  hasUnpublishedChanges: boolean;
  neverPublished: boolean;
  draftUpdatedAt: string | null;
  draftUpdatedBy: string | null;
  draftUpdatedByName: string | null;
  publishedAt: string | null;
}

/**
 * GET /api/content/status
 *
 * Publish state for every section in one round trip — powers the sidebar's
 * pending badge and the review screen. One query per collection, not per section.
 */
export async function GET() {
  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) return authError(auth.failure);

  const db = await getDb();
  const docs = await db
    .collection<ContentDoc>('content')
    .find({ section: { $in: [...CONTENT_SECTIONS] } })
    .toArray();

  const bySection = new Map(docs.map((doc) => [doc.section, doc]));

  const editorUids = [...new Set(docs.map((d) => d.draftUpdatedBy).filter((v): v is string => !!v))];
  const editors = editorUids.length
    ? await db
        .collection<{ uid: string; displayName: string }>('users')
        .find({ uid: { $in: editorUids } }, { projection: { uid: 1, displayName: 1 } })
        .toArray()
    : [];
  const nameByUid = new Map(editors.map((u) => [u.uid, u.displayName]));

  const sections: SectionStatus[] = CONTENT_SECTIONS.map((section) => {
    const state = toContentState(bySection.get(section) ?? null);
    return {
      section,
      label: SECTION_LABELS[section],
      hasUnpublishedChanges: state.hasUnpublishedChanges,
      neverPublished: state.neverPublished,
      draftUpdatedAt: state.draftUpdatedAt,
      draftUpdatedBy: state.draftUpdatedBy,
      draftUpdatedByName: state.draftUpdatedBy ? nameByUid.get(state.draftUpdatedBy) ?? null : null,
      publishedAt: state.publishedAt,
    };
  });

  return NextResponse.json({
    sections,
    pendingCount: sections.filter((s) => s.hasUnpublishedChanges).length,
  });
}
