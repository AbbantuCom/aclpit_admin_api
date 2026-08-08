import AdminHeader from '@/components/admin/AdminHeader';
import ServicesEditor from '@/components/admin/sections/ServicesEditor';
import { getDb } from '@/lib/mongodb';
import { defaultServices } from '@/lib/seed-data';
import type { ServiceItem } from '@/types';

export default async function ServicesPage() {
  let data: ServiceItem[] = defaultServices;
  try {
    const db = await getDb();
    const doc = await db.collection('content').findOne({ section: 'services' });
    if (doc?.data) data = doc.data as ServiceItem[];
  } catch {}

  return (
    <>
      <AdminHeader title="Services Section" />
      <div className="p-4 sm:p-8 max-w-3xl">
        <ServicesEditor initial={data} />
      </div>
    </>
  );
}
