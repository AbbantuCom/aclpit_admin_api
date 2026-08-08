import AdminHeader from '@/components/admin/AdminHeader';
import HeroEditor from '@/components/admin/sections/HeroEditor';
import { getDb } from '@/lib/mongodb';
import { defaultHero } from '@/lib/seed-data';
import type { HeroContent } from '@/types';

export default async function HeroPage() {
  let data: HeroContent = defaultHero;
  try {
    const db = await getDb();
    const doc = await db.collection('content').findOne({ section: 'hero' });
    if (doc?.data) data = doc.data as HeroContent;
  } catch {}

  return (
    <>
      <AdminHeader title="Hero Section" />
      <div className="p-4 sm:p-8 max-w-3xl">
        <HeroEditor initial={data} />
      </div>
    </>
  );
}
