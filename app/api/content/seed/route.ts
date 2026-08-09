import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import {
  defaultHero,
  defaultAbout,
  defaultServices,
  defaultPracticeAreas,
  defaultPublications,
  defaultDialogues,
  defaultContact,
  defaultFooter,
} from '@/lib/seed-data';

const sections = [
  { section: 'hero',          data: defaultHero },
  { section: 'about',         data: defaultAbout },
  { section: 'services',      data: defaultServices },
  { section: 'practiceAreas', data: defaultPracticeAreas },
  { section: 'publications',  data: defaultPublications },
  { section: 'dialogues',     data: defaultDialogues },
  { section: 'contact',       data: defaultContact },
  { section: 'footer',        data: defaultFooter },
];

export async function POST() {
  const db = await getDb();
  const now = new Date().toISOString();

  // Seeded content starts out live: draft and published hold the same snapshot,
  // so a freshly seeded section reports no pending changes.
  for (const s of sections) {
    const exists = await db.collection('content').findOne({ section: s.section });
    if (!exists) {
      await db.collection('content').insertOne({
        section: s.section,
        draft: s.data,
        published: s.data,
        draftUpdatedAt: now,
        draftUpdatedBy: 'system',
        publishedAt: now,
        publishedBy: 'system',
      });
    }
  }

  return NextResponse.json({ ok: true, seeded: sections.map((s) => s.section) });
}
