import AdminHeader from '@/components/admin/AdminHeader';
import PublicationsEditor from '@/components/admin/sections/PublicationsEditor';
import { getDb } from '@/lib/mongodb';
import { defaultPublications } from '@/lib/seed-data';
import type { PublicationItem } from '@/types';

export default async function PublicationsPage() {
  let data: PublicationItem[] = defaultPublications;
  try {
    const db = await getDb();
    const doc = await db.collection('content').findOne({ section: 'publications' });
    if (doc?.data) data = doc.data as PublicationItem[];
  } catch {}

  return (
    <>
      <AdminHeader title="Publications" />
      <div className="p-4 sm:p-8 max-w-3xl">
        <PublicationsEditor initial={data} />
      </div>
    </>
  );
}
