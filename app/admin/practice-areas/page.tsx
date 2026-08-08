import AdminHeader from '@/components/admin/AdminHeader';
import PracticeAreasEditor from '@/components/admin/sections/PracticeAreasEditor';
import { getDb } from '@/lib/mongodb';
import { defaultPracticeAreas } from '@/lib/seed-data';
import type { PracticeArea } from '@/types';

export default async function PracticeAreasPage() {
  let data: PracticeArea[] = defaultPracticeAreas;
  try {
    const db = await getDb();
    const doc = await db.collection('content').findOne({ section: 'practiceAreas' });
    if (doc?.data) data = doc.data as PracticeArea[];
  } catch {}

  return (
    <>
      <AdminHeader title="Practice Areas" />
      <div className="p-4 sm:p-8 max-w-3xl">
        <PracticeAreasEditor initial={data} />
      </div>
    </>
  );
}
