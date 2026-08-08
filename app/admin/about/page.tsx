import AdminHeader from '@/components/admin/AdminHeader';
import AboutEditor from '@/components/admin/sections/AboutEditor';
import { getDb } from '@/lib/mongodb';
import { defaultAbout } from '@/lib/seed-data';
import type { AboutContent } from '@/types';

export default async function AboutPage() {
  let data: AboutContent = defaultAbout;
  try {
    const db = await getDb();
    const doc = await db.collection('content').findOne({ section: 'about' });
    if (doc?.data) data = doc.data as AboutContent;
  } catch {}

  return (
    <>
      <AdminHeader title="About Section" />
      <div className="p-4 sm:p-8 max-w-3xl">
        <AboutEditor initial={data} />
      </div>
    </>
  );
}
