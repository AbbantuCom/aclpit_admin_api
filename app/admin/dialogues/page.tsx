import AdminHeader from '@/components/admin/AdminHeader';
import DialoguesEditor from '@/components/admin/sections/DialoguesEditor';
import { getDb } from '@/lib/mongodb';
import { defaultDialogues } from '@/lib/seed-data';
import type { DialogueItem } from '@/types';

export default async function DialoguesPage() {
  let data: DialogueItem[] = defaultDialogues;
  try {
    const db = await getDb();
    const doc = await db.collection('content').findOne({ section: 'dialogues' });
    if (doc?.data) data = doc.data as DialogueItem[];
  } catch {}

  return (
    <>
      <AdminHeader title="Legal Tech Dialogues" />
      <div className="p-4 sm:p-8 max-w-3xl">
        <DialoguesEditor initial={data} />
      </div>
    </>
  );
}
