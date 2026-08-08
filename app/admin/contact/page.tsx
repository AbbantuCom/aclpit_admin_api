import AdminHeader from '@/components/admin/AdminHeader';
import ContactEditor from '@/components/admin/sections/ContactEditor';
import { getDb } from '@/lib/mongodb';
import { defaultContact } from '@/lib/seed-data';
import type { ContactContent } from '@/types';

export default async function ContactPage() {
  let data: ContactContent = defaultContact;
  try {
    const db = await getDb();
    const doc = await db.collection('content').findOne({ section: 'contact' });
    if (doc?.data) data = doc.data as ContactContent;
  } catch {}

  return (
    <>
      <AdminHeader title="Contact Section" />
      <div className="p-4 sm:p-8 max-w-3xl">
        <ContactEditor initial={data} />
      </div>
    </>
  );
}
